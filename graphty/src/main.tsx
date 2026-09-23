import "./index.css";
import "@mantine/core/styles.css";
// Defines <graphty-element>. The element declares its entry files as side effects, so a bare
// import survives tree-shaking.
import "@graphty/graphty-element";

import { MantineProvider } from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import { App } from "./App.tsx";
import { initSentry } from "./lib/sentry";
import { theme } from "./theme";

// Re-export theme for tests and other modules
export { theme } from "./theme";

// Initialize Sentry before React render
initSentry();

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
            <App />
        </MantineProvider>
    </React.StrictMode>,
);
