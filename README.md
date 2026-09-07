# ⚡ Autoflow MCP

**Zero-Config AI Agent Automation for Google Flow via the Autoflow Chrome Extension.**

Control [Google Flow](https://flow.google.com/) — image & video generation with **Veo 3.1**, **Nano Banana**, and **Imagen 4** — directly from your AI agent without browser flags, terminal profiles, or bot blocks.

---

## 🌟 Why Autoflow MCP?

Traditional browser MCP servers require launching Chrome with `--remote-debugging-port=9222`, hunting down profile directories, closing personal browser windows, and dealing with Google bot detection.

**Autoflow MCP eliminates all of that:**
* **Zero Configuration**: No terminal flags or profile paths. It bridges directly to your everyday Chrome browser.
* **100% Anti-Bot Immune**: Actions run inside your real, active Google session via the Autoflow extension.
* **Cross-Platform**: Works identically on Windows, macOS, and Linux out of the box.
* **Fast & Lightweight**: Zero headless browser overhead (< 15MB RAM).

---

## 🏗️ Architecture

```
┌───────────────────────────────┐
│ AI Client (Claude / OpenCode) │
└───────────────┬───────────────┘
                │ Standard MCP Stdio
                ▼
┌───────────────────────────────┐
│      Autoflow MCP Server      │
│     (ws://127.0.0.1:19845)    │
└───────────────┬───────────────┘
                │ Local WebSocket RPC
                ▼
┌───────────────────────────────┐
│   Autoflow Chrome Extension   │
│  (Background Service Worker)  │
└───────────────┬───────────────┘
                │ Native DOM & CDP Automation
                ▼
┌───────────────────────────────┐
│    Google Flow Web Studio     │
│   (https://flow.google.com/)  │
└───────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Requirements
* Google Chrome with the **Autoflow Extension** installed and enabled.
* Node.js >= 18.

### 2. Configure Your AI Agent

Add **Autoflow MCP** to your AI client's configuration (Claude Desktop, OpenCode, Antigravity `mcp_config.json`, or Cursor):

#### Using `npx` (Recommended for Users)
```json
{
  "mcpServers": {
    "autoflow": {
      "command": "npx",
      "args": ["-y", "autoflow-mcp"]
    }
  }
}
```

#### Running from Local Repository
```json
{
  "mcpServers": {
    "autoflow": {
      "command": "node",
      "args": ["F:/google-flow-browser-mcp-main/src/index.js"]
    }
  }
}
```

### 3. Start Generating!
Just talk to your AI assistant:
* *"Check if Autoflow and Google Flow are connected."*
* *"Generate a cinematic drone shot of a neon cyberpunk city in 16:9 ratio using Veo 3.1."*
* *"List the available characters in my current Flow project."*

---

## 🔧 Tools Included

| Tool | Parameters | Description |
| :--- | :--- | :--- |
| `autoflow_status` | *(none)* | Checks extension and Google Flow tab connectivity. |
| `autoflow_open_flow` | *(none)* | Opens `https://flow.google.com/` in an active tab. |
| `autoflow_generate` | `prompt`, `mode`, `model`, `aspectRatio`, `outputCount`, `videoOption`, `characters` | Generates images or videos with Veo 3 or Nano Banana models. |
| `autoflow_list_characters` | *(none)* | Scans all available `@` character tags in the open project. |
| `autoflow_cancel` | `groupId` *(optional)* | Cancels any ongoing generation queue. |

---

## 🧪 Testing

Run the automated bridge test suite:
```bash
npm test
```
