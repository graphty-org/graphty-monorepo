/**
 * Dual server orchestration for running HTTP and MCP interfaces simultaneously.
 *
 * This module provides a unified way to start both HTTP and MCP servers
 * that share the same log storage instance.
 * @module server/dual-server
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as http from "http";
import * as https from "https";
import { internalIpV4Sync } from "internal-ip";
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

/** Maximum retries for binding after EADDRINUSE during listen */
const MAX_BIND_RETRIES = 10;

/**
 * Attempt to bind an HTTP/HTTPS server to a port with retry on EADDRINUSE.
 * This handles race conditions where a port becomes unavailable between
 * port scanning and actual binding.
 * @param serverFactory - Function to create a new server instance
 * @param startPort - Starting port to try
 * @param host - Host to bind to
 * @param quiet - Suppress output messages
 * @param maxPort - Maximum port number to scan up to (default: 9099)
 * @returns Promise resolving to bound server and actual port
 */
async function tryBindWithRetry(
    serverFactory: () => http.Server | https.Server,
    startPort: number,
    host: string,
    quiet: boolean,
    maxPort: number = MAX_PORT_NUMBER,
): Promise<{ server: http.Server | https.Server; port: number }> {
    let port = startPort;
    let attempts = 0;

    while (attempts < MAX_BIND_RETRIES) {
        if (port > maxPort) {
            break;
        }

        const server = serverFactory();

        try {
            await new Promise<void>((resolve, reject) => {
                const errorHandler = (err: NodeJS.ErrnoException): void => {
                    if (err.code === "EADDRINUSE") {
                        if (!quiet) {
                            // eslint-disable-next-line no-console
                            console.log(
                                `${colors.yellow}Port ${port} claimed during bind, trying ${port + 1}...${colors.reset}`,
                            );
                        }
                        reject(err);
                    } else {
                        reject(err);
                    }
                };

                server.once("error", errorHandler);
                server.listen({ port, host, exclusive: false }, () => {
                    server.removeListener("error", errorHandler);
                    resolve();
                });
            });

            // Success - server is bound
            if (!quiet) {
                // eslint-disable-next-line no-console
                console.log(
                    `${colors.green}HTTP server listening on ${host}:${port}${colors.reset}`,
                );
            }
            return { server, port };
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "EADDRINUSE") {
                port++;
                attempts++;
                continue;
            }
            // Re-throw non-EADDRINUSE errors
            throw err;
        }
    }

    // Exhausted retries
    const errorMsg = `Could not bind to any port after ${attempts} attempts. ` +
        `Ports ${startPort}-${port - 1} are all in use or were claimed during bind.`;

    if (!quiet) {
        console.error(`${colors.red}${errorMsg}${colors.reset}`);
    }

    throw new Error(errorMsg);
}

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
 * @param maxPort - Maximum port number to scan up to (default: 9099)
 * @returns Promise resolving to available port number
 * @throws Error if no available port found within MAX_PORT_SCAN_ATTEMPTS
 */
export async function findAvailablePort(
    basePort: number,
    host: string,
    quiet: boolean = false,
    maxPort: number = MAX_PORT_NUMBER,
): Promise<number> {
    let port = basePort;
    let attempts = 0;

    while (attempts < MAX_PORT_SCAN_ATTEMPTS) {
        if (port > maxPort) {
            // Stop if we exceed max port
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
    const errorMsg = `Could not find available port after ${attempts} attempts starting from ${basePort}. ` +
        `Ports ${basePort}-${Math.min(port - 1, maxPort)} are all in use. ` +
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
    /** Host for HTTP server (default: 0.0.0.0) */
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
    /** Maximum port number to scan up to (default: 9099) */
    maxPortNumber?: number;
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
        httpHost = "0.0.0.0",
        mcpEnabled = true,
        httpEnabled = true,
        quiet = false,
        storage: externalStorage,
        jsonlWriter: externalJsonlWriter,
        logReceiveOnly = false,
        certPath,
        keyPath,
        maxPortNumber = MAX_PORT_NUMBER,
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
        const startPort = await findAvailablePort(requestedPort, httpHost, quiet, maxPortNumber);

        // Factory function to create server instances (for retry on bind failure)
        const createServerInstance = (): http.Server | https.Server => {
            return createLogServer({
                port: startPort, // Port is set but not used until bind
                host: httpHost,
                storage,
                quiet: true, // Quiet during factory, messages handled by tryBindWithRetry
                logReceiveOnly,
                certPath,
                keyPath,
            }).server;
        };

        // Bind with retry logic to handle race conditions
        const bindResult = await tryBindWithRetry(
            createServerInstance,
            startPort,
            httpHost,
            quiet,
            maxPortNumber,
        );
        httpServer = bindResult.server;
        actualHttpPort = bindResult.port;

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
        // When bound to all interfaces (0.0.0.0), detect the machine's IP address
        // for the endpoint URL since 0.0.0.0 is not a routable address for clients
        let endpointHost = httpHost;
        if (httpHost === "0.0.0.0") {
            const internalIp = internalIpV4Sync();
            if (internalIp) {
                endpointHost = internalIp;
            } else {
                // Fallback for local-only use - don't use hostname as it may not resolve
                endpointHost = "127.0.0.1";
                if (!quiet) {
                    console.warn(
                        `${colors.yellow}Could not detect LAN IP. Endpoint URL will only work locally.${colors.reset}`,
                    );
                }
            }
        }
        storage.setServerConfig({
            httpPort: actualHttpPort,
            httpHost,
            protocol,
            httpEndpoint: `${protocol}://${endpointHost}:${actualHttpPort}/log`,
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
