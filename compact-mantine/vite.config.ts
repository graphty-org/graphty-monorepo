import { copyFileSync } from "node:fs";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import dts from "vite-plugin-dts";

export default defineConfig({
    plugins: [
        react(),
        dts({
            insertTypesEntry: true,
            rollupTypes: true,
            // package.json's `require` condition points at index.d.cts. A CommonJS consumer
            // resolving index.d.ts in a "type": "module" package would get ESM typings for a
            // CommonJS file, so the declarations are published a second time under .d.cts.
            afterBuild: () => copyFileSync("dist/index.d.ts", "dist/index.d.cts"),
        }),
    ],
    build: {
        lib: {
            entry: "src/index.ts",
            formats: ["es", "cjs"],
            fileName: (format) => `index.${format === "es" ? "js" : "cjs"}`,
        },
        rollupOptions: {
            external: [
                "react",
                "react-dom",
                "react/jsx-runtime",
                "@mantine/core",
                "@mantine/hooks",
                "@tanstack/react-table",
                "@tanstack/react-virtual",
            ],
        },
    },
});
