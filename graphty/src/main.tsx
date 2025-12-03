import "./index.css";
import "@mantine/core/styles.css";
// WORKAROUND: Import InstancedMesh first to satisfy Babylon.js side-effect requirement
// This is needed in development mode where Vite may bypass the package's index.ts
import "@babylonjs/core/Meshes/instancedMesh";

// IMPORTANT: Import the Graphty class to ensure the @customElement decorator runs
// and registers the <graphty-element> custom element. A bare import like
// `import "@graphty/graphty-element"` gets tree-shaken away because nothing uses the exports.
import {Graphty} from "@graphty/graphty-element";

// Force Graphty class to be retained (prevents tree-shaking of the custom element registration)
if (typeof Graphty === "undefined") {
    throw new Error("Graphty class failed to load");
}

import {createTheme, MantineProvider} from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import {App} from "./App.tsx";

// Initialize Eruda for development/testing (mobile console)
if (import.meta.env.DEV) {
    void import("eruda").then(({default: eruda}) => {
        eruda.init();
    });
}

const theme = createTheme({
    colors: {
        dark: [
            "#d5d7da",
            "#a3a8b1",
            "#7a828e",
            "#5f6873",
            "#48525c",
            "#374047",
            "#2a3035",
            "#1f2428",
            "#161b22",
            "#0d1117",
        ],
    },
});

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
