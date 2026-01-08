import { describe, expect, test } from "vitest";

import { HELP_TEXT, parseArgs } from "../../src/server/log-server.js";

describe("CLI", () => {
    describe("parseArgs", () => {
        test("should parse --port argument", () => {
            const result = parseArgs(["--port", "9085"]);
            expect(result.options.port).toBe(9085);
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should parse -p argument (short form)", () => {
            const result = parseArgs(["-p", "9090"]);
            expect(result.options.port).toBe(9090);
        });

        test("should parse --host argument", () => {
            const result = parseArgs(["--host", "0.0.0.0"]);
            expect(result.options.host).toBe("0.0.0.0");
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should parse -h argument (short form)", () => {
            const result = parseArgs(["-h", "example.com"]);
            expect(result.options.host).toBe("example.com");
        });

        test("should parse --cert and --key arguments", () => {
            const result = parseArgs(["--cert", "/path/to/cert.crt", "--key", "/path/to/key.key"]);
            expect(result.options.certPath).toBe("/path/to/cert.crt");
            expect(result.options.keyPath).toBe("/path/to/key.key");
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should parse -c and -k arguments (short form)", () => {
            const result = parseArgs(["-c", "cert.pem", "-k", "key.pem"]);
            expect(result.options.certPath).toBe("cert.pem");
            expect(result.options.keyPath).toBe("key.pem");
        });

        test("should parse --http flag", () => {
            const result = parseArgs(["--http"]);
            expect(result.options.useHttp).toBe(true);
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should parse --log-file argument", () => {
            const result = parseArgs(["--log-file", "/var/log/app.jsonl"]);
            expect(result.options.logFile).toBe("/var/log/app.jsonl");
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should parse -l argument (short form)", () => {
            const result = parseArgs(["-l", "./logs.jsonl"]);
            expect(result.options.logFile).toBe("./logs.jsonl");
        });

        test("should parse --quiet flag", () => {
            const result = parseArgs(["--quiet"]);
            expect(result.options.quiet).toBe(true);
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should parse -q flag (short form)", () => {
            const result = parseArgs(["-q"]);
            expect(result.options.quiet).toBe(true);
        });

        test("should set showHelp with --help", () => {
            const result = parseArgs(["--help"]);
            expect(result.showHelp).toBe(true);
            expect(result.error).toBeUndefined();
        });

        test("should use defaults when no arguments", () => {
            const result = parseArgs([]);
            expect(result.options.port).toBeUndefined();
            expect(result.options.host).toBeUndefined();
            expect(result.options.certPath).toBeUndefined();
            expect(result.options.keyPath).toBeUndefined();
            expect(result.options.logFile).toBeUndefined();
            expect(result.options.useHttp).toBeUndefined();
            expect(result.options.quiet).toBeUndefined();
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should return error for unknown option", () => {
            const result = parseArgs(["--unknown-flag"]);
            expect(result.error).toBe("Unknown option: --unknown-flag");
            expect(result.showHelp).toBe(false);
        });

        test("should parse multiple arguments together", () => {
            const result = parseArgs([
                "--port",
                "9090",
                "--host",
                "0.0.0.0",
                "--http",
                "--quiet",
                "--log-file",
                "./logs.jsonl",
            ]);
            expect(result.options.port).toBe(9090);
            expect(result.options.host).toBe("0.0.0.0");
            expect(result.options.useHttp).toBe(true);
            expect(result.options.quiet).toBe(true);
            expect(result.options.logFile).toBe("./logs.jsonl");
            expect(result.showHelp).toBe(false);
            expect(result.error).toBeUndefined();
        });

        test("should stop parsing at --help even with other args", () => {
            const result = parseArgs(["--port", "9090", "--help", "--http"]);
            // Should return immediately upon encountering --help
            expect(result.showHelp).toBe(true);
            // Options parsed before --help are included
            expect(result.options.port).toBe(9090);
        });

        test("should stop parsing at unknown option", () => {
            const result = parseArgs(["--port", "9090", "--bad-option", "--http"]);
            // Should return immediately upon encountering unknown option
            expect(result.error).toBe("Unknown option: --bad-option");
            // Options parsed before error are included
            expect(result.options.port).toBe(9090);
        });
    });

    describe("HELP_TEXT", () => {
        test("should contain usage information", () => {
            expect(HELP_TEXT).toContain("Usage:");
            expect(HELP_TEXT).toContain("npx remote-log-server");
        });

        test("should document all options", () => {
            expect(HELP_TEXT).toContain("--port");
            expect(HELP_TEXT).toContain("-p");
            expect(HELP_TEXT).toContain("--host");
            expect(HELP_TEXT).toContain("-h");
            expect(HELP_TEXT).toContain("--cert");
            expect(HELP_TEXT).toContain("-c");
            expect(HELP_TEXT).toContain("--key");
            expect(HELP_TEXT).toContain("-k");
            expect(HELP_TEXT).toContain("--log-file");
            expect(HELP_TEXT).toContain("-l");
            expect(HELP_TEXT).toContain("--http");
            expect(HELP_TEXT).toContain("--quiet");
            expect(HELP_TEXT).toContain("-q");
            expect(HELP_TEXT).toContain("--help");
        });

        test("should contain examples section", () => {
            expect(HELP_TEXT).toContain("Examples:");
        });
    });
});
