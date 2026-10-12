// Remote logging, always on (design section 8). Entries go to /remote-log on the page's own origin
// (the Vite proxy forwards them to the log server), carry the session id and the run context, and
// console output is forwarded as well. A tail is kept in memory for the in-headset log panel and the
// dry run.

import { RemoteLogClient } from "@graphty/remote-logger/client";

/** One entry kept in the in-memory tail. */
export interface TailEntry {
    time: number;
    level: string;
    message: string;
    data?: Record<string, unknown>;
}

/** The sandbox's logger. */
export interface Logger {
    readonly sessionId: string;
    /** Fields merged into every entry: preset, enabled techniques, settings hash, device, mode, input. */
    context: Record<string, unknown>;
    readonly tail: TailEntry[];
    log(message: string, data?: Record<string, unknown>, level?: string): void;
    /** Send now, bypassing the batch (Flag uses it so its entry arrives whole). */
    flush(): Promise<void>;
}

const TAIL = 400;

/**
 * Start logging: create the client, forward console output and uncaught errors, flush on pagehide.
 * @returns the logger
 */
export function startLogging(): Logger {
    const client = new RemoteLogClient({
        serverUrl: `${location.origin}/remote-log`,
        sessionPrefix: "xr-sandbox",
        throttlePatterns: [{ pattern: /^console\.debug/, intervalMs: 1000 }],
    });
    const tail: TailEntry[] = [];
    const logger: Logger = {
        sessionId: client.sessionId,
        context: {},
        tail,
        log(message, data, level = "INFO") {
            const entry = { time: Date.now(), level, message, data };
            tail.push(entry);
            if (tail.length > TAIL) {
                tail.splice(0, tail.length - TAIL);
            }
            client.log(level, message, { ...logger.context, ...data });
        },
        flush: () => client.flush(),
    };

    // The page's console, captured so Babylon's own messages reach the log too.
    const con = console;
    for (const level of ["log", "info", "warn", "error"] as const) {
        const original = con[level].bind(con);
        con[level] = (...args: unknown[]) => {
            original(...args);
            const text = args.map(toText).join(" ");
            logger.log(`console.${level}`, { text }, level === "log" ? "INFO" : level.toUpperCase());
        };
    }
    // Temporary: remote-logger's client does not forward uncaught errors and unhandled rejections,
    // nor flush when the tab closes (design section 2.3 lists both as remote-logger defects to fix
    // there). Delete these listeners once the client does it.
    addEventListener("error", (e) => {
        logger.log(
            "error",
            { message: e.message, source: e.filename, line: e.lineno, stack: (e.error as Error | undefined)?.stack },
            "ERROR",
        );
    });
    addEventListener("unhandledrejection", (e) => {
        const r = e.reason as unknown;
        logger.log(
            "error",
            {
                message: r instanceof Error ? r.message : String(r),
                stack: r instanceof Error ? r.stack : undefined,
                unhandledRejection: true,
            },
            "ERROR",
        );
    });
    addEventListener("pagehide", () => {
        void client.flush();
    });
    return logger;
}

const toText = (v: unknown): string => {
    if (v instanceof Error) {
        return v.stack ?? v.message;
    }
    if (typeof v === "string") {
        return v;
    }
    try {
        return JSON.stringify(v);
    } catch {
        return String(v);
    }
};
