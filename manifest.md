# Project Manifest: Autoflow MCP (SaaS-Ready Extension Bridge)

## Overview
Autoflow MCP is a high-performance Model Context Protocol (MCP) server that connects AI assistants (Claude Desktop, OpenCode, Cursor, Antigravity) directly to Google Flow (`https://flow.google.com/`) through a zero-config local WebSocket bridge to the Autoflow Chrome Extension. It replaces legacy, fragile Playwright/CDP setups with native, ban-resistant browser execution.

## Architecture
- **AI Agent Integration**: Standard MCP Stdio protocol (`@modelcontextprotocol/sdk`).
- **Local Bridge Server**: Lightweight Node.js WebSocket server listening on `127.0.0.1:19845` (`src/bridge/ws-server.js`).
- **Chrome Extension Client**: The Autoflow Chrome Extension background service worker connects to the local WebSocket, relaying commands to content scripts running on `flow.google.com`.
- **Automation Execution**: Content script dispatches native `AUTO_FILL_FLOW` events, handles prompt typing, Veo 3 / Nano Banana model selection, and automatic file downloads.

## Stack
- **Runtime**: Node.js >= 18
- **Protocol**: Model Context Protocol (MCP) SDK v1.9+
- **Transport**: WebSocket (`ws` v8.18+) + Stdio Transport
- **Validation**: Zod v3.24+

## Repo Structure
```
f:\google-flow-browser-mcp-main\
├── extension-bridge/
│   └── mcp-bridge.js             # Extension-side bridge module
├── src/
│   ├── index.js                  # Main MCP server entry point
│   ├── bridge/
│   │   └── ws-server.js          # WebSocket server and RPC manager
│   ├── browser/                  # Legacy CDP components (retained for backward compatibility)
│   ├── navigation/               # Legacy project navigator
│   ├── queue/                    # Legacy queue helpers
│   ├── tools/                    # Legacy tool implementations
│   └── utils/                    # Shared utilities and logger
├── manifest.md                   # Long-term project memory and architecture
├── package.json                  # Package manifest (autoflow-mcp v2.0.0)
├── README.md                     # Documentation and user setup guide
└── test-bridge.mjs               # Automated WebSocket bridge test suite
```

## Conventions
- Feature Identifiers: `FEAT-XXX`, `BUG-XXX`, `CHORE-XXX`.
- Commits: Conventional commit format (`feat(FEAT-XXX): summary`).
- Logging: All server logs must use `console.error` so that `stdout` remains reserved for JSON-RPC MCP messages.
- Manifest is append-preserving: change log must never be overwritten or erased.

## Product Decisions
- **Zero Automation Flags**: Discarded requirement for `--remote-debugging-port=9222` and browser launch scripts. All browser automation is delegated to the user's authentic Chrome extension session.
- **Unified Tool Interface**: Consolidated complex multi-step tools into intuitive AI agent tools: `autoflow_status`, `autoflow_open_flow`, `autoflow_generate`, `autoflow_list_characters`, `autoflow_cancel`.
- **SaaS Readiness**: Packaged as an executable npm binary (`npx -y autoflow-mcp`) with cross-platform compatibility across Windows, macOS, and Linux.

## Design System
- N/A (Headless CLI / MCP Stdio service).

## Data Model
- **RPC Request**: `{ id: string, action: string, params: object }`
- **RPC Response**: `{ id: string, success: boolean, results?: any, error?: string }`
- **Handshake**: `{ type: "EXTENSION_HELLO", name: string, version: string, extensionId: string }`
- **Progress Event**: `{ type: "PROGRESS", id: string, percentage: number, status: string, prompt: string }`

## API Contracts
- **`autoflow_status`**: Returns extension connection status and Google Flow tab state.
- **`autoflow_open_flow`**: Triggers tab creation for `https://flow.google.com/`.
- **`autoflow_generate`**: High-level generation tool accepting `prompt`, `mode`, `model`, `aspectRatio`, `outputCount`, `characters`, `videoOption`.
- **`autoflow_list_characters`**: Returns all character tags scanned from Google Flow.
- **`autoflow_cancel`**: Stops running prompt group.

## State Management
- `pendingRequests` Map tracks inflight RPC calls with timeout guards and progress listeners.
- `activeSocket` maintains the live WebSocket connection to the Chrome Extension.

## Security
- Server binds strictly to `127.0.0.1` (localhost only). External network access is rejected.
- No Google account credentials, tokens, or cookies are stored or processed by the MCP server.

## Performance
- Lightweight footprint (< 15MB RAM), sub-millisecond RPC serialization.
- Zero Chrome browser startup overhead.

## Testing
- `test-bridge.mjs`: Automated mock client handshake and RPC dispatch test.
- Syntax verification via `node --check`.

## Known Constraints
- Requires Google Chrome with the Autoflow extension active. If the extension is not connected, the MCP server returns clear actionable guidance.

## Open Questions
- None.

## Change Log
- 2026-09-06 | BASELINE | Initial baseline commit of legacy CDP MCP server | * | Baseline captured in git commit ed93566 | Rollback: N/A
- 2026-09-06 | FEAT-011 | Refactored MCP server into SaaS-ready Autoflow MCP with WebSocket Bridge: created ws-server.js, updated src/index.js with clean tools, updated package.json to autoflow-mcp v2.0.0, added test-bridge.mjs, and verified automated tests | package.json, package-lock.json, src/bridge/ws-server.js, src/index.js, test-bridge.mjs, extension-bridge/mcp-bridge.js, manifest.md | test-bridge.mjs passed + node --check passed | commit 950abd1 | Rollback: git checkout ed93566
- 2026-09-06 | FEAT-012 | Implemented Sequential FIFO Job Queue: created src/queue/mcp-queue.js, integrated with src/index.js, added autoflow_get_queue tool, enhanced cancel handling, and verified with automated test-queue.mjs | src/queue/mcp-queue.js, src/index.js, test-queue.mjs, package.json | test-queue.mjs passed + npm test passed | commit f2b1e3c | Rollback: git checkout HEAD~1 src/queue/mcp-queue.js src/index.js
- 2026-09-06 | FEAT-013 | Codebase Cleanup & Distributable Packaging: removed 32 legacy Playwright files, added MIT license, configured package.json files/bin/keywords, verified 10.2KB clean npm tarball, and confirmed zero bloat | src/browser/*, src/tools/*, src/navigation/*, scripts/*, config/*, package.json, LICENSE, manifest.md | npm pack --dry-run passed (7 files, 10.2KB) + npm test passed | commit bd7f76e | Rollback: git revert HEAD
- 2026-09-06 | FEAT-014 | Synchronized MCP bridge status handler & fixed package.json bin specifier for global npx distribution | extension-bridge/mcp-bridge.js, package.json, manifest.md | npm test passed + node --check passed | commit 397f551 | Rollback: git revert HEAD
