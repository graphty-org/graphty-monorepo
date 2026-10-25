#!/usr/bin/env node
// Re-creates the Cytoscape desktop oracles: every sample whose reference route is cytoscape-desktop
// (CX, CX2, XGMML, .cys sessions) or cytoscape-gml (GML read by Cytoscape's own GML reader), opened
// in a running Cytoscape 3.10.5 the way a person would, fitted on a 1200 x 900 network view, and
// exported by Cytoscape as SVG (CyREST GET /v1/networks/{net}/views/{view}.svg, which is the
// desktop's "Export Network to Image... SVG" through FreeHEP's SVGGraphics2D).
//
//   CYREST_PORT=<port> CYTOSCAPE_DISPLAY=:96 node cytoscape-desktop.mjs [sample-id ...]
//   (no ids: every Cytoscape sample in samples.ts and corpus-samples.ts, and every specimen sheet in
//   specimens/{xgmml,cx,cx2,cys}/)
//
// Steps per sample: `session new`; a .cys is opened with `session open`, anything else with
// `network load file` (which keeps the file's own style; a .gz is loaded decompressed under its own
// name); the largest network view (by node count) is made current; the control and table panels are
// hidden and the main window is resized (x11-resize.py, the headless display has no window manager)
// until the view reports NETWORK_WIDTH x NETWORK_HEIGHT = 1200 x 900; `view fit content`; export.
//
// One change is made to Cytoscape's SVG, recorded in each oracle.json: every stroke-dashoffset is
// written as 0. Cytoscape animates dashed (marquee) lines, so the offset it writes is the animation's
// phase at the moment of export and differs on every run; nothing else in the SVG varies.
// Each file is loaded twice, each time in a new session, and oracle.json says whether the two drew the
// same thing (sameDrawing() below: any element order, numbers within 1 px). When a load draws what the
// committed oracle draws, the committed file is left as it is, so regenerating changes no file unless
// Cytoscape's drawing changed.
// Then run rasterize.mjs on the written SVGs for the PNGs.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const here = dirname(fileURLToPath(import.meta.url));
const oracles = resolve(here, "..");
const fidelity = resolve(here, "../..");
const testDir = resolve(here, "../../..");
const port = process.env.CYREST_PORT;
const display = process.env.CYTOSCAPE_DISPLAY ?? ":96";
if (!port) throw new Error("set CYREST_PORT to the running Cytoscape desktop's CyREST port");
const W = 1200;
const H = 900;
const base = `http://localhost:${port}/v1`;

const call = async (method, path, body, raw = false) => {
    const res = await fetch(base + path, {
        method,
        headers: body ? { "content-type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
    if (raw) return text;
    const json = text ? JSON.parse(text) : null;
    if (json?.errors?.length) throw new Error(`${method} ${path}: ${JSON.stringify(json.errors)}`);
    return json;
};
const cmd = (ns, c, args = {}) => call("POST", `/commands/${ns}/${encodeURIComponent(c)}`, args);
const netProps = async (net, view) =>
    Object.fromEntries(
        (await call("GET", `/networks/${net}/views/${view}/network`)).map((v) => [v.visualProperty, v.value]),
    );

/** The samples whose routes include cytoscape-desktop or cytoscape-gml, read from the two sample lists. */
function samples() {
    const src = ["samples.ts", "corpus-samples.ts"].map((f) => readFileSync(join(fidelity, f), "utf8")).join("\n");
    const out = [];
    // the GML specimen sheets whose stand-in is Cytoscape's GML reader (generators/specimens/gml.py writes the
    // route of each sheet into specimens/gml/oracle-routes.json): sample id gml-<sheet>
    const gmlRoutes = join(fidelity, "specimens", "gml", "oracle-routes.json");
    if (existsSync(gmlRoutes)) {
        const sheets = JSON.parse(readFileSync(gmlRoutes, "utf8")).sheets;
        for (const sheet of Object.keys(sheets).sort()) {
            const file = `fidelity/specimens/gml/${sheet}.gml`;
            if (sheets[sheet].route === "cytoscape-gml") {
                out.push({ id: `gml-${sheet}`, file, route: "cytoscape-gml", specimen: true });
            }
            // a sheet whose oracle draws only part of its keys is also drawn by Cytoscape's GML reader, as a stand-in
            // for the settings the oracle does not draw (specimens/gml/judges.json): oracles/stand-ins/
            if (sheets[sheet].standIns?.includes("cytoscape-gml")) {
                out.push({
                    id: `gml-${sheet}`,
                    file,
                    route: "cytoscape-gml",
                    specimen: true,
                    path: `stand-ins/gml-${sheet}.cytoscape-gml`,
                });
            }
        }
    }
    for (const m of src.matchAll(/\{\s*id: "([^"]+)",[^}]*?file: ([^,]+),[^}]*?routes: \[([^\]]*)\]/g)) {
        const route = /"(cytoscape-desktop|cytoscape-gml)"/.exec(m[3])?.[1];
        if (!route) continue;
        const file = m[2]
            .trim()
            .replace(/^styles\("(.*)"\)$/, "corpus/styles/$1")
            .replace(/^"(.*)"$/, "$1");
        out.push({ id: m[1], file, route });
    }
    // the specimen sheets Cytoscape wrote (generators/specimens/cytoscape-desktop.mjs): sample id <format>-<sheet>
    for (const fmt of ["xgmml", "cx", "cx2", "cys"]) {
        const dir = join(fidelity, "specimens", fmt);
        if (!existsSync(dir)) continue;
        for (const name of readdirSync(dir)
            .filter((f) => f.startsWith("specimen-"))
            .sort()) {
            out.push({
                id: `${fmt}-${name.replace(/\.[a-z0-9]+(\.gz)?$/, "")}`,
                file: `fidelity/specimens/${fmt}/${name}`,
                route: "cytoscape-desktop",
            });
        }
    }
    return out;
}

/** The main Cytoscape window's X id (its title starts "Session:"). */
function mainWindow() {
    const tree = execFileSync("xwininfo", ["-root", "-children"], { env: { ...process.env, DISPLAY: display } });
    const id = /^\s*(0x[0-9a-f]+) "Session: /m.exec(tree.toString())?.[1];
    if (!id) throw new Error("no Cytoscape main window on the display");
    return id;
}

/** Hides the side panels and resizes the main window until the network view is exactly W x H. */
async function sizeView(net, view) {
    await call("PUT", "/ui/panels", [
        { name: "WEST", state: "HIDE" },
        { name: "SOUTH", state: "HIDE" },
        { name: "EAST", state: "HIDE" },
    ]);
    const win = mainWindow();
    // the window's chrome around the view (menus, toolbar, status bar) measured, not assumed
    let [ww, wh] = [W + 29, H + 155];
    for (let i = 0; i < 6; i++) {
        execFileSync("python3", [join(here, "x11-resize.py"), win, String(ww), String(wh)], {
            env: { ...process.env, DISPLAY: display },
        });
        let p;
        for (let k = 0; k < 20; k++) {
            await new Promise((r) => setTimeout(r, 250));
            p = await netProps(net, view);
            if (p.NETWORK_WIDTH === W && p.NETWORK_HEIGHT === H) return;
        }
        ww += W - p.NETWORK_WIDTH;
        wh += H - p.NETWORK_HEIGHT;
    }
    throw new Error(`could not size the network view to ${W} x ${H}`);
}

/**
 * Exports the view as SVG once Cytoscape draws it at the fitted zoom and center, and only an export
 * Cytoscape repeats exactly.
 *
 * `view fit content` sets the view's properties at once but the renderer picks them up on its next
 * frame, so an export straight after it can still be drawn at the old zoom: an export counts only
 * when the first axis-aligned matrix in it (the network's own transform) is the view's
 * NETWORK_SCALE_FACTOR and center.
 *
 * A view with animated (marquee) edges re-renders on a timer, and Cytoscape 3.10.5's export races
 * that timer: most exports of such a view give some nodes another node's shape or fill, differently
 * every time. A clean export is the same every time, so the oracle is the first export (with the
 * marquee phase normalized) that Cytoscape produces AGREE times; a view without animation agrees on
 * its first AGREE exports.
 */
const AGREE = 3;
async function settledSvg(net, view) {
    const seen = new Map();
    let exports = 0;
    for (let i = 0; i < 200; i++) {
        // the window's chrome can change height after a load (the view then is 901 px high): size and fit again
        let p = await netProps(net, view);
        if (p.NETWORK_WIDTH !== W || p.NETWORK_HEIGHT !== H) {
            await sizeView(net, view);
            await cmd("view", "fit content");
            p = await netProps(net, view);
        }
        const s = p.NETWORK_SCALE_FACTOR;
        const want = [s, 0, 0, s, W / 2 - p.NETWORK_CENTER_X_LOCATION * s, H / 2 - p.NETWORK_CENTER_Y_LOCATION * s];
        // an export can also fail outright (HTTP 500) in the same race: try again
        const raw = await call("GET", `/networks/${net}/views/${view}.svg`, undefined, true).catch(() => "");
        if (!raw) continue;
        if (!raw.includes("<svg")) continue;
        let normalized = 0;
        const svg = raw.replace(/stroke-dashoffset="([^"]*)"/g, (all, v) =>
            Number(v) === 0 ? all : (normalized++, 'stroke-dashoffset="0"'),
        );
        const m = [...svg.matchAll(/transform="matrix\(([^)]*)\)"/g)]
            .map((x) => x[1].split(",").map(Number))
            .find((x) => x[1] === 0 && x[2] === 0 && x[0] === x[3]);
        if (!m?.every((v, k) => Math.abs(v - want[k]) <= 1e-6 * Math.max(1, Math.abs(want[k])))) {
            await new Promise((r) => setTimeout(r, 250));
            continue;
        }
        exports++;
        const key = sha(svg);
        const n = (seen.get(key) ?? 0) + 1;
        seen.set(key, n);
        if (n === AGREE) return { svg, normalized, exports, distinct: seen.size };
    }
    const p = await netProps(net, view);
    throw new Error(
        `view ${p.NETWORK_WIDTH} x ${p.NETWORK_HEIGHT} at zoom ${p.NETWORK_SCALE_FACTOR}: no export repeated ${AGREE} times (${exports} fitted exports, ${seen.size} distinct)`,
    );
}

/**
 * Whether two SVGs draw the same thing: the same lines in any order, every number within TOLERANCE
 * px. Cytoscape draws edges in an order that changes from one load of a file to the next, and places
 * some labels (rotated ones, wrapped ones) a fraction of a pixel apart from one load to the next.
 */
const TOLERANCE = 1;
function sameDrawing(a, b) {
    const rows = (svg) =>
        svg
            .split("\n")
            .map((line) => ({
                tpl: line.replace(/-?\d+(\.\d+)?(E-?\d+)?/g, "#"),
                nums: (line.match(/-?\d+(\.\d+)?(E-?\d+)?/g) ?? []).map(Number),
            }))
            .sort((x, y) => (x.tpl < y.tpl ? -1 : x.tpl > y.tpl ? 1 : x.nums.join(",") < y.nums.join(",") ? -1 : 1));
    const [ra, rb] = [rows(a), rows(b)];
    return (
        ra.length === rb.length &&
        ra.every((x, i) => x.tpl === rb[i].tpl && x.nums.every((v, k) => Math.abs(v - rb[i].nums[k]) <= TOLERANCE))
    );
}

/** The first axis-aligned matrix in the SVG: the network's own transform (the fitted zoom and center). */
const fitOf = (svg) => /transform="matrix\(([-\d.]+), 0, 0, \1, [^)]*\)"/.exec(svg)?.[0];

/**
 * Waits until a new session has re-registered Cytoscape's built-in styles. `session new` returns
 * with only "default" and adds the rest (Marquee, Sample1, ...) a moment later; a file loaded in
 * that moment gets its own style and then loses it to "default" when they land.
 */
async function builtInStyles() {
    let last = "";
    for (let i = 0; i < 80; i++) {
        const now = JSON.stringify((await call("GET", "/styles")).sort());
        if (now.includes('"Marquee"') && now === last) return;
        last = now;
        await new Promise((r) => setTimeout(r, 250));
    }
    throw new Error("the new session's built-in styles never appeared");
}

/** The title of the style a view is drawn with. */
const styleOf = async (net, view) => (await call("GET", `/networks/${net}/views/${view}/currentStyle`)).title;

/**
 * Opens the file in a new session and exports its largest view, fitted on a W x H view.
 * @returns the SVG and what was drawn
 */
async function draw(load, session) {
    await cmd("session", "new", { destroyCurrentSession: true });
    await builtInStyles();
    await (session ? cmd("session", "open", { file: load }) : cmd("network", "load file", { file: load }));
    const viewed = [];
    for (const net of await call("GET", "/networks")) {
        for (const view of await call("GET", `/networks/${net}/views`)) {
            viewed.push({ net, view, n: (await call("GET", `/networks/${net}/nodes`)).length });
        }
    }
    if (viewed.length === 0) throw new Error("Cytoscape made no network view");
    // ties broken by SUID, so a session's choice is the same every run
    const { net, view, n } = viewed.sort((a, b) => b.n - a.n || a.view - b.view)[0];
    await cmd("view", "set current", { view: `SUID:${view}` });
    await sizeView(net, view);
    const style = await styleOf(net, view);
    await cmd("view", "fit content");
    const got = await settledSvg(net, view);
    if ((await styleOf(net, view)) !== style) throw new Error(`the view's style changed from ${style} while exporting`);
    const p = await netProps(net, view);
    const title = (await call("GET", `/networks/${net}`)).data?.name;
    return { ...got, net, view, n, viewed, style, p, title };
}

const sha = (b) => createHash("sha256").update(b).digest("hex");
const version = (await call("GET", "/version")).cytoscapeVersion;
const wanted = new Set(process.argv.slice(2));
const failed = [];
const work = mkdtempSync(join(tmpdir(), "cy-oracle-"));
try {
    for (const s of samples().filter((x) => wanted.size === 0 || wanted.has(x.id))) {
        try {
            const stored = join(testDir, s.file);
            const bytes = readFileSync(stored);
            let load = stored;
            if (stored.endsWith(".gz")) {
                load = join(work, basename(stored, ".gz"));
                writeFileSync(load, gunzipSync(bytes));
            }
            const session = load.endsWith(".cys");
            // two loads, each in a new session: Cytoscape does not always draw a file the same way twice
            const first = await draw(load, session);
            const second = await draw(load, session);
            const same = sameDrawing(first.svg, second.svg);
            const { normalized, n, viewed, style, p, title, exports, distinct } = first;
            // keep the committed oracle when a load drew the same things (in any order)
            const path = s.path ?? s.id;
            const target = join(oracles, `${path}.svg`);
            const committed = existsSync(target) ? readFileSync(target, "utf8") : null;
            const kept = committed !== null && [first, second].some((d) => sameDrawing(d.svg, committed));
            if (!kept) writeFileSync(target, first.svg);
            const out = kept ? readFileSync(target, "utf8") : first.svg;
            const meta = {
                sample: s.id,
                file: `graph-io/test/${s.file}`,
                sha256: sha(bytes),
                program: "Cytoscape desktop",
                version: `${version} (Temurin JRE 17, headless Xvfb, CyREST)`,
                route: s.route,
                command:
                    (session ? "session new; session open file=<file>" : "session new; network load file file=<file>") +
                    "; view set current (the largest view); hide the WEST, SOUTH and EAST panels; resize the main window " +
                    `until the view is ${W} x ${H}; view fit content; GET /v1/networks/{net}/views/{view}.svg`,
                ...(s.file.endsWith(".gz") ? { loaded: "the file decompressed under its own name without .gz" } : {}),
                standIn: s.route === "cytoscape-gml",
                ...(s.route === "cytoscape-gml"
                    ? {
                          standInReason: s.specimen
                              ? "no program that writes GML can be automated on this machine (yEd's license forbids " +
                                "it; Graphlet is gone); this is Cytoscape desktop's own drawing of the sheet through " +
                                "Cytoscape's GML reader, with the style that reader builds."
                              : "yEd, which wrote this file, cannot run on this machine; this is Cytoscape desktop's own " +
                                "drawing of the file through Cytoscape's GML reader, with the style that reader builds.",
                      }
                    : {}),
                network: { title, nodes: n, views: viewed.length, chosen: "the view with the most nodes", style },
                canvas: {
                    widthPx: W,
                    heightPx: H,
                    zoom: p.NETWORK_SCALE_FACTOR,
                    center: [p.NETWORK_CENTER_X_LOCATION, p.NETWORK_CENTER_Y_LOCATION],
                    background: p.NETWORK_BACKGROUND_PAINT,
                },
                fonts:
                    "the style's own font names, written into <text> as Java names them (for example Dialog.bold, " +
                    "SansSerif.plain); label wrapping was measured by Java with the JRE's fonts",
                svgPostprocessing:
                    normalized > 0
                        ? `stroke-dashoffset set to 0 on ${normalized} elements (the marquee animation's phase, which changes every run); nothing else changed`
                        : "none: the SVG is Cytoscape's output byte for byte",
                exportsAgreed: AGREE,
                loads: same
                    ? `two loads, each in a new session, drew the same SVG (in any element order, numbers within ${TOLERANCE} px)`
                    : `two loads, each in a new session, drew different SVGs (${
                          fitOf(first.svg) === fitOf(second.svg)
                              ? "the same fit; label text was laid out differently"
                              : "a different fit: node positions or label extents differed"
                      }); this oracle is one of them, and a regenerate may write the other`,
                ...(normalized > 0
                    ? {
                          exportRace:
                              "the view has animated (marquee) edges; Cytoscape's export races its animation timer and most exports give some nodes another node's shape or fill, so the oracle is the first export Cytoscape produced " +
                              `${AGREE} times`,
                      }
                    : {}),
                date: kept
                    ? JSON.parse(readFileSync(join(oracles, `${path}.oracle.json`), "utf8")).date
                    : new Date().toISOString().slice(0, 10),
                regenerate:
                    `CYREST_PORT=<port> node graph-io/test/fidelity/oracles/tools/cytoscape-desktop.mjs ${s.id} && ` +
                    `node graph-io/test/fidelity/oracles/tools/rasterize.mjs graph-io/test/fidelity/oracles/${path}.svg`,
            };
            writeFileSync(join(oracles, `${path}.oracle.json`), `${JSON.stringify(meta, null, 4)}\n`);
            console.log(
                `${s.id}\t${n} nodes\t${viewed.length} views\t${out.length} bytes\tdash ${normalized}\texports ${exports}/${distinct}\t${same ? "stable" : "VARIES"}\t${kept ? "unchanged" : "written"}`,
            );
        } catch (e) {
            failed.push(s.id);
            console.log(`${s.id}\tFAILED\t${e.message.split("\n")[0]}`);
        }
    }
} finally {
    rmSync(work, { recursive: true, force: true });
}
if (failed.length) {
    console.error(`failed: ${failed.join(" ")}`);
    process.exitCode = 1;
}
