/**
 * MCP Server for remote logging.
 *
 * Provides an MCP interface for Claude Code to query logs from browser
 * applications. Uses STDIO transport for communication.
 * @module mcp/mcp-server
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import type { LogStorage } from "../server/log-storage.js";
import {
    logsClearHandler,
    type LogsClearInput,
    logsClearInputSchema,
    logsClearTool,
    logsGetAllHandler,
    type LogsGetAllInput,
    logsGetAllInputSchema,
    logsGetAllTool,
    logsGetErrorsHandler,
    type LogsGetErrorsInput,
    logsGetErrorsInputSchema,
    logsGetErrorsTool,
    logsGetFilePathHandler,
    type LogsGetFilePathInput,
    logsGetFilePathInputSchema,
    logsGetFilePathTool,
    logsGetRecentHandler,
    type LogsGetRecentInput,
    logsGetRecentInputSchema,
    logsGetRecentTool,
    logsListSessionsHandler,
    type LogsListSessionsInput,
    logsListSessionsInputSchema,
    logsListSessionsTool,
    logsReceiveHandler,
    type LogsReceiveInput,
    logsReceiveInputSchema,
    logsReceiveTool,
    logsSearchHandler,
    type LogsSearchInput,
    logsSearchInputSchema,
    logsSearchTool,
    logsStatusHandler,
    logsStatusTool,
} from "./tools/index.js";

// Track registered tool names for testing
let registeredTools: string[] = [];

/**
 * Get the names of all registered tools.
 * Useful for testing.
 * @returns Array of registered tool names
 */
export function getToolNames(): string[] {
    return [...registeredTools];
}

/**
 * Server instructions for LLMs describing the overall purpose and usage.
 */
const SERVER_INSTRUCTIONS = `Remote Logger MCP Server - View console.log output from browser applications.

## What is Remote Logging?

Browser applications run in a sandbox - their console.log() output appears in browser DevTools but is NOT visible to CLI tools or this assistant. Remote logging bridges this gap by sending browser logs to a server where they can be queried.

## When to Use Remote Logging

Use this when debugging applications where developer tools aren't easily accessible:
- Storybook components (stories running in browser)
- Web applications during development
- Mobile web apps (phones, tablets) where DevTools requires USB debugging
- VR/AR applications where you can't see a console while wearing a headset
- Embedded devices, kiosks, or smart displays without keyboard access
- Any JavaScript running in a browser context

Remote logging is especially valuable for LLM assistants like this one - it enables reading, interpreting, and acting on application logs without requiring user interaction with browser DevTools.

## Architecture

Browser App → HTTP POST to /logs → Log Server (stores in memory + JSONL files) → MCP Tools (query logs)

## Setting Up a Browser App to Send Logs

First, get the server endpoint URL by calling logs_status - look for server.httpEndpoint in the response.

### Option 1: Using the RemoteLogClient SDK (Recommended)

Install: npm install @graphty/remote-logger

\`\`\`typescript
import { RemoteLogClient } from "@graphty/remote-logger";

const logger = new RemoteLogClient({
  serverUrl: "http://localhost:9080/logs",  // Get this from logs_status
  projectMarker: "my-project",               // Optional: for filtering
});

// Intercept all console.log/warn/error calls
logger.interceptConsole();

// Or log manually
logger.log("INFO", "Hello from browser!");
\`\`\`

### Option 2: Raw fetch() calls

\`\`\`typescript
fetch("http://localhost:9080/logs", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    sessionId: "unique-session-id",
    logs: [
      { time: new Date().toISOString(), level: "INFO", message: "Hello!" }
    ]
  })
});
\`\`\`

## Querying Logs (MCP Tools)

Once browser logs are flowing to the server:

1. logs_status - Check server health, get endpoint URL, see retention settings
2. logs_get_recent - View recent logs (primary tool, sorted chronologically)
3. logs_get_errors - Quick filter for ERROR level only
4. logs_search - Find specific text (supports regex)
5. logs_list_sessions - See all browser sessions
6. logs_get_all - Get all logs grouped by session
7. logs_get_file_path - Get JSONL file path for Grep/Read tools
8. logs_clear - Delete logs (requires confirmation)

## Typical Debugging Workflow

1. Call logs_status to verify server is running and get the endpoint URL
2. Ensure the browser app is configured to send logs to that endpoint
3. Trigger the action in the browser you want to debug
4. Call logs_get_recent to see what happened
5. Use logs_search if looking for specific errors or messages`;

/**
 * Create an MCP server with logging tools.
 *
 * Registers all logging tools and returns the configured server.
 * The server is not started; use `startMcpServer` to run it.
 * @param storage - The LogStorage instance to use for log operations
 * @returns Configured McpServer instance
 */
export function createMcpServer(storage: LogStorage): McpServer {
    const server = new McpServer(
        {
            name: "remote-logger",
            version: "1.0.0",
        },
        {
            instructions: SERVER_INSTRUCTIONS,
        },
    );

    // Reset registered tools
    registeredTools = [];

    // Register logs_get_recent tool
    server.registerTool(
        logsGetRecentTool.name,
        {
            description: logsGetRecentTool.description,
            inputSchema: logsGetRecentInputSchema,
        },
        (args: LogsGetRecentInput) => {
            return logsGetRecentHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsGetRecentTool.name);

    // Register logs_status tool
    server.registerTool(
        logsStatusTool.name,
        {
            description: logsStatusTool.description,
        },
        () => {
            return logsStatusHandler(storage).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsStatusTool.name);

    // Register logs_list_sessions tool
    server.registerTool(
        logsListSessionsTool.name,
        {
            description: logsListSessionsTool.description,
            inputSchema: logsListSessionsInputSchema,
        },
        (args: LogsListSessionsInput) => {
            return logsListSessionsHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsListSessionsTool.name);

    // Register logs_receive tool
    server.registerTool(
        logsReceiveTool.name,
        {
            description: logsReceiveTool.description,
            inputSchema: logsReceiveInputSchema,
        },
        (args: LogsReceiveInput) => {
            return logsReceiveHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsReceiveTool.name);

    // Register logs_get_all tool
    server.registerTool(
        logsGetAllTool.name,
        {
            description: logsGetAllTool.description,
            inputSchema: logsGetAllInputSchema,
        },
        (args: LogsGetAllInput) => {
            return logsGetAllHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsGetAllTool.name);

    // Register logs_get_errors tool
    server.registerTool(
        logsGetErrorsTool.name,
        {
            description: logsGetErrorsTool.description,
            inputSchema: logsGetErrorsInputSchema,
        },
        (args: LogsGetErrorsInput) => {
            return logsGetErrorsHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsGetErrorsTool.name);

    // Register logs_clear tool
    server.registerTool(
        logsClearTool.name,
        {
            description: logsClearTool.description,
            inputSchema: logsClearInputSchema,
        },
        (args: LogsClearInput) => {
            return logsClearHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsClearTool.name);

    // Register logs_search tool
    server.registerTool(
        logsSearchTool.name,
        {
            description: logsSearchTool.description,
            inputSchema: logsSearchInputSchema,
        },
        (args: LogsSearchInput) => {
            return logsSearchHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsSearchTool.name);

    // Register logs_get_file_path tool
    server.registerTool(
        logsGetFilePathTool.name,
        {
            description: logsGetFilePathTool.description,
            inputSchema: logsGetFilePathInputSchema,
        },
        (args: LogsGetFilePathInput) => {
            return logsGetFilePathHandler(storage, args).then((r) => ({
                content: [
                    {
                        type: "text" as const,
                        text: JSON.stringify(r, null, 2),
                    },
                ],
            }));
        },
    );
    registeredTools.push(logsGetFilePathTool.name);

    return server;
}

/**
 * Start the MCP server with STDIO transport.
 *
 * This function runs the MCP server and blocks until the connection is closed.
 * @param storage - The LogStorage instance to use for log operations
 */
export async function startMcpServer(storage: LogStorage): Promise<void> {
    const server = createMcpServer(storage);
    const transport = new StdioServerTransport();

    await server.connect(transport);

    // Keep the process alive
    // The connection will handle cleanup when stdin closes
}
