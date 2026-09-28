// Type-check every TypeScript example in design/extensions/*.md against the element's own ./extend
// and ./logging, under strict and noImplicitOverride. Run from the repository root:
//   node design/extensions/check-examples.mjs
// A one-line signature block (for example "registerPalette(descriptor, options?): void") is skipped.
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
const prelude = [
    'import type { createGraphSession } from "@graphty/graphty-element/session";',
    'import type { Graph } from "@graphty/graphty-element";',
    "declare const session: ReturnType<typeof createGraphSession>;",
    "declare const graph: Graph;",
    "declare const droppedFile: File;",
    "",
].join("\n");

let count = 0;
for (const name of readdirSync(specDir).filter((file) => file.endsWith(".md"))) {
    const blocks = [...readFileSync(join(specDir, name), "utf8").matchAll(/```ts\n([\s\S]*?)```/g)].map((m) => m[1]);
    blocks.forEach((block, index) => {
        if (block.includes("@graphty/graphty-element/conformance") || block.split("\n").length < 3) {
            return;
        }
        writeFileSync(join(out, `${name.replace(/\.md$/, "")}_${index}.ts`), prelude + block);
        count++;
    });
}

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
