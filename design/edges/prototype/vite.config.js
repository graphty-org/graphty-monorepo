// Serves the edge-corner prototype: PORT and HOST from the environment (start it through servherd).
// @babylonjs/core resolves to the monorepo's copy; the shipped shader is read from graphty-element.
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default {
    root,
    server: {
        host: process.env.HOST ?? "0.0.0.0",
        port: Number(process.env.PORT),
        strictPort: true,
        allowedHosts: true,
        fs: { allow: [fileURLToPath(new URL("../../..", import.meta.url))] },
    },
    optimizeDeps: { include: ["@babylonjs/core"] },
};
