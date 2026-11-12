import { GraphtyLogger, LogLevel } from "@graphty/graphty-element/logging";

/**
 * Sends this page's console to a @graphty/remote-logger server, for debugging a browser we cannot
 * open ourselves. Only with `?remoteLog` in the page's address, and only to the server this build
 * was made with (VITE_REMOTE_LOG_URL): the address never names the server, so a link cannot load
 * a script from anywhere else. Without the parameter nothing is fetched or configured (the logging entry is already in the page,
 * for src/lib/sentryPrivacy.ts).
 *
 * It loads the server's `/remote-logger.js`, which forwards every console call, reports uncaught
 * errors and unhandled rejections through `console.error`, and switches on graphty-element's
 * "diag" logging channel at debug level, whose records reach the console and so the server.
 */
export function startRemoteLogIfAsked(): void {
    if (!new URLSearchParams(globalThis.location.search).has("remoteLog")) {
        return;
    }

    const server = import.meta.env.VITE_REMOTE_LOG_URL;
    if (server === undefined || server === "") {
        console.warn("[remoteLog] no server: this build was made with no VITE_REMOTE_LOG_URL");
        return;
    }

    const script = document.createElement("script");
    script.src = `${server.replace(/\/$/, "")}/remote-logger.js`;
    script.onload = onLoggerLoaded;
    script.onerror = () => {
        console.error(`[remoteLog] could not load ${script.src}`);
    };
    document.head.prepend(script);
}

/** Once the logger is forwarding the console: say who this is, and listen for failures. */
function onLoggerLoaded(): void {
    globalThis.addEventListener("error", (event) => {
        console.error(
            "[remoteLog] uncaught error",
            event.message,
            `${event.filename}:${event.lineno}:${event.colno}`,
            String(event.error?.stack ?? ""),
        );
    });
    globalThis.addEventListener("unhandledrejection", (event) => {
        const { reason } = event as { reason: unknown };
        console.error(
            "[remoteLog] unhandled rejection",
            String(reason),
            reason instanceof Error ? (reason.stack ?? "") : "",
        );
    });

    const remote = (globalThis as { __remoteLogger__?: { client: { sessionId: string } } }).__remoteLogger__;
    const { gpu } = navigator as { gpu?: unknown };
    console.warn("[remoteLog] session start", {
        session: remote?.client.sessionId,
        url: globalThis.location.href,
        userAgent: navigator.userAgent,
        webgpu: gpu !== undefined,
        build: document.querySelector('meta[name="graphty-build"]')?.getAttribute("content") ?? null,
        screen: `${globalThis.innerWidth}x${globalThis.innerHeight}@${globalThis.devicePixelRatio}`,
    });

    void GraphtyLogger.configure({ enabled: true, level: LogLevel.DEBUG, modules: ["diag"] });

    // Logged as warnings because the app's lint allows only warn and error; the server keeps both.
    // The element's settings as it reports them, each time its acceleration status changes.
    document.addEventListener("graphty-capabilities-change", (event) => {
        const element = event.target as HTMLElement & {
            acceleration?: unknown;
            workingGraph?: unknown;
            viewMode?: unknown;
        };
        console.warn("[remoteLog] element", {
            acceleration: element.acceleration,
            workingGraph: element.workingGraph,
            viewMode: element.viewMode,
            capabilities: event.detail.capabilities,
        });
    });
}
