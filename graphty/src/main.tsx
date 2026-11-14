import "./index.css";
import "@mantine/core/styles.css";

// Types the <graphty-element> tag for JSX, as any React 19 consumer opts in.
import type {} from "@graphty/graphty-element/jsx"; // NOSONAR(S7787): the element's documented JSX opt-in, a types-only import
import { GraphtyLogger, LogLevel, parseLoggingURLParams } from "@graphty/graphty-element/logging";
import { MantineProvider, Tooltip } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App.tsx";
import { loadGraphtyElement } from "./elementLoader";
import { loadSiteConfig } from "./siteConfig";
import { theme } from "./theme";
import { loadFrame } from "./workspace/frameLoader";
import { startUsageDataIfShared } from "./workspace/privacy/usageData";

// Re-export theme for tests and other modules
export { theme } from "./theme";

// Nothing is sent until the reader says Share usage data on the start screen or in Settings >
// Privacy; a reader who said so on an earlier visit starts sending again here, once the site's
// site.json (fetched first, before the element) has said how this site labels its errors.
void loadSiteConfig().then(startUsageDataIfShared); // NOSONAR(S7785): a top-level await would hold the first paint for the fetch

// The element reads nothing off the page's address, so the app turns its logging on from the
// documented parameter: `?graphty-element-logging=voice:debug` shows what speech recognition did.
const logging = parseLoggingURLParams();
if (logging !== null) {
    void GraphtyLogger.configure({
        enabled: true,
        modules: logging.modules,
        ...(logging.level === undefined ? {} : { level: logging.level }),
        ...(logging.moduleOverrides === undefined ? {} : { moduleLevels: Object.fromEntries(logging.moduleOverrides) }),
        ...(logging.remoteLogUrl === undefined ? {} : { remoteLogUrl: logging.remoteLogUrl }),
    });
}

// Initialize Eruda for development/testing (mobile console)
if (import.meta.env.DEV) {
    void import("eruda").then(({ default: eruda }) => {
        eruda.init();
    });
}

/** Logs what a remote log reader needs to tie a session to a server, a browser and a navigation. */
function logPageStart(): void {
    const [navigation] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
    GraphtyLogger.getLogger(["graphty", "workspace"]).info("page start", {
        origin: location.origin,
        path: location.pathname,
        features: new URLSearchParams(location.search).get("features"),
        userAgent: navigator.userAgent,
        navigationType: navigation?.type ?? null,
    });
}

// A dev server with the remote logger attached: enough facts to tell afterwards what a page did.
if (import.meta.env.VITE_REMOTE_LOG_URL) {
    const remoteLogging = GraphtyLogger.configure({
        enabled: true,
        level: LogLevel.INFO,
        modules: ["autosave", "workspace"],
    });
    void remoteLogging.then(logPageStart); // NOSONAR(S7785): a top-level await would hold the first paint for the logger
}

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Failed to find the root element");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <MantineProvider theme={theme} defaultColorScheme="auto">
            {/* One tooltip group around the whole shell, so a tooltip opened within 300 ms of
                another opens at once (Figma's warm hand-off); the timing is the theme's. */}
            <Tooltip.Group>
                <App />
            </Tooltip.Group>
        </MantineProvider>
    </React.StrictMode>,
);

// <graphty-element> and the project frame load after the first frame, so the start page's text and
// buttons paint before their code is fetched and run.
requestAnimationFrame(() => {
    setTimeout(() => {
        // A failure here is said where a graph is drawn, which loads again and offers Retry.
        loadGraphtyElement().catch(() => undefined);
        void loadFrame();
    }, 0);
});
