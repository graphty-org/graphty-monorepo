# @graphty/remote-logger

Remote logging client and server for browser debugging. Send console logs from browsers to a terminal-based log server for easy debugging of web applications.

## Why Remote Logging?

Browser applications run in a sandbox - their `console.log()` output appears in browser DevTools but is not accessible to CLI tools, terminal sessions, or AI assistants. Remote logging bridges this gap by sending browser logs to a server where they can be viewed, searched, and analyzed.

**Use cases where remote logging shines:**

- **Storybook & Component Development** - See console output without switching to browser DevTools
- **Mobile Web Apps** - Phones and tablets require USB debugging to access DevTools
- **VR/AR Applications** - You can't see a browser console while wearing a headset
- **Embedded Devices** - Kiosks, smart displays, and IoT devices without keyboard access
- **CI/CD & Automated Testing** - Capture browser logs during headless test runs
- **LLM-Assisted Debugging** - AI assistants can read, interpret, and act on logs without requiring user interaction with browser DevTools

## Features

- **Browser Client**: Lightweight client for sending logs from browser to server
- **Log Server**: HTTPS/HTTP server with colored terminal output and REST API
- **MCP Server**: Model Context Protocol server for Claude Code integration
- **Console Capture UI**: Floating widget to copy/download/view browser console logs
- **Batching & Retry**: Efficient log delivery with automatic retry on failure
- **Session Tracking**: Unique session IDs for correlating logs across page loads
- **Project Markers**: Filter logs by git worktree or project name
- **Throttling**: Configurable rate limiting for high-frequency log messages
- **File Logging**: JSONL file streaming organized by project marker
- **Log Retention**: Automatic cleanup of old logs (configurable, default 7 days)

## Documentation

The full documentation is at **https://graphty.app/docs/remote-logger/**: a getting-started
guide, the browser client, the server and its REST API, the MCP tools, typical setups (Storybook,
Vite, phones, VR headsets, third-party sites), troubleshooting and the API reference.

## Installation

```bash
npm install @graphty/remote-logger
# or
pnpm add @graphty/remote-logger
```

## Quick Start

### 1. Start the Log Server

```bash
# Using npx
npx remote-log-server --port 9080

# Or via CLI after installation
remote-log-server --port 9080
```

### 2. Add Logging to Your Application

#### Option A: Script Tag (Zero Install)

The server serves a browser-ready script at `/remote-logger.js` that auto-configures itself:

```html
<script src="http://localhost:9080/remote-logger.js"></script>
```

Or paste in the browser console for quick debugging:

```javascript
var s = document.createElement("script");
s.src = "http://localhost:9080/remote-logger.js";
document.head.appendChild(s);
```

The script automatically intercepts all `console.log/warn/error/info/debug` calls and forwards them to the server. It exposes `window.__remoteLogger__` for manual control:

```javascript
// Stop intercepting console
window.__remoteLogger__.destroy();
```

Add `?ui=true` to the script URL to show a floating console capture widget.

#### Option B: NPM Package

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";

// Create client pointing to your log server
const logger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    sessionPrefix: "myapp",
});

// Log messages (batched and sent automatically)
logger.log("INFO", "Application started");
logger.log("DEBUG", "Loading user data", { userId: 123 });
logger.log("ERROR", "Failed to fetch", { error: "Network error" });

// Flush immediately when needed (e.g., before page unload)
await logger.flush();

// Clean up when done
await logger.close();
```

### 3. View Logs in Terminal

Logs appear in the server terminal with colors and session info:

```
10:30:15 [myapp-abc123] INFO   Application started
10:30:15 [myapp-abc123] DEBUG  Loading user data
10:30:16 [myapp-abc123] ERROR  Failed to fetch
```

Log levels are displayed with the following colors:

| Level         | Color                          |
| ------------- | ------------------------------ |
| ERROR         | White text on red background   |
| WARN/WARNING  | Bold text on yellow background |
| INFO          | Blue                           |
| DEBUG         | Cyan                           |
| TRACE         | Dim/gray                       |
| LOG (default) | Green                          |

## License

MIT
