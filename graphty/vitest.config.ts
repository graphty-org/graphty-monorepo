import react from "@vitejs/plugin-react";
import {resolve} from "path";
import {defineConfig} from "vitest/config";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
            "graphty-element": resolve(__dirname, "../graphty-element/index.ts"),
        },
    },
    test: {
        globals: true,
        browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{browser: "chromium"}],
        },
        setupFiles: "./src/test/setup.ts",
        coverage: {
            reporter: ["text", "json", "html"],
            exclude: [
                "node_modules/",
                "src/test/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/.eslintrc.*",
                "dist/",
            ],
        },
    },
});
