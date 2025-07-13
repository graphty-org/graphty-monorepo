import react from "@vitejs/plugin-react";
import {resolve} from "path";
import {defineConfig} from "vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            // Alias to local graphty-element during development
            "graphty-element": resolve(__dirname, "../graphty-element/index.ts"),
        },
    },
    server: {
        host: true,
        port: 5173,
    },
    build: {
        outDir: "dist",
        sourcemap: true,
    },
});
