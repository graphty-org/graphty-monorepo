# Feature Design: Remote Logger MCP Server

## Overview

- **User Value**: Eliminates port conflicts and cross-talk when running multiple development sessions across different git worktrees, providing a single unified logging server that Claude Code can query to monitor logs from specific projects.

- **Technical Value**: Simplifies development workflow by running one persistent MCP server instead of multiple ad-hoc HTTP servers, enables filtering logs by project/worktree markers, and leverages the standard MCP protocol for tool-based interaction.

## Requirements

### Current State
The existing remote logging server accepts connections from web browsers on devices where logs are hard to access (iPad, iPhone, Meta Quest). Claude Code currently:
1. Starts the server manually to read output and logs
2. Views different sessions from different clients
3. Risks port conflicts when multiple git worktrees need separate servers
4. Has potential for cross-talk between sessions from different projects

### Desired State
Convert the logging server to an MCP server that:
1. Runs as a single persistent service
2. Exposes current endpoints as MCP tools
3. Enables project/worktree differentiation through markers
4. Allows Claude Code to query logs filtered by project context

## MCP Best Practices Applied

Based on research from the official MCP documentation:

### Tool Design Principles
1. **Clear, Specific Names**: Use verb-noun format (e.g., `get_logs`, `clear_logs`)
2. **Comprehensive Descriptions**: Each tool must explain what it does, when to use it, and what it returns
3. **Strict Input Schemas**: Use JSON Schema with required fields and descriptions for each parameter
4. **Meaningful Error Messages**: Return actionable error information
5. **Single Responsibility**: Each tool does one thing well

### Security Considerations
- Validate all inputs
- Implement rate limiting
- Sanitize outputs
- Consider read-only vs write operations

## Proposed Solution

### MCP Tool Definitions

#### 1. `logs_receive` (POST /log equivalent)

**Purpose**: Receive log entries from browser clients.

```typescript
{
  name: "logs_receive",
  description: "Receive and store log entries from a browser client. This is typically called by the RemoteLogClient running in a browser, not directly by Claude Code. The logs are stored in memory and associated with the provided session ID and optional project marker.",
  inputSchema: {
    type: "object",
    properties: {
      sessionId: {
        type: "string",
        description: "Unique identifier for the logging session (e.g., 'graphty-element-1704067200000-abc123')"
      },
      projectMarker: {
        type: "string",
        description: "Optional marker to identify the project/worktree (e.g., 'remote-logging', 'main'). If not provided, derived from sessionId prefix."
      },
      logs: {
        type: "array",
        items: {
          type: "object",
          properties: {
            time: { type: "string", description: "ISO 8601 timestamp" },
            level: { type: "string", description: "Log level (ERROR, WARN, INFO, DEBUG, TRACE, LOG)" },
            message: { type: "string", description: "Log message content" },
            data: { type: "object", description: "Optional structured data" }
          },
          required: ["time", "level", "message"]
        },
        description: "Array of log entries to store"
      }
    },
    required: ["sessionId", "logs"]
  }
}
```

#### 2. `logs_get_all` (GET /logs equivalent)

**Purpose**: Retrieve all logs grouped by session.

```typescript
{
  name: "logs_get_all",
  description: "Retrieve all stored logs grouped by session ID. Use this to see the complete log history across all sessions. For large log volumes, consider using logs_get_recent instead. Optionally filter by project marker to see only logs from a specific project/worktree.",
  inputSchema: {
    type: "object",
    properties: {
      projectMarker: {
        type: "string",
        description: "Optional filter to show only logs from sessions with this project marker (e.g., 'remote-logging')"
      }
    }
  }
}
```

#### 3. `logs_get_recent` (GET /logs/recent equivalent)

**Purpose**: Get the most recent logs across all sessions.

```typescript
{
  name: "logs_get_recent",
  description: "Get the most recent log entries across all sessions, sorted by time. This is the recommended tool for checking current application state. Returns logs in chronological order (oldest first) for easier reading.",
  inputSchema: {
    type: "object",
    properties: {
      count: {
        type: "number",
        description: "Maximum number of log entries to return (default: 50, max: 500)"
      },
      errorsOnly: {
        type: "boolean",
        description: "If true, only return ERROR level logs (default: false)"
      },
      projectMarker: {
        type: "string",
        description: "Optional filter to show only logs from sessions with this project marker"
      },
      sessionId: {
        type: "string",
        description: "Optional filter to show only logs from a specific session"
      },
      level: {
        type: "string",
        enum: ["ERROR", "WARN", "INFO", "DEBUG", "TRACE", "LOG"],
        description: "Optional filter to show only logs at or above this level"
      },
      since: {
        type: "string",
        description: "ISO 8601 timestamp - only return logs after this time"
      }
    }
  }
}
```

#### 4. `logs_get_errors` (GET /logs/errors equivalent)

**Purpose**: Retrieve only error-level logs.

```typescript
{
  name: "logs_get_errors",
  description: "Retrieve only ERROR level logs across all sessions. Use this when debugging failures or checking for problems. Results are sorted chronologically.",
  inputSchema: {
    type: "object",
    properties: {
      projectMarker: {
        type: "string",
        description: "Optional filter to show only errors from sessions with this project marker"
      },
      since: {
        type: "string",
        description: "ISO 8601 timestamp - only return errors after this time"
      }
    }
  }
}
```

#### 5. `logs_clear` (POST /logs/clear equivalent)

**Purpose**: Clear stored logs.

```typescript
{
  name: "logs_clear",
  description: "Clear stored logs from memory. Use with caution as this operation cannot be undone. Can optionally clear only logs for a specific project or session.",
  inputSchema: {
    type: "object",
    properties: {
      projectMarker: {
        type: "string",
        description: "Optional - only clear logs for sessions with this project marker"
      },
      sessionId: {
        type: "string",
        description: "Optional - only clear logs for this specific session"
      },
      confirm: {
        type: "boolean",
        description: "Must be true to confirm the clear operation"
      }
    },
    required: ["confirm"]
  }
}
```

#### 6. `logs_list_sessions` (NEW - recommended addition)

**Purpose**: List all active sessions with metadata.

```typescript
{
  name: "logs_list_sessions",
  description: "List all active logging sessions with their metadata including session ID, project marker, log count, first/last log time, and error count. Use this to understand what clients are currently logging and their status.",
  inputSchema: {
    type: "object",
    properties: {
      projectMarker: {
        type: "string",
        description: "Optional filter to show only sessions with this project marker"
      },
      hasErrors: {
        type: "boolean",
        description: "If true, only show sessions that have error logs"
      }
    }
  }
}
```

#### 7. `logs_health` (GET /health equivalent)

**Purpose**: Check server health and status.

```typescript
{
  name: "logs_health",
  description: "Check the health and status of the remote logging server. Returns server uptime, total sessions, total log count, and memory usage.",
  inputSchema: {
    type: "object",
    properties: {}
  }
}
```

#### 8. `logs_search` (NEW - recommended addition)

**Purpose**: Search logs by content.

```typescript
{
  name: "logs_search",
  description: "Search log messages for specific text or patterns. Use this to find logs related to specific functionality, errors, or user actions.",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Text to search for in log messages (case-insensitive substring match)"
      },
      regex: {
        type: "boolean",
        description: "If true, treat query as a regular expression (default: false)"
      },
      projectMarker: {
        type: "string",
        description: "Optional filter to search only in sessions with this project marker"
      },
      level: {
        type: "string",
        enum: ["ERROR", "WARN", "INFO", "DEBUG", "TRACE", "LOG"],
        description: "Optional filter to search only logs at this level"
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 100)"
      }
    },
    required: ["query"]
  }
}
```

#### 9. `logs_get_file_path` (NEW - for file-based access)

**Purpose**: Get the path to the JSONL log file for file-based searching.

```typescript
{
  name: "logs_get_file_path",
  description: "Get the path to the JSONL log file for a project. Use this when you want to search logs using file-based tools (Grep, Read) instead of the MCP query tools. The file is streamed in real-time as logs arrive. Located in temp directory for automatic OS cleanup.",
  inputSchema: {
    type: "object",
    properties: {
      workingDirectory: {
        type: "string",
        description: "Claude Code's current working directory to derive project marker"
      },
      projectMarker: {
        type: "string",
        description: "Explicit project marker (overrides workingDirectory derivation)"
      }
    }
  }
}
// Returns: {
//   path: "/tmp/remote-logger/remote-logging/logs.jsonl",
//   projectMarker: "remote-logging",
//   exists: true,
//   sizeBytes: 24576
// }
```

### Tools Recommendation Summary

| Tool | Maps To | Recommendation |
|------|---------|----------------|
| `logs_receive` | POST /log | **Keep** - Core functionality |
| `logs_get_all` | GET /logs | **Keep** - Useful for full history |
| `logs_get_recent` | GET /logs/recent | **Keep & Enhance** - Add filters |
| `logs_get_errors` | GET /logs/errors | **Keep** - Common debugging need |
| `logs_clear` | POST /logs/clear | **Keep** - Add confirmation |
| `logs_list_sessions` | NEW | **Add** - Essential for multi-project |
| `logs_health` | GET /health | **Keep** - Server monitoring |
| `logs_search` | NEW | **Add** - Powerful debugging aid |
| `logs_get_file_path` | NEW | **Add** - File-based access for Grep/Read |

### JSONL File Streaming

Logs are automatically streamed to JSONL files in the temp directory, organized by project marker:

#### Directory Structure

```
${os.tmpdir()}/remote-logger/
├── remote-logging/
│   └── logs.jsonl        # All sessions for remote-logging worktree
├── main/
│   └── logs.jsonl        # All sessions for main worktree
└── feature-xyz/
    └── logs.jsonl        # All sessions for feature-xyz worktree
```

#### JSONL Format

One JSON object per line, streamed in real-time:

```jsonl
{"time":"2024-01-15T10:30:00.000Z","sessionId":"app-abc123","projectMarker":"remote-logging","level":"INFO","message":"App started"}
{"time":"2024-01-15T10:30:01.000Z","sessionId":"app-abc123","projectMarker":"remote-logging","level":"DEBUG","message":"Loading config"}
{"time":"2024-01-15T10:30:02.000Z","sessionId":"app-def456","projectMarker":"remote-logging","level":"ERROR","message":"Connection failed"}
```

#### Two Ways to Access Logs

Claude Code can access logs via:

1. **MCP Tools** - Structured queries with filtering
   ```
   logs_get_recent({ workingDirectory: "/path/to/.worktrees/remote-logging", count: 50 })
   ```

2. **File Tools** - Grep/Read on JSONL for flexible searching
   ```
   # Get file path first
   logs_get_file_path({ workingDirectory: "/path/to/.worktrees/remote-logging" })
   # Returns: { path: "/tmp/remote-logger/remote-logging/logs.jsonl" }

   # Then use native tools
   Grep: pattern='"level":"ERROR"' path="/tmp/remote-logger/remote-logging/logs.jsonl"
   Grep: pattern='Connection failed' path="/tmp/remote-logger/remote-logging/logs.jsonl"
   Read: file_path="/tmp/remote-logger/remote-logging/logs.jsonl" offset=-100
   ```

#### Benefits

- **Real-time streaming** - Logs written immediately as received
- **Auto-cleanup** - Temp directory cleared by OS on reboot
- **Project isolation** - Each project marker gets its own directory
- **Flexible querying** - MCP tools for structured access, file tools for grep
- **No configuration** - Automatic, always enabled

### Project Marker System

#### The Correlation Problem

With multiple Claude Code instances in different git worktrees, we need **automatic correlation** so that:
- Browser clients automatically tag logs with their project identity
- Claude Code automatically queries logs for "its" project
- No human intervention or memory required

#### Solution: Path-Based Auto-Detection

The key insight is that both sides can derive a marker from the **git worktree path**:

| Side | How It Knows the Path | Derived Marker |
|------|----------------------|----------------|
| Browser (via Vite) | `process.cwd()` at build time | Injected via `__PROJECT_MARKER__` |
| Claude Code | Current working directory | Passed to MCP tools |
| MCP Server | Extracts from path | `path.basename()` or worktree name |

#### Browser Client: Vite Auto-Injection

The shared Vite config automatically injects the project marker:

```typescript
// vite.shared.config.ts
import path from "path";

export function createViteConfig(options) {
  const worktreePath = process.cwd();

  // Extract marker from path, e.g.:
  // /home/user/graphty-monorepo/.worktrees/remote-logging → "remote-logging"
  // /home/user/graphty-monorepo → "graphty-monorepo" (main worktree)
  const autoMarker = extractWorktreeMarker(worktreePath);

  return defineConfig({
    define: {
      '__REMOTE_LOG_PROJECT_MARKER__': JSON.stringify(
        process.env.REMOTE_LOG_MARKER ||  // Explicit override
        autoMarker ||                       // Auto-detected
        'default'
      ),
      '__REMOTE_LOG_WORKTREE_PATH__': JSON.stringify(worktreePath)
    }
  });
}

function extractWorktreeMarker(cwd: string): string {
  // Check if in .worktrees directory
  const worktreeMatch = cwd.match(/\.worktrees[\/\\]([^\/\\]+)/);
  if (worktreeMatch) {
    return worktreeMatch[1]; // e.g., "remote-logging"
  }
  // Fall back to directory name
  return path.basename(cwd);
}
```

**RemoteLogClient Auto-Detection:**

```typescript
// RemoteLogClient.ts
export class RemoteLogClient {
  constructor(options: RemoteLogClientOptions) {
    // Auto-detect project marker (zero config needed)
    this.projectMarker = options.projectMarker
      ?? (typeof __REMOTE_LOG_PROJECT_MARKER__ !== 'undefined'
          ? __REMOTE_LOG_PROJECT_MARKER__
          : undefined);

    this.worktreePath = typeof __REMOTE_LOG_WORKTREE_PATH__ !== 'undefined'
      ? __REMOTE_LOG_WORKTREE_PATH__
      : undefined;
  }
}
```

#### Claude Code: CWD-Based Queries

MCP tools accept working directory for automatic filtering:

```typescript
// logs_get_recent tool
{
  inputSchema: {
    properties: {
      workingDirectory: {
        type: "string",
        description: "Pass Claude Code's current working directory. The server will automatically derive the project marker and filter logs accordingly. This enables zero-config correlation between Claude Code instances and their browser clients."
      },
      // ... other properties
    }
  }
}
```

**Server-side marker extraction:**

```typescript
// mcp-server/marker-utils.ts
export function extractMarkerFromPath(cwd: string): string {
  // .worktrees/remote-logging → "remote-logging"
  const worktreeMatch = cwd.match(/\.worktrees[\/\\]([^\/\\]+)/);
  if (worktreeMatch) return worktreeMatch[1];

  // Regular directory → basename
  return path.basename(cwd);
}

// In tool handler
async function handleLogsGetRecent(args: { workingDirectory?: string }) {
  const marker = args.workingDirectory
    ? extractMarkerFromPath(args.workingDirectory)
    : undefined;

  return queryLogs({ projectMarker: marker });
}
```

#### Fallback Chain (Priority Order)

When determining project marker, use this precedence:

1. **Explicit parameter** in tool call or client config
2. **Environment variable** `REMOTE_LOG_MARKER`
3. **Auto-detected from path** (worktree name or directory basename)
4. **Page URL hostname** (for non-Vite environments)
5. **"default"** as final fallback

#### Additional Correlation Data

Sessions also store extra context for debugging correlation issues:

```typescript
interface SessionMetadata {
    sessionId: string;
    projectMarker: string;           // Derived or explicit
    worktreePath?: string;           // Full path if available
    pageUrl?: string;                // Browser URL
    userAgent?: string;              // Browser info
    firstLogTime: string;
    lastLogTime: string;
    logCount: number;
    errorCount: number;
}
```

#### Example: Zero-Config Workflow

**Setup** (one-time):
1. Add shared Vite config to monorepo (already done)
2. MCP server registered in Claude Code config

**Runtime** (automatic):
```
1. Developer runs `pnpm dev:graphty-element` in remote-logging worktree
2. Vite injects __REMOTE_LOG_PROJECT_MARKER__ = "remote-logging"
3. Browser loads app, RemoteLogClient auto-detects marker
4. Logs sent to MCP server tagged with "remote-logging"

5. Claude Code (CWD: .../worktrees/remote-logging) asks for logs
6. MCP tool receives workingDirectory parameter
7. Server extracts "remote-logging" from path
8. Returns only logs matching that marker
```

**No manual configuration needed!**

#### Manual Override Options

For edge cases, explicit configuration is still supported:

```typescript
// Override via environment variable
REMOTE_LOG_MARKER=my-custom-marker pnpm dev:graphty-element

// Override in client code
const client = new RemoteLogClient({
    url: "http://localhost:9080",
    projectMarker: "my-custom-marker"  // Explicit override
});

// Override in MCP tool call
logs_get_recent({ projectMarker: "specific-project" })
```

#### Server-Side Session Storage

```typescript
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

// Sessions stored with full metadata
const sessions = new Map<string, {
    metadata: SessionMetadata;
    logs: LogEntry[];
}>();
```

### Technical Architecture

#### Components

1. **MCP Server Core** (`src/mcp-server/mcp-server.ts`)
   - Implements MCP protocol using `@modelcontextprotocol/sdk`
   - Registers all tools with schemas
   - Handles tool execution
   - Manages STDIO transport

2. **Log Storage** (`src/mcp-server/log-storage.ts`)
   - In-memory storage with session metadata
   - Project marker indexing
   - Query methods for filtering/searching

3. **HTTP Bridge** (`src/mcp-server/http-bridge.ts`) - Optional
   - Maintains HTTP endpoints for browser clients
   - Forwards logs to MCP storage
   - Required because browsers can't speak MCP directly

4. **Existing Components** (modified)
   - `RemoteLogClient.ts` - Add projectMarker option
   - `log-server.ts` - Refactor to use shared storage

#### Data Flow

```
Browser Client                    MCP Server                    Claude Code
      │                               │                              │
      │  POST /log (HTTP)            │                              │
      ├─────────────────────────────►│                              │
      │                               │ Store in Log Storage        │
      │                               │                              │
      │                               │  tools/call logs_get_recent │
      │                               │◄─────────────────────────────┤
      │                               │                              │
      │                               │  Return filtered logs        │
      │                               ├─────────────────────────────►│
      │                               │                              │
```

#### Architecture Decision: Dual Interface

Since browser clients cannot speak MCP protocol (requires STDIO or SSE), the server must maintain **both**:

1. **HTTP Interface** (for browsers): Existing REST endpoints
2. **MCP Interface** (for Claude Code): STDIO-based tool calls

Both interfaces share the same log storage backend.

### Implementation Approach

1. **Phase 1: Core MCP Server**
   - Create `@modelcontextprotocol/sdk` based server
   - Implement all 8 tools with shared in-memory storage
   - Add STDIO transport for Claude Code

2. **Phase 2: Project Marker System**
   - Update `SessionMetadata` interface
   - Add marker extraction/detection logic
   - Add `projectMarker` option to RemoteLogClient

3. **Phase 3: HTTP Bridge Integration**
   - Refactor existing HTTP server to use shared storage
   - Ensure both MCP and HTTP interfaces work simultaneously
   - Single process handles both

4. **Phase 4: Enhanced Features**
   - Implement `logs_search` with regex support
   - Add log level filtering
   - Add time-based filtering

5. **Phase 5: Testing & Documentation**
   - Unit tests for MCP tools
   - Integration tests for HTTP+MCP
   - Update README with MCP usage

### User Interface/API

#### Claude Code Configuration

Add to `~/.config/claude-code/mcp.json` or project-specific config:

```json
{
  "mcpServers": {
    "remote-logger": {
      "command": "npx",
      "args": ["@graphty/remote-logger", "--mcp"]
    }
  }
}
```

#### Example Claude Code Usage

```
User: Check the recent logs from the remote-logging project

Claude: [Calls logs_get_recent with projectMarker: "remote-logging"]

Result: Here are the 15 most recent logs from remote-logging:
  [10:30:15] INFO - Application started
  [10:30:16] DEBUG - Loading configuration
  ...
```

#### Browser Client Usage

```typescript
import { RemoteLogClient } from "@graphty/remote-logger";

const logger = new RemoteLogClient({
    url: "http://localhost:9080",
    sessionPrefix: "my-app",
    projectMarker: "remote-logging"  // NEW
});

logger.log("INFO", "Application started");
```

## Acceptance Criteria

- [ ] MCP server implements all 9 tools with proper schemas and descriptions
- [ ] Browser clients can still send logs via HTTP (backward compatible)
- [ ] Claude Code can query logs filtered by project marker
- [ ] Session metadata includes project marker and is queryable
- [ ] `logs_search` supports both substring and regex search
- [ ] `logs_clear` requires confirmation parameter
- [ ] Health check returns meaningful status information
- [ ] All tools return structured JSON responses
- [ ] Logs automatically stream to JSONL files in temp directory
- [ ] JSONL files organized by project marker (`/tmp/remote-logger/{marker}/logs.jsonl`)
- [ ] `logs_get_file_path` returns correct path for project
- [ ] Vite auto-injects `__REMOTE_LOG_PROJECT_MARKER__` at build time
- [ ] Existing tests pass (backward compatibility)
- [ ] New tests cover MCP tool functionality

## Technical Considerations

### Performance

- **Impact**: In-memory storage unchanged; MCP adds minimal overhead
- **Mitigation**: STDIO transport is efficient; tool calls are synchronous
- **Log Volume**: Consider adding max log retention or rotation if needed

### Security

- **Considerations**: MCP runs locally via STDIO, no network exposure for MCP
- **HTTP Security**: Existing CORS headers maintained; consider optional auth
- **Input Validation**: All tool inputs validated via JSON Schema

### Compatibility

- **Backward Compatible**: HTTP endpoints remain functional
- **RemoteLogClient**: New `projectMarker` option is optional
- **Existing Integrations**: No breaking changes to graphty-element usage

### Testing

- **Unit Tests**: Each MCP tool handler
- **Integration Tests**: HTTP bridge + MCP storage coordination
- **E2E Tests**: Claude Code querying logs from browser client

## Risks and Mitigation

- **Risk**: Browser clients cannot directly communicate with MCP
  **Mitigation**: Maintain HTTP bridge; MCP is for Claude Code queries only

- **Risk**: Memory usage growth with many sessions
  **Mitigation**: Implement configurable log retention limits; add `logs_rotate` tool if needed

- **Risk**: Project marker extraction fails for edge cases
  **Mitigation**: Always allow explicit marker; fall back to "default" marker

- **Risk**: MCP SDK compatibility with Claude Code
  **Mitigation**: Use standard STDIO transport; test with actual Claude Code client

## Future Enhancements

1. **Persistent Storage**: Optional SQLite backend for log persistence across restarts
2. **Log Streaming**: SSE-based real-time log streaming to Claude Code
3. **Aggregation**: `logs_aggregate` tool for statistics (logs/minute, error rates)
4. **Export**: `logs_export` tool to save logs to file in various formats
5. **Alerts**: Configurable alerts when error threshold exceeded
6. **Multi-instance**: Support distributed logging from multiple servers

## Design Decisions (Confirmed)

Based on discussion:

1. **Project Marker Source**: ✅ Multiple options with fallback chain
   - Auto-detect from git worktree path (primary)
   - Environment variable `REMOTE_LOG_MARKER` (override)
   - Explicit parameter (final override)
   - This prevents confusion from accidental conflicts

2. **Log Retention**: ✅ Time-based, configurable
   - Delete logs after X days (configurable)
   - Default: 7 days (suggested)
   - Configurable via MCP server config or environment variable

3. **HTTP Port**: ✅ Configurable
   - Default: 9080 (existing)
   - Configurable via `--port` flag or config

4. **Startup Mode**: ✅ Dual mode
   - Always run both HTTP (for browsers) and MCP (for Claude Code)
   - Required since browsers cannot speak MCP protocol

5. **Authentication**: ✅ No auth required
   - Local development tool, no auth needed

## Implementation Estimate

Based on the scope:

- Phase 1 (Core MCP Server): 2-3 days
- Phase 2 (Project Marker System): 1-2 days
- Phase 3 (HTTP Bridge Integration): 1-2 days
- Phase 4 (Enhanced Features): 1-2 days
- Phase 5 (Testing & Documentation): 2 days

**Total: 7-11 days**

---

## Appendix: MCP Tool Description Best Practices

Based on MCP documentation, effective tool descriptions should:

1. **Start with the action**: "Get", "Search", "Clear", "List"
2. **Explain the purpose**: Why would someone use this tool?
3. **Describe the output**: What will be returned?
4. **Note constraints**: Limits, requirements, side effects
5. **Suggest alternatives**: When to use a different tool

### Example Well-Written Description

```
"Get the most recent log entries across all sessions, sorted by time.
This is the recommended tool for checking current application state.
Returns logs in chronological order (oldest first) for easier reading.
For debugging specific issues, consider using logs_search instead.
Maximum 500 entries can be returned per call."
```
