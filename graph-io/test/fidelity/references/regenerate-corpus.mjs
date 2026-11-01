// Regenerates the reference scenes of the style fidelity corpus (CORPUS_SAMPLES in ../corpus-samples.ts):
// for each sample, each of its routes, the extractor in this directory that writes
// ../scenes/<sample>/<route>.ref.json. The hand-picked samples (../samples.ts) are regenerate.sh's.
//
//   node regenerate-corpus.mjs [--out <dir>] [--route <route>] [<sample id> ...]
//
// With no sample ids it runs every corpus sample. --out writes <dir>/<sample>/<route>.ref.json instead
// of over the committed scenes, to compare them (--check does that comparison: it writes into a
// temporary directory and reports each scene as SAME, the committed one bar provenance.generatedAt,
// REORDERED, the same once the elements are sorted, or DIFFERENT). A route whose tool is not there is reported SKIPPED with what it needs, never faked.
//
// Tools come from $STYLE_FIDELITY_TOOLS (default <main checkout>/tmp/style-fidelity/tools, TOOLS.md):
// jre17/ and gephi/ for gephi-noscale, conda-graphviz/ for gml2gv, npm-graphviz/ for graphviz-json,
// py/ (networkx) for GML's yed-file, drawio/ for drawio. cytoscape-desktop needs $CYREST_PORT, the
// CyREST port of a running Cytoscape desktop 3.10.5. The JSON routes need only graph-io's
// devDependencies. Browser steps run under $WITH_BROWSER (default tools/with-browser.sh).
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import console from "node:console";
import process from "node:process";

import { CORPUS_SAMPLES } from "../corpus-samples.ts";

const here = dirname(fileURLToPath(import.meta.url));
const fidelity = resolve(here, "..");
const testDir = resolve(fidelity, "..");
const repo = resolve(testDir, "../..");
const main = dirname(
    execFileSync("git", ["-C", here, "rev-parse", "--path-format=absolute", "--git-common-dir"], {
        encoding: "utf8",
    }).trim(),
);
const TOOLS = process.env.STYLE_FIDELITY_TOOLS ?? join(main, "tmp/style-fidelity/tools");
const WITH_BROWSER = process.env.WITH_BROWSER ?? join(repo, "tools/with-browser.sh");

// sigma.js draws label sizes in canvas pixels over positions it fits to the canvas: these two are
// judged on the 800 x 600 canvas the browser scorecard draws graphty-element on (TOOLS.md).
const SIGMA_CANVAS = { "json-sigma-lesmis": "800x600", "json-graphology-synth": "800x600" };

const args = process.argv.slice(2);
const flag = (name) => {
    const i = args.indexOf(name);
    return i < 0 ? undefined : args.splice(i, 2)[1];
};
const check = args.includes("--check") ? (args.splice(args.indexOf("--check"), 1), true) : false;
const onlyRoute = flag("--route");
const outArg = flag("--out");
const out = check
    ? mkdtempSync(join(tmpdir(), "fidelity-scenes-"))
    : outArg
      ? resolve(outArg)
      : join(fidelity, "scenes");
const unknown = args.filter((id) => !CORPUS_SAMPLES.some((s) => s.id === id));
if (unknown.length > 0) {
    console.error(`regenerate-corpus.mjs: not corpus samples: ${unknown.join(", ")}`);
    process.exit(2);
}
const samples = CORPUS_SAMPLES.filter((s) => args.length === 0 || args.includes(s.id));

/**
 * Runs a command and fails on a non-zero exit.
 * @param cmd - the program
 * @param cmdArgs - its arguments
 * @param [opts] - `env`, added to this process's environment, and `input`, piped to its stdin
 * @param [opts.env] - environment variables
 * @param [opts.input] - its stdin
 * @returns its stdout
 */
function run(cmd, cmdArgs, { env = {}, input } = {}) {
    const r = spawnSync(cmd, cmdArgs, {
        env: { ...process.env, FC_FONTATIONS: "1", ...env },
        input,
        encoding: "utf8",
        maxBuffer: 1 << 30,
    });
    if (r.status !== 0) throw new Error(`${cmd} ${cmdArgs.join(" ")}: exit ${r.status}\n${r.stderr}`);
    return r.stdout;
}
const node = (script, scriptArgs, opts) => run(process.execPath, [join(here, script), ...scriptArgs], opts);
const browser = (script, scriptArgs, opts) =>
    run(WITH_BROWSER, [process.execPath, join(here, script), ...scriptArgs], opts);
const finish = (json, dest, ...flags) => node("common.mjs", ["finish", ...flags, dest], { input: json });
const python = (script, file, env) => run("python3", [join(here, script), file], { env });
const YFILES_HTML_NAMESPACE = "http://www.yworks.com/xml/yfiles-for-html/";
// yEd draws edges to group boxes, which a scene cannot carry
const GROUP_EDGES = "--drop-group-edges";
const need = (path, what) => (existsSync(path) ? null : `${what} (${path})`);

/**
 * How one route of one sample is regenerated.
 * @param sample - the corpus sample
 * @param route - one of its routes
 * @param file - the sample's file
 * @param dest - the scene to write
 * @returns what is missing to run it (a string), or the function that writes `dest`
 */
function recipe(sample, route, file, dest) {
    const G = join(TOOLS, "conda-graphviz/bin");
    switch (route) {
        case "cyjs-computed":
            return () => browser("json-library.mjs", ["cyjs", file, dest]);
        case "vis-network":
            return () => browser("json-library.mjs", ["vis", file, dest]);
        case "sigma": {
            const canvas = SIGMA_CANVAS[sample.id];
            return () => browser("json-library.mjs", ["sigma", file, dest, ...(canvas ? ["--canvas", canvas] : [])]);
        }
        case "cytoscape-desktop":
            if (!process.env.CYREST_PORT) return "a running Cytoscape desktop 3.10.5 ($CYREST_PORT)";
            return () => {
                const instead = readdirSync(join(here, "cytoscape-loads")).find((f) => f.startsWith(`${sample.id}.`));
                node("cytoscape-corpus.mjs", [
                    process.env.CYREST_PORT,
                    file,
                    dest,
                    ...(instead ? [join(here, "cytoscape-loads", instead)] : []),
                ]);
            };
        case "gexf-file":
            return () => finish(python("gexf_file.py", file), dest);
        case "pajek-file":
            return () => finish(python("pajek_file.py", file), dest);
        case "yed-file": {
            if (file.endsWith(".gml")) {
                const py = join(TOOLS, "py");
                return (
                    need(join(py, "networkx"), "networkx") ??
                    (() => finish(python("yed_gml_ext.py", file, { PYTHONPATH: py }), dest, GROUP_EDGES))
                );
            }
            // yFiles for HTML (yEd Live) GraphML stores its drawing in another vocabulary than yEd desktop's
            // (a namespace it declares starts with yFiles for HTML's)
            const bytes = readFileSync(file);
            const text = (file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8");
            const namespaces = [...text.matchAll(/\sxmlns(?::[\w.-]+)?="([^"]*)"/g)].map((m) => m[1]);
            const live = namespaces.some((ns) => ns.startsWith(YFILES_HTML_NAMESPACE));
            return () => finish(python(live ? "yfiles_html_facts.py" : "yed_facts.py", file), dest, GROUP_EDGES);
        }
        case "gephi-noscale": {
            const jdk = existsSync(join(TOOLS, "jre17"))
                ? readdirSync(join(TOOLS, "jre17")).find((d) => d.startsWith("jdk-17"))
                : undefined;
            const jar = join(TOOLS, "gephi/gephi-toolkit-0.11.3-all.jar");
            if (!jdk) return `Temurin JDK 17 (${join(TOOLS, "jre17")})`;
            return (
                need(jar, "the Gephi Toolkit") ??
                (() =>
                    node("gephi.mjs", [file, dest], { env: { JAVA_HOME: join(TOOLS, "jre17", jdk), GEPHI_JAR: jar } }))
            );
        }
        case "drawio": {
            const webapp = join(TOOLS, "drawio/app/drawio/src/main/webapp");
            return (
                need(webapp, "draw.io's source") ??
                (() => browser("drawio.mjs", [file, dest], { env: { DRAWIO_WEBAPP: webapp } }))
            );
        }
        case "graphviz-json": {
            const wasm = process.env.GRAPHVIZ_WASM_DIR ?? join(TOOLS, "npm-graphviz");
            return (
                need(wasm, "@hpcc-js/wasm-graphviz") ??
                (() => node("graphviz.mjs", [file, dest], { env: { GRAPHVIZ_WASM_DIR: wasm } }))
            );
        }
        case "gml2gv":
            return (
                need(join(G, "gml2gv"), "the Graphviz CLI") ??
                (() => {
                    const work = mkdtempSync(join(tmpdir(), "gml2gv-"));
                    try {
                        writeFileSync(
                            join(work, "layout.json"),
                            run(join(G, "neato"), ["-n2", "-Tjson"], { input: run(join(G, "gml2gv"), [file]) }),
                        );
                        // `dot -V` prints "dot - graphviz version 14.1.2 (...)" on stderr
                        const v = spawnSync(join(G, "dot"), ["-V"], { encoding: "utf8" }).stderr.split(/\s+/)[4];
                        node("graphviz.mjs", [
                            "--json",
                            join(work, "layout.json"),
                            "gml2gv",
                            file,
                            "Graphviz gml2gv, neato -n2",
                            v,
                            "gml2gv <file> | neato -n2 -Tjson",
                            dest,
                        ]);
                    } finally {
                        rmSync(work, { recursive: true, force: true });
                    }
                })
            );
        default:
            return `no extractor for route ${route}`;
    }
}

/**
 * How a regenerated scene compares with the committed one, provenance.generatedAt aside.
 * @param committed - the committed scene's path
 * @param regenerated - the regenerated scene's path
 * @returns SAME, REORDERED (equal once nodes, edges, groups and annotations are sorted: Cytoscape lists
 *   them in another order from one load to the next) or DIFFERENT
 */
function compare(committed, regenerated) {
    const read = (p, sorted) => {
        const s = JSON.parse(readFileSync(p, "utf8"));
        delete s.provenance.generatedAt;
        for (const k of sorted ? ["nodes", "edges", "groups", "annotations"] : []) {
            s[k] = s[k]?.map((x) => JSON.stringify(x)).sort();
        }
        return JSON.stringify(s);
    };
    if (read(committed, false) === read(regenerated, false)) return "SAME";
    return read(committed, true) === read(regenerated, true) ? "REORDERED" : "DIFFERENT";
}

const tally = { SAME: 0, REORDERED: 0, DIFFERENT: 0, WRITTEN: 0, SKIPPED: 0, FAILED: 0 };
for (const sample of samples) {
    for (const route of sample.routes) {
        if (onlyRoute && route !== onlyRoute) continue;
        const dest = join(out, sample.id, `${route}.ref.json`);
        const step = recipe(sample, route, join(testDir, sample.file), dest);
        let result;
        if (typeof step === "string") {
            result = `SKIPPED (needs ${step})`;
        } else {
            try {
                // a scene committed on one line (most corpus scenes) is written back on one line
                const oneLine = existsSync(dest) && !readFileSync(dest, "utf8").trimEnd().includes("\n");
                step();
                if (oneLine) writeFileSync(dest, `${JSON.stringify(JSON.parse(readFileSync(dest, "utf8")))}\n`);
                result = check ? compare(join(fidelity, "scenes", sample.id, `${route}.ref.json`), dest) : "WRITTEN";
            } catch (e) {
                result = `FAILED ${String(e.message).split("\n").slice(0, 3).join(" | ")}`;
            }
        }
        tally[result.split(" ")[0]] += 1;
        console.log(`${sample.id} ${route}: ${result}`);
    }
}
console.log(
    Object.entries(tally)
        .filter(([, n]) => n > 0)
        .map(([k, n]) => `${n} ${k}`)
        .join(", "),
);
if (check) console.log(`regenerated scenes in ${out}`);
process.exit(tally.FAILED + tally.DIFFERENT > 0 ? 1 : 0);
