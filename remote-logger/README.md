# @graphty/remote-logger

Remote logging client and server for browser debugging. Send console logs from browsers to a terminal-based log server for easy debugging of web applications.

## Features

- **Browser Client**: Lightweight client for sending logs from browser to server
- **Log Server**: HTTPS/HTTP server with colored terminal output and REST API
- **Console Capture UI**: Floating widget to copy/download/view browser console logs
- **Batching & Retry**: Efficient log delivery with automatic retry on failure
- **Session Tracking**: Unique session IDs for correlating logs across page loads
- **Throttling**: Configurable rate limiting for high-frequency log messages
- **File Logging**: Optional JSONL file output for persistent log storage

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
npx remote-log-server --http --port 9080

# Or via CLI after installation
remote-log-server --http --port 9080
```

### 2. Add Client to Your Application

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
| Level | Color |
|-------|-------|
| ERROR | White text on red background |
| WARN/WARNING | Bold text on yellow background |
| INFO | Blue |
| DEBUG | Cyan |
| TRACE | Dim/gray |
| LOG (default) | Green |

## CLI Reference

```
Usage:
  npx remote-log-server [options]

Options:
  --port, -p <port>       Port to listen on (default: 9080)
  --host, -h <host>       Hostname to bind to (default: localhost)
  --cert, -c <path>       Path to SSL certificate file
  --key, -k <path>        Path to SSL private key file
  --log-file, -l <path>   Write logs to file (JSONL format)
  --http                  Use HTTP instead of HTTPS
  --quiet, -q             Suppress startup banner
  --help                  Show help message

Examples:
  npx remote-log-server                           # HTTPS with auto-generated cert
  npx remote-log-server --http --port 9080        # HTTP on port 9080
  npx remote-log-server --cert cert.pem --key key.pem  # Custom SSL certs
```

## API Reference

### RemoteLogClient

The browser-side client for sending logs.

```typescript
import { RemoteLogClient, createRemoteLogClient } from "@graphty/remote-logger";

// Using constructor
const client = new RemoteLogClient(options);

// Using factory function
const client = createRemoteLogClient(options);
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `serverUrl` | `string` | required | URL of the log server |
| `sessionPrefix` | `string` | `"session"` | Prefix for session ID |
| `batchIntervalMs` | `number` | `1000` | Interval between batch sends |
| `maxRetries` | `number` | `3` | Max retry attempts on failure |
| `retryDelayMs` | `number` | `1000` | Base delay between retries (uses exponential backoff) |
| `throttlePatterns` | `ThrottlePattern[]` | `[]` | Patterns to throttle (see below) |

#### Throttling High-Frequency Logs

Use throttle patterns to prevent log flooding from high-frequency events:

```typescript
const logger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    throttlePatterns: [
        // Only send "Rendering frame" once per second
        { pattern: /Rendering frame/, intervalMs: 1000 },
        // Only send mouse position updates every 500ms
        { pattern: /Mouse position:/, intervalMs: 500 },
    ],
});
```

#### Methods

| Method | Description |
|--------|-------------|
| `log(level, message, data?)` | Log a message with optional data object |
| `flush(): Promise<void>` | Immediately send pending logs to server |
| `close(): Promise<void>` | Flush remaining logs and stop accepting new ones |

#### Properties

| Property | Type | Description |
|----------|------|-------------|
| `sessionId` | `string` (readonly) | Unique session identifier in format `{prefix}-{timestamp}-{random}` |

### startLogServer

Start the log server programmatically.

```typescript
import { startLogServer } from "@graphty/remote-logger/server";

const server = startLogServer({
    port: 9080,
    host: "localhost",
    useHttp: true,
    quiet: false,
});
```

#### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `port` | `number` | `9080` | Port to listen on |
| `host` | `string` | `"localhost"` | Hostname to bind to |
| `certPath` | `string` | - | Path to SSL certificate |
| `keyPath` | `string` | - | Path to SSL private key |
| `logFile` | `string` | - | Path for file logging |
| `useHttp` | `boolean` | `false` | Use HTTP instead of HTTPS |
| `quiet` | `boolean` | `false` | Suppress output |

### REST API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/log` | POST | Receive logs from client |
| `/logs` | GET | Get all logs by session |
| `/logs/recent` | GET | Get recent logs (`?n=50&errors=true`) |
| `/logs/errors` | GET | Get error-level logs only |
| `/logs/clear` | POST | Clear all stored logs |
| `/health` | GET | Health check |

#### POST /log

Receive log entries from clients. This is the endpoint used by `RemoteLogClient`.

**Request body:**
```json
{
    "sessionId": "myapp-abc123-xyz789",
    "logs": [
        {
            "time": "2024-01-15T10:30:00.000Z",
            "level": "INFO",
            "message": "User logged in",
            "data": { "userId": 123 }
        }
    ]
}
```

**Response:**
```json
{ "success": true }
```

#### GET /logs

Returns all logs grouped by session.

**Response:**
```json
{
    "myapp-abc123": [
        { "time": "2024-01-15T10:30:00Z", "level": "INFO", "message": "Hello" }
    ],
    "myapp-def456": [
        { "time": "2024-01-15T10:31:00Z", "level": "DEBUG", "message": "Debug msg" }
    ]
}
```

#### GET /logs/recent

Returns recent logs across all sessions, sorted by time.

**Query parameters:**
- `n` (optional): Number of logs to return (default: 50)
- `errors` (optional): Set to `true` to return only error-level logs

**Response:**
```json
{
    "total": 150,
    "showing": 50,
    "logs": [
        { "sessionId": "myapp-abc123", "time": "...", "level": "INFO", "message": "..." }
    ]
}
```

#### GET /logs/errors

Returns only error-level logs across all sessions.

**Response:**
```json
{
    "total": 5,
    "logs": [
        { "sessionId": "myapp-abc123", "time": "...", "level": "ERROR", "message": "..." }
    ]
}
```

#### POST /logs/clear

Clears all stored logs from memory.

**Response:**
```json
{ "success": true }
```

#### GET /health

Health check endpoint for monitoring.

**Response:**
```json
{ "status": "ok", "sessions": 3 }
```

### ConsoleCaptureUI

A floating UI widget that captures all console output (`log`, `error`, `warn`, `info`, `debug`) and provides a menu to copy, download, view, or clear the captured logs.

```typescript
import { initConsoleCaptureUI, ConsoleCaptureUI } from "@graphty/remote-logger/ui";

// Initialize the UI (adds floating button to page)
const ui = initConsoleCaptureUI();

// Or use the class directly
const ui = new ConsoleCaptureUI();

// All console methods are now captured
console.log("This is captured");
console.error("This too");

// Access captured logs programmatically
const logsText = ui.getLogs();

// Later, clean up (restores original console methods)
ui.destroy();
```

#### Widget Features

The floating button (📋) appears in the top-right corner of the page. Clicking it reveals a menu with:

| Button | Action |
|--------|--------|
| 📋 Copy Logs | Copy all captured logs to clipboard |
| 💾 Download | Download logs as a timestamped text file |
| 🗑️ Clear | Clear all captured logs |
| 👁️ Show Logs | Open a modal to view and select logs |

#### Instance Methods

| Method | Description |
|--------|-------------|
| `getLogs(): string` | Get all captured logs as formatted text |
| `clearLogs(): void` | Clear captured logs |
| `copyLogs(): Promise<void>` | Copy logs to clipboard |
| `downloadLogs(): void` | Download logs as text file |
| `destroy(): void` | Restore console methods and remove UI |

#### Global Methods

When initialized, `window.__console__` is exposed for programmatic access:

```typescript
// Available globally after initConsoleCaptureUI()
window.__console__.copy();      // Copy to clipboard
window.__console__.download();  // Download as file
window.__console__.clear();     // Clear logs
window.__console__.get();       // Get logs as string
window.__console__.logs;        // Raw log array
```

#### Log Format

Captured logs are formatted as:
```
[2024-01-15T10:30:00.000Z] [INFO] User logged in
[2024-01-15T10:30:01.000Z] [ERROR] Failed to connect
```

## Integration Examples

### Basic Browser Integration

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";

// Create a logger instance
const logger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    sessionPrefix: "myapp",
});

// Wrap console methods to also send to remote server
const originalLog = console.log;
console.log = (...args) => {
    originalLog.apply(console, args);
    logger.log("LOG", args.map(String).join(" "));
};

// Flush before page unload
window.addEventListener("beforeunload", () => {
    logger.flush();
});
```

### React/Vue/Angular Error Boundary

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";

const logger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    sessionPrefix: "react-app",
});

// Global error handler
window.onerror = (message, source, lineno, colno, error) => {
    logger.log("ERROR", String(message), {
        source,
        lineno,
        colno,
        stack: error?.stack,
    });
};

// Unhandled promise rejections
window.onunhandledrejection = (event) => {
    logger.log("ERROR", "Unhandled rejection", {
        reason: String(event.reason),
    });
};
```

### Usage with graphty-element

Add URL parameter to enable remote logging in Storybook:

```
?graphty-element-remote-log=http://localhost:9080
```

### Node.js Custom Server Integration

```typescript
import { startLogServer, clearLogs } from "@graphty/remote-logger/server";
import type { Server } from "http";

// Start server and store reference
const server: Server = startLogServer({
    port: 9080,
    useHttp: true,
    quiet: true,  // Suppress banner for programmatic use
    logFile: "./logs/debug.jsonl",
});

// Clear logs periodically
setInterval(() => {
    clearLogs();
}, 3600000); // Every hour

// Graceful shutdown
process.on("SIGTERM", () => {
    server.close(() => {
        process.exit(0);
    });
});
```

### Combining RemoteLogClient with ConsoleCaptureUI

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";
import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";

// Initialize console capture for local viewing
const ui = initConsoleCaptureUI();

// Also send to remote server
const remoteLogger = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    sessionPrefix: "dual-logging",
});

// Hook into captured logs
const originalLog = console.log;
console.log = (...args) => {
    // ConsoleCaptureUI already captures this
    originalLog.apply(console, args);
    // Also send to remote
    remoteLogger.log("LOG", args.map(String).join(" "));
};
```

## HTTPS Certificates

### Auto-generated Self-Signed Cert

By default, the server generates a self-signed certificate. You'll need to accept the certificate warning in your browser.

### Using Let's Encrypt or Custom Certs

```bash
npx remote-log-server \
  --cert /path/to/fullchain.pem \
  --key /path/to/privkey.pem \
  --host yourdomain.com
```

## File Logging

Write logs to a JSONL file for later analysis:

```bash
npx remote-log-server --log-file ./logs/debug.jsonl
```

Each line contains a JSON object:
```json
{"time":"2024-01-15T10:30:00Z","sessionId":"myapp-abc123","level":"INFO","message":"Hello"}
```

## TypeScript

Full TypeScript support with type definitions included.

```typescript
// Client types
import type {
    LogEntry,
    RemoteLogClientOptions,
    ThrottlePattern
} from "@graphty/remote-logger";

// Server types (from server entry point)
import type {
    LogServerOptions,
    ParseArgsResult,
    GeneratedCert
} from "@graphty/remote-logger/server";
```

### Type Definitions

```typescript
interface LogEntry {
    time: string;      // ISO 8601 timestamp
    level: string;     // Log level (INFO, DEBUG, WARN, ERROR, etc.)
    message: string;   // Log message
    data?: Record<string, unknown>;  // Optional additional data
}

interface ThrottlePattern {
    pattern: RegExp;   // Pattern to match log messages
    intervalMs: number; // Minimum interval between matching messages
}

interface RemoteLogClientOptions {
    serverUrl: string;
    sessionPrefix?: string;
    batchIntervalMs?: number;
    maxRetries?: number;
    retryDelayMs?: number;
    throttlePatterns?: ThrottlePattern[];
}

interface LogServerOptions {
    port?: number;
    host?: string;
    certPath?: string;
    keyPath?: string;
    logFile?: string;
    useHttp?: boolean;
    quiet?: boolean;
}
```

## Troubleshooting

### CORS Errors

The server includes CORS headers by default (`Access-Control-Allow-Origin: *`). If you still encounter CORS issues:

1. Ensure you're using the correct protocol (http vs https)
2. Check that the port is correct
3. For HTTPS, you may need to accept the self-signed certificate first by visiting the server URL directly

### Certificate Warnings

When using auto-generated self-signed certificates:

1. Navigate to `https://localhost:9080/health` in your browser
2. Accept the security warning
3. Your application should now be able to connect

### Logs Not Appearing

1. Check the browser console for network errors
2. Verify the server is running: `curl http://localhost:9080/health`
3. Check that `flush()` is being called before page unload
4. Increase `batchIntervalMs` if logs are being sent too frequently

### High Memory Usage on Server

The server stores all logs in memory. For long-running sessions:

1. Use `POST /logs/clear` periodically to clear logs
2. Or use `clearLogs()` programmatically
3. Consider using `--log-file` to persist logs to disk and reduce memory pressure

## Package Exports

The package provides three entry points for different use cases:

### Main Entry (`@graphty/remote-logger`)

Browser-safe exports for the logging client:

```typescript
import {
    RemoteLogClient,
    createRemoteLogClient
} from "@graphty/remote-logger";

// Types
import type {
    LogEntry,
    RemoteLogClientOptions,
    ThrottlePattern
} from "@graphty/remote-logger";
```

### Server Entry (`@graphty/remote-logger/server`)

Node.js-only exports for the log server:

```typescript
import {
    startLogServer,      // Start server programmatically
    main,                // CLI entry point
    parseArgs,           // Parse CLI arguments
    clearLogs,           // Clear stored logs
    HELP_TEXT,           // CLI help text

    // Certificate utilities
    generateSelfSignedCert,
    certFilesExist,
    readCertFiles,
} from "@graphty/remote-logger/server";

// Types
import type {
    LogServerOptions,
    LogEntry,
    ParseArgsResult,
    GeneratedCert,
} from "@graphty/remote-logger/server";
```

### UI Entry (`@graphty/remote-logger/ui`)

Browser exports for the console capture widget:

```typescript
import {
    ConsoleCaptureUI,
    initConsoleCaptureUI
} from "@graphty/remote-logger/ui";
```

### Client Entry (`@graphty/remote-logger/client`)

Direct client-only imports (same as main entry):

```typescript
import { RemoteLogClient } from "@graphty/remote-logger/client";
```

## License

MIT
