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
  --mcp-only              Start only MCP server (no HTTP)
  --http-only             Start only HTTP server (no MCP)
  --help                  Show help message

Examples:
  npx remote-log-server                           # Dual mode: HTTP + MCP (default)
  npx remote-log-server --http --port 9080        # HTTP on port 9080 + MCP
  npx remote-log-server --mcp-only                # MCP only (for Claude Code)
  npx remote-log-server --http-only               # HTTP only (legacy mode)
  npx remote-log-server --cert cert.pem --key key.pem  # Custom SSL certs
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `REMOTE_LOG_RETENTION_DAYS` | `7` | Number of days to retain logs before cleanup |

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
| `projectMarker` | `string` | auto | Project identifier for filtering (auto-detected from Vite globals) |
| `worktreePath` | `string` | auto | Full worktree path for debugging (auto-detected from Vite globals) |

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

## MCP Server (Claude Code Integration)

The remote-logger includes a Model Context Protocol (MCP) server that allows Claude Code to directly query and manage logs. This enables AI-assisted debugging by letting Claude Code see browser console output in real-time.

### Setup with Claude Code

Add the following to your Claude Code MCP configuration (`~/.config/claude-code/mcp.json` or project settings):

```json
{
  "mcpServers": {
    "remote-logger": {
      "command": "npx",
      "args": ["remote-log-server", "--mcp-only"]
    }
  }
}
```

Or if installed globally:

```json
{
  "mcpServers": {
    "remote-logger": {
      "command": "remote-log-server",
      "args": ["--mcp-only"]
    }
  }
}
```

### Dual Mode (HTTP + MCP)

By default, the server runs in dual mode with both HTTP and MCP interfaces sharing the same log storage. This allows browsers to send logs via HTTP while Claude Code queries them via MCP.

```bash
# Start dual server (HTTP + MCP)
npx remote-log-server --http --port 9080
```

### MCP Tools

The MCP server provides 9 tools for log management:

#### `logs_get_recent`

Get recent logs from the server, sorted by time (oldest first).

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `count` | `number` | `50` | Number of logs to return (max 500) |
| `projectMarker` | `string` | - | Filter by project marker |
| `workingDirectory` | `string` | - | Derive marker from path (e.g., `/path/.worktrees/my-branch`) |
| `level` | `string` | - | Filter by log level (ERROR, WARN, INFO, DEBUG) |
| `since` | `string` | - | Only logs after this ISO timestamp |

**Example usage in Claude Code:**
> "Show me the last 20 logs from the graphty-element project"

#### `logs_status`

Get the status of the remote log server.

**Returns:**
- Server status, uptime, session count, log count, error count, memory usage
- HTTP endpoint configuration (port, host, protocol, full URL for browser clients)
- Retention settings (how long logs are kept before automatic cleanup)

**Example usage:**
> "What is the status of the remote logger?"
> "What URL should I use to configure the browser client?"
> "How long are logs retained?"

#### `logs_list_sessions`

List all logging sessions with their metadata.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectMarker` | `string` | Filter by project marker |
| `hasErrors` | `boolean` | Only show sessions with errors |

**Returns:** Array of sessions with:
- `sessionId`, `projectMarker`, `worktreePath`, `pageUrl`
- `firstLogTime`, `lastLogTime`, `logCount`, `errorCount`

**Example usage:**
> "List all logging sessions that have errors"

#### `logs_receive`

Store logs from a browser or application session.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `sessionId` | `string` | Yes | Unique session identifier |
| `logs` | `array` | Yes | Array of log entries |
| `projectMarker` | `string` | No | Project identifier |
| `worktreePath` | `string` | No | Full worktree path |
| `pageUrl` | `string` | No | Browser page URL |

#### `logs_get_all`

Get all logs grouped by session.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectMarker` | `string` | Filter by project marker |

**Returns:** Object mapping session IDs to log arrays

#### `logs_get_errors`

Get only ERROR level logs.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectMarker` | `string` | Filter by project marker |
| `since` | `string` | Only errors after this timestamp |

**Example usage:**
> "Show me all errors from the current project"

#### `logs_clear`

Clear logs from the server.

**Parameters:**
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `confirm` | `boolean` | Yes | Must be `true` to proceed |
| `projectMarker` | `string` | No | Only clear this project's logs |
| `sessionId` | `string` | No | Only clear this session's logs |

**Example usage:**
> "Clear all logs for the remote-logging project, confirm"

#### `logs_search`

Search logs by text pattern.

**Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `query` | `string` | required | Search text or regex pattern |
| `regex` | `boolean` | `false` | Treat query as regex |
| `projectMarker` | `string` | - | Filter by project |
| `level` | `string` | - | Filter by log level |
| `limit` | `number` | `100` | Max results (max 1000) |

**Example usage:**
> "Search the logs for 'connection failed'"
> "Search logs for any network errors using regex 'network|timeout|connection'"

#### `logs_get_file_path`

Get the file path to the JSONL log file for a project.

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `projectMarker` | `string` | Project marker |
| `workingDirectory` | `string` | Derive marker from path |

**Returns:** File path, existence status, and size

**Example usage:**
> "Get the log file path for this project so I can grep it"

This tool is useful for accessing logs via file-based tools like `Grep` or `Read` when you need more advanced searching capabilities.

### Project Markers

Project markers allow you to filter logs by project, which is especially useful in monorepos or when working with multiple projects simultaneously.

Markers are determined in the following priority:
1. Explicit `projectMarker` parameter
2. Derived from `workingDirectory` path (extracts from `.worktrees/` or uses basename)
3. Extracted from `sessionId` prefix (e.g., `graphty-element-123-abc` → `graphty-element`)
4. Default: `"default"`

### JSONL File Organization

Logs are streamed to JSONL files organized by project marker:

```
{tmpdir}/remote-logger/
├── graphty-element/
│   └── logs.jsonl
├── remote-logging/
│   └── logs.jsonl
└── default/
    └── logs.jsonl
```

## ConsoleCaptureUI

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

### Vite Integration (Automatic Project Markers)

Use the Vite plugin to automatically inject project markers into your browser builds:

```typescript
// vite.config.ts
import { defineConfig } from "vite";
import { remoteLoggerPlugin } from "@graphty/remote-logger/vite";

export default defineConfig({
    plugins: [remoteLoggerPlugin()],
});
```

The plugin automatically:
- Detects if you're in a git worktree (e.g., `.worktrees/my-feature`) and uses the worktree name as the marker
- Falls back to the project directory basename for regular projects
- Injects `__REMOTE_LOG_PROJECT_MARKER__` and `__REMOTE_LOG_WORKTREE_PATH__` globals

The `RemoteLogClient` automatically reads these globals when available:

```typescript
// These are injected by the Vite plugin
declare const __REMOTE_LOG_PROJECT_MARKER__: string | undefined;
declare const __REMOTE_LOG_WORKTREE_PATH__: string | undefined;

// Client reads them automatically
const client = new RemoteLogClient({
    serverUrl: "http://localhost:9080",
    // projectMarker and worktreePath are auto-detected!
});
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
    projectMarker?: string;    // Project identifier for filtering
    worktreePath?: string;     // Full path for debugging
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

### Vite Entry (`@graphty/remote-logger/vite`)

Vite plugin for automatic project marker injection:

```typescript
import { remoteLoggerPlugin } from "@graphty/remote-logger/vite";
```

## Log Retention

Logs are automatically cleaned up after a configurable retention period (default: 7 days). This applies to both in-memory logs and JSONL files.

### Configuration

Set retention via environment variable:

```bash
export REMOTE_LOG_RETENTION_DAYS=3
npx remote-log-server
```

Or programmatically:

```typescript
import { LogStorage } from "@graphty/remote-logger/server";

const storage = new LogStorage({
    retentionDays: 3,           // Keep logs for 3 days
    cleanupIntervalMs: 3600000, // Check every hour (default)
});
```

### How It Works

1. **Memory cleanup**: Individual logs older than the retention period are removed. Sessions with no remaining logs are deleted entirely.

2. **JSONL cleanup**: Project directories whose files haven't been modified within the retention period are removed.

3. **Automatic scheduling**: Cleanup runs automatically at the configured interval (default: 1 hour).

4. **Graceful shutdown**: Call `storage.stopCleanupTimer()` when shutting down to prevent memory leaks.

## License

MIT

