import "./index.css";
import "@mantine/core/styles.css";

// Types the <graphty-element> tag for JSX, as any React 19 consumer opts in.
import type {} from "@graphty/graphty-element/jsx"; // NOSONAR(S7787): the element's documented JSX opt-in, a types-only import
import { MantineProvider, Tooltip } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App.tsx";
import { loadGraphtyElement } from "./elementLoader";
import { theme } from "./theme";
import { startUsageDataIfShared } from "./workspace/privacy/usageData";

// Re-export theme for tests and other modules
export { theme } from "./theme";

// Nothing is sent until the reader says Share usage data on the start screen or in Settings >
// Privacy; a reader who said so on an earlier visit starts sending again here, before React renders.
startUsageDataIfShared();

// Initialize Eruda for development/testing (mobile console)
if (import.meta.env.DEV) {
    void import("eruda").then(({ default: eruda }) => {
        eruda.init();
    });
}

const rootElement = document.getElementById("root");
if (!rootElement) {
    throw new Error("Failed to find the root element");
}

ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
        <MantineProvider theme={theme} defaultColorScheme="dark">
            {/* One tooltip group around the whole shell, so a tooltip opened within 300 ms of
                another opens at once (Figma's warm hand-off); the timing is the theme's. */}
            <Tooltip.Group>
                <App />
            </Tooltip.Group>
        </MantineProvider>
    </React.StrictMode>,
);

// <graphty-element> is defined after the first frame, so the start page's text and buttons paint
// before the graph's code is fetched and run.
requestAnimationFrame(() => {
    setTimeout(() => {
        void loadGraphtyElement();
    }, 0);
});
