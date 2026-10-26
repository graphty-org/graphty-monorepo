// Temporary: the model and SLA tests until the package's own vitest config lands on feat/3602-pipeline-health.
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    root: fileURLToPath(new URL("..", import.meta.url)),
    test: { include: ["test/model/**/*.test.ts", "test/sla/**/*.test.ts"], environment: "node" },
});
