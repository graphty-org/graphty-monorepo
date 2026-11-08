/**
 * Sends this page's console to a @graphty/remote-logger server, for debugging a browser we cannot
 * open ourselves. Only with `?remoteLog` in the page's address: `?remoteLog=https://host:port`
 * names the server, and `?remoteLog=1` uses the one this build was made with (VITE_REMOTE_LOG_URL).
 * Without the parameter nothing is loaded.
 *
 * It loads the server's `/remote-logger.js`, which forwards every console call, reports uncaught
 * errors and unhandled rejections through `console.error`, and switches on graphty-element's
 * "diag" logging channel at debug level, whose records reach the console and so the server.
 */
export function startRemoteLogIfAsked(): void {
    const value = new URLSearchParams(window.location.search).get("remoteLog");
    if (value === null) {
        return;
    }

    const server = /^https?:\/\//.test(value) ? value : import.meta.env.VITE_REMOTE_LOG_URL;
    if (server === undefined || server === "") {
        console.warn("[remoteLog] no server: pass ?remoteLog=https://host:port");
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
    window.addEventListener("error", (event) => {
        console.error(
            "[remoteLog] uncaught error",
            event.message,
            `${event.filename}:${event.lineno}:${event.colno}`,
            String(event.error?.stack ?? ""),
        );
    });
    window.addEventListener("unhandledrejection", (event) => {
        const { reason } = event as { reason: unknown };
        console.error(
            "[remoteLog] unhandled rejection",
            String(reason),
            reason instanceof Error ? (reason.stack ?? "") : "",
        );
    });

    const remote = (window as { __remoteLogger__?: { client: { sessionId: string } } }).__remoteLogger__;
    const { gpu } = navigator as { gpu?: unknown };
    console.warn("[remoteLog] session start", {
        session: remote?.client.sessionId,
        url: window.location.href,
        userAgent: navigator.userAgent,
        webgpu: gpu !== undefined,
        build: document.querySelector('meta[name="graphty-build"]')?.getAttribute("content") ?? null,
        screen: `${window.innerWidth}x${window.innerHeight}@${window.devicePixelRatio}`,
    });

    void import("@graphty/graphty-element/logging").then(({ GraphtyLogger, LogLevel }) =>
        GraphtyLogger.configure({ enabled: true, level: LogLevel.DEBUG, modules: ["diag"] }),
    );

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
