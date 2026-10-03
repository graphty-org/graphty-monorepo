import "./index.css";
import "@mantine/core/styles.css";
// Defines <graphty-element>. The element declares its entry files as side effects, so a bare
// import survives tree-shaking.
import "@graphty/graphty-element";
// The element's optional GPU peer, switched on. This is the whole integration: the element
// probes, constructs, attaches, applies its threshold and recovers, and reports through
// `capabilities.acceleration`. Nothing in this application touches WebGPU.
import "@graphty/graphty-element/webgpu";

import { MantineProvider, Tooltip } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App.tsx";
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
