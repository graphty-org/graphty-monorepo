/**
 * The graphty app may import graph functionality only through graphty-element's published entry
 * points (CLAUDE.md, "Architectural Principles"). eslint.config.js enforces that with
 * @typescript-eslint/no-restricted-imports; this runs the real config over sample imports.
 */
import { fileURLToPath } from "node:url";

import { ESLint, Linter } from "eslint";
import tseslint from "typescript-eslint";
import { describe, expect, it } from "vitest";

const RULE_ID = "@typescript-eslint/no-restricted-imports";
const APP_ROOT = fileURLToPath(new URL("../..", import.meta.url));

// The rule's options as the app's real config computes them for a source file. The rule is then
// run on its own: the full config lints with type information, which a sample text cannot have.
const appConfig = await new ESLint({ cwd: APP_ROOT }).calculateConfigForFile("src/main.tsx");
const ruleConfig = appConfig.rules?.[RULE_ID];
const linter = new Linter();
const config: Linter.Config[] = [
    {
        files: ["**/*.ts"],
        languageOptions: { parser: tseslint.parser },
        plugins: { "@typescript-eslint": tseslint.plugin },
        rules: { [RULE_ID]: ruleConfig },
    },
];

function restricted(source: string): boolean {
    const messages = linter.verify(source, config, "sample.ts");
    const fatal = messages.find((m) => m.fatal);
    if (fatal) {
        throw new Error(fatal.message);
    }
    return messages.some((m) => m.ruleId === RULE_ID);
}

describe("graphty app import restrictions", () => {
    it("is an error in the app config", () => {
        expect(Array.isArray(ruleConfig) ? ruleConfig[0] : ruleConfig).toBe(2);
    });

    it.each([
        'import { dijkstra } from "@graphty/algorithms";',
        'import { springLayout } from "@graphty/layout";',
        'import { createGpuContext } from "@graphty/webgpu-graph-algorithms";',
        'import type { GraphSnapshot } from "@graphty/graph-format";',
        'import { parseGexf } from "@graphty/graph-io/gexf";',
        'import { Scene } from "@babylonjs/core";',
        'import { Graph } from "@graphty/graphty-element/src/Graph";',
        'import { Graph } from "@graphty/graphty-element/dist/Graph.js";',
        'import { Button } from "@graphty/compact-mantine/src/index";',
        'import { Graph } from "../../graphty-element/src/Graph";',
    ])("rejects %s", (source) => {
        expect(restricted(source)).toBe(true);
    });

    it.each([
        'import "@graphty/graphty-element";',
        'import type { GraphtySession } from "@graphty/graphty-element/session";',
        'import { catalog } from "@graphty/graphty-element/catalog";',
        'import { Button } from "@graphty/compact-mantine";',
        'import { helper } from "../components/helper";',
    ])("allows %s", (source) => {
        expect(restricted(source)).toBe(false);
    });
});
