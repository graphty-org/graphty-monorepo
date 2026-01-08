/**
 * Remote Log Server - A standalone HTTP/HTTPS log server for remote debugging.
 *
 * Features:
 * - HTTPS with auto-generated self-signed certs or custom certs
 * - Receives logs from browser via POST /log
 * - Pretty terminal output with colors
 * - REST API for querying logs
 * - Optional file logging for Claude Code to read
 *
 * Usage:
 *   npx remote-log-server --port 9080
 *   npx remote-log-server --cert /path/to/cert.crt --key /path/to/key.key
 */

import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import * as os from "os";
import * as path from "path";
import { URL } from "url";

import { JsonlWriter } from "./jsonl-writer.js";
import { type LogEntry, LogStorage } from "./log-storage.js";
import { certFilesExist, generateSelfSignedCert, readCertFiles } from "./self-signed-cert.js";

// Shared log storage instance
let sharedStorage: LogStorage | null = null;
// Shared JSONL writer instance
let sharedJsonlWriter: JsonlWriter | null = null;

/**
 * Get the shared LogStorage instance, creating it if needed.
 * Creates a JsonlWriter for JSONL file streaming by default.
 * @returns The shared LogStorage instance
 */
export function getLogStorage(): LogStorage {
    if (!sharedStorage) {
        // Create JSONL writer for file streaming
        const jsonlBaseDir = path.join(os.tmpdir(), "remote-logger");
        sharedJsonlWriter = new JsonlWriter(jsonlBaseDir);

        // Create storage with JSONL writer
        sharedStorage = new LogStorage({ jsonlWriter: sharedJsonlWriter });
    }
    return sharedStorage;
}

/**
 * Get the shared JsonlWriter instance.
 * @returns The shared JsonlWriter instance or null if not initialized
 */
export function getJsonlWriter(): JsonlWriter | null {
    return sharedJsonlWriter;
}

/**
 * Set the shared LogStorage instance (for testing or external injection).
 * @param storage - The LogStorage instance to use
 */
export function setLogStorage(storage: LogStorage): void {
    sharedStorage = storage;
}

// ANSI color codes for terminal output
const colors = {
    reset: "\x1b[0m",
    bright: "\x1b[1m",
    dim: "\x1b[2m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
    bgRed: "\x1b[41m",
    bgYellow: "\x1b[43m",
};

export interface LogServerOptions {
    /** Port to listen on (default: 9080) */
    port?: number;
    /** Hostname to bind to (default: localhost) */
    host?: string;
    /** Path to SSL certificate file */
    certPath?: string;
    /** Path to SSL private key file */
    keyPath?: string;
    /** Path to file for writing logs (optional) */
    logFile?: string;
    /** Use HTTP instead of HTTPS (default: false) */
    useHttp?: boolean;
    /** Start in MCP server mode (default: false) @deprecated Use mcpOnly instead */
    mcp?: boolean;
    /** Start only MCP server (no HTTP) */
    mcpOnly?: boolean;
    /** Start only HTTP server (no MCP) - legacy mode */
    httpOnly?: boolean;
    /** Suppress startup banner (default: false) */
    quiet?: boolean;
}

// Re-export LogEntry from log-storage for backward compatibility
export type { LogEntry } from "./log-storage.js";

interface LogBatch {
    sessionId: string;
    logs: LogEntry[];
    projectMarker?: string;
    worktreePath?: string;
    pageUrl?: string;
}

// File stream for log file
let logFileStream: fs.WriteStream | null = null;

/**
 * Clear all stored logs.
 * Useful for testing.
 */
export function clearLogs(): void {
    getLogStorage().clear();
}

/**
 * Format log level for terminal output with colors.
 * @param level - The log level string
 * @returns Colored and formatted log level string
 */
function formatLogLevel(level: string): string {
    switch (level.toUpperCase()) {
        case "ERROR":
            return `${colors.bgRed}${colors.white} ERROR ${colors.reset}`;
        case "WARN":
        case "WARNING":
            return `${colors.bgYellow}${colors.bright} WARN  ${colors.reset}`;
        case "INFO":
            return `${colors.blue} INFO  ${colors.reset}`;
        case "DEBUG":
            return `${colors.cyan} DEBUG ${colors.reset}`;
        case "TRACE":
            return `${colors.dim} TRACE ${colors.reset}`;
        case "LOG":
        default:
            return `${colors.green} LOG   ${colors.reset}`;
    }
}

/**
 * Display a log entry in the terminal.
 * @param sessionId - The session ID for this log entry
 * @param log - The log entry to display
 * @param quiet - If true, suppress terminal output
 */
function displayLog(sessionId: string, log: LogEntry, quiet: boolean): void {
    if (!quiet) {
        const time = new Date(log.time).toLocaleTimeString();
        const level = formatLogLevel(log.level);
        const session = `${colors.cyan}[${sessionId.substring(0, 12)}]${colors.reset}`;

        // Truncate very long messages for display
        let { message } = log;
        if (message.length > 1000) {
            message = `${message.substring(0, 1000)}... [truncated]`;
        }

        // eslint-disable-next-line no-console
        console.log(`${time} ${session} ${level} ${message}`);
    }

    // Write to log file if configured
    if (logFileStream) {
        const logLine = JSON.stringify({
            time: log.time,
            sessionId,
            level: log.level,
            message: log.message,
        });
        logFileStream.write(`${logLine}\n`);
    }
}

/**
 * Handle incoming HTTP request.
 * @param req - The incoming HTTP request
 * @param res - The HTTP response object
 * @param host - The server hostname
 * @param port - The server port number
 * @param useHttps - Whether HTTPS is being used
 * @param quiet - If true, suppress terminal output
 */
function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
    host: string,
    port: number,
    useHttps: boolean,
    quiet: boolean,
): void {
    // CORS headers
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return;
    }

    const url = req.url ?? "/";
    const protocol = useHttps ? "https" : "http";

    // Handle log endpoint - receive logs from browser
    if (url === "/log" && req.method === "POST") {
        let body = "";
        req.on("data", (chunk: Buffer) => {
            body += chunk.toString();
        });
        req.on("end", () => {
            try {
                const data = JSON.parse(body) as LogBatch;
                const { sessionId, logs, projectMarker, worktreePath, pageUrl } = data;

                const storage = getLogStorage();
                const isNewSession = !storage.hasSession(sessionId);

                // Show new session banner
                if (isNewSession && !quiet) {
                    // eslint-disable-next-line no-console
                    console.log(
                        `\n${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}`,
                    );
                    // eslint-disable-next-line no-console
                    console.log(`${colors.bright}${colors.magenta}  NEW SESSION: ${sessionId}${colors.reset}`);
                    // eslint-disable-next-line no-console
                    console.log(
                        `${colors.bright}${colors.magenta}═══════════════════════════════════════════════════════════${colors.reset}\n`,
                    );
                }

                // Add logs to storage
                storage.addLogs(sessionId, logs, { projectMarker, worktreePath, pageUrl });

                // Display each log in terminal
                for (const log of logs) {
                    displayLog(sessionId, log, quiet);
                }

                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ success: true }));
            } catch (error) {
                if (!quiet) {
                    console.error("Error parsing log data:", error);
                }
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ error: "Invalid JSON" }));
            }
        });
        return;
    }

    // Handle logs viewer endpoint - GET all logs
    if (url === "/logs" && req.method === "GET") {
        const allLogs = getLogStorage().getAllLogsBySession();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(allLogs, null, 2));
        return;
    }

    // Handle recent logs endpoint - GET last N logs across all sessions
    if (url.startsWith("/logs/recent") && req.method === "GET") {
        const urlObj = new URL(url, `${protocol}://${host}:${port}`);
        const count = parseInt(urlObj.searchParams.get("n") ?? "50", 10);
        const errorsOnly = urlObj.searchParams.get("errors") === "true";

        const storage = getLogStorage();
        const filter = errorsOnly ? { level: "ERROR" } : {};
        const recentLogs = storage.getRecentLogs(count, filter);
        const totalLogs = storage.getLogs(filter).length;

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify(
                {
                    total: totalLogs,
                    showing: recentLogs.length,
                    logs: recentLogs,
                },
                null,
                2,
            ),
        );
        return;
    }

    // Handle errors-only endpoint
    if (url === "/logs/errors" && req.method === "GET") {
        const errorLogs = getLogStorage().getErrors();

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
            JSON.stringify(
                {
                    total: errorLogs.length,
                    logs: errorLogs,
                },
                null,
                2,
            ),
        );
        return;
    }

    // Handle clear logs endpoint
    if (url === "/logs/clear" && req.method === "POST") {
        getLogStorage().clear();
        if (!quiet) {
            // eslint-disable-next-line no-console
            console.log(`\n${colors.yellow}Logs cleared${colors.reset}\n`);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
        return;
    }

    // Health check endpoint
    if (url === "/health" && req.method === "GET") {
        const health = getLogStorage().getHealth();
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ status: health.status, sessions: health.sessionCount }));
        return;
    }

    // Default: 404
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not found" }));
}

/**
 * Print startup banner.
 * @param host - The server hostname
 * @param port - The server port number
 * @param useHttps - Whether HTTPS is being used
 */
function printBanner(host: string, port: number, useHttps: boolean): void {
    const protocol = useHttps ? "https" : "http";

    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log(
        `${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`,
    );
    // eslint-disable-next-line no-console
    console.log(`${colors.bright}${colors.cyan}  Remote Log Server${colors.reset}`);
    // eslint-disable-next-line no-console
    console.log(
        `${colors.bright}${colors.cyan}════════════════════════════════════════════════════════════${colors.reset}`,
    );
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log(
        `${colors.green}Server running at:${colors.reset} ${colors.bright}${protocol}://${host}:${port}/${colors.reset}`,
    );
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log(`${colors.yellow}API Endpoints:${colors.reset}`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}POST /log         ${colors.reset} - Receive logs from browser`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}GET  /logs        ${colors.reset} - Get all logs as JSON`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}GET  /logs/recent ${colors.reset} - Get last 50 logs (?n=100 for more)`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}GET  /logs/errors ${colors.reset} - Get only error logs`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}POST /logs/clear  ${colors.reset} - Clear all logs`);
    // eslint-disable-next-line no-console
    console.log(`  ${colors.cyan}GET  /health      ${colors.reset} - Health check`);
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log(`${colors.dim}Remote logs will appear below:${colors.reset}`);
    // eslint-disable-next-line no-console
    console.log(`${colors.cyan}────────────────────────────────────────────────────────────${colors.reset}`);
}

/**
 * Options for creating a log server without starting it.
 */
export interface CreateLogServerOptions {
    /** Port to listen on */
    port: number;
    /** Hostname to bind to */
    host: string;
    /** Shared log storage instance */
    storage: LogStorage;
    /** Use HTTP instead of HTTPS (default: false) */
    useHttp?: boolean;
    /** Suppress terminal output (default: false) */
    quiet?: boolean;
}

/**
 * Result of creating a log server.
 */
export interface CreateLogServerResult {
    /** The HTTP server instance (not yet listening) */
    server: http.Server;
}

/**
 * Create a log server with shared storage (for integration testing).
 * The server is not started - call server.listen() to start it.
 * @param options - Server configuration options
 * @returns The server instance
 */
export function createLogServer(options: CreateLogServerOptions): CreateLogServerResult {
    const { port, host, storage, quiet = true } = options;

    // Set the shared storage
    setLogStorage(storage);

    // Create HTTP server (integration tests use HTTP)
    const server = http.createServer((req, res) => {
        handleRequest(req, res, host, port, false, quiet);
    });

    return { server };
}

/**
 * Start the log server.
 * @param options - Server configuration options
 * @returns The HTTP or HTTPS server instance
 */
export function startLogServer(options: LogServerOptions = {}): http.Server | https.Server {
    const port = options.port ?? 9080;
    const host = options.host ?? "localhost";
    const useHttp = options.useHttp ?? false;
    const quiet = options.quiet ?? false;

    // Set up log file if specified
    if (options.logFile) {
        logFileStream = fs.createWriteStream(options.logFile, { flags: "a" });
        if (!quiet) {
            // eslint-disable-next-line no-console
            console.log(`${colors.green}Writing logs to: ${options.logFile}${colors.reset}`);
        }
    }

    // Determine SSL configuration
    let server: https.Server | http.Server;

    if (useHttp) {
        // Plain HTTP server
        server = http.createServer((req, res) => {
            handleRequest(req, res, host, port, false, quiet);
        });
    } else {
        // HTTPS server
        let cert: string;
        let key: string;

        if (options.certPath && options.keyPath && certFilesExist(options.certPath, options.keyPath)) {
            // Use provided certificates
            ({ cert, key } = readCertFiles(options.certPath, options.keyPath));
            if (!quiet) {
                // eslint-disable-next-line no-console
                console.log(`${colors.green}Using SSL certificates from: ${options.certPath}${colors.reset}`);
            }
        } else {
            // Generate self-signed certificate
            if (!quiet) {
                // eslint-disable-next-line no-console
                console.log(`${colors.yellow}Generating self-signed certificate for ${host}...${colors.reset}`);
            }

            ({ cert, key } = generateSelfSignedCert(host));
            if (!quiet) {
                // eslint-disable-next-line no-console
                console.log(
                    `${colors.yellow}Note: Browser will show certificate warning - this is expected for self-signed certs${colors.reset}`,
                );
            }
        }

        server = https.createServer({ cert, key }, (req, res) => {
            handleRequest(req, res, host, port, true, quiet);
        });
    }

    // Start listening
    server.listen(port, host, () => {
        if (!quiet) {
            printBanner(host, port, !useHttp);
        }
    });

    // Handle graceful shutdown
    process.on("SIGINT", () => {
        // eslint-disable-next-line no-console
        console.log(`\n${colors.yellow}Shutting down...${colors.reset}`);
        if (logFileStream) {
            logFileStream.end();
        }

        // Close JSONL writer to flush pending writes
        const jsonlWriter = getJsonlWriter();
        if (jsonlWriter) {
            void jsonlWriter.close();
        }

        server.close(() => {
            process.exit(0);
        });
    });

    return server;
}

/**
 * Help text displayed when --help is passed.
 */
export const HELP_TEXT = `
Remote Log Server - Remote logging for browser debugging

Usage:
  npx remote-log-server [options]
  npx @graphty/remote-logger [options]

Options:
  --port, -p <port>       Port to listen on (default: 9080)
  --host, -h <host>       Hostname to bind to (default: localhost)
  --cert, -c <path>       Path to SSL certificate file
  --key, -k <path>        Path to SSL private key file
  --log-file, -l <path>   Write logs to file
  --http                  Use HTTP instead of HTTPS
  --mcp-only              Start only MCP server (no HTTP)
  --http-only             Start only HTTP server (legacy mode)
  --mcp                   Alias for --mcp-only (deprecated)
  --quiet, -q             Suppress startup banner
  --help                  Show this help message

Modes:
  Default (no flags)      Dual mode: HTTP + MCP running together
  --mcp-only              MCP only: For Claude Code integration
  --http-only             HTTP only: Legacy mode for browser debugging

Examples:
  npx remote-log-server                           # Start dual mode (HTTP + MCP)
  npx remote-log-server --port 9085               # Custom port
  npx remote-log-server --http                    # Use HTTP instead of HTTPS
  npx remote-log-server --mcp-only                # MCP server only (for Claude Code)
  npx remote-log-server --http-only               # HTTP server only (legacy)
  npx remote-log-server --cert cert.crt --key key.key  # Custom SSL certs
  npx remote-log-server --log-file ./tmp/logs.jsonl    # Also write to file
`;

/**
 * Result of parsing command line arguments.
 */
export interface ParseArgsResult {
    /** Parsed options for the log server */
    options: LogServerOptions;
    /** Whether --help was requested */
    showHelp: boolean;
    /** Error message if parsing failed */
    error?: string;
}

/**
 * Parse command line arguments into LogServerOptions.
 * This is separated from main() to enable testing.
 * @param args - Array of command line arguments (excluding node and script name)
 * @returns ParseArgsResult with options, help flag, or error
 */
export function parseArgs(args: string[]): ParseArgsResult {
    const options: LogServerOptions = {};

    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        const nextArg = args[i + 1];

        switch (arg) {
            case "--port":
            case "-p":
                options.port = parseInt(nextArg, 10);
                i++;
                break;
            case "--host":
            case "-h":
                options.host = nextArg;
                i++;
                break;
            case "--cert":
            case "-c":
                options.certPath = nextArg;
                i++;
                break;
            case "--key":
            case "-k":
                options.keyPath = nextArg;
                i++;
                break;
            case "--log-file":
            case "-l":
                options.logFile = nextArg;
                i++;
                break;
            case "--http":
                options.useHttp = true;
                break;
            case "--mcp":
                // Legacy alias for --mcp-only. Only set mcpOnly now.
                options.mcpOnly = true;
                break;
            case "--mcp-only":
                options.mcpOnly = true;
                break;
            case "--http-only":
                options.httpOnly = true;
                break;
            case "--quiet":
            case "-q":
                options.quiet = true;
                break;
            case "--help":
                return { options, showHelp: true };
            default:
                return { options, showHelp: false, error: `Unknown option: ${arg}` };
        }
    }

    return { options, showHelp: false };
}

/**
 * Parse command line arguments and start the server.
 */
export async function main(): Promise<void> {
    const args = process.argv.slice(2);
    const result = parseArgs(args);

    if (result.showHelp) {
        // eslint-disable-next-line no-console
        console.log(HELP_TEXT);
        process.exit(0);
    }

    if (result.error) {
        console.error(result.error);
        process.exit(1);
    }

    const { options } = result;

    // Determine mode: mcp-only, http-only, or dual (default)
    if (options.mcpOnly) {
        // MCP-only mode
        const { startMcpServer } = await import("../mcp/index.js");
        const storage = getLogStorage();
        await startMcpServer(storage);
    } else if (options.httpOnly) {
        // HTTP-only mode (legacy)
        startLogServer(options);
    } else {
        // Dual mode (default): Start both HTTP and MCP
        const { createDualServer } = await import("./dual-server.js");

        const dualServer = await createDualServer({
            httpPort: options.port ?? 9080,
            httpHost: options.host ?? "localhost",
            httpEnabled: true,
            mcpEnabled: true,
            useHttp: options.useHttp ?? false,
            quiet: options.quiet ?? false,
            certPath: options.certPath,
            keyPath: options.keyPath,
            logFile: options.logFile,
        });

        // Handle graceful shutdown
        process.on("SIGINT", () => {
            // eslint-disable-next-line no-console
            console.log("\nShutting down...");
            void dualServer.shutdown().then(() => {
                process.exit(0);
            });
        });

        if (!options.quiet) {
            // eslint-disable-next-line no-console
            console.log("Dual mode: HTTP and MCP servers running");
        }
    }
}
