/**
 * The "Styles in and out" example of docs/guide/graphs-in-and-out.md, run as written: taken from the page, it runs
 * in a child Node against dist/, with the package installed under its published name, as a reader would run it.
 * It then reads the GraphML the example wrote back into a new core, to check the file holds what the page says.
 *
 * Builds against dist/, so the package must be built first (the pre-push gate and CI do).
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const pkg = fileURLToPath(new URL("..", import.meta.url));
const guide = readFileSync(join(pkg, "docs/guide/graphs-in-and-out.md"), "utf8");
const example = /<!-- example: styles-in-and-out[^>]*-->\s*```js\n([\s\S]*?)```/.exec(guide)?.[1] ?? "";

/** Reads the example's `graphml` back with its styles and prints what each node and the edge draw. */
const readBack = `
const back = cytoscape({ headless: true, styleEnabled: true });
await back.graphtyImport(graphml, "graphml", { styles: true, applyStyles: true });
console.log(JSON.stringify(["a", "b", "ab"].map((id) => back.$id(id).style(id === "ab" ? "line-color" : "background-color"))));
back.destroy();
`;

describe("the styles example of the graphs-in-and-out guide", () => {
    it("is on the page, about 15 lines, and imports only published entry points", () => {
        expect(example).not.toBe("");
        const specifiers = [...example.matchAll(/from "([^"]+)"/g)].map((m) => m[1]);
        expect(specifiers.sort()).toEqual(["@graphty/cytoscape-extensions", "cytoscape"]);
        // the code, without the GEXF text it reads
        const code = example
            .replace(/`[\s\S]*?`/, "``")
            .split("\n")
            .filter((l) => l.trim() !== "");
        expect(code.length).toBeLessThanOrEqual(16);
    });

    it("draws the GEXF in Gephi's colors and writes the recolored graph to GraphML", () => {
        expect(existsSync(join(pkg, "dist/index.js")), "build the package first (npm run build)").toBe(true);
        const dir = mkdtempSync(join(tmpdir(), "cytoscape-extensions-docs-styles-"));
        try {
            mkdirSync(join(dir, "node_modules/@graphty"), { recursive: true });
            symlinkSync(pkg, join(dir, "node_modules/@graphty/cytoscape-extensions"), "dir");
            const cy = process.env.CYTOSCAPE_DIR ?? realpathSync(join(pkg, "node_modules/cytoscape"));
            symlinkSync(cy, join(dir, "node_modules/cytoscape"), "dir");
            const out = execFileSync(process.execPath, ["--input-type=module", "-e", example + readBack], {
                cwd: dir,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
            })
                .trim()
                .split("\n");
            // the first line is what the page says it prints
            expect(out[0]).toBe("rgb(228,26,28)");
            // the file keeps a's color from the GEXF, b's gold from the core's own rule, and Gephi's edge color:
            // the mean of a's and b's GEXF colors, each channel rounded down
            expect(JSON.parse(out.at(-1) ?? "")).toEqual(["rgb(228,26,28)", "rgb(255,215,0)", "rgb(141,76,106)"]);
        } finally {
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
