import "./index.css";
import "@mantine/core/styles.css";

import {createTheme, MantineProvider} from "@mantine/core";
import React from "react";
import ReactDOM from "react-dom/client";

import {App} from "./App.tsx";

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
