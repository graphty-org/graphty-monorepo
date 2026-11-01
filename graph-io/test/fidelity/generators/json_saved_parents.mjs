// Writes cyjs-synth-edges-saved.json: cyjs-synth-edges.json with each compound parent's position as
// Cytoscape.js's cy.json() saves it (the center Cytoscape.js draws the parent at, around its
// children and their labels). The positions are read from the pinned Cytoscape.js (graph-io's
// devDependency) drawing the file in headless Chromium, since a headless Cytoscape.js measures no
// labels. Run json_gen_synthetic.py first.
//
//   tools/with-browser.sh node json_saved_parents.mjs [<json fidelity dir>]
import console from "node:console";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const graphIo = resolve(here, "../../..");
const dir = resolve(process.argv[2] ?? join(graphIo, "test/corpus/styles/json/fidelity"));
const doc = JSON.parse(readFileSync(join(dir, "cyjs-synth-edges.json"), "utf8"));
const cyjs = createRequire(join(graphIo, "package.json")).resolve("cytoscape/dist/cytoscape.min.js");
const { chromium } = createRequire(resolve(graphIo, "../graphty-element/package.json"))("playwright");
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
try {
    const page = await (await browser.newContext({ viewport: { width: 1200, height: 900 } })).newPage();
    await page.setContent(
        `<html><body style="margin:0"><div id=c style="width:1200px;height:900px"></div></body></html>`,
    );
    await page.addScriptTag({ content: readFileSync(cyjs, "utf8") });
    const parents = await page.evaluate(async ({ elements, style }) => {
        const cy = globalThis.cytoscape({
            container: globalThis.document.getElementById("c"),
            elements,
            style,
            layout: { name: "preset" },
        });
        await new Promise((drawn) => {
            let draws = 0;
            cy.on("render", () => {
                draws += 1;
                if (draws === 2) drawn();
            });
            cy.forceRender();
        });
        return Object.fromEntries(cy.nodes(":parent").map((n) => [n.id(), n.position()]));
    }, doc);
    for (const n of doc.elements.nodes) {
        if (parents[n.data.id]) n.position = parents[n.data.id];
    }
    writeFileSync(join(dir, "cyjs-synth-edges-saved.json"), JSON.stringify(doc, null, 1));
    console.log("cyjs-synth-edges-saved");
} finally {
    await browser.close();
}
