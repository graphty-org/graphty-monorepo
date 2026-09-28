// Type-check every TypeScript example in design/extensions/*.md against the element's own ./extend
// and ./logging, under strict and noImplicitOverride. Run from the repository root:
//   node design/extensions/check-examples.mjs
// A one-line signature block (for example "registerPalette(descriptor, options?): void") is skipped.
//
// Three checks, all of which must pass:
// 1. Every ts block compiles against the element (below). A "use it" block's `element` is the
//    element class plus the simple tier's consumer calls (SimpleTierElementControls).
// 2. Every simple-tier.md block that imports ./extend also compiles against simple.d.ts ALONE, under
//    lib ES2020, with skipLibCheck off and no other path -- the setup a third party has
//    (README section 8.1 item 2).
// 3. The budget (README section 8.1 items 1, 4 and 7): the first example of each point in
//    simple-tier.md section 4, with its "use it" block, is at most 20 author lines (non-blank,
//    non-comment, not import) and names no internal concept.
// ./extend is checked as the element's own ./extend plus the proposed simple tier (simple.d.ts), so
// a simple-tier example is checked against the normative declarations it depends on, and a
// simple-tier name that collides with a published one fails the check.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../..");
const specDir = join(root, "design/extensions");
const out = mkdtempSync(join(tmpdir(), "extension-examples-"));
// `session` and `graph` are typed from the element's own published types, so a consumer-side call
// in an example (session.runs.start, graph.setLayout) is checked too, not waved through as `any`.
const elementSource = join(root, "graphty-element/src/graphty-element");
const prelude = [
    'import type { createGraphSession } from "@graphty/graphty-element/session";',
    'import type { Graph } from "@graphty/graphty-element";',
    'import type { Graphty } from "@graphty/graphty-element";',
    "declare const session: ReturnType<typeof createGraphSession>;",
    "declare const graph: Graph;",
    "declare const element: Graphty;",
    "declare const droppedFile: File;",
    "",
].join("\n");
const isSignature = (block) => block.trim().split("\n").length === 1 && !block.trim().endsWith(";");

let count = 0;
for (const name of readdirSync(specDir).filter((file) => file.endsWith(".md"))) {
    const blocks = [...readFileSync(join(specDir, name), "utf8").matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]);
    blocks.forEach((block, index) => {
        if (block.includes("@graphty/graphty-element/conformance") || isSignature(block)) {
            return;
        }
        writeFileSync(join(out, `${name.replace(/\.md$/, "")}_${index}.ts`), prelude + block);
        count++;
    });
}

// The simple tier adds consumer calls to the element class; the playground and the release add them
// to Graphty itself, which HTMLElementTagNameMap maps "graphty-element" to.
writeFileSync(
    join(out, "_element.ts"),
    [
        `import type { SimpleTierElementControls } from ${JSON.stringify(join(specDir, "simple"))};`,
        `declare module ${JSON.stringify(elementSource)} {`,
        "    interface Graphty extends SimpleTierElementControls {}",
        "}",
        "",
    ].join("\n"),
);

writeFileSync(
    join(out, "_extend.ts"),
    [
        `export * from ${JSON.stringify(join(root, "graphty-element/extend"))};`,
        `export * from ${JSON.stringify(join(specDir, "simple"))};`,
        "",
    ].join("\n"),
);

writeFileSync(
    join(out, "tsconfig.json"),
    JSON.stringify({
        compilerOptions: {
            strict: true,
            noImplicitOverride: true,
            noEmit: true,
            target: "ES2024",
            module: "ESNext",
            moduleResolution: "Bundler",
            lib: ["ES2024", "DOM", "DOM.Iterable"],
            skipLibCheck: true,
            types: [],
            paths: {
                "@graphty/graphty-element/extend": [join(out, "_extend.ts")],
                "@graphty/graph-format": [join(root, "graph-format/src/index.ts")],
                "@graphty/graphty-element/logging": [join(root, "graphty-element/logging.ts")],
                "@graphty/graphty-element/session": [join(root, "graphty-element/session.ts")],
                "@graphty/graphty-element": [join(root, "graphty-element/index.ts")],
            },
        },
        include: ["*.ts"],
    }),
);

// The element's own sources are compiled through the path mapping and are not all written for
// noImplicitOverride, so only diagnostics in the extracted examples count.
console.log(`type-checking ${count} examples in ${out}`);
let report = "";
try {
    execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(out, "tsconfig.json")], { encoding: "utf8" });
} catch (error) {
    report = String(error.stdout ?? "");
}
const failures = report.split("\n").filter((line) => line.startsWith(out) || line.includes("extension-examples-"));
if (failures.length > 0) {
    console.error(failures.join("\n"));
    process.exit(1);
}
console.log("examples type-check");

// 2. The simple tier alone, as a third party compiles it.
const simpleText = readFileSync(join(specDir, "simple-tier.md"), "utf8");
const alone = mkdtempSync(join(tmpdir(), "extension-simple-"));
let aloneCount = 0;
for (const [index, match] of [...simpleText.matchAll(/```ts\n([\s\S]*?)```/g)].entries()) {
    if (match[1].includes('from "@graphty/graphty-element/extend"')) {
        writeFileSync(join(alone, `simple_${index}.ts`), match[1]);
        aloneCount++;
    }
}
writeFileSync(
    join(alone, "tsconfig.json"),
    JSON.stringify({
        compilerOptions: {
            strict: true,
            noEmit: true,
            target: "ES2020",
            module: "ESNext",
            moduleResolution: "Bundler",
            lib: ["ES2020", "DOM", "DOM.Iterable"],
            skipLibCheck: false,
            types: [],
            paths: { "@graphty/graphty-element/extend": [join(specDir, "simple.d.ts")] },
        },
        include: ["*.ts"],
    }),
);
console.log(`type-checking ${aloneCount} simple-tier examples against simple.d.ts alone, lib ES2020`);
try {
    execFileSync(join(root, "node_modules/.bin/tsc"), ["-p", join(alone, "tsconfig.json")], { encoding: "utf8" });
} catch (error) {
    console.error(String(error.stdout ?? ""));
    process.exit(1);
}

// 3. The budget of each point's first example.
const internal = [
    "snapshot",
    "rowPtr",
    "colIdx",
    "Float32Array",
    "typed array",
    "NodeMask",
    "EdgeMask",
    "yieldNow",
    "forEachChunked",
    "costClass",
    "costUnits",
    "plainName",
    "technicalName",
    "declaredCaveats",
    "getConfig",
    "resolveOptions",
    "toRecords",
    "chunkData",
    "ExportCapabilities",
    "idOf",
    "edgeId",
];
const authorLines = (block) =>
    block.split("\n").filter((line) => {
        const t = line.trim();
        return t !== "" && !t.startsWith("//") && !t.startsWith("import ");
    }).length;
let overBudget = false;
for (const section of simpleText.split(/\n### (?=4\.\d)/).slice(1)) {
    const title = section.split("\n")[0];
    const first = section.split("**Use it")[0];
    const example = [...first.matchAll(/```ts\n([\s\S]*?)```/g)].at(-1)?.[1] ?? "";
    const useIt = section.split("**Use it")[1]?.match(/```ts\n([\s\S]*?)```/)?.[1] ?? "";
    const lines = authorLines(example) + authorLines(useIt);
    const named = internal.filter((term) => (example + useIt).includes(term));
    console.log(`${title}: ${lines} author lines`);
    if (lines > 20 || named.length > 0) {
        console.error(`  over budget: ${lines} lines${named.length ? `; names ${named.join(", ")}` : ""}`);
        overBudget = true;
    }
}
if (overBudget) process.exit(1);
console.log("every first example is within the budget");
