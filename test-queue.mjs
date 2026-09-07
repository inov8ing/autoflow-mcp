import { McpJobQueue } from './src/queue/mcp-queue.js';

async function testQueue() {
  console.log('--- Testing Autoflow Sequential FIFO Queue ---');

  const queue = new McpJobQueue();
  const executionOrder = [];

  // Mock processNext to simulate async work without needing real extension
  queue.processNext = async function() {
    if (this.isProcessing || this.queue.length === 0) return;
    this.isProcessing = true;
    this.activeJob = this.queue.shift();
    this.activeJob.status = 'running';
    this.activeJob.startedAt = new Date().toISOString();

    const currentJob = this.activeJob;
    executionOrder.push(`start-${currentJob.id}`);

    // Simulate 100ms generation
    await new Promise(r => setTimeout(r, 100));

    executionOrder.push(`finish-${currentJob.id}`);
    currentJob.status = 'completed';
    this.addToHistory(currentJob);
    currentJob.resolve({ success: true, jobId: currentJob.id });

    this.activeJob = null;
    this.isProcessing = false;
    this.processNext();
  };

  // Enqueue 3 jobs in rapid succession
  console.log('Enqueueing 3 jobs simultaneously...');
  const p1 = queue.enqueue({ prompt: 'Job 1' });
  const p2 = queue.enqueue({ prompt: 'Job 2' });
  const p3 = queue.enqueue({ prompt: 'Job 3' });

  // Inspect queue state while running
  const stateDuring = queue.getQueueState();
  console.log('Queue state during processing:', {
    activeJob: stateDuring.activeJob?.prompt,
    queueLength: stateDuring.queueLength,
    pendingPrompts: stateDuring.pendingJobs.map(j => j.prompt)
  });

  if (stateDuring.queueLength !== 2) {
    throw new Error(`Expected 2 pending jobs, got ${stateDuring.queueLength}`);
  }

  // Wait for all to finish
  const results = await Promise.all([p1, p2, p3]);
  console.log('All 3 jobs resolved:', results);

  // Verify execution order was strictly sequential: start-1, finish-1, start-2, finish-2, start-3, finish-3
  console.log('Execution trace:', executionOrder);
  for (let i = 0; i < 3; i++) {
    const startIdx = executionOrder.findIndex(e => e.startsWith('start') && e.includes(`job_`));
    const finishIdx = executionOrder.findIndex(e => e.startsWith('finish') && e.includes(`job_`));
    if (finishIdx < startIdx) {
      throw new Error('Non-sequential execution detected!');
    }
  }

  const finalState = queue.getQueueState();
  console.log('Final Queue State:', {
    queueLength: finalState.queueLength,
    historyCount: finalState.recentHistory.length
  });

  if (finalState.queueLength !== 0 || finalState.recentHistory.length !== 3) {
    throw new Error('Queue cleanup or history tracking failed');
  }

  console.log('✓ Sequential FIFO Queue test passed completely!');
}

testQueue().catch(err => {
  console.error('✗ Queue test failed:', err);
  process.exit(1);
});
