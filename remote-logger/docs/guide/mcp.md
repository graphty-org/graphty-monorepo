# MCP tools

The remote-logger includes a Model Context Protocol (MCP) server that allows Claude Code to directly query and manage logs. This enables AI-assisted debugging by letting Claude Code see browser console output in real-time.

## Setup with Claude Code

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

## Dual Mode (HTTP + MCP)

By default, the server runs in dual mode with both HTTP and MCP interfaces sharing the same log storage. This allows browsers to send logs via HTTP while Claude Code queries them via MCP.

```bash
# Start dual server (HTTP + MCP)
npx remote-log-server --port 9080
```

## MCP Tools

The MCP server provides 9 tools for log management:

### `logs_get_recent`

Get recent logs from the server, sorted by time (oldest first).

**Parameters:**

| Parameter          | Type     | Default | Description                                                  |
| ------------------ | -------- | ------- | ------------------------------------------------------------ |
| `count`            | `number` | `50`    | Number of logs to return (max 500)                           |
| `projectMarker`    | `string` | -       | Filter by project marker                                     |
| `workingDirectory` | `string` | -       | Derive marker from path (e.g., `/path/.worktrees/my-branch`) |
| `level`            | `string` | -       | Filter by log level (ERROR, WARN, INFO, DEBUG)               |
| `since`            | `string` | -       | Only logs after this ISO timestamp                           |

**Example usage in Claude Code:**

> "Show me the last 20 logs from the graphty-element project"

### `logs_status`

Get the status of the remote log server.

**Returns:**

- Server status, uptime, session count, log count, error count, memory usage
- HTTP endpoint configuration (port, host, protocol, full URL for browser clients)
- Retention settings (how long logs are kept before automatic cleanup)

**Example usage:**

> "What is the status of the remote logger?"
> "What URL should I use to configure the browser client?"
> "How long are logs retained?"

### `logs_list_sessions`

List all logging sessions with their metadata.

**Parameters:**

| Parameter       | Type      | Description                    |
| --------------- | --------- | ------------------------------ |
| `projectMarker` | `string`  | Filter by project marker       |
| `hasErrors`     | `boolean` | Only show sessions with errors |

**Returns:** Array of sessions with:

- `sessionId`, `projectMarker`, `worktreePath`, `pageUrl`
- `firstLogTime`, `lastLogTime`, `logCount`, `errorCount`

**Example usage:**

> "List all logging sessions that have errors"

### `logs_receive`

Store logs from a browser or application session.

**Parameters:**

| Parameter       | Type     | Required | Description               |
| --------------- | -------- | -------- | ------------------------- |
| `sessionId`     | `string` | Yes      | Unique session identifier |
| `logs`          | `array`  | Yes      | Array of log entries      |
| `projectMarker` | `string` | No       | Project identifier        |
| `worktreePath`  | `string` | No       | Full worktree path        |
| `pageUrl`       | `string` | No       | Browser page URL          |

### `logs_get_all`

Get all logs grouped by session.

**Parameters:**

| Parameter       | Type     | Description              |
| --------------- | -------- | ------------------------ |
| `projectMarker` | `string` | Filter by project marker |

**Returns:** Object mapping session IDs to log arrays

### `logs_get_errors`

Get only ERROR level logs.

**Parameters:**

| Parameter       | Type     | Description                      |
| --------------- | -------- | -------------------------------- |
| `projectMarker` | `string` | Filter by project marker         |
| `since`         | `string` | Only errors after this timestamp |

**Example usage:**

> "Show me all errors from the current project"

### `logs_clear`

Clear logs from the server.

**Parameters:**

| Parameter       | Type      | Required | Description                    |
| --------------- | --------- | -------- | ------------------------------ |
| `confirm`       | `boolean` | Yes      | Must be `true` to proceed      |
| `projectMarker` | `string`  | No       | Only clear this project's logs |
| `sessionId`     | `string`  | No       | Only clear this session's logs |

**Example usage:**

> "Clear all logs for the remote-logging project, confirm"

### `logs_search`

Search logs by text pattern.

**Parameters:**

| Parameter       | Type      | Default  | Description                  |
| --------------- | --------- | -------- | ---------------------------- |
| `query`         | `string`  | required | Search text or regex pattern |
| `regex`         | `boolean` | `false`  | Treat query as regex         |
| `projectMarker` | `string`  | -        | Filter by project            |
| `level`         | `string`  | -        | Filter by log level          |
| `limit`         | `number`  | `100`    | Max results (max 1000)       |

**Example usage:**

> "Search the logs for 'connection failed'"
> "Search logs for any network errors using regex 'network|timeout|connection'"

### `logs_get_file_path`

Get the file path to the JSONL log file for a project.

**Parameters:**

| Parameter          | Type     | Description             |
| ------------------ | -------- | ----------------------- |
| `projectMarker`    | `string` | Project marker          |
| `workingDirectory` | `string` | Derive marker from path |

**Returns:** File path, existence status, and size

**Example usage:**

> "Get the log file path for this project so I can grep it"

This tool is useful for accessing logs via file-based tools like `Grep` or `Read` when you need more advanced searching capabilities.

## Project Markers

Project markers allow you to filter logs by project, which is especially useful in monorepos or when working with multiple projects simultaneously.

Markers are determined in the following priority:

1. Explicit `projectMarker` parameter
2. Derived from `workingDirectory` path (extracts from `.worktrees/` or uses basename)
3. Extracted from `sessionId` prefix (e.g., `graphty-element-123-abc` → `graphty-element`)
4. Default: `"default"`

## JSONL File Organization

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
