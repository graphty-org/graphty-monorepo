# The server

## Command line

```
Usage:
  npx remote-log-server [options]

Options:
  --port, -p <port>       Port to listen on (default: PORT, else 9080)
  --host, -h <host>       Hostname to bind to (default: 0.0.0.0)
  --cert, -c <path>       Path to SSL certificate file (enables HTTPS)
  --key, -k <path>        Path to SSL private key file (enables HTTPS)
  --log-file, -l <path>   Write logs to file (JSONL format)
  --quiet, -q             Suppress startup banner
  --mcp-only              Start only MCP server (no HTTP)
  --http-only             Start only HTTP server (no MCP)
  --help                  Show help message

Protocol:
  HTTP is used by default. To use HTTPS, provide both --cert and --key.

Examples:
  npx remote-log-server                                # Dual mode: HTTP + MCP (default)
  npx remote-log-server --port 9080                    # HTTP on port 9080 + MCP
  npx remote-log-server --mcp-only                     # MCP only (for Claude Code)
  npx remote-log-server --http-only                    # HTTP only (legacy mode)
  npx remote-log-server --cert cert.pem --key key.pem  # Use HTTPS with custom certs
```

`--port` must be a whole number from 1 to 65535. Any other value (for example `--port 90a0`)
stops the server at startup with an error naming the option and the value, rather than
listening on a different port.

A port you choose, with `--port` or the `PORT` environment variable, is the port the server
listens on: if it is already in use, the server stops at startup with an error naming the port,
rather than moving to another one. Only with no port given does it start at 9080 and move up to
the next free port. `--port` wins over `PORT`.

To run it under a process manager that assigns ports through `PORT`, such as servherd:

```jsonc
servherd_start({ name: "remote-logger", command: "npx remote-log-server --http-only",
  env: { PORT: "{{port}}" } })
```

### Environment Variables

| Variable                    | Default | Description                                                     |
| --------------------------- | ------- | --------------------------------------------------------------- |
| `REMOTE_LOG_RETENTION_DAYS` | `7`     | Number of days to retain logs before cleanup (whole number, 1+) |
| `PORT`                      | `9080`  | Port to listen on, as `--port` (whole number, 1 to 65535)       |

A `REMOTE_LOG_RETENTION_DAYS` that is not a whole number of at least 1 (for example `seven` or
`0`) stops the server at startup with an error naming the variable and the value.

## startLogServer

Start the log server from your own Node program. It returns the Node `http.Server` (or
`https.Server`), so you can wait for `"listening"` and call `close()`:

```typescript
import { startLogServer } from "@graphty/remote-logger/server";

const server = startLogServer({ port: 9080, quiet: true });
```

### Options

| Option     | Type      | Default     | Description                                                    |
| ---------- | --------- | ----------- | -------------------------------------------------------------- |
| `port`     | `number`  | `9080`      | Port to listen on; `0` picks any free port                     |
| `host`     | `string`  | `"0.0.0.0"` | Address to listen on; `0.0.0.0` is every network address       |
| `certPath` | `string`  | -           | Path to a TLS certificate; with `keyPath`, the server is HTTPS |
| `keyPath`  | `string`  | -           | Path to the certificate's private key                          |
| `logFile`  | `string`  | -           | Also append every log line to this file, as JSONL              |
| `quiet`    | `boolean` | `false`     | Do not print the startup banner                                |

## Node.js Custom Server Integration

```typescript
import { startLogServer, clearLogs } from "@graphty/remote-logger/server";
import type { Server } from "http";

// Start server and store reference
const server: Server = startLogServer({
    port: 9080,
    quiet: true, // Suppress banner for programmatic use
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

## REST API Endpoints

| Endpoint            | Method | Description                           |
| ------------------- | ------ | ------------------------------------- |
| `/log`              | POST   | Receive logs from client              |
| `/remote-logger.js` | GET    | Browser-ready auto-config script      |
| `/proxy/<url>`      | \*     | Reverse proxy with script injection   |
| `/logs`             | GET    | Get all logs by session               |
| `/logs/recent`      | GET    | Get recent logs (`?n=50&errors=true`) |
| `/logs/errors`      | GET    | Get error-level logs only             |
| `/logs/clear`       | POST   | Clear all stored logs                 |
| `/health`           | GET    | Health check                          |

### POST /log

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

### GET /logs

Returns all logs grouped by session.

**Response:**

```json
{
    "myapp-abc123": [{ "time": "2024-01-15T10:30:00Z", "level": "INFO", "message": "Hello" }],
    "myapp-def456": [{ "time": "2024-01-15T10:31:00Z", "level": "DEBUG", "message": "Debug msg" }]
}
```

### GET /logs/recent

Returns recent logs across all sessions, sorted by time.

**Query parameters:**

- `n` (optional): Number of logs to return, a whole number of at least 1 (default: 50 when
  missing or empty). Any other value (for example `n=abc` or `n=0`) answers `400` with a JSON
  `error` message naming the parameter and the value.
- `errors` (optional): Set to `true` to return only error-level logs

**Response:**

```json
{
    "total": 150,
    "showing": 50,
    "logs": [{ "sessionId": "myapp-abc123", "time": "...", "level": "INFO", "message": "..." }]
}
```

### GET /logs/errors

Returns only error-level logs across all sessions.

**Response:**

```json
{
    "total": 5,
    "logs": [{ "sessionId": "myapp-abc123", "time": "...", "level": "ERROR", "message": "..." }]
}
```

### POST /logs/clear

Clears all stored logs from memory.

**Response:**

```json
{ "success": true }
```

### GET /health

Health check endpoint for monitoring.

**Response:**

```json
{ "status": "ok", "sessions": 3 }
```

## HTTPS Certificates

The server speaks plain HTTP unless you give it a certificate and its key (`--cert` and `--key`,
or `certPath` and `keyPath`); then it speaks HTTPS. A page served over HTTPS can only send logs to
an HTTPS server, so give the server a certificate the browser trusts when the page is HTTPS (a
WebXR page always is).

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
{ "time": "2024-01-15T10:30:00Z", "sessionId": "myapp-abc123", "level": "INFO", "message": "Hello" }
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
    retentionDays: 3, // Keep logs for 3 days
    cleanupIntervalMs: 3600000, // Check every hour (default)
});
```

### How It Works

1. **Memory cleanup**: Individual logs older than the retention period are removed. Sessions with no remaining logs are deleted entirely.

2. **JSONL cleanup**: Project directories whose files haven't been modified within the retention period are removed.

3. **Automatic scheduling**: Cleanup runs automatically at the configured interval (default: 1 hour).

4. **Graceful shutdown**: Call `storage.stopCleanupTimer()` when shutting down to prevent memory leaks.
