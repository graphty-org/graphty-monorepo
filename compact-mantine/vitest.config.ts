import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        globals: true,
        environment: "jsdom",
        setupFiles: ["./tests/setup.ts"],
        include: ["tests/**/*.test.{ts,tsx}", "src/**/*.test.{ts,tsx}"],
        coverage: {
            provider: "v8",
            reporter: ["text", "json", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.ts", "src/**/*.tsx"],
            exclude: ["**/*.stories.tsx", "**/*.stories.ts", "**/*.test.ts", "**/*.test.tsx"],
            thresholds: {
                lines: 80,
                functions: 80,
                statements: 80,
                branches: 75,
            },
        },
    },
});
