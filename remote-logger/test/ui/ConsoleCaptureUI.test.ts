/**
 * Unit tests for ConsoleCaptureUI - console interception and floating UI widget
 * Tests run in happy-dom environment to provide window and document globals
 */
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { ConsoleCaptureUI, initConsoleCaptureUI } from "../../src/ui/index.js";

// Extended window interface for global console methods
declare global {
    interface Window {
        __console__?: {
            copy: () => Promise<void>;
            download: () => void;
            clear: () => void;
            get: () => string;
            logs: unknown[];
        };
    }
}

describe("ConsoleCaptureUI", () => {
    let originalLog: typeof console.log;
    let originalError: typeof console.error;
    let originalWarn: typeof console.warn;
    let originalInfo: typeof console.info;
    let originalDebug: typeof console.debug;
    let ui: ConsoleCaptureUI | null = null;
    let clipboardWriteTextMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Store originals before ConsoleCaptureUI intercepts them
        originalLog = console.log;
        originalError = console.error;
        originalWarn = console.warn;
        originalInfo = console.info;
        originalDebug = console.debug;

        // Mock clipboard API using Object.defineProperty which works with happy-dom
        clipboardWriteTextMock = vi.fn().mockResolvedValue(undefined);
        Object.defineProperty(navigator, "clipboard", {
            value: {
                writeText: clipboardWriteTextMock,
            },
            writable: true,
            configurable: true,
        });
    });

    afterEach(() => {
        // Clean up UI if it was created
        if (ui) {
            ui.destroy();
            ui = null;
        }
        // Restore console methods if needed
        console.log = originalLog;
        console.error = originalError;
        console.warn = originalWarn;
        console.info = originalInfo;
        console.debug = originalDebug;
    });

    describe("console interception", () => {
        test("should intercept console.log", () => {
            ui = new ConsoleCaptureUI();
            console.log("test log message");
            const logs = ui.getLogs();
            expect(logs).toContain("test log message");
            expect(logs).toContain("[LOG]");
        });

        test("should intercept console.error", () => {
            ui = new ConsoleCaptureUI();
            console.error("test error message");
            const logs = ui.getLogs();
            expect(logs).toContain("test error message");
            expect(logs).toContain("[ERROR]");
        });

        test("should intercept console.warn", () => {
            ui = new ConsoleCaptureUI();
            console.warn("test warning message");
            const logs = ui.getLogs();
            expect(logs).toContain("test warning message");
            expect(logs).toContain("[WARN]");
        });

        test("should intercept console.info", () => {
            ui = new ConsoleCaptureUI();
            console.info("test info message");
            const logs = ui.getLogs();
            expect(logs).toContain("test info message");
            expect(logs).toContain("[INFO]");
        });

        test("should intercept console.debug", () => {
            ui = new ConsoleCaptureUI();
            console.debug("test debug message");
            const logs = ui.getLogs();
            expect(logs).toContain("test debug message");
            expect(logs).toContain("[DEBUG]");
        });

        test("should format log entries with timestamp", () => {
            ui = new ConsoleCaptureUI();
            console.log("timestamped message");
            const logs = ui.getLogs();
            // Should contain ISO-like timestamp pattern
            expect(logs).toMatch(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
        });

        test("should still call original console methods", () => {
            const spy = vi.fn();
            console.log = spy;
            ui = new ConsoleCaptureUI();
            console.log("pass through test");
            expect(spy).toHaveBeenCalledWith("pass through test");
        });

        test("should handle multiple arguments", () => {
            ui = new ConsoleCaptureUI();
            console.log("message", "with", "multiple", "parts");
            const logs = ui.getLogs();
            expect(logs).toContain("message");
            expect(logs).toContain("with");
            expect(logs).toContain("multiple");
            expect(logs).toContain("parts");
        });

        test("should handle objects in log messages", () => {
            ui = new ConsoleCaptureUI();
            console.log("object:", { key: "value", num: 42 });
            const logs = ui.getLogs();
            expect(logs).toContain("key");
            expect(logs).toContain("value");
        });
    });

    describe("floating button UI", () => {
        test("should create floating button on initialization", () => {
            ui = new ConsoleCaptureUI();
            const btn = document.getElementById("console-capture-btn");
            expect(btn).not.toBeNull();
            expect(btn?.textContent).toContain("📋");
        });

        test("should create menu with all buttons", () => {
            ui = new ConsoleCaptureUI();
            expect(document.getElementById("cc-copy")).not.toBeNull();
            expect(document.getElementById("cc-download")).not.toBeNull();
            expect(document.getElementById("cc-clear")).not.toBeNull();
            expect(document.getElementById("cc-show")).not.toBeNull();
        });

        test("should show log count in menu", () => {
            ui = new ConsoleCaptureUI();
            const countEl = document.getElementById("cc-count");
            expect(countEl?.textContent).toBe("0");

            console.log("test message");
            expect(countEl?.textContent).toBe("1");

            console.log("another message");
            expect(countEl?.textContent).toBe("2");
        });

        test("menu should be hidden by default", () => {
            ui = new ConsoleCaptureUI();
            const menu = document.getElementById("console-capture-menu");
            expect(menu?.style.display).toBe("none");
        });

        test("should toggle menu visibility on button click", () => {
            ui = new ConsoleCaptureUI();
            const btn = document.getElementById("console-capture-btn");
            const menu = document.getElementById("console-capture-menu");

            expect(menu?.style.display).toBe("none");

            btn?.click();
            expect(menu?.style.display).toBe("block");

            btn?.click();
            expect(menu?.style.display).toBe("none");
        });

        test("should remove UI elements on destroy", () => {
            ui = new ConsoleCaptureUI();
            expect(document.getElementById("console-capture-btn")).not.toBeNull();

            ui.destroy();
            ui = null;

            expect(document.getElementById("console-capture-btn")).toBeNull();
            expect(document.getElementById("console-capture-menu")).toBeNull();
        });
    });

    describe("restore console methods", () => {
        test("should restore original console methods on destroy", () => {
            // Create a tracking array to verify console is properly restored
            const loggedMessages: string[] = [];
            const origLog = console.log;

            // Override console.log to track what gets logged
            console.log = (...args: unknown[]) => {
                loggedMessages.push(args.join(" "));
            };

            ui = new ConsoleCaptureUI();

            // After ConsoleCaptureUI is created, console.log should be different
            expect(console.log).not.toBe(origLog);

            // Log something - this should be captured by ConsoleCaptureUI
            // and also call our tracking function
            console.log("during capture");
            expect(loggedMessages).toContain("during capture");
            expect(ui.getLogs()).toContain("during capture");

            ui.destroy();
            ui = null;

            // After destroy, console.log should be restored to our tracking function
            console.log("after destroy");
            expect(loggedMessages).toContain("after destroy");

            // Restore original for cleanup
            console.log = origLog;
        });
    });

    describe("getLogs", () => {
        test("should return formatted log string", () => {
            ui = new ConsoleCaptureUI();
            console.log("first message");
            console.error("second message");
            const logs = ui.getLogs();
            expect(typeof logs).toBe("string");
            expect(logs).toContain("first message");
            expect(logs).toContain("second message");
        });

        test("should include all captured logs", () => {
            ui = new ConsoleCaptureUI();
            for (let i = 0; i < 5; i++) {
                console.log(`message ${i}`);
            }
            const logs = ui.getLogs();
            for (let i = 0; i < 5; i++) {
                expect(logs).toContain(`message ${i}`);
            }
        });

        test("should return empty string when no logs captured", () => {
            ui = new ConsoleCaptureUI();
            const logs = ui.getLogs();
            expect(logs).toBe("");
        });
    });

    describe("clearLogs", () => {
        test("should clear all captured logs", () => {
            ui = new ConsoleCaptureUI();
            console.log("message to clear");
            expect(ui.getLogs()).toContain("message to clear");
            ui.clearLogs();
            // getLogs returns empty after clear (minus the "cleared" message itself)
            const logs = ui.getLogs();
            expect(logs).not.toContain("message to clear");
        });

        test("should reset log count badge", () => {
            ui = new ConsoleCaptureUI();
            console.log("test");
            const countEl = document.getElementById("cc-count");
            expect(countEl?.textContent).toBe("1");
            ui.clearLogs();
            // After clear, count should be 1 (the "cleared" log message)
            expect(countEl?.textContent).toBe("1");
        });
    });

    describe("copyLogs", () => {
        test("should copy logs to clipboard", async () => {
            ui = new ConsoleCaptureUI();
            console.log("copy this message");
            await ui.copyLogs();
            expect(clipboardWriteTextMock).toHaveBeenCalled();
            const calledWith = clipboardWriteTextMock.mock.calls[0][0];
            expect(calledWith).toContain("copy this message");
        });
    });

    describe("downloadLogs", () => {
        test("should trigger file download", () => {
            ui = new ConsoleCaptureUI();
            console.log("download this message");

            // Mock URL.createObjectURL and link click
            const createObjectURL = vi.fn().mockReturnValue("blob:test");
            const revokeObjectURL = vi.fn();
            global.URL.createObjectURL = createObjectURL;
            global.URL.revokeObjectURL = revokeObjectURL;

            const clickSpy = vi.fn();
            const originalCreateElement = document.createElement.bind(document);
            vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
                const el = originalCreateElement(tagName);
                if (tagName === "a") {
                    el.click = clickSpy;
                }
                return el;
            });

            ui.downloadLogs();

            expect(createObjectURL).toHaveBeenCalled();
            expect(clickSpy).toHaveBeenCalled();
        });
    });

    describe("showLogsModal", () => {
        test("should create modal with logs textarea", () => {
            ui = new ConsoleCaptureUI();
            console.log("modal test message");

            // Click show button to open modal
            const showBtn = document.getElementById("cc-show");
            showBtn?.click();

            const modal = document.getElementById("console-logs-modal");
            expect(modal).not.toBeNull();

            const textarea = document.getElementById("logs-textarea") as HTMLTextAreaElement;
            expect(textarea).not.toBeNull();
            expect(textarea.value).toContain("modal test message");
        });

        test("should close modal on close button click", () => {
            ui = new ConsoleCaptureUI();

            // Open modal
            const showBtn = document.getElementById("cc-show");
            showBtn?.click();
            expect(document.getElementById("console-logs-modal")).not.toBeNull();

            // Close modal
            const closeBtn = document.getElementById("close-modal");
            closeBtn?.click();
            expect(document.getElementById("console-logs-modal")).toBeNull();
        });

        test("should remove modal on destroy", () => {
            ui = new ConsoleCaptureUI();

            // Open modal
            const showBtn = document.getElementById("cc-show");
            showBtn?.click();
            expect(document.getElementById("console-logs-modal")).not.toBeNull();

            // Destroy UI
            ui.destroy();
            ui = null;
            expect(document.getElementById("console-logs-modal")).toBeNull();
        });
    });

    describe("window.__console__.logs reference", () => {
        test("should return current logs after clearLogs() is called", () => {
            ui = new ConsoleCaptureUI();
            console.log("message 1");
            expect(window.__console__?.logs).toHaveLength(1);

            ui.clearLogs();
            // After clear, we have 1 log (the "cleared" message)
            expect(window.__console__?.logs).toHaveLength(1);

            console.log("message 2");
            expect(window.__console__?.logs).toHaveLength(2);
            // The most recent log should be "message 2"
            expect(window.__console__?.logs[1].args[0]).toBe("message 2");
        });

        test("should not allow external mutation of internal logs array", () => {
            ui = new ConsoleCaptureUI();
            console.log("message 1");

            // Get the logs array
            const externalLogs = window.__console__?.logs;
            expect(externalLogs).toHaveLength(1);

            // External mutation should not affect internal state
            // because the getter returns a copy
            externalLogs?.push({ type: "log", args: ["fake"], timestamp: "" });

            // Internal logs should remain unchanged (still just 1 log)
            const internalLogs = ui.getLogs();
            expect(internalLogs).not.toContain("fake");
            // Verify the count is still 1
            expect(window.__console__?.logs).toHaveLength(1);
        });
    });

    describe("global methods", () => {
        test("should expose window.__console__.copy", () => {
            ui = new ConsoleCaptureUI();
            expect(window.__console__).toBeDefined();
            expect(typeof window.__console__?.copy).toBe("function");
        });

        test("should expose window.__console__.download", () => {
            ui = new ConsoleCaptureUI();
            expect(typeof window.__console__?.download).toBe("function");
        });

        test("should expose window.__console__.clear", () => {
            ui = new ConsoleCaptureUI();
            expect(typeof window.__console__?.clear).toBe("function");
        });

        test("should expose window.__console__.get", () => {
            ui = new ConsoleCaptureUI();
            expect(typeof window.__console__?.get).toBe("function");
        });

        test("should expose window.__console__.logs array", () => {
            ui = new ConsoleCaptureUI();
            expect(Array.isArray(window.__console__?.logs)).toBe(true);
        });

        test("window.__console__.get should return logs", () => {
            ui = new ConsoleCaptureUI();
            console.log("global get test");
            const logs = window.__console__?.get();
            expect(logs).toContain("global get test");
        });

        test("window.__console__.clear should clear logs", () => {
            ui = new ConsoleCaptureUI();
            console.log("global clear test");
            window.__console__?.clear();
            // After clear, the log should be gone (except for the "cleared" message)
            expect(ui.getLogs()).not.toContain("global clear test");
        });

        test("should remove window.__console__ on destroy", () => {
            ui = new ConsoleCaptureUI();
            expect(window.__console__).toBeDefined();
            ui.destroy();
            ui = null;
            expect(window.__console__).toBeUndefined();
        });
    });

    describe("initConsoleCaptureUI", () => {
        test("should create and return ConsoleCaptureUI instance", () => {
            ui = initConsoleCaptureUI();
            expect(ui).toBeInstanceOf(ConsoleCaptureUI);
        });
    });
});
