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

import {MantineProvider} from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import {App} from "./App.tsx";
import {theme} from "./theme";

// Re-export theme for tests and other modules
export {theme} from "./theme";

// Initialize Eruda for development/testing (mobile console)
if (import.meta.env.DEV) {
    void import("eruda").then(({default: eruda}) => {
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
