# Code Review Report - 1/8/2026

## Executive Summary
- **Files reviewed**: 27 production source files (ALL source files in remote-logger)
- **Critical issues**: 0
- **High priority issues**: 3
- **Medium priority issues**: 4
- **Low priority issues**: 4

The remote-logger package is well-structured with clean separation between client, server, MCP, and Vite plugin components. The codebase demonstrates good TypeScript practices and thoughtful API design. The main areas for improvement relate to localhost vs IP address handling edge cases and potential race conditions in the port scanning logic.

---

## File Inventory

### Production Code (src/)
| Category | Files |
|----------|-------|
| Server | `log-server.ts`, `dual-server.ts`, `log-storage.ts`, `jsonl-writer.ts`, `self-signed-cert.ts`, `marker-utils.ts` |
| Client | `RemoteLogClient.ts`, `types.ts`, `index.ts` |
| MCP | `mcp-server.ts`, `logs-*.ts` (9 tool files) |
| Vite | `plugin.ts`, `index.ts` |
| UI | `ConsoleCaptureUI.ts`, `index.ts` |

### Configuration Files
- `package.json`, `tsconfig.json`, `vitest.config.ts`

---

## High Priority Issues (Fix Soon)

### 1. Race Condition in Port Scanning Logic
- **Files**: `src/server/dual-server.ts:45-68`, `src/server/dual-server.ts:221-247`
- **Description**: There's a potential race condition between `isPortAvailable()` checking if a port is free and the actual `server.listen()` call. Another process could claim the port in between.

```typescript
// dual-server.ts:89
if (await isPortAvailable(port, host)) {
    // ... port could be claimed here by another process ...
    return port;
}
```

- **Impact**: In environments with multiple concurrent server starts, the server could fail with EADDRINUSE despite the port scan succeeding.
- **Fix**: The current code does handle this case with an error message at lines 224-232, but the error message is misleading ("This shouldn't happen after port scanning - there may be a race condition"). Consider:

```typescript
// Option 1: Retry with next port on EADDRINUSE during listen
serverToStart.on("error", (err: NodeJS.ErrnoException) => {
    if (err.code === "EADDRINUSE") {
        // Instead of failing, try the next port
        return tryNextPort(portToUse + 1, httpHost, resolve, reject);
    }
    reject(err);
});

// Option 2: Use port 0 to let OS assign an available port (if fixed port not required)
```

### 2. internalIpV4Sync May Return undefined on Some Systems
- **Files**: `src/server/dual-server.ts:264-268`
- **Description**: The fallback chain for `endpointHost` when bound to `0.0.0.0` uses `internalIpV4Sync()` which can return `undefined` on systems without a configured network interface.

```typescript
// dual-server.ts:267
endpointHost = internalIpV4Sync() ?? os.hostname() ?? "localhost";
```

- **Impact**: `os.hostname()` returns a hostname string that may not be resolvable from other machines. The resulting endpoint URL could be unusable.
- **Fix**: Consider also checking if the hostname is resolvable, or defaulting directly to `127.0.0.1` for local-only usage:

```typescript
// Prefer IP for reliable connectivity
const internalIp = internalIpV4Sync();
if (internalIp) {
    endpointHost = internalIp;
} else {
    // Fallback for local-only use
    endpointHost = "127.0.0.1";
    if (!quiet) {
        console.warn("Could not detect LAN IP. Endpoint will only work locally.");
    }
}
```

### 3. ConsoleCaptureUI Exposes Mutable Internal State via window.__console__
- **Files**: `src/ui/ConsoleCaptureUI.ts:314-327`, `src/ui/ConsoleCaptureUI.ts:551-555`
- **Description**: The `setupGlobalMethods()` function exposes the internal `this.logs` array directly via `window.__console__.logs`. This has two problems:
  1. External code can mutate the internal array
  2. When `clearLogs()` is called, it reassigns `this.logs = []`, but `window.__console__.logs` still references the old (orphaned) array

```typescript
// ConsoleCaptureUI.ts:325 - Direct reference to internal array
window.__console__ = {
    // ...
    logs: this.logs,  // Problem: external mutation possible
};

// ConsoleCaptureUI.ts:551-552 - Breaks the reference
clearLogs(): void {
    this.logs = [];  // window.__console__.logs now points to old array!
    // ...
}
```

- **Impact**: After calling `clearLogs()`, `window.__console__.logs` will be stale and show old data. External mutations could corrupt internal state.
- **Fix**: Use a getter or copy the array:

```typescript
// Option 1: Use getter (live but read-only)
Object.defineProperty(window.__console__, 'logs', {
    get: () => [...this.logs],  // Return copy
    enumerable: true,
});

// Option 2: In clearLogs(), update the reference
clearLogs(): void {
    this.logs.length = 0;  // Mutate in place instead of reassigning
    // ...
}
```

---

## Medium Priority Issues (Technical Debt)

### 1. Inconsistent Endpoint Path in SERVER_INSTRUCTIONS
- **Files**: `src/mcp/mcp-server.ts:85-86`, `src/mcp/mcp-server.ts:113`
- **Description**: The MCP server instructions document the endpoint as `/logs` in some places but the actual endpoint is `/log` (singular).

```typescript
// mcp-server.ts:85-86 (incorrect)
"Browser App → HTTP POST to /logs → Log Server"

// mcp-server.ts:113 (incorrect)
'fetch("http://localhost:9080/logs", {'

// Actual endpoint in log-server.ts:216 (correct)
if (url === "/log" && req.method === "POST") {
```

- **Impact**: Users following the documentation will get 404 errors.
- **Fix**: Update the MCP server instructions to use `/log`:

```typescript
"Browser App → HTTP POST to /log → Log Server"
// and
'fetch("http://localhost:9080/log", {'
```

### 2. Duplicate SIGINT Handlers in main()
- **Files**: `src/server/log-server.ts:525-541`, `src/server/log-server.ts:698-704`, `src/server/log-server.ts:724-730`, `src/server/log-server.ts:750-756`
- **Description**: The `main()` function sets up duplicate SIGINT handlers for each mode branch. The handler at line 525 is for `startLogServer()` (legacy), while three more handlers are set for the dual server modes.

- **Impact**: Multiple SIGINT handlers could cause unexpected behavior during shutdown.
- **Fix**: Register a single SIGINT handler at the end of `main()` after determining which server was created:

```typescript
let shutdownFn: () => Promise<void>;

if (options.mcpOnly) {
    const dualServer = await createDualServer({ ... });
    shutdownFn = dualServer.shutdown;
} else if (options.httpOnly) {
    // ...
}

process.on("SIGINT", () => {
    console.log("\nShutting down...");
    void shutdownFn().then(() => process.exit(0));
});
```

### 3. No Timeout on Client HTTP Requests
- **Files**: `src/client/RemoteLogClient.ts:234-264`
- **Description**: The `sendRequest()` method uses `fetch()` without a timeout. If the server is unresponsive, the client will hang indefinitely.

```typescript
// RemoteLogClient.ts:253
const response = await fetch(`${this.serverUrl}/log`, {
    method: "POST",
    // No AbortController/timeout
});
```

- **Impact**: Browser tabs could hang if the log server becomes unresponsive.
- **Fix**: Add an AbortController with a configurable timeout:

```typescript
private async sendRequest(logs: LogEntry[]): Promise<void> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
        const response = await fetch(`${this.serverUrl}/log`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: controller.signal,
        });
        // ...
    } finally {
        clearTimeout(timeout);
    }
}
```

### 4. HTTPS Configuration Only Works with Pre-existing Certificates
- **Files**: `src/server/log-server.ts:450-468`, `src/server/dual-server.ts:251`
- **Description**: The code has a `generateSelfSignedCert()` function in `self-signed-cert.ts` but it's never called. HTTPS is only enabled if valid cert files already exist.

```typescript
// log-server.ts:450
const useHttps = certPath && keyPath && certFilesExist(certPath, keyPath);
```

- **Impact**: Users expecting auto-generated certs (as hinted by the generateSelfSignedCert function) won't get HTTPS unless they manually provide certs.
- **Documentation**: The behavior is correct (browsers reject self-signed certs anyway), but the unused function is confusing. Consider:
  - Removing `generateSelfSignedCert()` if not needed
  - Or documenting when it would be used (e.g., testing, non-browser clients)

---

## Low Priority Issues (Nice to Have)

### 1. Module-level Mutable State in log-server.ts
- **Files**: `src/server/log-server.ts:28-30`, `src/server/log-server.ts:114`
- **Description**: `sharedStorage`, `sharedJsonlWriter`, and `logFileStream` are module-level mutable variables. This makes testing harder and could cause issues if multiple servers are created.

### 2. Hardcoded Port Range Limits
- **Files**: `src/server/dual-server.ts:37`
- **Description**: `MAX_PORT_NUMBER = 9099` is hardcoded per project guidelines, but this isn't configurable. Users outside this project can't change it.

### 3. Synchronous File Operations in JsonlWriter
- **Files**: `src/server/jsonl-writer.ts:185-216`
- **Description**: Uses `fs.openSync()`, `fs.writeSync()`, `fs.mkdirSync()` which block the event loop. For high-throughput logging, this could cause latency spikes.

### 4. Incomplete MCP Tool Exports from mcp/index.ts
- **Files**: `src/mcp/index.ts:9-25`
- **Description**: The `mcp/index.ts` only exports 3 of the 9 available tools (logsGetRecent, logsListSessions, logsStatus). The other 6 tools (logsClear, logsGetAll, logsGetErrors, logsGetFilePath, logsReceive, logsSearch) are available in `tools/index.ts` but not re-exported.
- **Impact**: Users importing from `@graphty/remote-logger/mcp` cannot access all tool handlers directly. They must import from the deeper `tools/index.js` path.
- **Note**: This may be intentional if only certain tools are meant for public API, but it should be documented.

---

## Positive Findings

1. **Clean API Design**: The separation between client, server, MCP, and Vite plugin is well thought out. Export paths in `package.json` are well-organized.

2. **Thorough TypeScript Types**: All interfaces are well-documented with JSDoc comments. No use of `any` types in production code.

3. **Graceful Degradation**: The client handles network failures with exponential backoff retry logic (`sendWithRetry()`).

4. **Project Marker Resolution**: The `marker-utils.ts` implementation handles git worktrees elegantly with a clear priority chain.

5. **Memory Management**: Log retention with configurable cleanup (`cleanupExpiredLogs()`) prevents unbounded memory growth.

6. **MCP Tool Descriptions**: Each tool has detailed descriptions that help LLMs understand when and how to use them.

---

## Recommendations

1. **Fix the `/logs` vs `/log` documentation mismatch** - This will cause immediate user confusion (Medium Priority #1).

2. **Fix ConsoleCaptureUI stale reference bug** - `window.__console__.logs` becomes stale after `clearLogs()` is called (High Priority #3).

3. **Add request timeout to RemoteLogClient** - Prevents browser hangs if server is unresponsive (Medium Priority #3).

4. **Improve port scanning resilience** - Either retry on EADDRINUSE during listen, or use OS-assigned ports for development (High Priority #1).

5. **Consider the IP address fallback** - The current fallback to `os.hostname()` may not work in all network configurations (High Priority #2).

6. **Consolidate SIGINT handling** - Single handler is cleaner and avoids potential issues (Medium Priority #2).

---

## Complete File Inventory

### Files Reviewed (27 total)

**Client (3 files)**
- `src/client/index.ts` - Clean export file
- `src/client/types.ts` - Clean type definitions
- `src/client/RemoteLogClient.ts` - Main client implementation

**Server (7 files)**
- `src/server/index.ts` - Clean export file
- `src/server/log-server.ts` - HTTP server implementation
- `src/server/dual-server.ts` - HTTP + MCP orchestration
- `src/server/log-storage.ts` - In-memory log storage
- `src/server/jsonl-writer.ts` - File persistence
- `src/server/self-signed-cert.ts` - Certificate utilities
- `src/server/marker-utils.ts` - Project marker resolution

**MCP (12 files)**
- `src/mcp/index.ts` - Partial exports (see Low Priority #4)
- `src/mcp/mcp-server.ts` - MCP server setup
- `src/mcp/tools/index.ts` - All tool exports
- `src/mcp/tools/logs-status.ts` - Status tool
- `src/mcp/tools/logs-get-recent.ts` - Recent logs tool
- `src/mcp/tools/logs-get-all.ts` - All logs tool
- `src/mcp/tools/logs-get-errors.ts` - Error logs tool
- `src/mcp/tools/logs-list-sessions.ts` - Sessions tool
- `src/mcp/tools/logs-receive.ts` - Log ingestion tool
- `src/mcp/tools/logs-clear.ts` - Clear logs tool
- `src/mcp/tools/logs-search.ts` - Search tool
- `src/mcp/tools/logs-get-file-path.ts` - File path tool

**UI (2 files)**
- `src/ui/index.ts` - Clean export file
- `src/ui/ConsoleCaptureUI.ts` - Console capture widget

**Vite (2 files)**
- `src/vite/index.ts` - Clean export file
- `src/vite/plugin.ts` - Vite plugin implementation

**Root (1 file)**
- `src/index.ts` - Main package entry point
