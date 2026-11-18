# Getting started

## Install

```bash
npm install @graphty/remote-logger
```

remote-logger is an ES module. The server runs in Node; the client runs in any browser, and in
Node 18 or later.

## 1. Start the Log Server

```bash
# Using npx
npx remote-log-server --port 9080

# Or via CLI after installation
remote-log-server --port 9080
```

## 2. Add Logging to Your Application

### Option A: Script Tag (Zero Install)

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

### Option B: NPM Package

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

## 3. View Logs in Terminal

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

## A complete round trip

This example starts a server in the same process, sends it two lines from a client, and reads
them back over the REST API. In a real setup the server runs in a terminal and the client in a
browser:

<<< ../examples/round-trip.ts

## Read next

- [The browser client](./browser-client) lists every client option.
- [Typical setups](./setups) covers Storybook, Vite, phones and VR headsets.
- [MCP tools](./mcp) lets Claude Code read the logs itself.
