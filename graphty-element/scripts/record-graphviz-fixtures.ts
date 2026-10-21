/**
 * Record the Graphviz layout fixtures `test/layout/graphviz-fidelity.test.ts` checks against.
 *
 * For each corpus file: read it with graph-io's DOT importer, write it as the DOT the element
 * hands Graphviz (`toDot`), and lay that out with every engine. Two answers are recorded:
 *
 * - `wasm`: `@hpcc-js/wasm-graphviz`, the library the element runs, in a fresh instance. The test
 *   asserts the element's path gives exactly these.
 * - `cli`: the native Graphviz command line on the same DOT text, when `GRAPHVIZ_CLI` names a
 *   `dot` binary (any engine is chosen with `-K`). The test asserts the element's answer is within
 *   a stated tolerance of it after both are normalized to their bounding box.
 *
 * The recorded `cli` answers are native Graphviz 16.1.0 built without pango and run with musl's
 * `qsort` preloaded, the libc the WebAssembly build uses: with glibc's `qsort` dot and circo break
 * ties between equal elements in another order on 5 of these 20 files.
 *
 * Usage: GRAPHVIZ_CLI=/path/to/dot npx tsx scripts/record-graphviz-fixtures.ts
 */

import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GraphBuilder } from "@graphty/graph-format";
import { dotImporter } from "@graphty/graph-io/dot";
import { Graphviz } from "@hpcc-js/wasm-graphviz";

import { GRAPHVIZ_ENGINES } from "../src/layout/graphviz/engines";
import { fromJson } from "../src/layout/graphviz/fromJson";
import { toDot } from "../src/layout/graphviz/toDot";

const here = dirname(fileURLToPath(import.meta.url));
const corpus = resolve(here, "../../graph-io/test/conformance/fixtures/dot");
const out = resolve(here, "../test/layout/graphviz-fixtures");

/** The corpus files, relative to graph-io's DOT conformance fixtures. */
const FIDELITY_FILES = [
    "graphviz-graphs/abstract.gv",
    "graphviz-graphs/alf.gv",
    "graphviz-graphs/clust4.gv",
    "graphviz-graphs/crazy.gv",
    "graphviz-graphs/Heawood.gv",
    "graphviz-graphs/Petersen.gv",
    "graphviz-graphs/jcctree.gv",
    "graphviz-graphs/states.gv",
    "graphviz-graphs/world.gv",
    "graphviz-graphs/dfa.gv",
    "graphviz-graphs/grammar.gv",
    "graphviz-graphs/hashtable.gv",
    "graphviz-graphs/pgram.gv",
    "graphviz-graphs/train11.gv",
    "graphviz-graphs/structs.gv",
    "graphviz-gallery/cluster.gv",
    "graphviz-gallery/fsm.gv",
    "graphviz-gallery/unix.gv",
    "graphviz-gallery/process.gv",
    "graphviz-gallery/ER.gv",
];

const cli = process.env.GRAPHVIZ_CLI;
mkdirSync(out, { recursive: true });
let version = "";
for (const file of FIDELITY_FILES) {
    const builder = new GraphBuilder({ directed: true, weightDtype: "f64" });
    await dotImporter.import(readFileSync(resolve(corpus, file)), builder, { ids: "keep" });
    const snapshot = builder.freeze();
    const dot = toDot(snapshot, {});
    const engines: Record<string, { wasm: number[]; cli?: number[]; cliWarning?: string }> = {};
    for (const engine of GRAPHVIZ_ENGINES) {
        Graphviz.unload();
        const graphviz = await Graphviz.load();
        version = graphviz.version();
        const wasm = Array.from(fromJson(graphviz.layout(dot, "json", engine), snapshot.nodeCount));
        engines[engine] = { wasm };
        if (cli !== undefined) {
            // A native build without the triangulation library warns on sfdp's overlap removal and
            // exits non-zero, with the layout still written; the warning is kept beside it.
            const run = spawnSync(cli, [`-K${engine}`, "-Tjson"], { input: dot, encoding: "utf8" });
            if (!run.stdout.trimStart().startsWith("{")) {
                throw new Error(`${cli} -K${engine} failed on ${file}: ${run.stderr}`);
            }

            engines[engine].cli = Array.from(fromJson(run.stdout, snapshot.nodeCount));
            if (run.stderr.trim() !== "") {
                engines[engine].cliWarning = run.stderr.trim();
            }
        }
    }

    // `dot -V` writes its version to stderr.
    const cliVersion = cli === undefined ? null : spawnSync(cli, ["-V"], { encoding: "utf8" }).stderr;
    writeFileSync(
        resolve(out, `${basename(file, ".gv")}.json`),
        `${JSON.stringify({ file, nodes: snapshot.nodeCount, graphviz: version, cli: cliVersion?.trim() ?? null, engines })}\n`,
    );
    console.log(file, snapshot.nodeCount);
}
