# Implementation Plan for Remote Logger MCP Server

## Overview

Convert the existing remote logging server into an MCP (Model Context Protocol) server that Claude Code can query directly, while maintaining HTTP compatibility for browser clients. The implementation adds 9 MCP tools, automatic project marker detection, and JSONL file streaming for flexible log access.

**Key Deliverables:**
- MCP server with 9 tools for log management
- Dual interface: HTTP for browsers, MCP for Claude Code
- Zero-config project marker auto-detection via git worktree paths
- JSONL file streaming to temp directory for file-based searching
- Vite integration for automatic marker injection

**Existing Foundation:**
- `log-server.ts` (572 lines) - HTTP server with REST API
- `RemoteLogClient.ts` (281 lines) - Browser logging client
- 9 test files with comprehensive coverage
- CLI entry point with argument parsing

---

## Phase Breakdown

### Phase 1: Log Storage Refactor & Core Data Model
**Objective**: Extract log storage into a standalone module with session metadata support, enabling both HTTP and MCP interfaces to share the same data layer.

**Duration**: 2 days

**Why First**: The existing `log-server.ts` has in-memory storage tightly coupled to the HTTP handlers. Both MCP and HTTP need to share storage, so this must be decoupled first.

**Tests to Write First**:
- `test/server/log-storage.test.ts`: Log storage operations
  ```typescript
  describe("LogStorage", () => {
    it("stores logs with session metadata");
    it("extracts project marker from session ID prefix");
    it("filters logs by project marker");
    it("filters logs by session ID");
    it("returns recent logs across all sessions sorted by time");
    it("returns only error-level logs");
    it("clears logs for specific session");
    it("clears logs for specific project marker");
    it("tracks session metadata (logCount, errorCount, firstLogTime, lastLogTime)");
    it("lists all sessions with metadata");
  });
  ```

- `test/server/marker-utils.test.ts`: Project marker extraction
  ```typescript
  describe("extractMarkerFromPath", () => {
    it("extracts marker from .worktrees path: /home/user/.worktrees/remote-logging → 'remote-logging'");
    it("uses basename for regular paths: /home/user/my-project → 'my-project'");
    it("handles Windows paths with backslashes");
    it("returns 'default' for empty or invalid paths");
  });
  ```

**Implementation**:
- `src/server/log-storage.ts`: Shared log storage class
  ```typescript
  interface LogEntry {
    time: string;
    level: string;
    message: string;
    data?: Record<string, unknown>;
  }

  interface SessionMetadata {
    sessionId: string;
    projectMarker: string;
    worktreePath?: string;
    pageUrl?: string;
    firstLogTime: string;
    lastLogTime: string;
    logCount: number;
    errorCount: number;
  }

  interface SessionData {
    metadata: SessionMetadata;
    logs: LogEntry[];
  }

  class LogStorage {
    addLogs(sessionId: string, logs: LogEntry[], options?: { projectMarker?: string; worktreePath?: string; pageUrl?: string }): void;
    getLogs(filter?: LogFilter): LogEntry[];
    getRecentLogs(count: number, filter?: LogFilter): LogEntry[];
    getErrors(filter?: LogFilter): LogEntry[];
    getSessions(filter?: SessionFilter): SessionMetadata[];
    clearLogs(filter?: ClearFilter): { cleared: number };
    getHealth(): HealthStatus;
  }
  ```

- `src/server/marker-utils.ts`: Path-based marker extraction
  ```typescript
  export function extractMarkerFromPath(path: string): string;
  export function extractMarkerFromSessionId(sessionId: string): string;
  export function resolveProjectMarker(options: MarkerResolutionOptions): string;
  ```

- Modify `src/server/log-server.ts`: Refactor to use LogStorage instead of inline Map

**Dependencies**:
- External: None (use existing Node.js built-ins)
- Internal: None (this is the foundation)

**Verification**:
1. Run: `cd remote-logger && npm run test:run -- --grep "LogStorage"`
2. Run: `cd remote-logger && npm run test:run -- --grep "marker"`
3. Run existing server tests to ensure no regression: `npm run test:run -- test/server/log-server.test.ts`
4. Manual: Start server with `npx remote-log-server`, send logs via curl, verify storage works:
   ```bash
   curl -X POST http://localhost:9080/log \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test-123","logs":[{"time":"2024-01-15T10:00:00Z","level":"INFO","message":"Hello"}]}'
   curl http://localhost:9080/logs
   ```

---

### Phase 2: MCP Server MVP (3 Core Tools)
**Objective**: Create a minimal MCP server with the 3 most essential tools that Claude Code needs: `logs_get_recent`, `logs_health`, and `logs_list_sessions`.

**Duration**: 2 days

**Why This Scope**: Start with read-only tools that Claude Code will use most frequently. This validates the MCP SDK integration before adding all 9 tools.

**Tests to Write First**:
- `test/mcp/mcp-server.test.ts`: MCP server initialization and tool registration
  ```typescript
  describe("MCP Server", () => {
    it("initializes with STDIO transport");
    it("registers tools with correct schemas");
    it("lists available tools via tools/list");
  });
  ```

- `test/mcp/tools/logs-get-recent.test.ts`: logs_get_recent tool
  ```typescript
  describe("logs_get_recent tool", () => {
    it("returns recent logs sorted by time");
    it("respects count parameter (default 50, max 500)");
    it("filters by projectMarker");
    it("filters by workingDirectory (derives marker from path)");
    it("filters by level");
    it("filters by since timestamp");
    it("returns empty array when no logs");
  });
  ```

- `test/mcp/tools/logs-health.test.ts`: logs_health tool
  ```typescript
  describe("logs_health tool", () => {
    it("returns server status, uptime, session count, log count");
    it("includes memory usage");
  });
  ```

- `test/mcp/tools/logs-list-sessions.test.ts`: logs_list_sessions tool
  ```typescript
  describe("logs_list_sessions tool", () => {
    it("lists all sessions with metadata");
    it("filters by projectMarker");
    it("filters by hasErrors");
    it("returns empty array when no sessions");
  });
  ```

**Implementation**:
- `src/mcp/mcp-server.ts`: Core MCP server
  ```typescript
  import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
  import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

  export function createMcpServer(storage: LogStorage): McpServer;
  export async function startMcpServer(storage: LogStorage): Promise<void>;
  ```

- `src/mcp/tools/logs-get-recent.ts`: Get recent logs tool
- `src/mcp/tools/logs-health.ts`: Health check tool
- `src/mcp/tools/logs-list-sessions.ts`: List sessions tool
- `src/mcp/tools/index.ts`: Tool registration
- `src/mcp/index.ts`: MCP module exports

- Update `bin/remote-log-server.js`: Add `--mcp` flag to start in MCP mode

**Dependencies**:
- External: `@modelcontextprotocol/sdk` (add to package.json)
- External: `zod` for schema validation (MCP SDK peer dependency)
- Internal: `log-storage.ts`, `marker-utils.ts` from Phase 1

**Verification**:
1. Run: `cd remote-logger && npm run test:run -- test/mcp/`
2. Manual MCP test with Claude Code:
   ```bash
   # Add to ~/.config/claude-code/mcp.json:
   {
     "mcpServers": {
       "remote-logger": {
         "command": "node",
         "args": ["/path/to/remote-logger/bin/remote-log-server.js", "--mcp"]
       }
     }
   }
   ```
3. In Claude Code, verify tools appear: ask "What MCP tools are available for logging?"
4. Test tool execution: ask "Check the health of the remote logger"

---

### Phase 3: Remaining MCP Tools
**Objective**: Implement the remaining 6 MCP tools to complete the tool set: `logs_receive`, `logs_get_all`, `logs_get_errors`, `logs_clear`, `logs_search`, `logs_get_file_path`.

**Duration**: 2 days

**Tests to Write First**:
- `test/mcp/tools/logs-receive.test.ts`:
  ```typescript
  describe("logs_receive tool", () => {
    it("stores logs with session ID");
    it("accepts optional projectMarker");
    it("derives marker from sessionId prefix if not provided");
    it("validates log entry format");
    it("returns success with count");
  });
  ```

- `test/mcp/tools/logs-get-all.test.ts`:
  ```typescript
  describe("logs_get_all tool", () => {
    it("returns all logs grouped by session");
    it("filters by projectMarker");
  });
  ```

- `test/mcp/tools/logs-get-errors.test.ts`:
  ```typescript
  describe("logs_get_errors tool", () => {
    it("returns only ERROR level logs");
    it("filters by projectMarker");
    it("filters by since timestamp");
  });
  ```

- `test/mcp/tools/logs-clear.test.ts`:
  ```typescript
  describe("logs_clear tool", () => {
    it("requires confirm: true");
    it("rejects when confirm is false or missing");
    it("clears all logs when no filter");
    it("clears only matching projectMarker");
    it("clears only matching sessionId");
    it("returns count of cleared logs");
  });
  ```

- `test/mcp/tools/logs-search.test.ts`:
  ```typescript
  describe("logs_search tool", () => {
    it("searches by substring (case-insensitive)");
    it("searches by regex when regex: true");
    it("filters by projectMarker");
    it("filters by level");
    it("respects limit (default 100)");
    it("handles invalid regex gracefully");
  });
  ```

- `test/mcp/tools/logs-get-file-path.test.ts`:
  ```typescript
  describe("logs_get_file_path tool", () => {
    it("returns path based on projectMarker");
    it("derives marker from workingDirectory");
    it("returns file existence status");
    it("returns file size");
  });
  ```

**Implementation**:
- `src/mcp/tools/logs-receive.ts`
- `src/mcp/tools/logs-get-all.ts`
- `src/mcp/tools/logs-get-errors.ts`
- `src/mcp/tools/logs-clear.ts`
- `src/mcp/tools/logs-search.ts`
- `src/mcp/tools/logs-get-file-path.ts`
- Update `src/mcp/tools/index.ts`: Register all new tools

**Dependencies**:
- External: None new
- Internal: All Phase 1-2 components

**Verification**:
1. Run: `cd remote-logger && npm run test:run -- test/mcp/tools/`
2. In Claude Code, test each tool:
   - "Search the logs for 'error'" → logs_search
   - "Clear all logs for this project, confirm" → logs_clear
   - "Get the log file path for this project" → logs_get_file_path
3. Verify all 9 tools appear in Claude Code's tool list

---

### Phase 4: JSONL File Streaming
**Objective**: Automatically stream logs to JSONL files in temp directory, organized by project marker.

**Duration**: 2 days

**Tests to Write First**:
- `test/server/jsonl-writer.test.ts`:
  ```typescript
  describe("JsonlWriter", () => {
    it("creates directory structure: {tmpdir}/remote-logger/{marker}/logs.jsonl");
    it("appends log entries as JSON lines");
    it("handles concurrent writes safely");
    it("creates new file if not exists");
    it("flushes buffer periodically");
    it("closes file handle on shutdown");
  });
  ```

- `test/mcp/tools/logs-get-file-path.test.ts` (update):
  ```typescript
  describe("logs_get_file_path tool", () => {
    // Add tests for actual file creation
    it("returns path that exists after logs are written");
    it("returns correct file size after logs written");
    it("file contains valid JSONL format");
  });
  ```

- `test/integration/jsonl-streaming.test.ts`:
  ```typescript
  describe("JSONL streaming integration", () => {
    it("streams logs to file as they arrive via HTTP");
    it("creates separate files per project marker");
    it("file is readable by external tools during streaming");
  });
  ```

**Implementation**:
- `src/server/jsonl-writer.ts`: JSONL file writer
  ```typescript
  class JsonlWriter {
    constructor(baseDir: string); // e.g., os.tmpdir()/remote-logger
    write(projectMarker: string, entry: JsonlEntry): void;
    getFilePath(projectMarker: string): string;
    getFileStats(projectMarker: string): FileStats | null;
    close(): Promise<void>;
  }
  ```

- Update `src/server/log-storage.ts`: Integrate JsonlWriter, write on each addLogs call

- Update `src/mcp/tools/logs-get-file-path.ts`: Use JsonlWriter to get real file info

**Dependencies**:
- External: None (use Node.js fs/path)
- Internal: log-storage.ts

**Verification**:
1. Run: `cd remote-logger && npm run test:run -- jsonl`
2. Manual test:
   ```bash
   # Start server
   npx remote-log-server --http

   # Send logs
   curl -X POST http://localhost:9080/log \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"test-project-123","logs":[{"time":"2024-01-15T10:00:00Z","level":"INFO","message":"Test"}]}'

   # Check file exists
   cat /tmp/remote-logger/test-project/logs.jsonl
   ```
3. In Claude Code: "Get the log file path, then use Grep to search for 'error' in that file"

---

### Phase 5: HTTP-MCP Dual Mode
**Objective**: Run HTTP and MCP interfaces simultaneously, sharing the same log storage. Browser clients use HTTP, Claude Code uses MCP.

**Duration**: 2 days

**Tests to Write First**:
- `test/integration/dual-mode.test.ts`:
  ```typescript
  describe("Dual mode (HTTP + MCP)", () => {
    it("starts both interfaces from single process");
    it("HTTP logs appear in MCP queries");
    it("logs are shared between interfaces");
    it("graceful shutdown closes both interfaces");
  });
  ```

- `test/cli/cli.test.ts` (update):
  ```typescript
  describe("CLI", () => {
    it("--mcp-only starts only MCP server");
    it("--http-only starts only HTTP server (legacy mode)");
    it("default starts both (dual mode)");
    it("--port configures HTTP port");
  });
  ```

**Implementation**:
- `src/server/dual-server.ts`: Combined server orchestration
  ```typescript
  interface DualServerOptions {
    httpPort?: number;
    httpHost?: string;
    mcpEnabled?: boolean;
    httpEnabled?: boolean;
  }

  export async function startDualServer(options: DualServerOptions): Promise<{
    httpServer?: http.Server;
    mcpServer?: McpServer;
    storage: LogStorage;
    shutdown: () => Promise<void>;
  }>;
  ```

- Update `bin/remote-log-server.js`: Support dual mode by default
  ```
  --mcp-only    Start only MCP server (no HTTP)
  --http-only   Start only HTTP server (legacy mode)
  (default)     Start both HTTP and MCP (dual mode)
  ```

- Update `src/server/log-server.ts`: Accept external LogStorage instance

**Dependencies**:
- External: None
- Internal: All previous phases

**Verification**:
1. Run: `cd remote-logger && npm run test:run -- dual-mode`
2. Manual dual mode test:
   ```bash
   # Start dual server (separate terminal)
   npx remote-log-server

   # Send log via HTTP (browser simulation)
   curl -X POST http://localhost:9080/log \
     -H "Content-Type: application/json" \
     -d '{"sessionId":"browser-abc","logs":[{"time":"2024-01-15T10:00:00Z","level":"INFO","message":"From browser"}]}'
   ```
3. In Claude Code (with MCP configured): "Show me recent logs" - should show the browser log
4. Verify HTTP still works for all endpoints

---

### Phase 6: Vite Integration & Client Updates
**Objective**: Update RemoteLogClient to support project markers and integrate marker injection into Vite shared config.

**Duration**: 2 days

**Tests to Write First**:
- `test/client/RemoteLogClient.test.ts` (update):
  ```typescript
  describe("RemoteLogClient", () => {
    it("sends projectMarker with logs when configured");
    it("sends worktreePath with logs when available");
    it("reads __REMOTE_LOG_PROJECT_MARKER__ global if defined");
    it("reads __REMOTE_LOG_WORKTREE_PATH__ global if defined");
    it("prefers explicit projectMarker over global");
  });
  ```

- `test/server/marker-utils.test.ts` (update):
  ```typescript
  describe("Vite marker extraction", () => {
    it("extractWorktreeMarker handles .worktrees paths");
    it("extractWorktreeMarker handles regular project paths");
    it("extractWorktreeMarker handles Windows paths");
  });
  ```

**Implementation**:
- Update `src/client/RemoteLogClient.ts`:
  ```typescript
  interface RemoteLogClientOptions {
    // Existing options...
    projectMarker?: string;    // NEW: Explicit marker
    worktreePath?: string;     // NEW: Full path for debugging
  }

  // Auto-detect from globals injected by Vite
  declare const __REMOTE_LOG_PROJECT_MARKER__: string | undefined;
  declare const __REMOTE_LOG_WORKTREE_PATH__: string | undefined;
  ```

- Update `src/client/types.ts`: Add new option types

- Create `src/vite/plugin.ts`: Vite plugin for marker injection
  ```typescript
  export function remoteLoggerPlugin(): Plugin {
    return {
      name: 'remote-logger',
      config() {
        return {
          define: {
            '__REMOTE_LOG_PROJECT_MARKER__': JSON.stringify(extractWorktreeMarker(process.cwd())),
            '__REMOTE_LOG_WORKTREE_PATH__': JSON.stringify(process.cwd())
          }
        };
      }
    };
  }
  ```

- Add package.json export: `"./vite"` → Vite plugin

**Dependencies**:
- External: None (Vite plugin is just a config object)
- Internal: marker-utils.ts

**Verification**:
1. Run: `cd remote-logger && npm run test:run -- test/client/`
2. Integration with graphty-element:
   ```typescript
   // In graphty-element/vite.config.ts, add:
   import { remoteLoggerPlugin } from "@graphty/remote-logger/vite";

   export default defineConfig({
     plugins: [remoteLoggerPlugin()]
   });
   ```
3. Build graphty-element, verify `__REMOTE_LOG_PROJECT_MARKER__` is injected
4. Run graphty-element dev server, send logs, verify marker appears in MCP queries

---

### Phase 7: Time-Based Retention & Polish
**Objective**: Add configurable log retention (delete after X days), final documentation, and ensure all acceptance criteria are met.

**Duration**: 2 days

**Tests to Write First**:
- `test/server/log-storage.test.ts` (update):
  ```typescript
  describe("Log retention", () => {
    it("removes logs older than retention period");
    it("respects REMOTE_LOG_RETENTION_DAYS env var");
    it("default retention is 7 days");
    it("retention check runs periodically");
    it("retention applies to both memory and JSONL files");
  });
  ```

- `test/integration/e2e.test.ts`: Full end-to-end test
  ```typescript
  describe("E2E: Browser to Claude Code", () => {
    it("browser sends logs → MCP queries return them");
    it("multiple projects stay isolated");
    it("JSONL file contains all logs");
    it("logs_search finds content in file");
  });
  ```

**Implementation**:
- Update `src/server/log-storage.ts`:
  ```typescript
  interface LogStorageOptions {
    retentionDays?: number;  // Default: 7
    cleanupIntervalMs?: number;  // Default: 1 hour
  }
  ```

- Update `src/server/jsonl-writer.ts`: Add file rotation/cleanup for old logs

- Update `README.md`: Document MCP usage, configuration, tools

- Update `CLAUDE.md`: Add MCP-specific guidance

**Dependencies**:
- External: None
- Internal: All previous phases

**Verification**:
1. Run: `cd remote-logger && npm run test:run`
2. Run: `cd remote-logger && npm run coverage` (ensure 80%+ coverage maintained)
3. Run: `cd remote-logger && npm run lint`
4. Verify all acceptance criteria from design doc:
   - [ ] MCP server implements all 9 tools
   - [ ] HTTP backward compatible
   - [ ] Project marker filtering works
   - [ ] Session metadata includes marker
   - [ ] logs_search supports regex
   - [ ] logs_clear requires confirm
   - [ ] Health check works
   - [ ] JSONL streaming works
   - [ ] File organized by marker
   - [ ] logs_get_file_path works
   - [ ] Vite auto-injection works
   - [ ] All tests pass
5. Manual verification with Claude Code in a real worktree

---

## Common Utilities Needed

| Utility | Location | Purpose | Used In |
|---------|----------|---------|---------|
| `extractMarkerFromPath()` | `marker-utils.ts` | Extract project marker from filesystem path | MCP tools, LogStorage, Vite plugin |
| `extractMarkerFromSessionId()` | `marker-utils.ts` | Extract marker from session ID prefix | LogStorage |
| `resolveProjectMarker()` | `marker-utils.ts` | Resolve marker with fallback chain | MCP tools, HTTP handlers |
| `LogStorage` class | `log-storage.ts` | Shared in-memory log storage | HTTP server, MCP tools |
| `JsonlWriter` class | `jsonl-writer.ts` | Stream logs to JSONL files | LogStorage |

---

## External Libraries Assessment

| Task | Library | Reason |
|------|---------|--------|
| MCP protocol | `@modelcontextprotocol/sdk` | Official SDK, required for MCP server |
| Schema validation | `zod` | MCP SDK peer dependency, used for tool input schemas |
| Self-signed certs | `selfsigned` | Already used, keep for HTTPS support |

**Not Needed**:
- Express/Koa: Existing HTTP server uses Node built-ins, sufficient for needs
- Winston/Pino: Console logging to terminal is adequate
- SQLite: In-memory + JSONL provides sufficient persistence

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| MCP SDK breaking changes | Low | High | Pin SDK version, test with specific Claude Code version |
| STDIO conflicts with console.log | Medium | Medium | Use console.error for debug output (per MCP docs) |
| Port conflicts in dual mode | Medium | Low | Configurable port, clear error messages |
| JSONL file growth | Medium | Low | Time-based retention, periodic cleanup |
| Windows path handling | Medium | Medium | Test marker extraction with Windows-style paths |
| Performance with many logs | Low | Medium | Limit in-memory storage, rely on JSONL for history |

---

## File Summary

**New Files (17)**:
```
src/
├── mcp/
│   ├── mcp-server.ts           # Core MCP server
│   ├── index.ts                # MCP exports
│   └── tools/
│       ├── index.ts            # Tool registration
│       ├── logs-receive.ts
│       ├── logs-get-all.ts
│       ├── logs-get-recent.ts
│       ├── logs-get-errors.ts
│       ├── logs-clear.ts
│       ├── logs-list-sessions.ts
│       ├── logs-health.ts
│       ├── logs-search.ts
│       └── logs-get-file-path.ts
├── server/
│   ├── log-storage.ts          # Shared storage
│   ├── marker-utils.ts         # Path/marker utilities
│   ├── jsonl-writer.ts         # JSONL file streaming
│   └── dual-server.ts          # Combined HTTP+MCP
└── vite/
    └── plugin.ts               # Vite plugin for marker injection
```

**Modified Files (5)**:
```
src/server/log-server.ts        # Use shared storage
src/client/RemoteLogClient.ts   # Add projectMarker support
src/client/types.ts             # Add new option types
bin/remote-log-server.js        # Add --mcp flag, dual mode
package.json                    # Add dependencies, exports
```

**New Test Files (12)**:
```
test/
├── server/
│   ├── log-storage.test.ts
│   ├── marker-utils.test.ts
│   └── jsonl-writer.test.ts
├── mcp/
│   ├── mcp-server.test.ts
│   └── tools/
│       ├── logs-receive.test.ts
│       ├── logs-get-all.test.ts
│       ├── logs-get-recent.test.ts
│       ├── logs-get-errors.test.ts
│       ├── logs-clear.test.ts
│       ├── logs-list-sessions.test.ts
│       ├── logs-health.test.ts
│       ├── logs-search.test.ts
│       └── logs-get-file-path.test.ts
└── integration/
    ├── dual-mode.test.ts
    ├── jsonl-streaming.test.ts
    └── e2e.test.ts
```

---

## Phase Summary

| Phase | Focus | Duration | Key Deliverable |
|-------|-------|----------|-----------------|
| 1 | Log Storage Refactor | 2 days | Shared LogStorage class, marker utilities |
| 2 | MCP Server MVP | 2 days | 3 core tools working with Claude Code |
| 3 | Remaining Tools | 2 days | All 9 MCP tools complete |
| 4 | JSONL Streaming | 2 days | File-based log access for Grep/Read |
| 5 | Dual Mode | 2 days | HTTP + MCP running together |
| 6 | Vite Integration | 2 days | Auto-detection in browser clients |
| 7 | Retention & Polish | 2 days | Time-based cleanup, documentation |

**Total: 14 days**

Each phase delivers testable, verifiable functionality that builds on previous phases without breaking existing features.
