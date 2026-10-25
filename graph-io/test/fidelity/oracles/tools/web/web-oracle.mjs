// Oracle SVG for one sample, drawn by the web library the sample's dialect was written for, in
// headless Chromium, with the file's own stylesheet / options and the library's own defaults for
// everything the file does not say. Nothing about the drawing is translated by us.
//
//   node web-oracle.mjs <cyjs|sigma|vis> <sample-id> <input file (.json or .json.gz)> <out dir> [sigma settings JSON]
//
// The optional last argument (sigma only) is a JSON object of sigma settings set on top of sigma's defaults, for a
// specimen page drawn under one setting (graphology/pages.json); a file never carries sigma settings.
//
// Writes <out>/<sample-id>.svg and <sample-id>.oracle.json; regenerate-web.sh rasterizes the SVG to
// <sample-id>.png with ../rasterize.mjs, as every oracle is.
//
// cyjs:  Cytoscape.js 3.34.3, cytoscape({ container, elements, style, layout }) with layout "preset"
//        when every node stores a position, else "grid" (Cytoscape.js's own default in a browser);
//        the SVG is Cytoscape.js's own canvas renderer (drawElements) replayed onto svgcanvas at the
//        view's pan and zoom, the procedure of cytoscape-svg 0.4.0's cy.svg({ full: false }) (whose
//        bundled canvas2svg drops shapes), so it is the viewport the user sees.
// vis:   vis-network 9.1.9 standalone, new vis.Network(container, { nodes, edges }, file options),
//        snapshot where vis-network ends its stabilization run and fits the view (physics then
//        stopped), or at once when physics is off; then its own CanvasRenderer
//        redraws once onto an svgcanvas 2.6.0 context (net.canvas.getContext swapped for the call).
// sigma: sigma 4.0.1 draws everything (nodes, edges, labels) with WebGL2 and has no vector output.
//        Its own export (@sigma/export-image 4.0.0 toBlob, PNG) is wrapped unmodified in an SVG
//        <image>, so the SVG is the program's real pixels, not vectors.
//
// Determinism: Math.random is replaced by a seeded generator and Date.now is stopped before any library
// loads (vis-network seeds its layout from both, and times its physics steps with Date.now, so a
// stopped clock always takes its "small graph, two steps per frame" branch; canvas2svg names clip
// paths and gradients from Math.random), the
// viewport is 1200 x 900 at device scale 1, and Chromium and resvg both draw with the repository's
// pinned fonts (visual-fonts/), never the host's.
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";
import console from "node:console";
import process from "node:process";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../../../..");
const W = 1200;
const H = 900;
const fonts = join(repo, "visual-fonts");
if (!existsSync(join(fonts, "fonts.conf")) || !existsSync(join(repo, "graphty-element/package.json"))) {
    throw new Error(`web-oracle.mjs: no repository checkout at ${repo}`);
}
// the pinned libraries are graph-io's devDependencies
const graphIo = resolve(here, "../../../../..");
const req = createRequire(join(graphIo, "package.json"));
const nm = (p) => readFileSync(req.resolve(p), "utf8");
const versionOf = (pkg) => JSON.parse(readFileSync(join(graphIo, "node_modules", pkg, "package.json"), "utf8")).version;
const sha = (b) => createHash("sha256").update(b).digest("hex");

const [family, id, input, outDir, settingsArg] = process.argv.slice(2);
const sigmaSettings = settingsArg ? JSON.parse(settingsArg) : {};
if (!["cyjs", "sigma", "vis"].includes(family) || !id || !input || !outDir) {
    console.error("usage: web-oracle.mjs <cyjs|sigma|vis> <sample-id> <input> <out dir>");
    process.exit(2);
}
const bytes = readFileSync(input);
const doc = JSON.parse((input.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8"));

// mulberry32, seed 1; and a stopped Date.now (vis-network seeds its layout from Math.random() + Date.now(),
// and times each physics step with Date.now to decide whether to run two steps per frame)
const SEED_SCRIPT = `(() => { Date.now = () => 1767225600000; let a = 1; Math.random = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; })();`;
// Every Image a library creates is tracked, so the drawing is recorded once each one has loaded (a
// node image or background image is a data URI that still decodes asynchronously);
// globalThis.imagesSettled() waits for the ones started since its last call.
const IMAGE_SCRIPT = `(() => {
    const Real = globalThis.Image;
    const pending = [];
    globalThis.Image = class extends Real {
        constructor(...a) {
            super(...a);
            // settled one task after the event, so the library's own onload handler (registered after
            // this listener, and run after its microtasks) has run too
            const later = (r) => () => setTimeout(r, 0);
            pending.push(new Promise((r) => { this.addEventListener("load", later(r)); this.addEventListener("error", later(r)); }));
            this.addEventListener("load", () => { this.__done = true; });
            this.addEventListener("error", () => { this.__done = true; });
        }
        // a library that answers a failed load by setting src again on the same Image (vis-network's
        // brokenImage) starts a second load, which is waited for too
        set src(v) {
            if (this.__done) {
                this.__done = false;
                pending.push(new Promise((r) => {
                    const done = () => setTimeout(r, 0);
                    this.addEventListener("load", done, { once: true });
                    this.addEventListener("error", done, { once: true });
                }));
            }
            Object.getOwnPropertyDescriptor(Real.prototype, "src").set.call(this, v);
        }
        get src() { return Object.getOwnPropertyDescriptor(Real.prototype, "src").get.call(this); }
    };
    // resolves true when it waited for images started since the last call, false when there were none
    let seen = 0;
    globalThis.imagesSettled = async () => {
        if (pending.length === seen) return false;
        while (seen !== pending.length) { seen = pending.length; await Promise.all(pending); }
        return true;
    };
})();`;

async function bundle(contents) {
    const esbuild = req("esbuild");
    const r = await esbuild.build({
        stdin: { contents, resolveDir: here },
        bundle: true,
        format: "iife",
        write: false,
        logLevel: "silent",
    });
    return r.outputFiles[0].text;
}

// svgcanvas, with the current path kept the way a canvas keeps it. A canvas's current path is not
// part of the element tree: it survives save(), fillText() and everything else until the next
// beginPath(). svgcanvas ties it to the element it last created, so a fill() or stroke() after
// save() paints an empty <g>, and path commands after fillText() land on a <text>. Both lose shapes
// (vis-network fills every node inside save() / restore(); Cytoscape.js draws node shapes after
// labels). Here every fill(), stroke() or clip() on a current path that is not a <path> element
// first opens a <path> for it where the call is made.
const SVG_CONTEXT = `import { Context } from "svgcanvas";
class CanvasPathContext extends Context {
    __pathHere() {
        if (this.__currentElement.nodeName !== "path" && this.__currentDefaultPath) {
            const path = this.__createElement("path", {}, true);
            this.__closestGroupOrSvg().appendChild(path);
            this.__currentElement = path;
        }
    }
    __applyCurrentDefaultPath() { this.__pathHere(); return super.__applyCurrentDefaultPath(); }
    // A canvas draws every blank of a text it fills or strokes; an SVG <text> collapses blanks at its ends and runs
    // of them unless its white space is kept, so vis-network's multi-font block " x" (a space, then the word) drew
    // "x" against the block before it.
    __applyText(text, x, y, action) {
        super.__applyText(text, x, y, action);
        const el = this.__currentElement;
        if (el && el.nodeName === "text" && /^\\s|\\s$|\\s\\s/.test(String(text))) el.setAttribute("xml:space", "preserve");
    }
    // A canvas reads a gradient's coordinates in the transform current when it paints; svgcanvas writes
    // them untransformed while it writes every path already transformed. Cytoscape.js builds a node's
    // gradient around the origin after translating to the node, so its gradients landed at (0, 0).
    __placed(g) {
        const { a, b, c, d, e, f } = this.__transformMatrix;
        g.__root.setAttribute("gradientTransform", "matrix(" + [a, b, c, d, e, f].join(" ") + ")");
        return g;
    }
    createLinearGradient(...a) { return this.__placed(super.createLinearGradient(...a)); }
    createRadialGradient(...a) { return this.__placed(super.createRadialGradient(...a)); }
    // svgcanvas skips a lineWidth of 1 as the SVG default before it scales it by the transform, so a
    // 1-wide line under a zoom kept width 1 (vis-network's edges, drawn 1 wide at its view scale), and
    // it never scales the dash pattern (Cytoscape.js's dotted edge came out solid).
    __applyStyleToCurrentElement(type) {
        super.__applyStyleToCurrentElement(type);
        if (!this.__currentElementsToStyle) this.__applyShadow();
        if (type !== "stroke" || this.__currentElementsToStyle) return;
        const scale = this.__getTransformScale();
        const k = Math.max(scale.x, scale.y);
        if (this.lineWidth === 1) this.__currentElement.setAttribute("stroke-width", k);
        // the dash pattern, too, is in canvas units and svgcanvas writes it unscaled
        if (this.lineDash) {
            this.__currentElement.setAttribute("stroke-dasharray", String(this.lineDash).split(",").map((v) => v * k).join(","));
        }
    }
    // svgcanvas records no shadow at all (shadowColor / shadowBlur / shadowOffsetX / Y are kept and never
    // written), so vis-network's node and edge shadows were missing. A canvas draws a shadow in device
    // pixels, unaffected by the transform, blurred with a Gaussian of standard deviation shadowBlur / 2:
    // here an feDropShadow filter on the element, in its own units (a <text> carries the transform, so its
    // offsets are divided by the scale).
    __applyShadow() {
        const blur = this.shadowBlur || 0;
        const dx = this.shadowOffsetX || 0;
        const dy = this.shadowOffsetY || 0;
        if (!blur && !dx && !dy) return;
        const probe = globalThis.document.createElement("canvas").getContext("2d");
        probe.fillStyle = this.shadowColor;
        const m = /rgba?\\(([^)]+)\\)/.exec(probe.fillStyle);
        const [r, g, b, a] = m ? m[1].split(",").map(Number) : [];
        const hex = m ? null : probe.fillStyle;
        const alpha = m ? (a ?? 1) : 1;
        if (alpha === 0) return;
        const el = this.__currentElement;
        const k = el.getAttribute("transform") ? Math.max(this.__getTransformScale().x, this.__getTransformScale().y) : 1;
        const filter = this.__createElement("filter", {
            id: "shadow-" + (this.__shadowCount = (this.__shadowCount || 0) + 1),
            filterUnits: "userSpaceOnUse",
            x: -100000, y: -100000, width: 200000, height: 200000,
        });
        filter.appendChild(this.__createElement("feDropShadow", {
            dx: dx / k, dy: dy / k, stdDeviation: blur / 2 / k,
            "flood-color": hex ?? "rgb(" + [r, g, b].join(",") + ")", "flood-opacity": alpha,
        }));
        this.__defs.appendChild(filter);
        el.setAttribute("filter", "url(#" + filter.getAttribute("id") + ")");
    }
    // svgcanvas scales a stroke's width by the transform and also gives a <text> that transform, so a
    // text outline (Cytoscape.js's text-outline) came out scaled twice; this undoes the first one.
    strokeText(...a) {
        super.strokeText(...a);
        const el = this.__currentElement;
        const scale = this.__getTransformScale();
        el.setAttribute("stroke-width", el.getAttribute("stroke-width") / Math.max(scale.x, scale.y));
    }
    // fill(path), stroke(path), clip(path) with a recorded Path2D: its calls become the current path
    __replay(a) {
        if (a[0] && a[0].__ops) {
            this.beginPath();
            for (const [m, args] of a[0].__ops) this[m](...args);
            return a.slice(1);
        }
        return a;
    }
    // A canvas paints the current path anew at every fill() or stroke(); svgcanvas restyles its one <path>, so
    // a second stroke of the same path (vis-network's edge background, then the edge over it) replaced the
    // first, and the first's dash pattern stayed on the second. A repeated paint of the same kind gets its own
    // copy of the path, after the first.
    __repaint(kind) {
        const el = this.__currentElement;
        if (el.nodeName !== "path" || !el["__" + kind]) return;
        const copy = el.cloneNode(false);
        for (const k of ["filter", "stroke-dasharray"]) copy.removeAttribute(k);
        copy.setAttribute(kind === "stroke" ? "fill" : "stroke", "none");
        el.parentNode.insertBefore(copy, el.nextSibling);
        this.__currentElement = copy;
    }
    __paint(kind, a) {
        a = this.__replay(a);
        this.__pathHere();
        this.__repaint(kind);
        const r = kind === "fill" ? super.fill(...a) : super.stroke(...a);
        this.__currentElement["__" + kind] = true;
        return r;
    }
    // svgcanvas writes an <image> without the context's globalAlpha (vis-network's node opacity on an image)
    drawImage(...a) {
        const parent = this.__closestGroupOrSvg();
        const before = parent.lastChild;
        const r = super.drawImage(...a);
        const el = parent.lastChild;
        if (el && el !== before && this.globalAlpha < 1) el.setAttribute("opacity", this.globalAlpha);
        return r;
    }
    fill(...a) { return this.__paint("fill", a); }
    stroke(...a) { return this.__paint("stroke", a); }
    // svgcanvas drops clip()'s fill rule; Cytoscape.js clips an outside border to a box minus the node, evenodd
    clip(...a) {
        a = this.__replay(a);
        this.__pathHere();
        const r = super.clip(...a);
        if (a[0] === "evenodd") this.__defs.lastChild.firstChild.setAttribute("clip-rule", "evenodd");
        return r;
    }
}
globalThis.SvgContext = CanvasPathContext;`;

const PATH2D_RECORDER = `(() => {
    const Real = globalThis.Path2D;
    class RecordingPath2D extends Real {
        constructor(p) { super(p); this.__ops = p && p.__ops ? [...p.__ops] : []; }
    }
    for (const m of ["moveTo", "lineTo", "bezierCurveTo", "quadraticCurveTo", "arc", "arcTo", "ellipse", "rect", "roundRect", "closePath"]) {
        RecordingPath2D.prototype[m] = function (...a) { this.__ops.push([m, a]); return Real.prototype[m].apply(this, a); };
    }
    // a path added to another (Cytoscape.js's outside-border clip region): its calls join this one's
    RecordingPath2D.prototype.addPath = function (p, t) {
        if (p && p.__ops) this.__ops.push(...p.__ops);
        return Real.prototype.addPath.call(this, p, t);
    };
    globalThis.Path2D = RecordingPath2D;
})();`;

const { chromium } = createRequire(join(repo, "graphty-element/package.json"))("playwright");
const browser = await chromium.launch({
    args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--font-render-hinting=none"],
    env: { ...process.env, FONTCONFIG_FILE: join(fonts, "fonts.conf") },
});
let result;
const errors = [];
try {
    const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await context.addInitScript(SEED_SCRIPT);
    await context.addInitScript(IMAGE_SCRIPT);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(String(e)));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.setContent(
        `<html><body style="margin:0;background:#fff"><div id=c style="width:${W}px;height:${H}px"></div></body></html>`,
    );
    if (family === "cyjs") {
        // A Path2D that also records its calls, so the SVG context can replay a path Cytoscape.js
        // built once and fills by reference (fill(path)); the screen still gets a real Path2D.
        await page.addScriptTag({ content: PATH2D_RECORDER });
        await page.addScriptTag({ content: nm("cytoscape/dist/cytoscape.min.js") });
        await page.addScriptTag({ content: await bundle(SVG_CONTEXT) });
        const els = Array.isArray(doc.elements)
            ? doc.elements
            : [...(doc.elements.nodes ?? []), ...(doc.elements.edges ?? [])];
        const parents = new Set(els.map((e) => e.data?.parent).filter(Boolean));
        const positioned = els
            .filter((e) => !e.data?.source && !parents.has(e.data?.id))
            .every((e) => e.position && Number.isFinite(e.position.x));
        const layout = positioned ? "preset" : "grid";
        result = await page.evaluate(
            async ({ elements, style, layout, W, H }) => {
                const make = (st) =>
                    globalThis.cytoscape({
                        container: globalThis.document.getElementById("c"),
                        elements,
                        style: st,
                        layout: { name: layout },
                    });
                // Cytoscape.js throws on some stylesheets while parsing them, and then draws nothing at all.
                // Only then: the values it throws on are left out one by one (each tried alone in a headless
                // instance), listed in the oracle, and the rest is drawn.
                let cy;
                const dropped = [];
                try {
                    cy = make(style);
                } catch (err) {
                    dropped.push(`cytoscape() threw on the file's stylesheet: ${err}`);
                    globalThis.document.getElementById("c").replaceChildren();
                    const kept = style.map((r) => ({
                        ...r,
                        style: Object.fromEntries(
                            Object.entries(r.style ?? r.css ?? {}).filter(([k, v]) => {
                                try {
                                    globalThis.cytoscape({
                                        headless: true,
                                        styleEnabled: true,
                                        style: [{ selector: "node", style: { [k]: v } }],
                                    });
                                    return true;
                                } catch (e) {
                                    dropped.push(`${r.selector} { ${k}: ${JSON.stringify(v)} }: ${e}`);
                                    return false;
                                }
                            }),
                        ),
                    }));
                    cy = make(kept);
                }
                // a forced frame settles edge endpoints and label boxes (rscratch), which cy.svg() replays
                // a library starts loading an image the first time it draws the element, so: draw, let the
                // images load, and draw again, until a frame starts no new image
                const frame = () =>
                    new Promise((drawn) => {
                        cy.one("render", drawn);
                        cy.forceRender();
                    });
                await frame();
                while (await globalThis.imagesSettled()) await frame();
                // what cytoscape-svg's cy.svg({ full: false }) does, onto the context above: the view's pan and
                // zoom, then the renderer's own drawElements over the z-sorted elements. Unlike cytoscape-svg,
                // path caching stays on, as on screen: with it off, Cytoscape.js draws a rounded polygon
                // without beginPath() and joins it to the shape drawn before it.
                const r = cy.renderer();
                const C = new globalThis.SvgContext({ width: W, height: H });
                const pan = cy.pan();
                C.translate(pan.x * r.getPixelRatio(), pan.y * r.getPixelRatio());
                C.scale(cy.zoom() * r.getPixelRatio(), cy.zoom() * r.getPixelRatio());
                r.drawElements(C, r.getCachedZSortedEles());
                const svg = C.getSerializedSvg();
                return {
                    svg,
                    observed: {
                        nodes: cy.nodes().length,
                        edges: cy.edges().length,
                        zoom: cy.zoom(),
                        pan: cy.pan(),
                        ...(dropped.length ? { styleValuesDropped: dropped } : {}),
                    },
                };
            },
            { elements: doc.elements, style: doc.style, layout, W, H },
        );
        result.program = "Cytoscape.js";
        result.version = `cytoscape ${versionOf("cytoscape")}, svgcanvas ${versionOf("svgcanvas")} (cytoscape-svg 0.4.0's procedure)`;
        result.command = `cytoscape({ container: <div 1200x900>, elements: file.elements, style: file.style, layout: { name: "${layout}" } }); after a forced render: renderer.drawElements(svgContext, z-sorted elements) at the view's pan and zoom, as cytoscape-svg's cy.svg({ full: false }) does`;
        result.how =
            "Cytoscape.js's own canvas renderer (renderer.drawElements over the z-sorted elements, at the view's pan and zoom) replayed onto an svgcanvas context, as the cytoscape-svg extension's cy.svg({ full: false }) does; the Path2D objects Cytoscape.js fills by reference are recorded and replayed as SVG paths. cytoscape-svg itself is not used: its bundled canvas2svg drops shapes (a node's path commands after the previous label's fillText land on the <text>), and it turns path caching off, where Cytoscape.js draws a rounded polygon without beginPath() and joins it to the shape before; both left node shapes missing or smeared in its SVG. The SVG is the viewport a user of this file sees, not the whole graph.";
    } else if (family === "vis") {
        await page.addScriptTag({ content: nm("vis-network/standalone/umd/vis-network.min.js") });
        await page.addScriptTag({
            content: await bundle(SVG_CONTEXT),
        });
        result = await page.evaluate(
            async ({ doc, W, H }) => {
                const net = new globalThis.vis.Network(
                    globalThis.document.getElementById("c"),
                    { nodes: doc.nodes, edges: doc.edges },
                    doc.options ?? {},
                );
                // The first view vis-network shows: with physics and its stabilization on (the default), the
                // end of the stabilization run, where vis-network fits the view; the live simulation after it
                // is stopped there, since it may never settle (json-vis-siblings keeps moving). With
                // stabilization off, the first "stabilized" event.
                const physics = net.physics.physicsEnabled;
                const stabilization = physics && net.physics.options.stabilization.enabled;
                if (physics) {
                    await new Promise((r) => net.once(stabilization ? "stabilizationIterationsDone" : "stabilized", r));
                    net.stopSimulation();
                }
                // as for Cytoscape.js: draw, let the images that frame started load, draw again
                net.renderer._redraw();
                while (await globalThis.imagesSettled()) net.renderer._redraw();
                const C = new globalThis.SvgContext({ width: W, height: H });
                const real = net.canvas.getContext;
                net.canvas.getContext = () => C;
                try {
                    net.renderer._redraw(false);
                } finally {
                    net.canvas.getContext = real;
                }
                const s = net.getViewPosition();
                // where vis-network drew each node, in the SVG's pixels: its own position (getPositions, canvas
                // units) through its own view (canvasToDOM), and its own bounding box the same way. A file with no
                // positions and labels too small to draw (json-vis-siblings) names its nodes nowhere else.
                const positions = net.getPositions();
                const nodes = net.body.nodeIndices.flatMap((nid) => {
                    const at = positions[nid];
                    if (at === undefined) return [];
                    const c = net.canvasToDOM(at);
                    const b = net.getBoundingBox(nid);
                    const [p0, p1] = [
                        net.canvasToDOM({ x: b.left, y: b.top }),
                        net.canvasToDOM({ x: b.right, y: b.bottom }),
                    ];
                    return [{ id: String(nid), x: c.x, y: c.y, w: p1.x - p0.x, h: p1.y - p0.y }];
                });
                return {
                    drawn: { nodes },
                    svg: C.getSerializedSvg(),
                    observed: {
                        nodes: net.body.nodeIndices.length,
                        edges: net.body.edgeIndices.length,
                        physics,
                        snapshotAt: !physics
                            ? "first draw (physics off)"
                            : stabilization
                              ? "stabilizationIterationsDone"
                              : "stabilized",
                        scale: net.getScale(),
                        viewCenter: s,
                    },
                };
            },
            { doc, W, H },
        );
        result.drawnAbout =
            "vis-network's own account of where it drew each node, for naming the SVG's shapes: each node's id, its center (net.getPositions() through net.canvasToDOM) and its bounding box's width and height (net.getBoundingBox through net.canvasToDOM), in the SVG's pixels";
        result.program = "vis-network";
        result.version = `vis-network ${versionOf("vis-network")} (standalone), svgcanvas ${versionOf("svgcanvas")}`;
        result.command = `new vis.Network(<div 1200x900>, { nodes: file.nodes, edges: file.edges }, file.options); ${result.observed.physics ? `once("${result.observed.snapshotAt}"); stopSimulation(); ` : ""}net.renderer._redraw() onto an svgcanvas Context`;
        result.how =
            "vis-network draws with Canvas 2D only. At the snapshot point (observed.snapshotAt), its own CanvasRenderer._redraw ran once with net.canvas.getContext returning an svgcanvas context, so every draw call vis-network made (edges, nodes, arrows, labels) was recorded as SVG at the view vis-network itself chose.";
    } else {
        await page.addScriptTag({
            content: await bundle(
                `import Graph from "graphology"; import Sigma from "sigma"; import { parseColor } from "sigma/utils"; import { toBlob } from "@sigma/export-image";
                 globalThis.Graph = Graph; globalThis.Sigma = Sigma; globalThis.sigmaToBlob = toBlob; globalThis.sigmaParseColor = parseColor;`,
            ),
        });
        // Gephi's JSON export (id/label/x/y/size/color at the top level) is sigma v1's shape; graphology
        // imports it after those keys move into attributes, which is what a sigma user does.
        const gephi = doc.nodes.length > 0 && !("key" in doc.nodes[0]);
        const data = gephi
            ? {
                  options: { type: "directed", multi: true, allowSelfLoops: true },
                  // (Gephi's own column object stays as one attribute, "attributes", which sigma does not read)
                  nodes: doc.nodes.map(({ id, ...a }) => ({ key: String(id), attributes: a })),
                  edges: doc.edges.map(({ id, source, target, ...a }) => ({
                      key: String(id),
                      source: String(source),
                      target: String(target),
                      attributes: a,
                  })),
              }
            : doc;
        result = await page.evaluate(
            async ({ data, settings }) => {
                const g = new globalThis.Graph({
                    multi: true,
                    allowSelfLoops: true,
                    type: data.options?.type ?? "mixed",
                });
                g.import(data);
                const s = new globalThis.Sigma(g, globalThis.document.getElementById("c"), { settings });
                s.refresh();
                const blob = await globalThis.sigmaToBlob(s, { format: "png" });
                const buf = new Uint8Array(await blob.arrayBuffer());
                let bin = "";
                for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
                // Where sigma itself says it drew each node (its own viewport conversion of the node's
                // display data and its own size scaling), and which labels it chose to draw: the pixels
                // alone cannot be told apart node by node.
                const shown = s.getNodeDisplayedLabels();
                // the color sigma draws: its own parser's reading of the display color (a channel it cannot read is
                // 0, as its float packing makes it), and that color's alpha, which sigma blends with
                const paint = (c) => {
                    let p;
                    try {
                        p = globalThis.sigmaParseColor(String(c));
                    } catch {
                        return { fill: null, alpha: null };
                    }
                    const hex = [p.r, p.g, p.b].map((v) => (Number(v) | 0).toString(16).padStart(2, "0")).join("");
                    return { fill: `#${hex}`, alpha: Number.isFinite(p.a) ? p.a : 1 };
                };
                const nodes = g.nodes().flatMap((key) => {
                    const d = s.getNodeDisplayData(key);
                    if (d === undefined || d.hidden) return [];
                    const at = s.framedGraphToViewport(d);
                    const r = s.scaleSize(d.size);
                    return [
                        {
                            id: key,
                            x: at.x,
                            y: at.y,
                            r,
                            label: shown.has(key) ? (d.label ?? null) : null,
                            ...paint(d.color),
                        },
                    ];
                });
                // and each edge it drew: its display color and size, and its width in the PNG's pixels, as sigma's edge
                // shader computes it: max(size, minEdgeThickness * sizeRatio) * correctionRatio / sizeRatio in framed
                // graph units (sizeRatio = 1 / scaleSize()), times the pixels one framed unit spans -- which is half of
                // max(scaleSize(size), minEdgeThickness) on a 1200 x 900 canvas, measured off the PNG (size 20: 9.55 px
                // drawn, 9.66 here); sigma draws no edge of a hidden end node. An edge's label is the one sigma says it
                // displayed (getEdgeDisplayedLabels: only under renderEdgeLabels, and under edgeLabelAnchors
                // "nodeLabels" only between two nodes that show theirs).
                const minWidth = s.getSetting("minEdgeThickness");
                const [o0, o1] = [s.framedGraphToViewport({ x: 0, y: 0 }), s.framedGraphToViewport({ x: 1, y: 0 })];
                const pxPerUnit = Math.hypot(o1.x - o0.x, o1.y - o0.y);
                const edgeWidth = (size) => Math.max(s.scaleSize(size), minWidth) * s.correctionRatio * pxPerUnit;
                const edgeLabels = s.getEdgeDisplayedLabels();
                const edges = g.edges().flatMap((key) => {
                    const d = s.getEdgeDisplayData(key);
                    if (d === undefined || d.visibility === "hidden") return [];
                    return [
                        {
                            id: key,
                            source: g.source(key),
                            target: g.target(key),
                            color: d.color,
                            ...paint(d.color),
                            type: d.type ?? null,
                            size: d.size,
                            width: edgeWidth(d.size),
                            label: edgeLabels.has(key) && d.label ? d.label : null,
                        },
                    ];
                });
                return {
                    png: globalThis.btoa(bin),
                    observed: { nodes: g.order, edges: g.size, labelsShown: shown.size },
                    drawn: { nodes, edges },
                };
            },
            { data, settings: sigmaSettings },
        );
        result.svg =
            `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">` +
            `<image width="${W}" height="${H}" xlink:href="data:image/png;base64,${result.png}"/></svg>`;
        result.program = "sigma.js";
        result.version = `sigma ${versionOf("sigma")}, graphology ${versionOf("graphology")}, @sigma/export-image ${versionOf("@sigma/export-image")}`;
        const settingsNote = Object.keys(sigmaSettings).length
            ? `sigma's default settings plus ${JSON.stringify(sigmaSettings)}`
            : "sigma's default settings";
        result.command = `graph.import(${gephi ? "file moved into graphology's { key, attributes } shape" : "file"}); new Sigma(graph, <div 1200x900>) with ${settingsNote}; toBlob(sigma, { format: "png" })`;
        result.settings = sigmaSettings;
        result.how =
            "sigma 4 draws nodes, edges and labels with WebGL2 and offers no vector export. @sigma/export-image's toBlob renders the instance to PNG (its own export, 1200 x 900, transparent background); the SVG wraps those bytes unmodified in one <image> element.";
        result.svgKind = "raster";
        delete result.png;
    }
    // what Chromium shows on screen, for checking an oracle against the live drawing (never committed)
    if (process.env.ORACLE_SCREENSHOT_DIR) {
        mkdirSync(process.env.ORACLE_SCREENSHOT_DIR, { recursive: true });
        await page.screenshot({ path: join(process.env.ORACLE_SCREENSHOT_DIR, `${id}.screen.png`) });
    }
} finally {
    await browser.close();
}

mkdirSync(outDir, { recursive: true });
const svgPath = join(outDir, `${id}.svg`);
writeFileSync(svgPath, result.svg);

const metaPath = join(outDir, `${id}.oracle.json`);
const CONTEXT_NOTE =
    "The svgcanvas context is corrected where it departs from a canvas (SVG_CONTEXT in web-oracle.mjs): the current path survives save() and fillText(), a text keeps its blanks (xml:space), a Path2D argument is replayed (with the paths added to it), a clip keeps its evenodd rule, gradients and 1-wide or dashed strokes follow the transform, and a text outline is not scaled twice; each was checked against Chromium's own screenshot of the same drawing. A shadow (shadowColor, shadowBlur, shadowOffsetX / Y) is recorded as an feDropShadow filter in device pixels. Not recorded: globalCompositeOperation (a Cytoscape.js double border draws as one ring); a glyph the pinned fonts lack (a vis-network icon) rasterizes as a box where Chromium draws nothing.";
const svgSha256 = sha(result.svg);
const old = existsSync(metaPath) ? JSON.parse(readFileSync(metaPath, "utf8")) : null;
const meta = {
    sample: id,
    program: result.program,
    version: result.version,
    command: result.command,
    how: result.svgKind === "raster" ? result.how : `${result.how} ${CONTEXT_NOTE}`,
    svgKind: result.svgKind ?? "vector",
    canvas: { width: W, height: H, deviceScaleFactor: 1, background: "none (the page behind it is white)" },
    browser: `Playwright Chromium ${browser.version()}, headless, SwiftShader WebGL`,
    file: relative(join(repo, "graph-io"), resolve(input)),
    fileSha256: sha(bytes),
    svgSha256,
    date: old && old.svgSha256 === svgSha256 ? old.date : new Date().toISOString().slice(0, 10),
    standIn: false,
    determinism:
        "Math.random seeded (mulberry32, seed 1) and Date.now stopped at 2026-01-01T00:00:00Z before the library loads; pinned fonts (visual-fonts/fonts.conf); nothing removed from the SVG",
    png: `tools/rasterize.mjs (resvg-js ${versionOf("@resvg/resvg-js")}, over white, fonts from visual-fonts/fonts)`,
    observed: result.observed,
    ...(result.drawn
        ? {
              drawn: {
                  about:
                      result.drawnAbout ??
                      "sigma's own account of its drawing, for a raster oracle: each node it drew, at sigma.framedGraphToViewport(display data) with radius sigma.scaleSize(size) in the PNG's pixels, and the label text of each node in sigma.getNodeDisplayedLabels(); each edge it drew, with its display color and size, its width in the PNG's pixels (max(sigma.scaleSize(size), minEdgeThickness) * sigma.correctionRatio * the pixels one framed graph unit spans, as sigma's edge shader draws it) its display type, and its label when renderEdgeLabels is on; each node's and edge's fill and alpha as sigma's own parseColor reads the display color (sigma blends with that alpha)",
                  nodes: result.drawn.nodes,
                  edges: result.drawn.edges,
              },
              ...(Object.keys(result.settings ?? {}).length ? { settings: result.settings } : {}),
          }
        : {}),
    pageErrors: errors,
};
writeFileSync(metaPath, `${JSON.stringify(meta, null, 4)}\n`);
console.log(`${id}: ${JSON.stringify(result.observed)}${errors.length ? ` errors: ${errors.length}` : ""}`);
