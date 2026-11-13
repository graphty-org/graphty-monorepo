/// <reference types="vite/client" />
/**
 * Forwards this page's console output, uncaught errors and unhandled rejections to a remote-logger server, so a
 * browser without reachable devtools (an iPad, a headset) can be debugged from a terminal. Off unless
 * `VITE_REMOTE_LOG_URL` names the server's base URL (start `npx remote-log-server --port {{port}}` from the
 * remote-logger package through servherd and set the variable to the URL it gives). Batching and retries are
 * `RemoteLogClient`'s.
 */
import { RemoteLogClient } from "@graphty/remote-logger/client";

const FORWARDED = ["log", "info", "warn", "error"] as const;

/**
 * One console argument as text.
 * @param p - What was passed to the console.
 * @returns The text sent to the server.
 */
function format(p: unknown): string {
    if (p instanceof Error) {
        return `${p.name}: ${p.message}${p.stack ? `\n${p.stack}` : ""}`;
    }
    if (typeof p === "string") {
        return p;
    }
    try {
        return JSON.stringify(p);
    } catch {
        return String(p);
    }
}

/**
 * Installs the console and error hooks when `VITE_REMOTE_LOG_URL` is set.
 * @returns The session id shown in the server's log listing, or undefined when nothing is forwarded.
 */
export function installRemoteLog(): string | undefined {
    const serverUrl = import.meta.env.VITE_REMOTE_LOG_URL as string | undefined;
    if (!serverUrl) {
        return undefined;
    }
    const client = new RemoteLogClient({ serverUrl, sessionPrefix: "webgpu-demo", projectMarker: "webgpu-fa2-demo" });
    const send = (level: string, parts: unknown[]): void => client.log(level, parts.map(format).join(" "));
    for (const method of FORWARDED) {
        const original = console[method].bind(console);
        console[method] = (...a: unknown[]) => {
            original(...a);
            // The client reports its own failed sends on the console; forwarding those would loop.
            if (typeof a[0] === "string" && a[0].startsWith("[RemoteLogClient]")) {
                return;
            }
            send(method === "log" ? "INFO" : method.toUpperCase(), a);
        };
    }
    globalThis.addEventListener("error", (e) => send("ERROR", [`uncaught: ${e.message} (${e.filename}:${e.lineno})`]));
    globalThis.addEventListener("unhandledrejection", (e) => send("ERROR", ["unhandled rejection:", e.reason]));
    globalThis.addEventListener("pagehide", () => void client.flush());
    send("INFO", [`page ${location.pathname} loaded; ${navigator.userAgent}`]);
    return client.sessionId;
}
