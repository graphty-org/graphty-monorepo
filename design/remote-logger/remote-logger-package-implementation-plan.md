# Implementation Plan for @graphty/remote-logger

## Overview

This implementation plan creates a standalone npm package (`@graphty/remote-logger`) that provides:
1. A browser client for sending log messages to a remote server
2. An HTTPS/HTTP log server with terminal output and REST API
3. A console capture UI widget for copy/download/view functionality

The package will be extracted from existing code in `graphty-element` and `bjs-mantine`, simplified, and made reusable across projects.

## Mocking Strategy

Before diving into phases, here's how we handle mocking across environments:

| Test Type | Environment | Mocking Approach |
|-----------|-------------|------------------|
| Server unit tests | Node.js | **No mocking** - real HTTP server on random port |
| Client unit tests | happy-dom | **Mock fetch** + fake timers |
| UI unit tests | happy-dom | **Spy on console** methods |
| UI browser tests | Playwright | **No mocking** - real DOM |
| Integration tests | Playwright + Node | **No mocking** - real server + real browser |

### Browser-Side (RemoteLogClient, ConsoleCaptureUI)

**Unit Tests (vitest with happy-dom):**
```typescript
// Mock fetch for RemoteLogClient tests
const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ success: true }), { status: 200 })
);

// Mock timers for batching tests
vi.useFakeTimers();
vi.runAllTimers();
vi.runAllTimersAsync(); // for async retry logic

// Spy on console methods for ConsoleCaptureUI
const logSpy = vi.spyOn(console, "log");
const errorSpy = vi.spyOn(console, "error");
```

### Server-Side (log-server)

**No mocking** - start a real HTTP server on a random port:
```typescript
let server: http.Server;
let port: number;

beforeEach(() => {
    port = 9000 + Math.floor(Math.random() * 99);
    server = startLogServer({ port, useHttp: true, quiet: true });
});

afterEach((done) => {
    server.close(done);
});

// Use real fetch against real server
const response = await fetch(`http://localhost:${port}/log`, { ... });
```

### Integration Tests (Playwright)

**Real server + real browser** for true E2E testing:
```typescript
// Start real server in beforeAll
server = startLogServer({ port: 9080, useHttp: true, quiet: true });

// Browser makes real requests to real server
await page.evaluate(() => {
    const client = new RemoteLogClient({ serverUrl: "http://localhost:9080" });
    client.log("INFO", "Test");
    return client.flush();
});

// Verify via server REST API
const logs = await fetch("http://localhost:9080/logs").then(r => r.json());
```

---

## Phase Breakdown

### Phase 1: Package Scaffolding and Log Server

**Objective**: Create the package structure and implement a working log server that can be started via CLI and receive log messages.

**Duration**: 1-2 days

**Tests to Write First**:

- `test/server/self-signed-cert.test.ts`: Certificate generation (no mocking needed - pure functions)
  ```typescript
  describe("self-signed-cert", () => {
      test("should generate valid certificate and key");
      test("should include hostname in Subject Alternative Names");
      test("should check if cert files exist");
      test("should read cert files from disk");
  });
  ```

- `test/server/log-server.test.ts`: HTTP server endpoints (real server, real fetch)
  ```typescript
  describe("Log Server", () => {
      let server: http.Server;
      let port: number;

      beforeEach(() => {
          port = 9000 + Math.floor(Math.random() * 99);
          server = startLogServer({ port, useHttp: true, quiet: true });
      });

      afterEach((done) => {
          server.close(done);
      });

      test("should start on specified port");
      test("should handle POST /log and store logs");
      test("should handle GET /logs and return all logs");
      test("should handle GET /logs/recent with limit");
      test("should handle GET /logs/errors");
      test("should handle POST /logs/clear");
      test("should handle GET /health");
      test("should handle CORS preflight (OPTIONS)");
      test("should auto-generate self-signed cert when none provided");
  });
  ```

**Implementation**:

- `package.json`: Package configuration with bin entry
- `tsconfig.json`: TypeScript configuration extending base
- `vite.config.ts`: Build configuration for multiple entry points
- `vitest.config.ts`: Test configuration

- `src/server/self-signed-cert.ts`: Certificate generation (copy from graphty-element)
  ```typescript
  export interface GeneratedCert { cert: string; key: string; }
  export function generateSelfSignedCert(hostname?: string): GeneratedCert;
  export function certFilesExist(certPath: string, keyPath: string): boolean;
  export function readCertFiles(certPath: string, keyPath: string): GeneratedCert;
  ```

- `src/server/log-server.ts`: HTTP/HTTPS server
  ```typescript
  export interface LogServerOptions {
      port?: number;
      host?: string;
      certPath?: string;
      keyPath?: string;
      logFile?: string;
      useHttp?: boolean;
      quiet?: boolean;
  }
  export function startLogServer(options?: LogServerOptions): http.Server | https.Server;
  export function main(): void;  // CLI entry point
  ```

- `src/server/index.ts`: Server exports
- `bin/remote-log-server.js`: CLI entry point

**Dependencies**:
- External: `selfsigned` (runtime), `vitest` (dev)
- Internal: None (first phase)

**Verification**:
1. Run: `npx tsx src/server/log-server.ts --http --port 9080`
2. In another terminal: `curl -X POST http://localhost:9080/log -H "Content-Type: application/json" -d '{"sessionId":"test","logs":[{"time":"2024-01-01T00:00:00Z","level":"INFO","message":"Hello"}]}'`
3. Expected: Server shows colored log output in terminal
4. Run: `curl http://localhost:9080/logs`
5. Expected: JSON response with stored logs

---

### Phase 2: Browser Client (RemoteLogClient)

**Objective**: Implement the browser-side client that sends log messages to the server with batching and retry logic.

**Duration**: 1-2 days

**Tests to Write First**:

- `test/client/types.test.ts`: Type validation (no mocking needed - type checks)
  ```typescript
  describe("types", () => {
      test("LogEntry should have required fields");
      test("RemoteLogClientOptions should accept serverUrl");
  });
  ```

- `test/client/RemoteLogClient.test.ts`: Client functionality (mock fetch + fake timers)
  ```typescript
  describe("RemoteLogClient", () => {
      let fetchSpy: MockInstance;

      beforeEach(() => {
          // Mock fetch - no real server needed for unit tests
          fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
              new Response(JSON.stringify({ success: true }), { status: 200 })
          );
          vi.useFakeTimers();
      });

      afterEach(() => {
          vi.restoreAllMocks();
          vi.useRealTimers();
      });

      test("should create client with serverUrl");
      test("should generate unique session ID");
      test("should use custom session prefix");
      test("should add timestamp and format log entry");

      describe("batching", () => {
          test("should batch multiple logs before sending");
          test("should send after batch interval");
          test("should flush immediately when flush() called");
      });

      describe("retry", () => {
          test("should retry on network failure", async () => {
              fetchSpy.mockRejectedValueOnce(new Error("Network error"));
              fetchSpy.mockResolvedValueOnce(
                  new Response(JSON.stringify({ success: true }), { status: 200 })
              );
              // ... test retry behavior
              await vi.runAllTimersAsync();
          });
          test("should give up after max retries");
          test("should use exponential backoff delay");
      });

      describe("close", () => {
          test("should flush pending logs on close");
          test("should stop batch timer on close");
      });
  });
  ```

**Implementation**:

- `src/client/types.ts`: Type definitions
  ```typescript
  export interface LogEntry {
      time: string;
      level: string;
      message: string;
      data?: Record<string, unknown>;
  }

  export interface RemoteLogClientOptions {
      serverUrl: string;
      sessionPrefix?: string;
      batchIntervalMs?: number;
      maxRetries?: number;
      retryDelayMs?: number;
  }
  ```

- `src/client/RemoteLogClient.ts`: Main client class
  ```typescript
  export class RemoteLogClient {
      readonly sessionId: string;
      constructor(options: RemoteLogClientOptions);
      log(level: string, message: string, data?: Record<string, unknown>): void;
      flush(): Promise<void>;
      close(): Promise<void>;
  }

  export function createRemoteLogClient(options: RemoteLogClientOptions): RemoteLogClient;
  ```

- `src/index.ts`: Main client exports

**Dependencies**:
- External: None (uses native fetch)
- Internal: Phase 1 (for integration testing)

**Verification**:
1. Start server: `npx tsx src/server/log-server.ts --http --port 9080`
2. Create test HTML file `tmp/test-client.html`:
   ```html
   <script type="module">
     import { RemoteLogClient } from '../dist/index.js';
     const client = new RemoteLogClient({ serverUrl: 'http://localhost:9080' });
     client.log('INFO', 'Page loaded', { userAgent: navigator.userAgent });
     client.log('DEBUG', 'Testing batching');
     setTimeout(() => client.flush(), 200);
   </script>
   ```
3. Run: `npm run build && npx serve . -p 9081`
4. Open: `http://localhost:9081/tmp/test-client.html`
5. Expected: Server terminal shows two log messages from browser

---

### Phase 3: Console Capture UI Widget

**Objective**: Implement the floating UI widget that intercepts console output and provides copy/download/view functionality.

**Duration**: 1-2 days

**Tests to Write First**:

- `test/ui/ConsoleCaptureUI.test.ts`: UI widget functionality (spy on console methods)
  ```typescript
  describe("ConsoleCaptureUI", () => {
      let originalLog: typeof console.log;
      let originalError: typeof console.error;

      beforeEach(() => {
          // Store originals before ConsoleCaptureUI intercepts them
          originalLog = console.log;
          originalError = console.error;
      });

      afterEach(() => {
          // Restore if needed (ConsoleCaptureUI.destroy() should do this)
          console.log = originalLog;
          console.error = originalError;
      });

      test("should intercept console.log", () => {
          const ui = new ConsoleCaptureUI();
          console.log("test message");
          expect(ui.getLogs()).toContain("test message");
          ui.destroy();
      });

      test("should intercept console.error");
      test("should intercept console.warn");
      test("should intercept console.info");
      test("should intercept console.debug");
      test("should format log entries with timestamp");
      test("should restore original console methods on destroy");

      describe("getLogs", () => {
          test("should return formatted log string");
          test("should include all captured logs");
      });

      describe("clearLogs", () => {
          test("should clear all captured logs");
      });

      describe("global methods", () => {
          test("should expose window.__console__.copy");
          test("should expose window.__console__.download");
          test("should expose window.__console__.clear");
          test("should expose window.__console__.get");
      });
  });
  ```

- `test/ui/ConsoleCaptureUI.browser.test.ts`: Browser integration tests (Playwright - real DOM, no mocking)
  ```typescript
  describe("ConsoleCaptureUI Browser", () => {
      // These tests run in real browser via Playwright
      // No mocking needed - test actual DOM manipulation

      test("should create floating button", async ({ page }) => {
          await page.goto("/test-ui.html");
          const button = page.locator("#console-capture-btn");
          await expect(button).toBeVisible();
      });

      test("should show menu on click", async ({ page }) => {
          await page.goto("/test-ui.html");
          await page.click("#console-capture-btn");
          const menu = page.locator("#console-capture-menu");
          await expect(menu).toBeVisible();
      });

      test("should copy logs to clipboard");
      test("should download logs as file");
  });
  ```

**Implementation**:

- `src/ui/ConsoleCaptureUI.ts`: Console capture and UI widget
  ```typescript
  export class ConsoleCaptureUI {
      constructor();
      getLogs(): string;
      clearLogs(): void;
      copyLogs(): Promise<void>;
      downloadLogs(): void;
      destroy(): void;  // Restore original console methods
  }

  export function initConsoleCaptureUI(): ConsoleCaptureUI;
  ```

- `src/ui/index.ts`: UI exports

**Dependencies**:
- External: None (pure DOM manipulation)
- Internal: None

**Verification**:
1. Create test HTML file `tmp/test-ui.html`:
   ```html
   <script type="module">
     import { initConsoleCaptureUI } from '../dist/ui/index.js';
     initConsoleCaptureUI();
     console.log('Test log 1');
     console.warn('Test warning');
     console.error('Test error');
   </script>
   <h1>Console Capture UI Test</h1>
   <p>Click the floating button in the top-right corner</p>
   ```
2. Run: `npm run build && npx serve . -p 9081`
3. Open: `http://localhost:9081/tmp/test-ui.html`
4. Expected: See floating button, click to open menu, verify Copy/Download/Clear/Show work

---

### Phase 4: CLI Polish and Build System

**Objective**: Polish the CLI experience, set up proper build outputs for ESM/CJS, and ensure the package can be run via npx.

**Duration**: 1 day

**Tests to Write First**:

- `test/cli/cli.test.ts`: CLI argument parsing
  ```typescript
  describe("CLI", () => {
      test("should parse --port argument");
      test("should parse --host argument");
      test("should parse --cert and --key arguments");
      test("should parse --http flag");
      test("should parse --log-file argument");
      test("should parse --quiet flag");
      test("should show help with --help");
      test("should use defaults when no arguments");
  });
  ```

**Implementation**:

- Update `bin/remote-log-server.js`: Proper shebang and module loading
  ```javascript
  #!/usr/bin/env node
  import { main } from "../dist/server/index.js";
  main();
  ```

- Update `vite.config.ts`: Configure multi-entry build
  ```typescript
  export default defineConfig({
      build: {
          lib: {
              entry: {
                  index: "src/index.ts",
                  "server/index": "src/server/index.ts",
                  "ui/index": "src/ui/index.ts",
              },
              formats: ["es", "cjs"],
          },
          rollupOptions: {
              external: ["fs", "http", "https", "url", "selfsigned"],
          },
      },
  });
  ```

- Update `package.json`: Proper exports map
  ```json
  {
      "exports": {
          ".": { "import": "./dist/index.js", "require": "./dist/index.cjs" },
          "./server": { "import": "./dist/server/index.js", "require": "./dist/server/index.cjs" },
          "./ui": { "import": "./dist/ui/index.js", "require": "./dist/ui/index.cjs" }
      }
  }
  ```

**Dependencies**:
- External: None
- Internal: Phases 1-3

**Verification**:
1. Run: `npm run build`
2. Run: `node bin/remote-log-server.js --help`
3. Expected: Help text with all options
4. Run: `node bin/remote-log-server.js --http --port 9080`
5. Expected: Server starts with banner
6. Test npx simulation: `npm pack && npx ./graphty-remote-logger-1.0.0.tgz --http`
7. Expected: Server starts successfully

---

### Phase 5: Integration Tests and Documentation

**Objective**: Add end-to-end integration tests that verify browser client communicates with server, and create README documentation.

**Duration**: 1-2 days

**Tests to Write First**:

- `test/integration/client-server.test.ts`: Full integration (real server, real client, NO mocking)
  ```typescript
  describe("Client-Server Integration", () => {
      // NO MOCKING - real server, real fetch
      // This tests the actual HTTP communication
      let server: http.Server;
      let port: number;

      beforeAll(() => {
          port = 9000 + Math.floor(Math.random() * 99);
          server = startLogServer({ port, useHttp: true, quiet: true });
      });

      afterAll((done) => {
          server.close(done);
      });

      test("should send log from client to server", async () => {
          const client = new RemoteLogClient({
              serverUrl: `http://localhost:${port}`,
              batchIntervalMs: 10,  // Short interval for testing
          });

          client.log("INFO", "Integration test message");
          await client.flush();

          // Verify via REST API
          const response = await fetch(`http://localhost:${port}/logs/recent?n=1`);
          const data = await response.json();
          expect(data.logs[0].message).toContain("Integration test message");
      });

      test("should batch multiple logs");
      test("should retrieve logs via REST API");
      test("should handle multiple sessions");
      test("should clear logs");
  });
  ```

- `test/integration/browser.test.ts`: Browser-to-server (Playwright - real browser, real server, NO mocking)
  ```typescript
  describe("Browser Integration", () => {
      // NO MOCKING - real Playwright browser, real server
      let server: http.Server;
      let port: number;

      beforeAll(() => {
          port = 9000 + Math.floor(Math.random() * 99);
          server = startLogServer({ port, useHttp: true, quiet: true });
      });

      afterAll((done) => {
          server.close(done);
      });

      test("should send logs from browser to server", async ({ page }) => {
          // Load test page with RemoteLogClient
          await page.goto("/test-integration.html");

          // Execute in browser context
          await page.evaluate((serverUrl) => {
              const client = new (window as any).RemoteLogClient({ serverUrl });
              client.log("INFO", "Browser test message", { source: "playwright" });
              return client.flush();
          }, `http://localhost:${port}`);

          // Verify on server side
          const response = await fetch(`http://localhost:${port}/logs/recent?n=1`);
          const data = await response.json();
          expect(data.logs[0].message).toContain("Browser test message");
      });

      test("should generate unique session per page");
      test("should flush logs before page unload");
  });
  ```

**Implementation**:

- `README.md`: Package documentation
  - Installation instructions
  - Quick start guide
  - API reference
  - CLI usage
  - Examples

- `CLAUDE.md`: Claude Code guidance for the package

- Update `pnpm-workspace.yaml`: Add package to workspace

- Update root `tsconfig.base.json`: Add project reference

**Dependencies**:
- External: `@vitest/browser`, `playwright` (dev)
- Internal: All previous phases

**Verification**:
1. Run: `npm test`
2. Expected: All tests pass including integration tests
3. Run: `npm run build && npm pack`
4. Expected: Creates tarball with correct files
5. Test in graphty-element:
   - Add `"@graphty/remote-logger": "workspace:*"` to dependencies
   - Import and use RemoteLogClient
   - Verify logs appear in server terminal

---

### Phase 6: Migration - Update graphty-element

**Objective**: Update graphty-element to use the new @graphty/remote-logger package instead of its internal implementation.

**Duration**: 1-2 days

**Tests to Write First**:

- Update `graphty-element/test/logging/sinks/RemoteSink.test.ts`: Verify wrapper works
  ```typescript
  describe("RemoteSink with remote-logger", () => {
      test("should create sink using RemoteLogClient");
      test("should format LogRecord to log entry");
      test("should flush client when sink flushes");
  });
  ```

**Implementation**:

- Update `graphty-element/package.json`: Add dependency
  ```json
  {
      "dependencies": {
          "@graphty/remote-logger": "workspace:*"
      }
  }
  ```

- Update `graphty-element/src/logging/sinks/RemoteSink.ts`: Use RemoteLogClient
  ```typescript
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
              const message = formatRecord(record);
              client.log(LOG_LEVEL_TO_NAME[record.level], message, record.data);
          },
          async flush(): Promise<void> {
              await client.flush();
          },
      };
  }
  ```

- Remove from graphty-element:
  - `src/logging/server/` directory (moved to remote-logger)
  - `bin/graphty-log-server.js` (replaced by remote-logger CLI)
  - Update package.json to remove `bin` entry

- Update `graphty-element/.storybook/`: Use ConsoleCaptureUI from remote-logger
  ```typescript
  import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";
  initConsoleCaptureUI();
  ```

**Dependencies**:
- External: None
- Internal: @graphty/remote-logger (Phase 5)

**Verification**:
1. Run graphty-element tests: `cd graphty-element && npm test`
2. Expected: All tests pass
3. Start log server: `npx @graphty/remote-logger --http --port 9080`
4. Start Storybook: `cd graphty-element && npm run storybook`
5. Add URL param: `?graphty-element-remote-log=http://localhost:9080`
6. Expected: Logs appear in server terminal

---

### Phase 7: Migration - Update bjs-mantine

**Objective**: Update bjs-mantine to use the new @graphty/remote-logger package.

**Duration**: 0.5-1 day

**Implementation**:

- Update `bjs-mantine/package.json`:
  ```json
  {
      "dependencies": {
          "@graphty/remote-logger": "workspace:*"
      },
      "scripts": {
          "log-server": "remote-log-server --port 9077 --host dev.ato.ms --cert $HTTPS_CERT_PATH --key $HTTPS_KEY_PATH"
      }
  }
  ```

- Remove from bjs-mantine:
  - `src/logging/server/` directory
  - `bin/log-server.ts`

- Update Storybook integration if using console capture UI

**Dependencies**:
- External: None
- Internal: @graphty/remote-logger (Phase 5)

**Verification**:
1. Run: `cd bjs-mantine && npm run log-server`
2. Expected: Log server starts on port 9077
3. Start Storybook and verify logs are received

---

## Common Utilities Needed

- **Port selection**: Random port in 9000-9099 range for tests (avoids conflicts)
- **Test helpers**: Mock fetch, fake timers patterns (reuse from existing tests)

## External Libraries Assessment

| Task | Library | Reason |
|------|---------|--------|
| Self-signed certs | `selfsigned` | Already in use, well-tested, lightweight |
| Testing | `vitest` | Monorepo standard |
| Browser testing | `@vitest/browser` + Playwright | Monorepo standard |
| Build | `vite` | Monorepo standard |

No new external libraries needed - the package is intentionally lightweight.

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Breaking graphty-element logging | Phase 6 keeps RemoteSink API identical, only changes internals |
| CORS issues | Server already handles CORS with `*` origin |
| Certificate issues | Auto-generate self-signed by default, clear browser warning message |
| Test port conflicts | Use random ports in 9000-9099 range |
| Build output issues | Test `npm pack` and local installation in each phase |

## File Summary

### New Files (remote-logger package)

```
remote-logger/
├── src/
│   ├── index.ts
│   ├── client/
│   │   ├── RemoteLogClient.ts
│   │   └── types.ts
│   ├── server/
│   │   ├── log-server.ts
│   │   ├── self-signed-cert.ts
│   │   └── index.ts
│   └── ui/
│       ├── ConsoleCaptureUI.ts
│       └── index.ts
├── bin/
│   └── remote-log-server.js
├── test/
│   ├── client/
│   │   ├── types.test.ts
│   │   └── RemoteLogClient.test.ts
│   ├── server/
│   │   ├── self-signed-cert.test.ts
│   │   └── log-server.test.ts
│   ├── ui/
│   │   ├── ConsoleCaptureUI.test.ts
│   │   └── ConsoleCaptureUI.browser.test.ts
│   ├── integration/
│   │   ├── client-server.test.ts
│   │   └── browser.test.ts
│   └── cli/
│       └── cli.test.ts
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
├── README.md
└── CLAUDE.md
```

### Files to Modify

- `pnpm-workspace.yaml`: Add remote-logger
- `tsconfig.base.json`: Add project reference
- `graphty-element/package.json`: Add dependency, remove bin
- `graphty-element/src/logging/sinks/RemoteSink.ts`: Use RemoteLogClient
- `graphty-element/.storybook/console-capture-ui.ts`: Import from remote-logger
- `bjs-mantine/package.json`: Add dependency, update scripts

### Files to Remove (after migration)

- `graphty-element/src/logging/server/` (entire directory)
- `graphty-element/bin/graphty-log-server.js`
- `bjs-mantine/src/logging/server/` (entire directory)
- `bjs-mantine/bin/log-server.ts`
