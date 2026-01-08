/**
 * Dual server orchestration for running HTTP and MCP interfaces simultaneously.
 *
 * This module provides a unified way to start both HTTP and MCP servers
 * that share the same log storage instance.
 * @module server/dual-server
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type * as http from "http";
import * as os from "os";
import * as path from "path";

import { createMcpServer } from "../mcp/mcp-server.js";
import { JsonlWriter } from "./jsonl-writer.js";
import { createLogServer } from "./log-server.js";
import { LogStorage } from "./log-storage.js";

/**
 * Options for creating a dual server.
 */
export interface DualServerOptions {
    /** Port for HTTP server (default: 9080) */
    httpPort?: number;
    /** Host for HTTP server (default: localhost) */
    httpHost?: string;
    /** Enable MCP server (default: true) */
    mcpEnabled?: boolean;
    /** Enable HTTP server (default: true) */
    httpEnabled?: boolean;
    /** Use HTTP instead of HTTPS (default: false) */
    useHttp?: boolean;
    /** Suppress terminal output (default: false) */
    quiet?: boolean;
    /** Path to SSL certificate file */
    certPath?: string;
    /** Path to SSL private key file */
    keyPath?: string;
    /** Path to file for writing logs (optional) */
    logFile?: string;
    /** External LogStorage instance (optional, will create one if not provided) */
    storage?: LogStorage;
    /** External JSONL writer instance (optional, will create one if not provided) */
    jsonlWriter?: JsonlWriter;
}

/**
 * Result of creating a dual server.
 */
export interface DualServerResult {
    /** HTTP server instance (if httpEnabled) */
    httpServer?: http.Server;
    /** MCP server instance (if mcpEnabled) */
    mcpServer?: McpServer;
    /** Shared log storage instance */
    storage: LogStorage;
    /** JSONL writer instance */
    jsonlWriter?: JsonlWriter;
    /** Graceful shutdown function */
    shutdown: () => Promise<void>;
}

/**
 * Create and start a dual server with HTTP and/or MCP interfaces.
 *
 * By default, both HTTP and MCP are enabled. Use httpEnabled/mcpEnabled
 * to control which interfaces to start.
 * @param options - Server configuration options
 * @returns Promise resolving to the dual server result
 */
export async function createDualServer(options: DualServerOptions = {}): Promise<DualServerResult> {
    const {
        httpPort = 9080,
        httpHost = "localhost",
        mcpEnabled = true,
        httpEnabled = true,
        useHttp = true, // Default to HTTP for integration testing
        quiet = false,
        storage: externalStorage,
        jsonlWriter: externalJsonlWriter,
    } = options;

    // Create or use provided JSONL writer
    const jsonlBaseDir = path.join(os.tmpdir(), "remote-logger");
    const jsonlWriter = externalJsonlWriter ?? new JsonlWriter(jsonlBaseDir);

    // Create or use provided storage
    const storage = externalStorage ?? new LogStorage({ jsonlWriter });

    let httpServer: http.Server | undefined;
    let mcpServer: McpServer | undefined;

    // Start HTTP server if enabled
    if (httpEnabled) {
        const result = createLogServer({
            port: httpPort,
            host: httpHost,
            storage,
            useHttp,
            quiet,
        });
        httpServer = result.server;

        // Wait for HTTP server to be listening
        const serverToStart = httpServer;
        await new Promise<void>((resolve, reject) => {
            serverToStart.on("error", reject);
            serverToStart.listen(httpPort, httpHost, () => {
                serverToStart.removeListener("error", reject);
                resolve();
            });
        });

        // Set server config in storage so MCP tools can report it
        const protocol = useHttp ? "http" : "https";
        storage.setServerConfig({
            httpPort,
            httpHost,
            protocol,
            httpEndpoint: `${protocol}://${httpHost}:${httpPort}/logs`,
        });
    }

    // Create MCP server if enabled (but don't connect - that happens when STDIO is ready)
    if (mcpEnabled) {
        mcpServer = createMcpServer(storage);
    }

    // Track if we created the JSONL writer internally
    const ownsJsonlWriter = !externalJsonlWriter;

    // Shutdown function
    const shutdown = async (): Promise<void> => {
        // Close HTTP server
        if (httpServer?.listening) {
            await new Promise<void>((resolve) => {
                httpServer.close(() => { resolve(); });
            });
        }

        // Close JSONL writer only if we created it internally
        if (ownsJsonlWriter) {
            await jsonlWriter.close();
        }

        // Stop cleanup timer if storage was created internally
        if (!externalStorage) {
            storage.stopCleanupTimer();
        }
    };

    return {
        httpServer,
        mcpServer,
        storage,
        jsonlWriter,
        shutdown,
    };
}
