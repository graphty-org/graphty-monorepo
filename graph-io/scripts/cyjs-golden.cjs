// Writes graph-io/test/corpus/styles/cyjs/golden.json.gz (gzipped JSON): what real Cytoscape.js draws for every node
// and edge of every stylesheet in that directory, read back with `ele.style(property)` from a headless core with
// styles on. The test compares graph-io's Cytoscape.js style engine with these values; it never loads Cytoscape.js.
//
// Usage, from the repository root after `pnpm install` (Cytoscape.js is a dependency of
// cytoscape-extensions and is hoisted to the root node_modules):
//   node graph-io/scripts/cyjs-golden.cjs
const { readdirSync, readFileSync, statSync, writeFileSync } = require("node:fs");
const { join, relative } = require("node:path");
const { gzipSync } = require("node:zlib");
const cytoscape = require("cytoscape");

const HERE = join(__dirname, "../test/corpus/styles/cyjs");
const NODE = [
    "background-color",
    "background-opacity",
    "opacity",
    "border-color",
    "border-width",
    "border-style",
    "shape",
    "width",
    "height",
    "label",
    "color",
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "visibility",
    "display",
    "text-valign",
    "text-halign",
];
const EDGE = [
    "line-color",
    "width",
    "opacity",
    "line-style",
    "target-arrow-shape",
    "source-arrow-shape",
    "target-arrow-color",
    "source-arrow-color",
    "curve-style",
    "arrow-scale",
    "label",
    "color",
    "font-size",
    "font-family",
    "font-weight",
    "font-style",
    "source-label",
    "target-label",
    "visibility",
    "display",
];

/**
 * One element's value of a property; "!error" where Cytoscape.js throws while styling the element (a number given
 * where a color is read through data() makes its color parser call toLowerCase on a number).
 */
function styleOf(ele, p) {
    try {
        return ele.style(p);
    } catch {
        return "!error";
    }
}

/** Run-length encodes a column as [value, count] pairs. */
function runs(values) {
    const out = [];
    for (const v of values) {
        const last = out[out.length - 1];
        if (last && last[0] === v) last[1]++;
        else out.push([v, 1]);
    }
    return out;
}

const files = [];
const walk = (d) => {
    for (const name of readdirSync(d).sort()) {
        const p = join(d, name);
        if (statSync(p).isDirectory()) walk(p);
        else if (name.endsWith(".cyjs")) files.push(p);
    }
};
walk(HERE);

const warn = console.warn;
console.warn = () => {};
const golden = {
    source: `Cytoscape.js ${cytoscape.version ?? require("cytoscape/package.json").version}, headless with styles on; ele.style(property) per element; each column run-length encoded as [value, count]`,
    files: {},
};
for (const f of files) {
    const doc = JSON.parse(readFileSync(f, "utf8"));
    const cy = cytoscape({ headless: true, styleEnabled: true, elements: doc.elements, style: doc.style });
    const entry = { nodes: cy.nodes().length, edges: cy.edges().length, node: {}, edge: {} };
    for (const p of NODE) entry.node[p] = runs(cy.nodes().map((n) => styleOf(n, p)));
    for (const p of EDGE) entry.edge[p] = runs(cy.edges().map((e) => styleOf(e, p)));
    golden.files[relative(HERE, f)] = entry;
    cy.destroy();
}
console.warn = warn;
writeFileSync(join(HERE, "golden.json.gz"), gzipSync(JSON.stringify(golden), { level: 9 }));
