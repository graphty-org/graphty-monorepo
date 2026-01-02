import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": resolve(__dirname, "./src"),
        },
    },
    optimizeDeps: {
        include: ["@mantine/hooks", "@graphty/graphty-element"],
    },
    test: {
        globals: true,
        browser: {
            enabled: true,
            headless: true,
            provider: "playwright",
            instances: [{ browser: "chromium" }],
        },
        exclude: ["**/node_modules/**", "**/dist/**", "**/.worktrees/**"],
        setupFiles: "./src/test/setup.ts",
        coverage: {
            all: true,
            provider: "v8",
            reporter: ["text", "json-summary", "json", "lcov", "html"],
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: [
                "node_modules/",
                "src/test/",
                "**/*.d.ts",
                "**/*.config.*",
                "**/.eslintrc.*",
                "dist/",
                "**/*.test.ts",
                "**/*.test.tsx",
            ],
        },
    },
});
