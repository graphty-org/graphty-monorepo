/**
 * ConsoleCaptureUI - Console capture with floating UI widget
 *
 * Intercepts console output (log, error, warn, info, debug) and provides
 * a floating button UI with copy, download, view, and clear functionality.
 *
 * Features:
 * - Floating button in top-right corner
 * - Menu with Copy, Download, Clear, and Show Logs options
 * - Works on mobile devices and in XR environments
 * - Global window.__console__ methods for programmatic access
 *
 * Usage:
 *   import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";
 *   initConsoleCaptureUI();
 *
 * Or programmatically:
 *   const ui = new ConsoleCaptureUI();
 *   console.log("This is captured");
 *   ui.destroy(); // Clean up when done
 */

// Extended window interface for global console methods
declare global {
    interface Window {
        __console__?: {
            copy: () => Promise<void>;
            download: () => void;
            clear: () => void;
            get: () => string;
            logs: CapturedLogEntry[];
        };
    }
}

/** A single captured log entry */
interface CapturedLogEntry {
    type: string;
    args: unknown[];
    timestamp: string;
}

/** Console method names we intercept */
type ConsoleMethod = "log" | "error" | "warn" | "info" | "debug";

// Get reference to the global console object
const globalConsole = globalThis.console;

/**
 * ConsoleCaptureUI class - captures console output and provides floating UI widget
 */
export class ConsoleCaptureUI {
    private logs: CapturedLogEntry[] = [];
    private originalMethods: Record<ConsoleMethod, typeof globalConsole.log>;
    private buttonContainer: HTMLElement | null = null;

    /**
     * Creates a new ConsoleCaptureUI instance that intercepts console methods
     * and creates a floating UI widget
     */
    constructor() {
        // Store original methods at construction time
        this.originalMethods = {
            log: globalConsole.log.bind(globalConsole),
            error: globalConsole.error.bind(globalConsole),
            warn: globalConsole.warn.bind(globalConsole),
            info: globalConsole.info.bind(globalConsole),
            debug: globalConsole.debug.bind(globalConsole),
        };

        this.interceptConsole();
        this.createUI();
        this.setupGlobalMethods();
    }

    /**
     * Intercept all console methods to capture output
     */
    private interceptConsole(): void {
        const methods: ConsoleMethod[] = [
            "log",
            "error",
            "warn",
            "info",
            "debug",
        ];
        for (const method of methods) {
            const original = this.originalMethods[method];

            // Override the console method - this is intentional for this module
            globalConsole[method] = (...args: unknown[]): void => {
                // Capture the log entry
                this.logs.push({
                    type: method,
                    args: args,
                    timestamp: new Date().toISOString(),
                });
                this.updateButtonBadge();
                // Still call the original method
                original.apply(globalConsole, args);
            };
        }
    }

    /**
     * Create the floating UI button and menu
     */
    private createUI(): void {
        if (typeof document === "undefined") {
            return;
        }

        // Create floating button container
        this.buttonContainer = document.createElement("div");
        this.buttonContainer.id = "console-capture-container";
        this.buttonContainer.innerHTML = `
            <button id="console-capture-btn" style="
                position: fixed;
                top: 20px;
                right: 20px;
                width: 32px;
                height: 32px;
                border-radius: 16px;
                background: rgba(128, 128, 128, 0.3);
                color: rgba(255, 255, 255, 0.8);
                border: 1px solid rgba(255, 255, 255, 0.2);
                cursor: pointer;
                box-shadow: 0 1px 4px rgba(0,0,0,0.1);
                z-index: 99999;
                font-size: 14px;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s;
                opacity: 0.6;
            ">📋</button>
            <div id="console-capture-menu" style="
                position: fixed;
                top: 60px;
                right: 20px;
                background: white;
                border-radius: 8px;
                box-shadow: 0 2px 20px rgba(0,0,0,0.2);
                padding: 10px;
                z-index: 99998;
                display: none;
            ">
                <button id="cc-copy" style="
                    display: block;
                    width: 100%;
                    padding: 8px 16px;
                    margin: 4px 0;
                    border: none;
                    background: #4CAF50;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">📋 Copy Logs</button>
                <button id="cc-download" style="
                    display: block;
                    width: 100%;
                    padding: 8px 16px;
                    margin: 4px 0;
                    border: none;
                    background: #FF9800;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">💾 Download</button>
                <button id="cc-clear" style="
                    display: block;
                    width: 100%;
                    padding: 8px 16px;
                    margin: 4px 0;
                    border: none;
                    background: #f44336;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">🗑️ Clear</button>
                <button id="cc-show" style="
                    display: block;
                    width: 100%;
                    padding: 8px 16px;
                    margin: 4px 0;
                    border: none;
                    background: #9C27B0;
                    color: white;
                    border-radius: 4px;
                    cursor: pointer;
                ">👁️ Show Logs</button>
                <div style="
                    margin-top: 10px;
                    padding-top: 10px;
                    border-top: 1px solid #ddd;
                    font-size: 12px;
                    color: #666;
                    text-align: center;
                ">
                    <div>Logs: <span id="cc-count">0</span></div>
                </div>
            </div>
        `;

        document.body.appendChild(this.buttonContainer);

        // Add event listeners
        const btn = document.getElementById("console-capture-btn");
        const menu = document.getElementById("console-capture-menu");

        if (btn && menu) {
            // Add hover effect to make button more visible on hover
            btn.addEventListener("mouseenter", () => {
                btn.style.opacity = "1";
                btn.style.background = "rgba(128, 128, 128, 0.5)";
            });

            btn.addEventListener("mouseleave", () => {
                btn.style.opacity = "0.6";
                btn.style.background = "rgba(128, 128, 128, 0.3)";
            });

            btn.addEventListener("click", () => {
                menu.style.display =
                    menu.style.display === "none" ? "block" : "none";
            });

            const copyBtn = document.getElementById("cc-copy");
            const downloadBtn = document.getElementById("cc-download");
            const clearBtn = document.getElementById("cc-clear");
            const showBtn = document.getElementById("cc-show");

            if (copyBtn) {
                copyBtn.addEventListener("click", () => {
                    void this.copyLogs();
                    menu.style.display = "none";
                });
            }

            if (downloadBtn) {
                downloadBtn.addEventListener("click", () => {
                    this.downloadLogs();
                    menu.style.display = "none";
                });
            }

            if (clearBtn) {
                clearBtn.addEventListener("click", () => {
                    this.clearLogs();
                    menu.style.display = "none";
                });
            }

            if (showBtn) {
                showBtn.addEventListener("click", () => {
                    this.showLogsModal();
                    menu.style.display = "none";
                });
            }

            // Close menu when clicking outside
            document.addEventListener("click", (e) => {
                if (
                    this.buttonContainer &&
                    !this.buttonContainer.contains(e.target as Node)
                ) {
                    menu.style.display = "none";
                }
            });
        }
    }

    /**
     * Update the log count badge in the menu
     */
    private updateButtonBadge(): void {
        if (typeof document === "undefined") {
            return;
        }
        const count = document.getElementById("cc-count");
        if (count) {
            count.textContent = String(this.logs.length);
        }
    }

    /**
     * Format a single log entry as a string
     * @param log - The log entry to format
     * @returns Formatted log string
     */
    private formatLog(log: CapturedLogEntry): string {
        const args = log.args
            .map((arg) => {
                if (typeof arg === "string") {
                    return arg;
                }
                if (arg instanceof Error) {
                    return `${arg.name}: ${arg.message}\n${arg.stack ?? ""}`;
                }
                try {
                    return JSON.stringify(arg, null, 2);
                } catch {
                    return String(arg);
                }
            })
            .join(" ");

        return `[${log.timestamp}] [${log.type.toUpperCase()}] ${args}`;
    }

    /**
     * Setup global window.__console__ methods for easy access
     */
    private setupGlobalMethods(): void {
        if (typeof window !== "undefined") {
            window.__console__ = {
                copy: () => this.copyLogs(),
                download: () => {
                    this.downloadLogs();
                },
                clear: () => {
                    this.clearLogs();
                },
                get: () => this.getLogs(),
                logs: this.logs,
            };
        }
    }

    /**
     * Show success indicator on the button
     */
    private showCopySuccess(): void {
        if (typeof document === "undefined") {
            return;
        }
        const btn = document.getElementById("console-capture-btn");
        if (btn) {
            btn.innerHTML = "✅";
            setTimeout(() => {
                btn.innerHTML = "📋";
            }, 1500);
        }
        globalConsole.log("📋 Console logs copied to clipboard!");
    }

    /**
     * Show error indicator on the button and fallback message
     */
    private showCopyError(): void {
        if (typeof document === "undefined") {
            return;
        }
        const btn = document.getElementById("console-capture-btn");
        if (btn) {
            btn.innerHTML = "❌";
            setTimeout(() => {
                btn.innerHTML = "📋";
            }, 1500);
        }

        // Show logs in console as fallback
        globalConsole.log(
            "❌ Failed to copy to clipboard. Here are your logs:"
        );
        globalConsole.log("═".repeat(50));
        globalConsole.log(this.getLogs());
        globalConsole.log("═".repeat(50));
    }

    /**
     * Fallback copy method using textarea (for mobile devices)
     * @param text - The text to copy
     */
    private copyUsingTextarea(text: string): void {
        if (typeof document === "undefined") {
            return;
        }
        // Create temporary textarea
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.cssText =
            "position: absolute; left: -9999px; top: -9999px;";
        document.body.appendChild(textarea);

        // Select and copy
        textarea.select();
        textarea.setSelectionRange(0, 99999); // For mobile devices

        try {
            // execCommand is deprecated but still necessary as a fallback for:
            // - Older mobile browsers that don't support Clipboard API
            // - iOS Safari in certain contexts where Clipboard API fails
            // - XR/VR browsers with limited API support
            // This provides the best compatibility across all target platforms
            // eslint-disable-next-line @typescript-eslint/no-deprecated -- Required fallback for mobile/XR compatibility
            const success = document.execCommand("copy");
            if (success) {
                this.showCopySuccess();
            } else {
                this.showCopyError();
            }
        } catch {
            this.showCopyError();
        } finally {
            document.body.removeChild(textarea);
        }
    }

    /**
     * Show a modal dialog with all captured logs
     */
    private showLogsModal(): void {
        if (typeof document === "undefined") {
            return;
        }

        // Remove existing modal if any
        const existing = document.getElementById("console-logs-modal");
        if (existing) {
            existing.remove();
        }

        const modal = document.createElement("div");
        modal.id = "console-logs-modal";
        modal.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.5);
                z-index: 100001;
                display: flex;
                align-items: center;
                justify-content: center;
            ">
                <div style="
                    background: white;
                    border-radius: 8px;
                    width: 90%;
                    max-width: 800px;
                    height: 85vh;
                    max-height: 85vh;
                    display: flex;
                    flex-direction: column;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
                ">
                    <div style="
                        padding: 16px;
                        border-bottom: 1px solid #ddd;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 style="margin: 0; color: #333;">Console Logs</h3>
                        <button id="close-modal" style="
                            background: none;
                            border: none;
                            font-size: 24px;
                            cursor: pointer;
                            color: #666;
                        ">×</button>
                    </div>
                    <textarea id="logs-textarea" style="
                        flex: 1;
                        margin: 16px;
                        padding: 12px;
                        border: 1px solid #ddd;
                        border-radius: 4px;
                        font-family: monospace;
                        font-size: 12px;
                        resize: none;
                        background: #f5f5f5;
                        min-height: 50vh;
                        overflow-y: auto;
                    " readonly>${this.getLogs()}</textarea>
                    <div style="
                        padding: 16px;
                        border-top: 1px solid #ddd;
                        text-align: center;
                    ">
                        <button id="select-all-logs" style="
                            padding: 8px 24px;
                            background: #2196F3;
                            color: white;
                            border: none;
                            border-radius: 4px;
                            cursor: pointer;
                            font-size: 14px;
                        ">Select All</button>
                        <span style="
                            margin-left: 16px;
                            color: #666;
                            font-size: 14px;
                        ">Press Ctrl+C (or Cmd+C) to copy</span>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Event listeners
        const closeBtn = document.getElementById("close-modal");
        if (closeBtn) {
            closeBtn.addEventListener("click", () => {
                modal.remove();
            });
        }

        modal.addEventListener("click", (e) => {
            if (e.target === modal.firstElementChild) {
                modal.remove();
            }
        });

        const textarea = document.getElementById(
            "logs-textarea"
        ) as HTMLTextAreaElement | null;
        const selectAllBtn = document.getElementById("select-all-logs");

        if (selectAllBtn && textarea) {
            selectAllBtn.addEventListener("click", () => {
                textarea.select();
                textarea.focus();
            });
        }

        // Auto-select on open
        if (textarea) {
            setTimeout(() => {
                textarea.select();
                textarea.focus();
            }, 100);
        }
    }

    /**
     * Get all captured logs as a formatted string
     * @returns Formatted log string with timestamps and levels
     */
    getLogs(): string {
        return this.logs.map((log) => this.formatLog(log)).join("\n");
    }

    /**
     * Clear all captured logs
     */
    clearLogs(): void {
        this.logs = [];
        this.updateButtonBadge();
        globalConsole.log("🗑️ Console logs cleared");
    }

    /**
     * Copy logs to clipboard
     */
    async copyLogs(): Promise<void> {
        const text = this.getLogs();

        try {
            // Try modern clipboard API first
            if (
                typeof navigator !== "undefined" &&
                navigator.clipboard &&
                navigator.clipboard.writeText
            ) {
                await navigator.clipboard.writeText(text);
                this.showCopySuccess();
            } else {
                // Fallback method using textarea
                this.copyUsingTextarea(text);
            }
        } catch {
            // If modern API fails, try fallback
            globalConsole.warn("Clipboard API failed, using fallback");
            this.copyUsingTextarea(text);
        }
    }

    /**
     * Download logs as a text file
     */
    downloadLogs(): void {
        if (typeof document === "undefined") {
            return;
        }

        const text = this.getLogs();
        const blob = new Blob([text], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        const filename = `console-logs-${timestamp}.txt`;

        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        URL.revokeObjectURL(url);
        globalConsole.log("💾 Console logs downloaded!");
    }

    /**
     * Restore original console methods and clean up UI
     */
    destroy(): void {
        // Restore original console methods
        globalConsole.log = this.originalMethods.log;
        globalConsole.error = this.originalMethods.error;
        globalConsole.warn = this.originalMethods.warn;
        globalConsole.info = this.originalMethods.info;
        globalConsole.debug = this.originalMethods.debug;

        // Remove UI elements
        if (
            typeof document !== "undefined" &&
            this.buttonContainer &&
            this.buttonContainer.parentNode
        ) {
            this.buttonContainer.parentNode.removeChild(this.buttonContainer);
        }

        // Remove modal if open
        if (typeof document !== "undefined") {
            const modal = document.getElementById("console-logs-modal");
            if (modal) {
                modal.remove();
            }
        }

        // Remove global methods
        if (typeof window !== "undefined") {
            delete window.__console__;
        }
    }
}

/**
 * Convenience function to initialize ConsoleCaptureUI
 * @returns A new ConsoleCaptureUI instance
 */
export function initConsoleCaptureUI(): ConsoleCaptureUI {
    return new ConsoleCaptureUI();
}
