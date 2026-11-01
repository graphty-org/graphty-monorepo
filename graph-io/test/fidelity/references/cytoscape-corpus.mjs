// Reference scene from Cytoscape desktop for a corpus file (route cytoscape-desktop): like cyrest.mjs,
// but it waits for the file's own style to reach the view before reading it. Cytoscape applies a CX or
// CX2 file's style to the view a moment after `network load file` returns, so a view read at once
// shows the "default" style's values. When Cytoscape registers the file's one style and never puts it
// on the view, this puts it there, as the load meant to. A session holding several views is read at
// the view of the network graph-io reads from it (graph-io's built dist/, so build graph-io first),
// else its largest.
//
//   node cytoscape-corpus.mjs <rest port> <file as stored> <out.ref.json> [<file Cytoscape loads instead>]
//
// The last argument is the same network in another encoding, for a file Cytoscape cannot load itself
// (cytoscape-loads/SOURCES.md); the scene still names the stored file's hash.
// Needs a running Cytoscape desktop 3.10.5 with CyREST on <rest port> (TOOLS.md, "The oracles", says
// how to start one); only one script may drive it at a time. A .gz file is loaded decompressed and
// hashed as stored. The scene itself is cyrest.mjs's sceneFromCyrest().
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";
import console from "node:console";
import process from "node:process";

import { finishScene, sha256File } from "./common.mjs";
import { sceneFromCyrest, sizeBypasses } from "./cyrest.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const [port, input, out, instead] = process.argv.slice(2);
if (!port || !input || !out) {
    console.error("usage: cytoscape-corpus.mjs <rest port> <file as stored> <out.ref.json>");
    process.exit(2);
}
const work = mkdtempSync(join(tmpdir(), "cytoscape-corpus-"));
let load = resolve(instead ?? input);
if (load.endsWith(".gz")) {
    load = join(work, basename(load, ".gz"));
    writeFileSync(load, gunzipSync(readFileSync(instead ?? input)));
}
/**
 * How many nodes graph-io reads from a session, to pick the same network's view.
 * @returns the count, or null for a file that is not a session
 */
async function graphIoNodes() {
    if (!load.endsWith(".cys")) return null;
    const { createRegistry } = await import(pathToFileURL(resolve(here, "../../../dist/graph-io.js")).href);
    const result = await createRegistry().importGraph(new Uint8Array(readFileSync(load)), { format: "cys" });
    return result.snapshot.nodeCount;
}
const wantNodes = await graphIoNodes();
const base = `http://localhost:${port}/v1`;
const call = async (method, path, body) => {
    const res = await globalThis.fetch(base + path, {
        method,
        headers: body ? { "content-type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${(await res.text()).slice(0, 300)}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
};
const cmd = (ns, c, args) => call("POST", `/commands/${ns}/${encodeURIComponent(c)}`, args);
const views = async () => {
    const list = [];
    for (const n of await call("GET", "/networks"))
        for (const v of await call("GET", `/networks/${n}/views`)) list.push([n, v]);
    return list;
};

try {
    await cmd("session", "new", { destroyCurrentSession: true });
    const builtinStyles = new Set(await call("GET", "/styles"));
    if (load.endsWith(".cys")) await cmd("session", "open", { file: load });
    else await cmd("network", "load file", { file: load });
    // Styles a session carries by default, which are never the file's own.
    const KNOWN =
        /^(Sample[123]|Nested Network Style|Big Labels|Directed|default( black)?|Curved|Ripple|Universe|Minimal|Marquee|Gradient1|Solid|size_rank)(_\d+)?$/;
    for (let i = 0; i < 20; i++) {
        await new Promise((r) => globalThis.setTimeout(r, 1000));
        const vs = await views();
        if (vs.length === 0) continue;
        const fileStyles = (await call("GET", "/styles")).filter((t) => !builtinStyles.has(t) && !KNOWN.test(t));
        const titles = [];
        for (const [n, v] of vs) titles.push((await call("GET", `/networks/${n}/views/${v}/currentStyle`)).title);
        if (fileStyles.length === 0 || titles.every((t) => t !== "default")) break;
        if (i >= 4 && !load.endsWith(".cys") && fileStyles.length === 1) {
            for (const [n] of vs) await call("GET", `/apply/styles/${encodeURIComponent(fileStyles[0])}/${n}`);
            await new Promise((r) => globalThis.setTimeout(r, 2000));
            break;
        }
    }
    const viewed = [];
    for (const [net, view] of await views())
        viewed.push({ net, view, n: (await call("GET", `/networks/${net}/nodes`)).length });
    if (viewed.length === 0) throw new Error(`Cytoscape made no network view of ${load}`);
    const { net, view, n } = viewed.find((x) => x.n === wantNodes) ?? [...viewed].sort((a, b) => b.n - a.n)[0];
    const keep = (rows) =>
        rows.map((r) => ({ SUID: r.SUID, ...Object.fromEntries(r.view.map((v) => [v.visualProperty, v.value])) }));
    const nodes = keep(await call("GET", `/networks/${net}/views/${view}/nodes`));
    const edges = keep(await call("GET", `/networks/${net}/views/${view}/edges`));
    const netProps = Object.fromEntries(
        (await call("GET", `/networks/${net}/views/${view}/network`)).map((v) => [v.visualProperty, v.value]),
    );
    const topology = await call("GET", `/networks/${net}/views/${view}`);
    const style = await call("GET", `/networks/${net}/views/${view}/currentStyle`);
    const deps = await call("GET", `/styles/${encodeURIComponent(style.title)}/dependencies`);
    const locked = deps.some((d) => d.visualPropertyDependency === "nodeSizeLocked" && d.enabled);
    const bypassed = locked ? await sizeBypasses(call, net, view, nodes) : {};
    const annotations = (await cmd("annotation", "list", { network: `SUID:${net}` })).data ?? [];
    const scene = sceneFromCyrest({
        nodes,
        edges,
        topology,
        background: netProps.NETWORK_BACKGROUND_PAINT,
        annotations,
        locked,
        bypassed,
    });
    const several =
        viewed.length > 1
            ? [
                  {
                      property: "position",
                      reason: `the file holds ${viewed.length} network views (${viewed.map((x) => x.n).join(", ")} nodes); this scene is the one with ${n} nodes`,
                  },
              ]
            : [];
    finishScene(
        {
            provenance: {
                side: "reference",
                route: "cytoscape-desktop",
                tool: "Cytoscape desktop over CyREST, Temurin JDK 17 (corpus run: waits for the file's style)",
                version: (await call("GET", "/version")).cytoscapeVersion,
                command: `${load.endsWith(".cys") ? "session open" : "network load file"} <file>; wait for style; GET /v1/networks/{n}/views/{v}/nodes|edges|network; annotation list`,
                sourceSha256: sha256File(resolve(input)),
                generatedAt: new Date().toISOString(),
            },
            canCarry: {},
            ...scene,
            gaps: [...scene.gaps, ...several],
        },
        out,
    );
} finally {
    rmSync(work, { recursive: true, force: true });
}
