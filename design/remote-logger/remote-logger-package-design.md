# @graphty/remote-logger Package Design

## Executive Summary

This document describes the design for extracting the remote logging transport functionality from `@graphty/graphty-element` into a standalone, reusable npm package called `@graphty/remote-logger`. The package provides a simple mechanism to send log messages to a remote server for viewing and debugging on devices without easy access to developer consoles (iPhone, Meta Quest, etc.).

## Problem Statement

Debugging web applications on devices like iPhones and Meta Quest headsets is challenging because:
1. Developer consoles are difficult or impossible to access
2. USB debugging setup is cumbersome
3. Real-time log monitoring is essential for XR/VR development
4. Multiple projects (graphty-element, bjs-mantine) duplicate the same remote logging infrastructure

## Scope

This package is intentionally simple and focused:

**In Scope:**
- Sending log messages to a remote server
- HTTPS/HTTP log server with terminal output
- Self-signed certificate generation (used by default)
- Console capture UI widget for copy/download/view
- Session-based log grouping
- Log batching and retry logic

**Out of Scope (stays in consuming packages like graphty-element):**
- URL parameter configuration
- Log level filtering
- Module filtering
- Lazy evaluation utilities
- Storage persistence
- Logger facades and hierarchical categories

## Goals

1. **Simple**: Single responsibility - transport logs to a remote server
2. **Zero-config CLI**: Run the log server via `npx` with sensible defaults (including auto-generated self-signed certs)
3. **Lightweight**: Minimal dependencies
4. **Testable**: Comprehensive test coverage

## Package Overview

### Package Name
`@graphty/remote-logger`

### Components

```
@graphty/remote-logger/
├── src/
│   ├── index.ts                    # Main client exports
│   ├── client/
│   │   ├── RemoteLogClient.ts      # Simple client for sending logs
│   │   └── types.ts                # Type definitions
│   ├── server/
│   │   ├── log-server.ts           # HTTPS/HTTP log server
│   │   ├── self-signed-cert.ts     # Self-signed certificate generation
│   │   └── index.ts                # Server exports
│   └── ui/
│       ├── ConsoleCaptureUI.ts     # Floating console capture widget
│       └── index.ts                # UI exports
├── bin/
│   └── remote-log-server.js        # npx CLI entry point
├── test/
│   ├── client/                     # Client-side tests
│   ├── server/                     # Server-side tests
│   └── integration/                # End-to-end tests
└── package.json
```

## API Design

### Client-Side API

#### RemoteLogClient

A simple client for sending log messages to a remote server.

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";

// Create a client
const client = new RemoteLogClient({
    serverUrl: "https://localhost:9080",
    sessionPrefix: "my-app",        // Optional, default: "session"
    batchIntervalMs: 100,           // Optional, default: 100
    maxRetries: 3,                  // Optional, default: 3
    retryDelayMs: 1000,             // Optional, default: 1000
});

// Send a log message
client.log("INFO", "User clicked button", { buttonId: "submit" });
client.log("ERROR", "Failed to load data", { error: err.message });
client.log("DEBUG", "Processing item", { itemId: 123 });

// Flush pending logs (e.g., before page unload)
await client.flush();

// Close the client (flushes and stops batching)
await client.close();
```

#### Type Definitions

```typescript
export interface RemoteLogClientOptions {
    /** URL of the remote log server (e.g., "https://localhost:9080") */
    serverUrl: string;
    /** Prefix for session ID (default: "session") */
    sessionPrefix?: string;
    /** Interval in ms to batch logs before sending (default: 100) */
    batchIntervalMs?: number;
    /** Maximum number of retries on failure (default: 3) */
    maxRetries?: number;
    /** Delay between retries in ms (default: 1000) */
    retryDelayMs?: number;
}

export interface LogEntry {
    /** ISO timestamp */
    time: string;
    /** Log level (e.g., "INFO", "ERROR", "DEBUG", "WARN") */
    level: string;
    /** Log message */
    message: string;
    /** Optional structured data */
    data?: Record<string, unknown>;
}

export interface RemoteLogClient {
    /** Send a log message */
    log(level: string, message: string, data?: Record<string, unknown>): void;
    /** Flush pending logs immediately */
    flush(): Promise<void>;
    /** Close the client */
    close(): Promise<void>;
    /** Get the session ID */
    readonly sessionId: string;
}
```

#### Factory Function

```typescript
import { createRemoteLogClient } from "@graphty/remote-logger";

const client = createRemoteLogClient({
    serverUrl: "https://localhost:9080",
});

client.log("INFO", "Application started");
```

### Server-Side API

#### Programmatic Server Usage

```typescript
import { startLogServer } from "@graphty/remote-logger/server";

// Start with defaults (port 9080, auto-generated self-signed cert)
startLogServer();

// Or with options
startLogServer({
    port: 9085,
    host: "localhost",
    // If certPath/keyPath not provided, self-signed cert is auto-generated
    certPath: "./certs/cert.crt",    // Optional
    keyPath: "./certs/key.key",      // Optional
    logFile: "./logs/output.jsonl",  // Optional
    useHttp: false,                  // Optional, default: false (HTTPS)
    quiet: false,                    // Optional, default: false
});
```

#### CLI Usage (npx)

```bash
# Start with defaults (port 9080, auto-generated self-signed cert)
npx @graphty/remote-logger

# Custom port
npx @graphty/remote-logger --port 9085

# Custom hostname (for certificate generation)
npx @graphty/remote-logger --host dev.example.com

# Custom SSL certificates (overrides auto-generation)
npx @graphty/remote-logger --cert cert.crt --key key.key

# HTTP mode (no SSL) - useful for local development
npx @graphty/remote-logger --http

# Write logs to file (for CI/tools integration)
npx @graphty/remote-logger --log-file ./tmp/logs.jsonl

# Quiet mode (suppress startup banner)
npx @graphty/remote-logger --quiet

# Show help
npx @graphty/remote-logger --help
```

**Default Behavior:**
- Port: 9080
- Host: localhost
- Protocol: HTTPS with auto-generated self-signed certificate
- No log file output (terminal only)

#### Server REST API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/log` | POST | Receive logs from browser |
| `/logs` | GET | Get all logs as JSON |
| `/logs/recent` | GET | Get last N logs (`?n=100`) |
| `/logs/errors` | GET | Get only error logs |
| `/logs/clear` | POST | Clear all logs |
| `/health` | GET | Health check with session count |

#### Log Payload Format

```typescript
// POST /log
{
    "sessionId": "my-app-abc123",
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

### Console Capture UI

A floating widget that captures console output and provides copy/download functionality.

```typescript
import { ConsoleCaptureUI } from "@graphty/remote-logger/ui";

// Initialize the floating UI widget
const captureUI = new ConsoleCaptureUI();

// Or use the convenience function
import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";
initConsoleCaptureUI();

// Access via global methods (for debugging in console)
window.__console__.copy();      // Copy logs to clipboard
window.__console__.download();  // Download as text file
window.__console__.clear();     // Clear captured logs
window.__console__.get();       // Get logs as string
```

The UI widget:
- Intercepts `console.log`, `console.info`, `console.warn`, `console.error`, `console.debug`
- Displays a floating button in the top-right corner
- Shows a menu with Copy, Download, Clear, and Show Logs options
- Works on mobile devices and in XR environments

## Self-Signed Certificate Handling

The server automatically generates self-signed certificates when none are provided:

```typescript
// src/server/log-server.ts
export function startLogServer(options: LogServerOptions = {}): void {
    const useHttp = options.useHttp ?? false;

    if (!useHttp) {
        let cert: string;
        let key: string;

        if (options.certPath && options.keyPath && certFilesExist(options.certPath, options.keyPath)) {
            // Use provided certificates
            ({ cert, key } = readCertFiles(options.certPath, options.keyPath));
        } else {
            // Auto-generate self-signed certificate
            const hostname = options.host ?? "localhost";
            ({ cert, key } = generateSelfSignedCert(hostname));
            console.log(`Generated self-signed certificate for ${hostname}`);
            console.log("Note: Browser will show certificate warning - this is expected");
        }

        // Create HTTPS server with cert/key
        server = https.createServer({ cert, key }, handleRequest);
    } else {
        // Plain HTTP
        server = http.createServer(handleRequest);
    }
}
```

The generated certificate:
- Valid for 365 days
- Includes Subject Alternative Names for the hostname, localhost, 127.0.0.1, and ::1
- Uses SHA-256 signature algorithm
- 2048-bit RSA key

## Testing Strategy

### Unit Tests (Node.js Environment)

| Component | Test Focus |
|-----------|------------|
| `RemoteLogClient` | Batching, retry logic, session ID generation |
| `log-server` | Request handling, CORS, log storage |
| `self-signed-cert` | Certificate generation, file reading |
| `ConsoleCaptureUI` | Console interception, formatting |

```typescript
// Example: RemoteLogClient batching test
describe("RemoteLogClient", () => {
    let fetchSpy: MockInstance;

    beforeEach(() => {
        fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
            new Response(JSON.stringify({ success: true }), { status: 200 })
        );
        vi.useFakeTimers();
    });

    test("should batch logs before sending", () => {
        const client = new RemoteLogClient({ serverUrl: "https://example.com" });

        client.log("INFO", "Message 1");
        client.log("INFO", "Message 2");
        client.log("INFO", "Message 3");

        // Not sent yet
        expect(fetchSpy).not.toHaveBeenCalled();

        // After batch interval
        vi.runAllTimers();

        expect(fetchSpy).toHaveBeenCalledTimes(1);
        const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
        expect(body.logs).toHaveLength(3);
    });

    test("should generate unique session ID", () => {
        const client1 = new RemoteLogClient({ serverUrl: "https://example.com" });
        const client2 = new RemoteLogClient({ serverUrl: "https://example.com" });

        expect(client1.sessionId).not.toBe(client2.sessionId);
    });

    test("should retry on failure", async () => {
        fetchSpy.mockRejectedValueOnce(new Error("Network error"));
        fetchSpy.mockResolvedValueOnce(
            new Response(JSON.stringify({ success: true }), { status: 200 })
        );

        const client = new RemoteLogClient({
            serverUrl: "https://example.com",
            maxRetries: 3,
            retryDelayMs: 100,
        });

        client.log("INFO", "Test message");
        await vi.runAllTimersAsync();

        expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
});
```

### Server Tests

```typescript
describe("Log Server", () => {
    let server: http.Server;
    let port: number;

    beforeEach(async () => {
        port = 9000 + Math.floor(Math.random() * 99);
        server = startLogServer({ port, useHttp: true, quiet: true });
    });

    afterEach((done) => {
        server.close(done);
    });

    test("should receive and store logs", async () => {
        const response = await fetch(`http://localhost:${port}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sessionId: "test-session",
                logs: [{ time: new Date().toISOString(), level: "INFO", message: "Test" }],
            }),
        });

        expect(response.status).toBe(200);

        const logsResponse = await fetch(`http://localhost:${port}/logs`);
        const logs = await logsResponse.json();
        expect(logs["test-session"]).toHaveLength(1);
    });

    test("should handle CORS preflight", async () => {
        const response = await fetch(`http://localhost:${port}/log`, {
            method: "OPTIONS",
        });

        expect(response.status).toBe(204);
        expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });

    test("should auto-generate self-signed cert when none provided", () => {
        // Start server without cert options (HTTPS mode)
        const httpsServer = startLogServer({ port: port + 1, quiet: true });
        // Server should start successfully with auto-generated cert
        expect(httpsServer).toBeDefined();
        httpsServer.close();
    });
});
```

### Integration Tests (Playwright)

```typescript
describe("Integration", () => {
    let server: http.Server;
    const port = 9080;

    beforeAll(() => {
        server = startLogServer({ port, useHttp: true, quiet: true });
    });

    afterAll((done) => {
        server.close(done);
    });

    test("should send logs from browser to server", async ({ page }) => {
        await page.goto("/test-page.html");

        // Create client and send log
        await page.evaluate((serverUrl) => {
            const client = new window.RemoteLogClient({ serverUrl });
            client.log("INFO", "Test from browser", { key: "value" });
            return client.flush();
        }, `http://localhost:${port}`);

        // Verify log received
        const response = await fetch(`http://localhost:${port}/logs/recent?n=1`);
        const data = await response.json();
        expect(data.logs[0].message).toContain("Test from browser");
    });
});
```

## Migration Guide

### From graphty-element

**Before (current graphty-element RemoteSink):**
```typescript
// Internal sink used by GraphtyLogger
import { createRemoteSink } from "@graphty/graphty-element/logging/sinks/RemoteSink";

const sink = createRemoteSink({
    serverUrl: "https://localhost:9080",
    sessionPrefix: "graphty",
});

// Used internally by GraphtyLogger
sink.write(logRecord);
```

**After (using @graphty/remote-logger):**
```typescript
// In graphty-element's RemoteSink implementation
import { RemoteLogClient } from "@graphty/remote-logger";

export function createRemoteSink(options: RemoteSinkOptions): Sink {
    const client = new RemoteLogClient({
        serverUrl: options.serverUrl,
        sessionPrefix: options.sessionPrefix ?? "graphty",
        batchIntervalMs: options.batchIntervalMs,
        maxRetries: options.maxRetries,
        retryDelayMs: options.retryDelayMs,
    });

    return {
        name: "remote",
        write(record: LogRecord): void {
            const message = formatRecord(record);  // graphty-element's formatting
            client.log(
                LOG_LEVEL_TO_NAME[record.level],
                message,
                record.data
            );
        },
        async flush(): Promise<void> {
            await client.flush();
        },
    };
}
```

### From bjs-mantine

**Before:**
```bash
# Custom log server script
npm run log-server
# Which runs: tsx bin/log-server.ts --port 9077 ...
```

**After:**
```bash
# Use the package directly
npx @graphty/remote-logger --port 9077 --host dev.ato.ms --cert ... --key ...
```

Or in package.json:
```json
{
    "scripts": {
        "log-server": "remote-log-server --port 9077 --host dev.ato.ms --cert $CERT_PATH --key $KEY_PATH"
    },
    "dependencies": {
        "@graphty/remote-logger": "workspace:*"
    }
}
```

## Package Configuration

### package.json

```json
{
    "name": "@graphty/remote-logger",
    "version": "1.0.0",
    "description": "Remote logging transport for browser debugging on devices without developer console access",
    "type": "module",
    "main": "./dist/index.cjs",
    "module": "./dist/index.js",
    "types": "./dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "import": "./dist/index.js",
            "require": "./dist/index.cjs"
        },
        "./server": {
            "types": "./dist/server/index.d.ts",
            "import": "./dist/server/index.js",
            "require": "./dist/server/index.cjs"
        },
        "./ui": {
            "types": "./dist/ui/index.d.ts",
            "import": "./dist/ui/index.js",
            "require": "./dist/ui/index.cjs"
        }
    },
    "bin": {
        "remote-log-server": "./bin/remote-log-server.js"
    },
    "files": [
        "dist/",
        "bin/",
        "README.md",
        "LICENSE"
    ],
    "keywords": [
        "logging",
        "remote",
        "debugging",
        "console",
        "vr",
        "xr",
        "mobile"
    ],
    "dependencies": {
        "selfsigned": "^2.4.1"
    },
    "devDependencies": {
        "typescript": "^5.0.0",
        "vite": "^6.0.0",
        "vitest": "^3.0.0",
        "@vitest/browser": "^3.0.0",
        "playwright": "^1.40.0"
    }
}
```

### Dependencies

**Runtime Dependencies:**
- `selfsigned` - Self-signed certificate generation for HTTPS

**No other runtime dependencies** - the package is intentionally lightweight.

## Monorepo Integration

### Package Location

```
graphty-monorepo/
├── algorithms/
├── layout/
├── graphty-element/
├── graphty/
├── remote-logger/           # NEW PACKAGE
│   ├── src/
│   │   ├── index.ts
│   │   ├── client/
│   │   │   ├── RemoteLogClient.ts
│   │   │   └── types.ts
│   │   ├── server/
│   │   │   ├── log-server.ts
│   │   │   ├── self-signed-cert.ts
│   │   │   └── index.ts
│   │   └── ui/
│   │       ├── ConsoleCaptureUI.ts
│   │       └── index.ts
│   ├── bin/
│   │   └── remote-log-server.js
│   ├── test/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   └── vitest.config.ts
└── pnpm-workspace.yaml
```

### pnpm-workspace.yaml Update

```yaml
packages:
  - "algorithms"
  - "layout"
  - "graphty-element"
  - "graphty"
  - "remote-logger"
```

### Dependency Graph

```
@graphty/remote-logger  (independent, no internal dependencies)
        ↑
@graphty/graphty-element (uses remote-logger for RemoteSink)
        ↑
@graphty/graphty
```

## File Mapping from Existing Code

| Original File (graphty-element) | New File (remote-logger) | Notes |
|--------------------------------|--------------------------|-------|
| `src/logging/sinks/RemoteSink.ts` | `src/client/RemoteLogClient.ts` | Simplified, no LogRecord dependency |
| `src/logging/server/log-server.ts` | `src/server/log-server.ts` | Mostly unchanged |
| `src/logging/server/self-signed-cert.ts` | `src/server/self-signed-cert.ts` | Unchanged |
| `.storybook/console-capture-ui.ts` | `src/ui/ConsoleCaptureUI.ts` | Cleaned up, standalone |

**Files that stay in graphty-element:**
- `src/logging/GraphtyLogger.ts` - Logger facade
- `src/logging/LoggerConfig.ts` - Configuration
- `src/logging/URLParamParser.ts` - URL parameters
- `src/logging/LazyEval.ts` - Lazy evaluation
- `src/logging/storage.ts` - Session storage
- `src/logging/types.ts` - LogRecord, Sink interfaces
- `src/logging/sinks/ConsoleSink.ts` - Console output

## Summary

The `@graphty/remote-logger` package is a focused, simple tool that:

1. **Client**: Sends log messages to a remote server with batching and retry
2. **Server**: Receives and displays logs in the terminal, with auto-generated HTTPS certificates
3. **UI**: Provides a floating widget for capturing and exporting console logs

All the sophisticated logging features (filtering, levels, URL params, lazy eval) remain in the consuming packages where they belong. This package just handles the transport.
