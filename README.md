<div align="center">
  <img src="https://raw.githubusercontent.com/inov8ing/autoflow-mcp/main/assets/logo.png" alt="Autoflow MCP Logo" width="200" />
  <h1>Autoflow MCP (Model Context Protocol) Server</h1>
  <p><strong>Brought to you by <a href="https://inov8ing.io">inov8ing.io</a></strong></p>
  <p><em>The ultimate background automation server for AI Video and Image Generation in Google Flow</em></p>

  [![NPM Version](https://img.shields.io/npm/v/autoflow-mcp.svg)](https://www.npmjs.com/package/autoflow-mcp)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

<br />

**Autoflow MCP** is a powerful Model Context Protocol (MCP) server that seamlessly bridges modern AI Agents (like Cursor, Cline, Windsurf, or custom LLMs) directly with the [Autoflow Chrome Extension](https://chromewebstore.google.com/detail/autoflow-%E2%80%94-veo-3-nano-ban/eklokclnmljbdijdhnamfcdhfomdmbmg?utm_source=item-share-cp). 

By acting as a background generation queue, Autoflow MCP allows AI agents to command browser-based AI generation models (such as Imagen 3, Omni Flash, and Veo 3) fully autonomously—achieving a complete "fire and forget" workflow without locking up your terminal or requiring manual intervention.

## 🌟 Key Features

- **Full MCP Integration**: Exposes a robust set of tools (`autoflow_generate`, `autoflow_screenshot`, `autoflow_status`) directly to any MCP-compliant AI client.
- **Background Queue System (Fire & Forget)**: Drop a prompt into the server, and the built-in queue handles the generation, progress monitoring, and asset saving entirely in the background.
- **Double-Engine Auto-Download**: Assets (images, 10s videos, etc.) are forcefully extracted and saved directly to your local `Downloads` folder using our proprietary fallback downloader. No more hanging or skipped downloads!
- **Zero-Touch Automation**: Once paired with the [Autoflow Chrome Extension](https://chromewebstore.google.com/detail/autoflow-%E2%80%94-veo-3-nano-ban/eklokclnmljbdijdhnamfcdhfomdmbmg?utm_source=item-share-cp), AI Agents can drive complex UI workflows entirely via WebSocket RPC.
- **Developed by [inov8ing.io](https://inov8ing.io)**: Ensuring highly professional, scalable, and resilient automation solutions.

---

## 🎨 Example Prompts & Outputs

With Autoflow MCP, you can automate breathtaking generations in the background. Here are real examples of media generated entirely through this MCP server!

### High-Quality Nature Photography (Imagen 3)

**Example Prompt:**
> *"A calm crystal-clear lake at pastel sunrise, soft pink and lavender sky reflecting on the mirror-like water, smooth stones on the shoreline, gentle mist rising from the surface, ultra-detailed, peaceful ambiance, cinematic lighting, 8k."*

<div align="center">
  <img src="https://raw.githubusercontent.com/inov8ing/autoflow-mcp/main/assets/media/pastel_lake.jpg" alt="Pastel Sunrise Lake" width="800" />
</div>

### Cinematic Video Generation (Omni Flash / Veo 3)

**Example Prompt:**
> *"Close-up portrait of a breathtakingly cute 20-year-old Korean girl with sweet gentle smile, soft pastel oversized knit sweater, natural glass-skin makeup, delicate rosy cheeks, glossy peach lip tint, soft wispy bangs, candid warm golden hour café lighting, aesthetic bokeh background, ultra-detailed textures, 8k masterpiece, photorealistic. The girl looks directly into the camera with sparkling eyes, blushes cutely, and softly says 'Oppa~' in a very cute, gentle, and romantic whisper with a charming affectionate smile, smooth natural facial animation and lip sync, cinematic photorealistic 8k video."*

<div align="center">
  <video src="https://raw.githubusercontent.com/inov8ing/autoflow-mcp/main/assets/media/cute_korean_girl.mp4" controls="controls" width="800">
    <a href="https://raw.githubusercontent.com/inov8ing/autoflow-mcp/main/assets/media/cute_korean_girl.mp4">Click to view the video</a>
  </video>
</div>

---

## 🚀 Installation & Setup

### 1. Install the Chrome Extension
Before using the MCP server, you must install the official Chrome Extension to act as the browser-side worker:
👉 **[Download Autoflow — Veo 3 Nano from the Chrome Web Store](https://chromewebstore.google.com/detail/autoflow-%E2%80%94-veo-3-nano-ban/eklokclnmljbdijdhnamfcdhfomdmbmg?utm_source=item-share-cp)**

### 2. Configure Your AI IDE (Cursor, Cline, Windsurf)
Since Autoflow is published globally on NPM, you don't even need to clone this repository. Simply add it to your MCP configuration file (e.g. `mcp.json` or Cursor's MCP settings):

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

## 🛠️ Usage for AI Agents

Once connected, your AI Agent will have access to the following tools:

- `autoflow_generate`: The primary powerhouse tool. Accepts `prompt`, `mode` (`textToImage`, `textToVideo`), `model` (e.g. `Omni Flash`), and `aspectRatio`. Jobs are queued in the background.
- `autoflow_status`: Check the status of the Google Flow tab, the extension connection, and the background job queue.
- `autoflow_screenshot`: Request an immediate snapshot of the active generation browser tab for debugging context.
- `autoflow_scan_assets`: Manually command the extension to scrape the DOM for generated media URLs.

### Examples

Check out the `/examples` directory in this repository for standalone Node.js scripts demonstrating how to interact with the WebSocket Bridge and Queue system directly!
- `batch-generate-nature.mjs`: Demonstrates queuing 10 high-quality image generations in the background.
- `generate-korean-girl-video.mjs`: Demonstrates triggering a 10s video generation workflow.

## 🤝 Contributing & Support
Built with ❤️ by the team at **[inov8ing.io](https://inov8ing.io)**. 
We specialize in cutting-edge browser automation, AI workflow integrations, and next-generation product development.

For enterprise inquiries or advanced feature requests, visit our website or open an issue on this repository!

---
*Note: This project is an independent automation tool and is not officially affiliated with Google Flow. Always ensure your usage complies with the respective platform's Terms of Service.*
