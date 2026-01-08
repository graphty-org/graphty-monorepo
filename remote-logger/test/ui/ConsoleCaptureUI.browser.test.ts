/**
 * Browser tests for ConsoleCaptureUI - runs in real browser using Playwright
 * Tests actual DOM manipulation, button clicks, and UI interactions
 */
import { afterEach, beforeEach, describe, expect, test } from "vitest";

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

describe("ConsoleCaptureUI Browser Tests", () => {
    let ui: ConsoleCaptureUI | null = null;

    beforeEach(() => {
        // Clean up any existing UI elements from previous tests
        const existingContainer = document.getElementById(
            "console-capture-container"
        );
        if (existingContainer) {
            existingContainer.remove();
        }
        const existingModal = document.getElementById("console-logs-modal");
        if (existingModal) {
            existingModal.remove();
        }
    });

    afterEach(() => {
        if (ui) {
            ui.destroy();
            ui = null;
        }
    });

    describe("floating button UI in real browser", () => {
        test("should create floating button visible in DOM", () => {
            ui = new ConsoleCaptureUI();

            const btn = document.getElementById("console-capture-btn");
            expect(btn).not.toBeNull();
            expect(btn).toBeInstanceOf(HTMLButtonElement);

            // Check button is positioned fixed in top-right
            const computedStyle = window.getComputedStyle(btn!);
            expect(computedStyle.position).toBe("fixed");
        });

        test("should create menu with Copy, Download, Clear, Show buttons", () => {
            ui = new ConsoleCaptureUI();

            const copyBtn = document.getElementById("cc-copy");
            const downloadBtn = document.getElementById("cc-download");
            const clearBtn = document.getElementById("cc-clear");
            const showBtn = document.getElementById("cc-show");

            expect(copyBtn).not.toBeNull();
            expect(downloadBtn).not.toBeNull();
            expect(clearBtn).not.toBeNull();
            expect(showBtn).not.toBeNull();

            // Check button text content
            expect(copyBtn?.textContent).toContain("Copy");
            expect(downloadBtn?.textContent).toContain("Download");
            expect(clearBtn?.textContent).toContain("Clear");
            expect(showBtn?.textContent).toContain("Show");
        });

        test("should toggle menu on button click", async () => {
            ui = new ConsoleCaptureUI();

            const btn = document.getElementById("console-capture-btn");
            const menu = document.getElementById("console-capture-menu");

            expect(menu).not.toBeNull();
            expect(menu?.style.display).toBe("none");

            // Click to open menu
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(menu?.style.display).toBe("block");

            // Click to close menu
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(menu?.style.display).toBe("none");
        });

        test("should close menu when clicking outside", async () => {
            ui = new ConsoleCaptureUI();

            const btn = document.getElementById("console-capture-btn");
            const menu = document.getElementById("console-capture-menu");

            // Open menu
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(menu?.style.display).toBe("block");

            // Click outside (on document body)
            document.body.click();
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(menu?.style.display).toBe("none");
        });

        test("should update log count when console methods are called", () => {
            ui = new ConsoleCaptureUI();

            const countEl = document.getElementById("cc-count");
            expect(countEl?.textContent).toBe("0");

            console.log("test message 1");
            expect(countEl?.textContent).toBe("1");

            console.warn("test message 2");
            expect(countEl?.textContent).toBe("2");

            console.error("test message 3");
            expect(countEl?.textContent).toBe("3");
        });
    });

    describe("show logs modal in real browser", () => {
        test("should open modal when Show Logs button is clicked", async () => {
            ui = new ConsoleCaptureUI();
            console.log("test message for modal");

            // Open menu first
            const btn = document.getElementById("console-capture-btn");
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Click Show Logs button
            const showBtn = document.getElementById("cc-show");
            showBtn?.click();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const modal = document.getElementById("console-logs-modal");
            expect(modal).not.toBeNull();

            const textarea = document.getElementById(
                "logs-textarea"
            ) as HTMLTextAreaElement;
            expect(textarea).not.toBeNull();
            expect(textarea.value).toContain("test message for modal");
        });

        test("should close modal when X button is clicked", async () => {
            ui = new ConsoleCaptureUI();

            // Open menu and show modal
            const btn = document.getElementById("console-capture-btn");
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            const showBtn = document.getElementById("cc-show");
            showBtn?.click();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(document.getElementById("console-logs-modal")).not.toBeNull();

            // Click close button
            const closeBtn = document.getElementById("close-modal");
            closeBtn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(document.getElementById("console-logs-modal")).toBeNull();
        });

        test("modal textarea should contain all logged messages", async () => {
            ui = new ConsoleCaptureUI();

            // Log various types
            console.log("log message");
            console.info("info message");
            console.warn("warn message");
            console.error("error message");
            console.debug("debug message");

            // Open modal
            const btn = document.getElementById("console-capture-btn");
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            const showBtn = document.getElementById("cc-show");
            showBtn?.click();
            await new Promise((resolve) => setTimeout(resolve, 100));

            const textarea = document.getElementById(
                "logs-textarea"
            ) as HTMLTextAreaElement;
            expect(textarea.value).toContain("log message");
            expect(textarea.value).toContain("info message");
            expect(textarea.value).toContain("warn message");
            expect(textarea.value).toContain("error message");
            expect(textarea.value).toContain("debug message");
        });
    });

    describe("clear logs in real browser", () => {
        test("should clear logs when Clear button is clicked", async () => {
            ui = new ConsoleCaptureUI();

            console.log("message to clear");
            expect(ui.getLogs()).toContain("message to clear");

            // Open menu and click clear
            const btn = document.getElementById("console-capture-btn");
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            const clearBtn = document.getElementById("cc-clear");
            clearBtn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            // Original message should be gone
            expect(ui.getLogs()).not.toContain("message to clear");
        });

        test("menu should close after clicking Clear", async () => {
            ui = new ConsoleCaptureUI();

            // Open menu
            const btn = document.getElementById("console-capture-btn");
            const menu = document.getElementById("console-capture-menu");
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));
            expect(menu?.style.display).toBe("block");

            // Click clear
            const clearBtn = document.getElementById("cc-clear");
            clearBtn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            expect(menu?.style.display).toBe("none");
        });
    });

    describe("global window.__console__ methods", () => {
        test("window.__console__ should be accessible", () => {
            ui = new ConsoleCaptureUI();

            expect(window.__console__).toBeDefined();
            expect(typeof window.__console__?.copy).toBe("function");
            expect(typeof window.__console__?.download).toBe("function");
            expect(typeof window.__console__?.clear).toBe("function");
            expect(typeof window.__console__?.get).toBe("function");
            expect(Array.isArray(window.__console__?.logs)).toBe(true);
        });

        test("window.__console__.get() should return captured logs", () => {
            ui = new ConsoleCaptureUI();

            console.log("test for global get");
            const logs = window.__console__?.get();
            expect(logs).toContain("test for global get");
        });

        test("window.__console__.clear() should clear logs", () => {
            ui = new ConsoleCaptureUI();

            console.log("test for global clear");
            expect(ui.getLogs()).toContain("test for global clear");

            window.__console__?.clear();

            // Original message should be cleared
            expect(ui.getLogs()).not.toContain("test for global clear");
        });
    });

    describe("destroy cleanup", () => {
        test("should remove all UI elements when destroyed", () => {
            ui = new ConsoleCaptureUI();

            expect(document.getElementById("console-capture-btn")).not.toBeNull();
            expect(
                document.getElementById("console-capture-menu")
            ).not.toBeNull();

            ui.destroy();
            ui = null;

            expect(document.getElementById("console-capture-btn")).toBeNull();
            expect(document.getElementById("console-capture-menu")).toBeNull();
            expect(
                document.getElementById("console-capture-container")
            ).toBeNull();
        });

        test("should remove window.__console__ when destroyed", () => {
            ui = new ConsoleCaptureUI();
            expect(window.__console__).toBeDefined();

            ui.destroy();
            ui = null;

            expect(window.__console__).toBeUndefined();
        });

        test("should remove modal if open when destroyed", async () => {
            ui = new ConsoleCaptureUI();

            // Open modal
            const btn = document.getElementById("console-capture-btn");
            btn?.click();
            await new Promise((resolve) => setTimeout(resolve, 50));

            const showBtn = document.getElementById("cc-show");
            showBtn?.click();
            await new Promise((resolve) => setTimeout(resolve, 100));

            expect(document.getElementById("console-logs-modal")).not.toBeNull();

            ui.destroy();
            ui = null;

            expect(document.getElementById("console-logs-modal")).toBeNull();
        });
    });

    describe("initConsoleCaptureUI convenience function", () => {
        test("should create ConsoleCaptureUI instance", () => {
            ui = initConsoleCaptureUI();
            expect(ui).toBeInstanceOf(ConsoleCaptureUI);
            expect(document.getElementById("console-capture-btn")).not.toBeNull();
        });
    });
});
