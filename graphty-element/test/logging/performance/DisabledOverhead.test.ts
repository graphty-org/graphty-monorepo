import { afterEach, assert, beforeEach, describe, type MockInstance, test, vi } from "vitest";

import { GraphtyLogger } from "../../../src/logging/GraphtyLogger.js";
import { resetLoggingConfig } from "../../../src/logging/LoggerConfig.js";
import { LogLevel } from "../../../src/logging/types.js";

// Empty mock function to satisfy linter
function noop(): void {
    // Intentionally empty
}

describe("Disabled Logging Overhead", () => {
    let consoleDebugSpy: MockInstance;
    let consoleInfoSpy: MockInstance;
    let consoleWarnSpy: MockInstance;
    let consoleErrorSpy: MockInstance;

    beforeEach(() => {
        // Reset logging config before each test
        resetLoggingConfig();
        // Spy on console methods
        vi.spyOn(console, "log").mockImplementation(noop);
        consoleDebugSpy = vi.spyOn(console, "debug").mockImplementation(noop);
        consoleInfoSpy = vi.spyOn(console, "info").mockImplementation(noop);
        consoleWarnSpy = vi.spyOn(console, "warn").mockImplementation(noop);
        consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(noop);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetLoggingConfig();
    });

    describe("disabled logging", () => {
        test("writes nothing to the console at any level", async () => {
            await GraphtyLogger.configure({
                enabled: false,
                level: LogLevel.TRACE,
                modules: "*",
                format: { timestamp: true, module: true },
            });

            const logger = GraphtyLogger.getLogger(["graphty", "test"]);

            for (let i = 0; i < 1000; i++) {
                logger.trace("trace message");
                logger.debug("debug message");
                logger.info("info message");
                logger.warn("warn message");
                logger.error("error message");
            }

            assert.strictEqual(consoleDebugSpy.mock.calls.length, 0);
            assert.strictEqual(consoleInfoSpy.mock.calls.length, 0);
            assert.strictEqual(consoleWarnSpy.mock.calls.length, 0);
            assert.strictEqual(consoleErrorSpy.mock.calls.length, 0);
        });

        test("reports every level guard as off, so guarded messages are never built", async () => {
            await GraphtyLogger.configure({
                enabled: false,
                level: LogLevel.TRACE,
                modules: "*",
                format: { timestamp: true, module: true },
            });

            const logger = GraphtyLogger.getLogger(["graphty", "test"]);

            assert.isFalse(logger.isTraceEnabled());
            assert.isFalse(logger.isDebugEnabled());
        });
    });

    describe("level guards", () => {
        test("isTraceEnabled and isDebugEnabled are off below the configured level", async () => {
            await GraphtyLogger.configure({
                enabled: true,
                level: LogLevel.WARN,
                modules: "*",
                format: { timestamp: true, module: true },
            });

            const logger = GraphtyLogger.getLogger(["graphty", "test"]);

            assert.isFalse(logger.isTraceEnabled());
            assert.isFalse(logger.isDebugEnabled());
        });

        test("isDebugEnabled is on at debug level, and isTraceEnabled stays off", async () => {
            await GraphtyLogger.configure({
                enabled: true,
                level: LogLevel.DEBUG,
                modules: "*",
                format: { timestamp: true, module: true },
            });

            const logger = GraphtyLogger.getLogger(["graphty", "test"]);

            assert.isTrue(logger.isDebugEnabled());
            assert.isFalse(logger.isTraceEnabled());
        });
    });

    describe("module filtering prevents overhead", () => {
        test("should not call log methods when module is filtered", async () => {
            await GraphtyLogger.configure({
                enabled: true,
                level: LogLevel.TRACE,
                modules: ["layout"], // Only layout is enabled
                format: { timestamp: true, module: true },
            });

            const xrLogger = GraphtyLogger.getLogger(["graphty", "xr"]);

            // Even with trace level, XR module is filtered
            xrLogger.trace("trace message");
            xrLogger.debug("debug message");
            xrLogger.info("info message");
            xrLogger.warn("warn message");
            xrLogger.error("error message");

            // No console methods should be called because module is filtered
            assert.strictEqual(consoleDebugSpy.mock.calls.length, 0);
            assert.strictEqual(consoleInfoSpy.mock.calls.length, 0);
            assert.strictEqual(consoleWarnSpy.mock.calls.length, 0);
            assert.strictEqual(consoleErrorSpy.mock.calls.length, 0);
        });

        test("should log when module is enabled", async () => {
            await GraphtyLogger.configure({
                enabled: true,
                level: LogLevel.DEBUG,
                modules: ["layout"], // Only layout is enabled
                format: { timestamp: true, module: true },
            });

            const layoutLogger = GraphtyLogger.getLogger(["graphty", "layout"]);

            layoutLogger.info("info message");

            // Console.info should be called for enabled module
            assert.strictEqual(consoleInfoSpy.mock.calls.length, 1);
        });
    });
});
