/**
 * Dual server orchestration for running HTTP and MCP interfaces simultaneously.
 *
 * This module provides a unified way to start both HTTP and MCP servers
 * that share the same log storage instance.
 * @module server/dual-server
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type * as http from "http";
import type * as https from "https";
import * as net from "net";
import * as os from "os";
import * as path from "path";

import { createMcpServer } from "../mcp/mcp-server.js";
import { JsonlWriter } from "./jsonl-writer.js";
import { createLogServer } from "./log-server.js";
import { LogStorage, type ServerMode } from "./log-storage.js";
import { certFilesExist } from "./self-signed-cert.js";

// ANSI color codes for terminal output
const colors = {
    reset: "\x1b[0m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    cyan: "\x1b[36m",
};

/** Maximum number of ports to try when scanning for available port */
const MAX_PORT_SCAN_ATTEMPTS = 100;

/** Maximum port number allowed (ports 9000-9099 per project guidelines) */
const MAX_PORT_NUMBER = 9099;

/**
 * Check if a port is available for binding.
 * @param port - Port number to check
 * @param host - Host to bind to
 * @returns Promise resolving to true if port is available, false otherwise
 */
async function isPortAvailable(port: number, host: string): Promise<boolean> {
    return new Promise((resolve) => {
        const server = net.createServer();

        // Enable SO_REUSEADDR to allow faster port reuse after server shutdown
        server.once("error", (err: NodeJS.ErrnoException) => {
            if (err.code === "EADDRINUSE") {
                resolve(false);
            } else {
                // Other errors (permission, etc.) - port is not usable
                resolve(false);
            }
        });

        server.once("listening", () => {
            server.close(() => {
                resolve(true);
            });
        });

        // Set SO_REUSEADDR before binding
        server.listen({ port, host, exclusive: false });
    });
}

/**
 * Find an available port starting from the given base port.
 * Increments port number until an available port is found.
 * @param basePort - Starting port number
 * @param host - Host to bind to
 * @param quiet - Suppress output messages
 * @returns Promise resolving to available port number
 * @throws Error if no available port found within MAX_PORT_SCAN_ATTEMPTS
 */
export async function findAvailablePort(basePort: number, host: string, quiet: boolean = false): Promise<number> {
    let port = basePort;
    let attempts = 0;

    while (attempts < MAX_PORT_SCAN_ATTEMPTS) {
        if (port > MAX_PORT_NUMBER) {
            // Wrap around if we exceed max port (shouldn't happen normally)
            break;
        }

        if (await isPortAvailable(port, host)) {
            if (port !== basePort && !quiet) {
                // eslint-disable-next-line no-console
                console.log(
                    `${colors.yellow}Port ${basePort} in use, using port ${port} instead${colors.reset}`,
                );
            }
            return port;
        }

        if (!quiet && attempts === 0) {
            // eslint-disable-next-line no-console
            console.log(
                `${colors.yellow}Port ${port} is already in use, scanning for available port...${colors.reset}`,
            );
        }

        port++;
        attempts++;
    }

    // No available port found
    const errorMsg = `Could not find available port after ${MAX_PORT_SCAN_ATTEMPTS} attempts starting from ${basePort}. ` +
        `Ports ${basePort}-${port - 1} are all in use. ` +
        `Try killing existing processes: pkill -f "remote-log-server"`;

    if (!quiet) {
         
        console.error(`${colors.red}${errorMsg}${colors.reset}`);
    }

    throw new Error(errorMsg);
}

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
    /** Suppress terminal output (default: false) */
    quiet?: boolean;
    /** Path to SSL certificate file (HTTPS only used if both certPath and keyPath provided) */
    certPath?: string;
    /** Path to SSL private key file (HTTPS only used if both certPath and keyPath provided) */
    keyPath?: string;
    /** Path to file for writing logs (optional) */
    logFile?: string;
    /** External LogStorage instance (optional, will create one if not provided) */
    storage?: LogStorage;
    /** External JSONL writer instance (optional, will create one if not provided) */
    jsonlWriter?: JsonlWriter;
    /** Only serve /log POST and /health GET endpoints (default: false) */
    logReceiveOnly?: boolean;
}

/**
 * Result of creating a dual server.
 */
export interface DualServerResult {
    /** HTTP or HTTPS server instance (if httpEnabled) */
    httpServer?: http.Server | https.Server;
    /** MCP server instance (if mcpEnabled) */
    mcpServer?: McpServer;
    /** Shared log storage instance */
    storage: LogStorage;
    /** JSONL writer instance */
    jsonlWriter?: JsonlWriter;
    /** Actual HTTP port used (may differ from requested if port was in use) */
    httpPort?: number;
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
        httpPort: requestedPort = 9080,
        httpHost = "localhost",
        mcpEnabled = true,
        httpEnabled = true,
        quiet = false,
        storage: externalStorage,
        jsonlWriter: externalJsonlWriter,
        logReceiveOnly = false,
        certPath,
        keyPath,
    } = options;

    // Create or use provided JSONL writer
    const jsonlBaseDir = path.join(os.tmpdir(), "remote-logger");
    const jsonlWriter = externalJsonlWriter ?? new JsonlWriter(jsonlBaseDir);

    // Create or use provided storage
    const storage = externalStorage ?? new LogStorage({ jsonlWriter });

    let httpServer: http.Server | https.Server | undefined;
    let mcpServer: McpServer | undefined;
    let actualHttpPort: number | undefined;

    // Start HTTP server if enabled
    if (httpEnabled) {
        // Find an available port starting from the requested port
        actualHttpPort = await findAvailablePort(requestedPort, httpHost, quiet);

        const result = createLogServer({
            port: actualHttpPort,
            host: httpHost,
            storage,
            quiet,
            logReceiveOnly,
            certPath,
            keyPath,
        });
        httpServer = result.server;

        // Wait for HTTP server to be listening
        const serverToStart = httpServer;
        const portToUse = actualHttpPort;
        await new Promise<void>((resolve, reject) => {
            serverToStart.on("error", (err: NodeJS.ErrnoException) => {
                // Provide helpful error message for port conflicts
                if (err.code === "EADDRINUSE") {
                    const errorMsg = `Port ${portToUse} is already in use. ` +
                        `This shouldn't happen after port scanning - there may be a race condition. ` +
                        `Try again or kill existing processes: pkill -f "remote-log-server"`;
                    if (!quiet) {
                         
                        console.error(`${colors.red}${errorMsg}${colors.reset}`);
                    }
                    reject(new Error(errorMsg));
                } else {
                    reject(err);
                }
            });
            serverToStart.listen({ port: portToUse, host: httpHost, exclusive: false }, () => {
                serverToStart.removeListener("error", reject);
                if (!quiet) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `${colors.green}HTTP server listening on ${httpHost}:${portToUse}${colors.reset}`,
                    );
                }
                resolve();
            });
        });

        // Set server config in storage so MCP tools can report it
        // Determine protocol based on whether valid cert files were provided
        const useHttps = certPath && keyPath && certFilesExist(certPath, keyPath);
        const protocol = useHttps ? "https" : "http";
        // Determine mode based on configuration
        let mode: ServerMode;
        if (logReceiveOnly && mcpEnabled) {
            mode = "mcp-only";
        } else if (!mcpEnabled) {
            mode = "http-only";
        } else {
            mode = "dual";
        }
        storage.setServerConfig({
            httpPort: actualHttpPort,
            httpHost,
            protocol,
            httpEndpoint: `${protocol}://${httpHost}:${actualHttpPort}/log`,
            mode,
        });
    }

    // Create and connect MCP server if enabled
    if (mcpEnabled) {
        mcpServer = createMcpServer(storage);
        const transport = new StdioServerTransport();
        await mcpServer.connect(transport);
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
        httpPort: actualHttpPort,
        shutdown,
    };
}
