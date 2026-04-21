/**
 * Browser bundle entry point for the remote logger.
 *
 * When loaded as a script tag, this auto-initializes a RemoteLogClient
 * that intercepts console methods and forwards them to the server.
 *
 * Server URL detection priority:
 *   1. window.__REMOTE_LOG_SERVER_URL__ (injected by server when serving this file)
 *   2. document.currentScript.src (parse origin from script tag URL)
 *   3. window.location.origin (fallback)
 *
 * Exposes window.__remoteLogger__ for manual control.
 * @module bundle/browser-entry
 */

import { RemoteLogClient } from "../client/RemoteLogClient.js";
import { ConsoleCaptureUI } from "../ui/ConsoleCaptureUI.js";

declare global {
    interface Window {
        __REMOTE_LOG_SERVER_URL__?: string;
        __remoteLogger__?: RemoteLoggerGlobal;
    }
}

type ConsoleMethod = "log" | "warn" | "error" | "info" | "debug";

const CONSOLE_LEVEL_MAP: Record<ConsoleMethod, string> = {
    log: "LOG",
    warn: "WARN",
    error: "ERROR",
    info: "INFO",
    debug: "DEBUG",
};

const INTERCEPTED_METHODS: ConsoleMethod[] = ["log", "warn", "error", "info", "debug"];

export interface RemoteLoggerGlobal {
    client: RemoteLogClient;
    ui?: ConsoleCaptureUI;
    destroy: () => void;
}

function detectServerUrl(): string | undefined {
    if (typeof window !== "undefined" && window.__REMOTE_LOG_SERVER_URL__) {
        return window.__REMOTE_LOG_SERVER_URL__;
    }

    if (typeof document !== "undefined" && document.currentScript) {
        try {
            const scriptUrl = new URL((document.currentScript as HTMLScriptElement).src);
            return scriptUrl.origin;
        } catch {
            // Invalid URL, fall through
        }
    }

    if (typeof window !== "undefined" && window.location) {
        return window.location.origin;
    }

    return undefined;
}

function shouldShowUI(): boolean {
    if (typeof document === "undefined" || !document.currentScript) {
        return false;
    }

    try {
        const {src} = (document.currentScript as HTMLScriptElement);
        if (!src) {return false;}
        const params = new URL(src).searchParams;
        return params.get("ui") === "true";
    } catch {
        return false;
    }
}

function formatArg(arg: unknown): string {
    if (typeof arg === "string") {return arg;}
    if (arg instanceof Error) {return `${arg.name}: ${arg.message}`;}
    try {
        return JSON.stringify(arg);
    } catch {
        return String(arg);
    }
}

function formatArgs(args: unknown[]): string {
    return args.map(formatArg).join(" ");
}

/**
 * Initialize the remote logger, intercepting console methods.
 * @returns The remote logger global object, or undefined if no server URL detected
 */
export function initRemoteLogger(): RemoteLoggerGlobal | undefined {
    const serverUrl = detectServerUrl();
    if (!serverUrl) {
        console.warn("[RemoteLogger] Could not detect server URL. Set window.__REMOTE_LOG_SERVER_URL__ before loading.");
        return undefined;
    }

    const client = new RemoteLogClient({
        serverUrl,
        sessionPrefix: "remote",
        batchIntervalMs: 500,
    });

    const originalMethods: Record<ConsoleMethod, typeof console.log> = {} as Record<ConsoleMethod, typeof console.log>;

    for (const method of INTERCEPTED_METHODS) {
        // eslint-disable-next-line no-console
        originalMethods[method] = console[method];

        // eslint-disable-next-line no-console
        console[method] = (...args: unknown[]) => {
            originalMethods[method].apply(console, args);
            const message = formatArgs(args);
            client.log(CONSOLE_LEVEL_MAP[method], message);
        };
    }

    let ui: ConsoleCaptureUI | undefined;
    if (shouldShowUI()) {
        ui = new ConsoleCaptureUI();
    }

    const destroy = (): void => {
        for (const method of INTERCEPTED_METHODS) {
            // eslint-disable-next-line no-console
            console[method] = originalMethods[method];
        }
        void client.close();
        if (ui) {
            ui.destroy();
        }
        if (typeof window !== "undefined") {
            delete window.__remoteLogger__;
        }
    };

    const global: RemoteLoggerGlobal = { client, ui, destroy };

    if (typeof window !== "undefined") {
        window.__remoteLogger__ = global;
    }

    return global;
}

// Auto-initialize on load
initRemoteLogger();

// Re-export for manual use via the IIFE global
export { ConsoleCaptureUI,RemoteLogClient };
