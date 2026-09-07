import { sendRpc, isExtensionConnected, downloadAndSaveAsset } from '../bridge/ws-server.js';
import path from 'path';

export class McpJobQueue {
  constructor() {
    this.queue = [];
    this.activeJob = null;
    this.history = [];
    this.isProcessing = false;
  }

  // Enqueue a new generation job with strict sequential FIFO processing
  enqueue(params) {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const job = {
      id,
      prompt: params.prompt,
      params,
      status: 'queued',
      progress: 0,
      progressStatus: 'queued',
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      result: null,
      error: null
    };

    const promise = new Promise((resolve, reject) => {
      job.resolve = resolve;
      job.reject = reject;
    });

    this.queue.push(job);
    console.error(`[Autoflow Queue] Enqueued job ${id} ("${params.prompt.substring(0, 40)}..."). Queue depth: ${this.queue.length}`);
    this.processNext();

    return promise;
  }

  async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.activeJob = this.queue.shift();
    this.activeJob.status = 'running';
    this.activeJob.startedAt = new Date().toISOString();

    console.error(`[Autoflow Queue] Processing job ${this.activeJob.id}: "${this.activeJob.prompt.substring(0, 40)}..."`);

    try {
      let attempts = 0;
      let result = null;
      let lastError = null;

      while (attempts < 2) {
        attempts++;
        try {
          result = await sendRpc('GENERATE', this.activeJob.params, {
            timeoutMs: 600000, // 10 minute timeout
            onProgress: (prog) => {
              if (this.activeJob) {
                this.activeJob.progress = prog.percentage || this.activeJob.progress;
                this.activeJob.progressStatus = prog.status || 'generating';
              }
            }
          });
          break; // Success
        } catch (err) {
          lastError = err;
          console.error(`[Autoflow Queue] Attempt ${attempts} for job ${this.activeJob.id} failed:`, err.message);
          if (attempts < 2) {
            console.error(`[Autoflow Queue] Attempting auto-healing and retrying in 3s...`);
            try {
              await sendRpc('HEAL_TAB', {}, { timeoutMs: 5000 });
            } catch (e) {}
            await new Promise(r => setTimeout(r, 3000));
          }
        }
      }

      if (!result && lastError) {
        throw lastError;
      }

      this.activeJob.status = 'completed';
      this.activeJob.completedAt = new Date().toISOString();
      this.activeJob.progress = 100;
      this.activeJob.result = result;

      // Double-Engine direct download: automatically save generated asset URLs directly to disk
      if (result && Array.isArray(result.results)) {
        const folder = (this.activeJob.params?.folderName || 'Autoflow_MCP').trim();
        const userFolder = path.join('C:\\Users\\Rizwan\\Downloads', folder);
        const localFolder = path.resolve('downloads', folder);

        for (const res of result.results) {
          if (res.assetUrls && Array.isArray(res.assetUrls)) {
            for (let i = 0; i < res.assetUrls.length; i++) {
              const url = res.assetUrls[i];
              const ext = url.includes('.mp4') ? 'mp4' : 'png';
              const filename = `${this.activeJob.id}_asset_${i + 1}.${ext}`;
              try {
                await downloadAndSaveAsset(url, path.join(userFolder, filename));
                await downloadAndSaveAsset(url, path.join(localFolder, filename));
                console.error(`[Autoflow Queue] Double-Engine saved asset to: ${path.join(userFolder, filename)}`);
              } catch (saveErr) {
                console.error(`[Autoflow Queue] Double-Engine auto-save error:`, saveErr.message);
              }
            }
          }
        }
      }

      this.addToHistory(this.activeJob);
      this.activeJob.resolve(result);
    } catch (err) {
      console.error(`[Autoflow Queue] Job ${this.activeJob.id} failed:`, err.message);
      this.activeJob.status = 'failed';
      this.activeJob.completedAt = new Date().toISOString();
      this.activeJob.error = err.message;

      this.addToHistory(this.activeJob);
      this.activeJob.reject(err);
    } finally {
      this.activeJob = null;
      this.isProcessing = false;
      this.processNext();
    }
  }

  // Cancel an active or pending job
  async cancel(jobId) {
    // If no jobId specified, cancel active job or first pending
    if (!jobId && this.activeJob) {
      jobId = this.activeJob.id;
    }

    if (this.activeJob && this.activeJob.id === jobId) {
      console.error(`[Autoflow Queue] Cancelling active job ${jobId}`);
      try {
        await sendRpc('CANCEL', { groupId: this.activeJob.id });
      } catch (e) {}

      this.activeJob.status = 'cancelled';
      this.activeJob.completedAt = new Date().toISOString();
      this.activeJob.error = 'Cancelled by user';
      this.addToHistory(this.activeJob);
      this.activeJob.reject(new Error('Job was cancelled'));

      this.activeJob = null;
      this.isProcessing = false;
      this.processNext();
      return { success: true, message: `Active job ${jobId} cancelled` };
    }

    const index = this.queue.findIndex(j => j.id === jobId);
    if (index !== -1) {
      const [removed] = this.queue.splice(index, 1);
      removed.status = 'cancelled';
      removed.completedAt = new Date().toISOString();
      removed.error = 'Cancelled before execution';
      this.addToHistory(removed);
      removed.reject(new Error('Job was cancelled from queue'));
      return { success: true, message: `Queued job ${jobId} cancelled` };
    }

    return { success: false, message: `Job ${jobId || 'current'} not found` };
  }

  addToHistory(job) {
    this.history.unshift({
      id: job.id,
      prompt: job.prompt,
      status: job.status,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      progress: job.progress,
      error: job.error
    });

    if (this.history.length > 20) {
      this.history.pop();
    }
  }

  clearQueue() {
    const cleared = [];
    while (this.queue.length > 0) {
      const job = this.queue.shift();
      job.status = 'cancelled';
      job.completedAt = new Date().toISOString();
      job.error = 'Queue was cleared';
      this.addToHistory(job);
      job.reject(new Error('Queue was cleared by user or agent'));
      cleared.push(job.id);
    }
    return { success: true, count: cleared.length, clearedJobs: cleared };
  }

  getQueueState() {
    return {
      activeJob: this.activeJob ? {
        id: this.activeJob.id,
        prompt: this.activeJob.prompt,
        status: this.activeJob.status,
        progress: this.activeJob.progress,
        progressStatus: this.activeJob.progressStatus,
        startedAt: this.activeJob.startedAt
      } : null,
      queueLength: this.queue.length,
      pendingJobs: this.queue.map(j => ({
        id: j.id,
        prompt: j.prompt,
        createdAt: j.createdAt
      })),
      recentHistory: this.history.slice(0, 5)
    };
  }
}

export const jobQueue = new McpJobQueue();
