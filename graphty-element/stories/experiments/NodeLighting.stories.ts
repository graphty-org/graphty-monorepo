/**
 * @file EXPERIMENT, not for merging: compares lighting setups for 3D nodes on every node shape.
 *
 * Each setup is applied from outside, through `graph.scene`, to the real meshes and materials the
 * element builds, so what is on screen is the element's own geometry and node material with only
 * the lights (and, for PBR and flat, the material) swapped. Every setup is a set of values for one
 * list of parameters ({@link Params}), and the "One setup" story offers each parameter as a
 * control, with a live readout of the measurements and a button that copies the values as JSON.
 * `window.__nodeLighting` exposes the setups, a rotation control and the in-page measurement for
 * the Playwright driver in tmp/node-lighting/.
 */
import "../../src/graphty-element";

import {
    Color3,
    Color4,
    DirectionalLight,
    FresnelParameters,
    HemisphericLight,
    InstancedMesh,
    Material,
    Matrix,
    type Mesh,
    type Nullable,
    PBRMaterial,
    type Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import type { ArgTypes, Meta, StoryObj } from "@storybook/web-components-vite";
import Color from "colorjs.io";
import { useArgs } from "storybook/preview-api";

import { OKABE_ITO_COLORS } from "../../src/config/palettes/categorical";
import type { Graph } from "../../src/Graph";
import { nodeShapes, renderFn, storySetup } from "../helpers";

type Graphty = HTMLElementTagNameMap["graphty-element"];

/** The four test colors: palest default palette color, a mid blue, a dark saturated purple, a light yellow. */
const COLOR_NAMES = ["palest default", "mid blue", "dark purple", "light yellow"];
const COLOR_KEYS = ["color1", "color2", "color3", "color4"] as const;

/** Every knob the setups turn. A setup is a set of values for these. */
interface Params {
    /** Hemispheric light: intensity, sky and ground colors, the specular it adds, where its sky is. */
    hemiIntensity: number;
    hemiDiffuse: string;
    hemiGround: string;
    /** When on, the direction below is in camera space (x right, y up, z forward), else world space. */
    hemiFollowsCamera: boolean;
    hemiDirX: number;
    hemiDirY: number;
    hemiDirZ: number;
    /** The hemispheric light's specular: color times amount (0 = no highlight). */
    specularColor: string;
    specularAmount: number;
    /** Node material: specular power (highlight tightness), emissive floor (fraction of the color). */
    specularPower: number;
    emissiveFloor: number;
    /** Scene ambient term, gray level, added through the material's ambient channel. */
    ambient: number;
    /** Key light: a directional light fixed to the camera, direction in camera space. */
    keyIntensity: number;
    keyDirX: number;
    keyDirY: number;
    keyDirZ: number;
    /** Fill light: a directional light fixed to the camera, mirrored from the key (other side, lower). */
    fillIntensity: number;
    /** Headlight: a directional light from just above-left of the camera. */
    headlightIntensity: number;
    /** Rim: the emissive floor lifted toward the silhouette (fresnel), in the node's own color. */
    rim: boolean;
    rimBoost: number;
    rimPower: number;
    /** Node material: the element's own, PBR (metallic 0), or unlit flat color with an outline. */
    material: "standard" | "pbr" | "flat";
    pbrRoughness: number;
    outlineWidth: number;
    background: string;
    color1: string;
    color2: string;
    color3: string;
    color4: string;
}

function gray(v: number): string {
    const h = Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, "0");

    return `#${h}${h}${h}`;
}

/** Any CSS color a control hands back (hex, rgb(), hsl()) as a Babylon color. */
function c3(css: string): Color3 {
    const [r, g, b] = new Color(css).to("srgb").coords;

    return new Color3(r ?? 0, g ?? 0, b ?? 0);
}

/** The element's own lighting, as the element builds it (setup b, "matte"). */
const BASE: Params = {
    hemiIntensity: 0.8,
    hemiDiffuse: "#ffffff",
    hemiGround: gray(0.35),
    hemiFollowsCamera: false,
    hemiDirX: 1,
    hemiDirY: 1,
    hemiDirZ: 0,
    specularColor: "#ffffff",
    specularAmount: 0,
    specularPower: 64,
    emissiveFloor: 0.2,
    ambient: 0,
    keyIntensity: 0,
    keyDirX: 0.6,
    keyDirY: -0.6,
    keyDirZ: 1,
    fillIntensity: 0,
    headlightIntensity: 0,
    rim: false,
    rimBoost: 1.8,
    rimPower: 2.5,
    material: "standard",
    pbrRoughness: 0.7,
    outlineWidth: 0.05,
    background: "#f5f5f5",
    color1: OKABE_ITO_COLORS[7],
    color2: "#3B82F6",
    color3: "#5B1A8E",
    color4: "#FFF3A0",
};

const HEADLIGHT: Partial<Params> = { hemiIntensity: 0.4, hemiGround: gray(0.65), headlightIntensity: 0.45 };

/** The lighting setups, in the order they are drawn: each is the matte base plus what it changes. */
const SETUPS: Record<string, { label: string; params: Partial<Params> }> = {
    master: {
        label: "a. master: hemispheric, intensity 1, white specular",
        params: { hemiIntensity: 1, specularAmount: 1 },
    },
    matte: { label: "b. matte (design/studio-tier1): intensity 0.8, no specular", params: {} },
    capped: {
        label: "c. matte + small capped specular",
        params: { specularAmount: 0.08, specularPower: 24, hemiGround: gray(0.45) },
    },
    headlight: { label: "d. camera headlight + soft hemispheric fill", params: HEADLIGHT },
    threePoint: {
        label: "e. key + fill + rim (rim = fresnel lift of the node's own color)",
        params: { hemiIntensity: 0.45, keyIntensity: 0.55, rim: true },
    },
    headRim: { label: "j. camera headlight + soft fill + rim", params: { ...HEADLIGHT, rim: true } },
    pbr: {
        label: "f. PBR, roughness 0.7, metallic 0, hemispheric",
        params: { material: "pbr", hemiIntensity: 2.2, specularAmount: 1 },
    },
    flat: { label: "g. unlit flat color + dark outline", params: { material: "flat" } },
    viewerHemi: {
        label: "i. matte hemispheric aimed from above the viewer (follows the camera)",
        params: { hemiGround: gray(0.45), hemiFollowsCamera: true, hemiDirX: -0.35, hemiDirY: 0.6, hemiDirZ: -1 },
    },
    strongFill: { label: "h. matte + stronger ground fill", params: { hemiGround: gray(0.6) } },
};

function presetOf(name: string): Params {
    return { ...BASE, ...SETUPS[name].params };
}

const PARAM_KEYS = Object.keys(BASE) as (keyof Params)[];

function colorsOf(p: Params): string[] {
    return COLOR_KEYS.map((k) => p[k]);
}

interface Lighting {
    el: Graphty;
    graph: Graph;
    scene: Scene;
    hemi: HemisphericLight;
    sources: Mesh[];
    materials: StandardMaterial[];
    originals: Map<Mesh, Nullable<Material>>;
    /** Whatever the last apply added (lights, observers, swapped materials), undone by the next. */
    extras: { dispose(): void }[];
    params: Params;
    /** The colors the style layers currently paint. */
    colors: string[];
    rotation: { x: number; y: number };
}

/** Find the node source meshes and their materials (again after a restyle may have rebuilt them). */
function capture(l: Pick<Lighting, "graph" | "sources" | "materials" | "originals">): void {
    l.sources = [
        ...new Set(
            l.graph
                .getNodes()
                .map((n) => n.mesh)
                .map((m) => (m instanceof InstancedMesh ? m.sourceMesh : (m as Mesh))),
        ),
    ];
    for (const s of l.sources) {
        if (!l.originals.has(s)) {
            l.originals.set(s, s.material);
        }
    }
    l.materials = [...new Set(l.sources.map((s) => l.originals.get(s)))].filter(
        (m): m is StandardMaterial => m instanceof StandardMaterial,
    );
    // Left unfrozen for the experiment, so every lighting change recompiles the shader.
    for (const m of l.materials) {
        m.unfreeze();
    }
}

function lightingOf(el: Graphty): Lighting {
    const { graph } = el;
    const { scene } = graph;
    const l: Lighting = {
        el,
        graph,
        scene,
        hemi: scene.lights.find((x) => x instanceof HemisphericLight) as HemisphericLight,
        sources: [],
        materials: [],
        originals: new Map(),
        extras: [],
        params: { ...BASE },
        colors: colorsOf(BASE),
        rotation: { x: 0, y: 0 },
    };
    capture(l);

    return l;
}

/**
 * Keep a direction fixed relative to the camera: `local` is in camera space (z forward, y up).
 * @param l - The lighting handle.
 * @param local - The direction, in camera space.
 * @param set - Where to write the world direction.
 */
function followCamera(l: Lighting, local: Vector3, set: (d: Vector3) => void): void {
    const follow = (): void => {
        const cam = l.scene.activeCamera;
        if (cam) {
            set(Vector3.TransformNormal(local, cam.getWorldMatrix()).normalize());
        }
    };
    follow();
    const obs = l.scene.onBeforeRenderObservable.add(follow);
    l.extras.push({ dispose: () => l.scene.onBeforeRenderObservable.remove(obs) });
}

/** A directional light whose direction follows the camera. */
function cameraLight(l: Lighting, name: string, local: Vector3, intensity: number): void {
    if (intensity <= 0) {
        return;
    }
    const light = new DirectionalLight(name, local.normalizeToNew(), l.scene);
    light.intensity = intensity;
    light.specular = Color3.Black();
    followCamera(l, local, (d) => {
        light.direction = d;
    });
    l.extras.push(light);
}

/** Replace every node source mesh's material; the originals are put back by the next apply. */
function swapMaterial(l: Lighting, mat: Material): void {
    for (const s of l.sources) {
        s.material = mat;
    }
    l.extras.push(mat);
}

/** Undo the last apply, then set every parameter. */
function applyParams(l: Lighting, p: Params): void {
    for (const e of l.extras.splice(0)) {
        e.dispose();
    }
    for (const s of l.sources) {
        s.material = l.originals.get(s) ?? s.material;
        s.renderOutline = false;
    }
    const { hemi, scene } = l;
    hemi.intensity = p.hemiIntensity;
    hemi.diffuse = c3(p.hemiDiffuse);
    hemi.groundColor = c3(p.hemiGround);
    hemi.specular = c3(p.specularColor).scale(p.specularAmount);
    const hemiDir = new Vector3(p.hemiDirX, p.hemiDirY, p.hemiDirZ);
    if (p.hemiFollowsCamera) {
        // The hemispheric light's direction points at its sky.
        followCamera(l, hemiDir, (d) => {
            hemi.direction = d;
        });
    } else {
        hemi.direction = hemiDir;
    }
    scene.ambientColor = new Color3(p.ambient, p.ambient, p.ambient);
    scene.clearColor = Color4.FromColor3(c3(p.background), 1);

    for (const m of l.materials) {
        m.specularPower = p.specularPower;
        m.emissiveColor = m.diffuseColor.scale(p.emissiveFloor);
        m.ambientColor = Color3.White();
        if (p.rim) {
            const f = new FresnelParameters();
            f.bias = 0.1;
            f.power = p.rimPower;
            f.leftColor = new Color3(p.rimBoost, p.rimBoost, p.rimBoost);
            f.rightColor = Color3.White();
            m.emissiveFresnelParameters = f;
        } else {
            m.emissiveFresnelParameters = null as unknown as FresnelParameters;
        }
    }

    cameraLight(l, "key", new Vector3(p.keyDirX, p.keyDirY, p.keyDirZ), p.keyIntensity);
    cameraLight(l, "fill", new Vector3(-p.keyDirX, -p.keyDirY * 0.3, p.keyDirZ), p.fillIntensity);
    // From slightly above and to the left of the camera, so a face square to the viewer is lit but
    // not every face of a polyhedron is lit identically.
    cameraLight(l, "headlight", new Vector3(0.25, -0.3, 1), p.headlightIntensity);

    if (p.material === "pbr") {
        const m = new PBRMaterial("exp-pbr", scene);
        m.albedoColor = Color3.White();
        m.metallic = 0;
        m.roughness = p.pbrRoughness;
        swapMaterial(l, m);
    } else if (p.material === "flat") {
        const m = new StandardMaterial("exp-flat", scene);
        m.disableLighting = true;
        m.diffuseColor = Color3.White();
        m.emissiveColor = Color3.White();
        swapMaterial(l, m);
        for (const s of l.sources) {
            s.renderOutline = true;
            s.outlineWidth = p.outlineWidth;
            s.outlineColor = new Color3(0.25, 0.25, 0.25);
        }
    }
    // A light's specular is compiled into the shader (it is a define, on only when some light had a
    // non-black specular when the material was prepared), so every lighting change recompiles.
    for (const s of l.sources) {
        s.material?.markAsDirty(Material.LightDirtyFlag);
    }
    l.params = { ...p };
    requestFrame(l.graph);
}

/** Repaint the four color layers through the element's style stack, then re-apply the lighting. */
async function applyColors(l: Lighting, colors: string[]): Promise<void> {
    if (colors.every((c, i) => c === l.colors[i])) {
        return;
    }
    l.colors = [...colors];
    const { styles } = l.el.session;
    for (const [i, color] of colors.entries()) {
        const layer = styles.list().find((x) => x.name === `color ${String(i)}`);
        if (layer) {
            await styles.update(layer.id, { set: { "node.color": color } });
        }
    }
    await styles.settled();
    // A restyle may rebuild source meshes and materials; pick up the new ones.
    capture(l);
    applyParams(l, l.params);
}

/** Ask the on-demand render loop for a frame (experiment only: reaches into a private member). */
function requestFrame(graph: Graph): void {
    (graph as unknown as { renderManager: { requestFrame(): void } }).renderManager.requestFrame();
}

/** Turn every node instance to the same rotation. */
function setRotation(l: Lighting, x: number, y: number): void {
    l.rotation = { x, y };
    for (const n of l.graph.getNodes()) {
        n.mesh.rotation.set(x, y, 0);
    }
    requestFrame(l.graph);
}

/** One node grid: `cols` shapes per row, rows grouped by color. */
function gridData(
    cols: number,
    spacing: number,
): { id: string; shape: string; color: number; position: { x: number; y: number; z: number } }[] {
    const rowsPerColor = Math.ceil(nodeShapes.length / cols);
    const out = [];
    for (let c = 0; c < COLOR_NAMES.length; c++) {
        for (let i = 0; i < nodeShapes.length; i++) {
            const row = c * rowsPerColor + Math.floor(i / cols);
            out.push({
                id: `${nodeShapes[i]}|${String(c)}`,
                shape: nodeShapes[i],
                color: c,
                position: { x: ((i % cols) - (cols - 1) / 2) * spacing, y: -row * spacing, z: 0 },
            });
        }
    }

    return out;
}

const LAYERS = [
    ...nodeShapes.map((shape) => ({
        name: `shape ${shape}`,
        target: "node" as const,
        selector: { match: "expression" as const, where: `data.shape == '${shape}'` },
        set: { "node.shape": shape },
    })),
    ...colorsOf(BASE).map((color, i) => ({
        name: `color ${String(i)}`,
        target: "node" as const,
        selector: { match: "expression" as const, where: `data.color == \`${String(i)}\`` },
        set: { "node.color": color },
    })),
];

/** Build one element, wait for it, and hand back its lighting handle. */
function mountGraph(host: HTMLElement, width: number, height: number, cols: number): Promise<Lighting> {
    const el = renderFn(
        {
            setup: storySetup({ viewMode: "3d", layers: LAYERS }),
            layout: "fixed",
            layoutConfig: {},
            nodeData: gridData(cols, 3.4),
            edgeData: [],
        },
        { argTypes: {} } as never,
    ) as Graphty;
    el.style.display = "block";
    el.style.width = `${String(width)}px`;
    el.style.height = `${String(height)}px`;
    host.appendChild(el);

    return (async (): Promise<Lighting> => {
        while (el.graph.getNodes().length < nodeShapes.length * COLOR_NAMES.length) {
            await new Promise((r) => setTimeout(r, 100));
        }
        await el.graph.waitForSettled();
        await el.session.styles.settled();
        await el.graph.waitForStableFrame({ timeoutMs: 30000 });

        return lightingOf(el);
    })();
}

/** Rotate every node by a small step per frame while `on()` says so. */
function spin(lightings: Lighting[], on: () => boolean): void {
    let last = performance.now();
    const tick = (now: number): void => {
        const dt = (now - last) / 1000;
        last = now;
        if (on()) {
            for (const l of lightings) {
                setRotation(l, l.rotation.x + dt * 0.21, l.rotation.y + dt * 0.37);
            }
        }
        requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
}

// ---------------------------------------------------------------- measurement

interface Lch {
    l: number;
    c: number;
    h: number;
}

function lchOf(r: number, g: number, b: number): Lch {
    const [l, c, h] = new Color("srgb", [r / 255, g / 255, b / 255]).to("oklch").coords;

    return { l: l ?? 0, c: c ?? 0, h: Number.isNaN(h) ? 0 : (h ?? 0) };
}

function hueDistance(a: number, b: number): number {
    const d = Math.abs(a - b) % 360;

    return d > 180 ? 360 - d : d;
}

/** Draw now and read the frame, bottom row first. */
async function frame(graph: Graph): Promise<{ px: Uint8Array; w: number; h: number }> {
    graph.scene.render();
    const w = graph.engine.getRenderWidth();
    const h = graph.engine.getRenderHeight();
    // Copied: the engine may hand back the same buffer on the next read.
    const px = new Uint8Array((await graph.engine.readPixels(0, 0, w, h)) as unknown as Uint8Array);

    return { px, w, h };
}

export interface NodeReading {
    setup: string;
    shape: string;
    color: string;
    pixels: number;
    clipped: number;
    brightHue: number;
    brightRatio: number;
    medianHue: number;
    medianRatio: number;
    spread: number;
    darkest: number;
    darkestRatio: number;
}

/** Twelve orientations: four tilts by three turns, so faces at every attitude to the light are seen. */
const ANGLES: [number, number][] = [0, 0.8, 1.6, 2.4].flatMap((x) =>
    [0, 2.1, 4.2].map((y): [number, number] => [x, y]),
);

/**
 * Measure every node of the grid under the lighting as it is now, pooled over the fixed angles.
 * A node's pixels are those inside its screen cell that change when the nodes are hidden,
 * eroded by 2 px so the anti-aliased silhouette is left out.
 */
async function measure(l: Lighting, setup: string): Promise<NodeReading[]> {
    const { graph } = l;
    const before = { ...l.rotation };
    // A swapped material compiles asynchronously; a frame drawn before that skips the mesh.
    await graph.scene.whenReadyAsync();
    const nodes = graph.getNodes();
    const acc = new Map<string, { lch: Lch[]; spreads: number[]; clipped: number }>();
    for (const [ax, ay] of ANGLES) {
        setRotation(l, ax, ay);
        const shown = await frame(graph);
        // The node mask: a pixel that does not change when the clear color does is a node.
        const clear = graph.scene.clearColor.clone();
        graph.scene.clearColor = new Color4(1, 0, 1, 1);
        const hidden = await frame(graph);
        graph.scene.clearColor = clear;
        const { w, h } = shown;
        const cam = graph.scene.activeCamera;
        if (!cam) {
            throw new Error("no camera");
        }
        const tm = graph.scene.getTransformMatrix();
        const vp = cam.viewport.toGlobal(w, h);
        const centers = nodes.map((n) => Vector3.Project(n.mesh.absolutePosition, Matrix.Identity(), tm, vp));
        // Cell half-size: half the smallest on-screen spacing between neighbours.
        let minGap = Infinity;
        for (let i = 1; i < centers.length; i++) {
            const d = Math.hypot(centers[i].x - centers[i - 1].x, centers[i].y - centers[i - 1].y);
            if (d > 1) {
                minGap = Math.min(minGap, d);
            }
        }
        const half = Math.floor(minGap / 2) - 1;
        const isNode = (x: number, y: number): boolean => {
            const at = ((h - 1 - y) * w + x) * 4;
            return (
                Math.abs(shown.px[at] - hidden.px[at]) +
                    Math.abs(shown.px[at + 1] - hidden.px[at + 1]) +
                    Math.abs(shown.px[at + 2] - hidden.px[at + 2]) <=
                3
            );
        };
        nodes.forEach((n, i) => {
            const cx = Math.round(centers[i].x);
            const cy = Math.round(centers[i].y);
            const key = String(n.id);
            const entry = acc.get(key) ?? { lch: [], spreads: [], clipped: 0 };
            const ls: number[] = [];
            for (let y = cy - half + 2; y <= cy + half - 2; y++) {
                for (let x = cx - half + 2; x <= cx + half - 2; x++) {
                    if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) {
                        continue;
                    }
                    let inside = true;
                    for (let dy = -2; dy <= 2 && inside; dy++) {
                        for (let dx = -2; dx <= 2 && inside; dx++) {
                            inside = isNode(x + dx, y + dy);
                        }
                    }
                    if (!inside) {
                        continue;
                    }
                    const at = ((h - 1 - y) * w + x) * 4;
                    const [r, g, b] = [shown.px[at], shown.px[at + 1], shown.px[at + 2]];
                    if (r > 240 && g > 240 && b > 240) {
                        entry.clipped++;
                    }
                    const v = lchOf(r, g, b);
                    entry.lch.push(v);
                    ls.push(v.l);
                }
            }
            ls.sort((a, b) => a - b);
            if (ls.length > 20) {
                entry.spreads.push(ls[Math.floor(ls.length * 0.95)] - ls[Math.floor(ls.length * 0.05)]);
            }
            acc.set(key, entry);
        });
    }
    setRotation(l, before.x, before.y);

    const out: NodeReading[] = [];
    for (const [id, e] of acc) {
        const [shape, ci] = id.split("|");
        const style = new Color(l.colors[Number(ci)]).to("oklch").coords;
        const sl = style[0] ?? 1;
        const sh = Number.isNaN(style[2]) ? 0 : (style[2] ?? 0);
        const byL = [...e.lch].sort((a, b) => a.l - b.l);
        const n = byL.length;
        if (n === 0) {
            continue;
        }
        const bright = byL[n - 1];
        const median = byL[Math.floor(n / 2)];
        const dark = byL[Math.floor(n * 0.02)];
        out.push({
            setup,
            shape,
            color: COLOR_NAMES[Number(ci)],
            pixels: n,
            clipped: e.clipped / n,
            brightHue: hueDistance(bright.h, sh),
            brightRatio: bright.l / sl,
            medianHue: hueDistance(median.h, sh),
            medianRatio: median.l / sl,
            spread: e.spreads.reduce((a, b) => a + b, 0) / Math.max(1, e.spreads.length),
            darkest: dark.l,
            darkestRatio: dark.l / sl,
        });
    }

    return out;
}

/** The readout's rows: one line per measurement, pooled over every node (spheres separately where asked). */
function summarize(rs: NodeReading[]): [string, string][] {
    const avg = (a: number[]): number => a.reduce((p, c) => p + c, 0) / Math.max(1, a.length);
    const f = (v: number, d = 2): string => v.toFixed(d);
    const spheres = rs.filter((r) => r.shape === "sphere");

    return [
        [
            "Clipped near white",
            `${f(100 * avg(rs.map((r) => r.clipped)), 1)}% (worst node ${f(100 * Math.max(...rs.map((r) => r.clipped)), 1)}%)`,
        ],
        [
            "Brightest L / style L",
            `${f(avg(rs.map((r) => r.brightRatio)))} (max ${f(Math.max(...rs.map((r) => r.brightRatio)))})`,
        ],
        ["Median L / style L", f(avg(rs.map((r) => r.medianRatio)))],
        ["Lightness spread (depth), all", f(avg(rs.map((r) => r.spread)), 3)],
        ["Lightness spread, spheres", f(avg(spheres.map((r) => r.spread)), 3)],
        ["Darkest L", `${f(avg(rs.map((r) => r.darkest)))} (min ${f(Math.min(...rs.map((r) => r.darkest)))})`],
        [
            "Brightest-pixel hue error",
            `${f(avg(rs.map((r) => r.brightHue)), 1)} deg (max ${f(Math.max(...rs.map((r) => r.brightHue)), 1)})`,
        ],
    ];
}

declare global {
    interface Window {
        __nodeLighting?: {
            setups: string[];
            ready: Promise<Lighting[]>;
            /** Apply a named setup, or a set of parameter values over the current ones. */
            apply: (setup: string | Partial<Params>) => void;
            rotate: (x: number, y: number) => void;
            spin: (on: boolean) => void;
            /** Measure a named setup (applied first), or the current parameters when none is named. */
            measure: (setup?: string) => Promise<NodeReading[]>;
        };
    }
}

// ---------------------------------------------------------------- stories

const meta: Meta = {
    title: "Experiments/Node lighting",
};
export default meta;

type Args = Params & { setup: string; spin: boolean };

const range = (min: number, max: number, step: number, description: string): ArgTypes[string] => ({
    control: { type: "range", min, max, step },
    description,
});
const color = (description: string): ArgTypes[string] => ({ control: { type: "color" }, description });

const PARAM_ARG_TYPES: Partial<ArgTypes<Params>> = {
    hemiIntensity: range(0, 3, 0.05, "Hemispheric light: intensity (in most setups this is the fill)"),
    hemiDiffuse: color("Hemispheric light: sky (diffuse) color"),
    hemiGround: color("Hemispheric light: ground color (lights faces turned away from the sky)"),
    hemiFollowsCamera: { control: "boolean", description: "Hemispheric direction is relative to the camera" },
    hemiDirX: range(-1, 1, 0.05, "Hemispheric light: direction toward its sky, x"),
    hemiDirY: range(-1, 1, 0.05, "Hemispheric light: direction toward its sky, y"),
    hemiDirZ: range(-1, 1, 0.05, "Hemispheric light: direction toward its sky, z"),
    specularColor: color("Light specular color"),
    specularAmount: range(0, 1, 0.01, "Light specular amount (0 = no highlight)"),
    specularPower: range(1, 128, 1, "Material specular power (higher = smaller, tighter highlight)"),
    emissiveFloor: range(0, 1, 0.01, "Material emissive floor, as a fraction of the node color (element: 0.2)"),
    ambient: range(0, 1, 0.01, "Scene ambient term (gray level)"),
    keyIntensity: range(0, 2, 0.05, "Key light intensity (directional, fixed to the camera)"),
    keyDirX: range(-1, 1, 0.05, "Key light direction relative to the camera, x (+ = light comes from the left)"),
    keyDirY: range(-1, 1, 0.05, "Key light direction relative to the camera, y (- = light comes from above)"),
    keyDirZ: range(0, 1, 0.05, "Key light direction relative to the camera, z (1 = from behind the viewer)"),
    fillIntensity: range(0, 2, 0.05, "Fill light intensity (directional, mirrored from the key)"),
    headlightIntensity: range(0, 2, 0.05, "Camera headlight intensity"),
    rim: { control: "boolean", description: "Rim: fresnel lift of the node's own color at the silhouette" },
    rimBoost: range(0, 4, 0.05, "Rim boost (emissive multiplier at the edge)"),
    rimPower: range(0.5, 8, 0.1, "Rim fresnel power (higher = thinner rim)"),
    material: { control: "inline-radio", options: ["standard", "pbr", "flat"], description: "Node material" },
    pbrRoughness: range(0, 1, 0.01, "PBR roughness (material = pbr)"),
    outlineWidth: range(0, 0.2, 0.005, "Outline width (material = flat)"),
    background: color("Scene background color"),
    color1: color(`Node color, rows 1-2 (${COLOR_NAMES[0]})`),
    color2: color(`Node color, rows 3-4 (${COLOR_NAMES[1]})`),
    color3: color(`Node color, rows 5-6 (${COLOR_NAMES[2]})`),
    color4: color(`Node color, rows 7-8 (${COLOR_NAMES[3]})`),
};

function paramsOf(args: Args): Params {
    return Object.fromEntries(PARAM_KEYS.map((k) => [k, args[k]])) as unknown as Params;
}

function sameParams(a: Params, b: Params): boolean {
    return PARAM_KEYS.every((k) => a[k] === b[k]);
}

/**
 * Keep a story's element alive across control changes.
 *
 * Storybook re-inserts the node a render returns on every args change, and graphty-element shuts
 * its graph down when it is disconnected, so the story keeps its element in a host beside
 * Storybook's root and returns an empty placeholder in its place. The host goes when the
 * placeholder does (another story was opened).
 * @param host - The story's content.
 * @param onGone - Called once the story is gone.
 * @returns The placeholder to return from every render.
 */
function persistent(host: HTMLElement, onGone: () => void): HTMLElement {
    const placeholder = document.createElement("div");
    host.style.padding = "1rem";
    document.body.appendChild(host);
    const timer = setInterval(() => {
        if (!placeholder.isConnected) {
            clearInterval(timer);
            host.remove();
            onGone();
        }
    }, 1000);

    return placeholder;
}

interface OneView {
    host: HTMLElement;
    placeholder: HTMLElement;
    caption: HTMLElement;
    lighting: Promise<Lighting>;
    /** The setup last loaded into the controls. */
    loaded: string;
    spinning: boolean;
    remeasure: () => void;
    json: HTMLTextAreaElement;
}
let oneView: OneView | undefined;

/** The readout panel: a table of measurements, the settings JSON and a copy button. */
function buildPanel(
    lighting: Promise<Lighting>,
    getSetup: () => string,
): {
    panel: HTMLElement;
    remeasure: () => void;
    json: HTMLTextAreaElement;
} {
    const panel = document.createElement("div");
    panel.style.cssText = "width: 330px; flex: none; font: 13px sans-serif; padding: 4px 8px;";
    const title = document.createElement("div");
    title.style.cssText = "font-weight: bold; margin-bottom: 4px;";
    title.textContent = "Measurements (12 orientations, every node)";
    const status = document.createElement("div");
    status.style.cssText = "color: #555; margin-bottom: 4px;";
    const table = document.createElement("table");
    table.style.cssText = "border-collapse: collapse; width: 100%;";
    const copy = document.createElement("button");
    copy.textContent = "Copy settings";
    copy.style.cssText = "margin-top: 10px;";
    const json = document.createElement("textarea");
    json.readOnly = true;
    json.style.cssText = "width: 100%; height: 260px; font: 11px monospace; margin-top: 4px;";
    panel.append(title, status, table, copy, json);

    copy.addEventListener("click", () => {
        const done = (ok: boolean): void => {
            copy.textContent = ok ? "Copied" : "Copy failed: select the text below";
            setTimeout(() => {
                copy.textContent = "Copy settings";
            }, 1500);
        };
        // navigator.clipboard needs a secure origin; plain-http Storybook falls back to execCommand.
        if (window.isSecureContext && "clipboard" in navigator) {
            navigator.clipboard.writeText(json.value).then(
                () => {
                    done(true);
                },
                () => {
                    done(false);
                },
            );
        } else {
            // The only copy an insecure (plain-http) page has; the typed DOM marks it deprecated.
            json.select();
            done((document as { execCommand(command: string): boolean }).execCommand("copy"));
        }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let again = false;
    const run = async (): Promise<void> => {
        if (running) {
            again = true;
            return;
        }
        running = true;
        status.textContent = "measuring...";
        try {
            const l = await lighting;
            const rows = summarize(await measure(l, getSetup()));
            table.replaceChildren(
                ...rows.map(([k, v]) => {
                    const tr = document.createElement("tr");
                    const th = document.createElement("td");
                    th.textContent = k;
                    th.style.cssText = "padding: 2px 6px 2px 0; color: #333;";
                    const td = document.createElement("td");
                    td.textContent = v;
                    td.style.cssText = "padding: 2px 0; font-variant-numeric: tabular-nums; text-align: right;";
                    tr.append(th, td);
                    return tr;
                }),
            );
            status.textContent = `measured ${new Date().toLocaleTimeString()}`;
        } catch (e) {
            status.textContent = `measurement failed: ${String(e)}`;
        } finally {
            running = false;
        }
        if (again) {
            again = false;
            void run();
        }
    };
    const remeasure = (): void => {
        status.textContent = "measuring...";
        clearTimeout(timer);
        timer = setTimeout(() => void run(), 700);
    };

    return { panel, remeasure, json };
}

function mountOne(args: Args): OneView {
    const host = document.createElement("div");
    host.style.cssText = "display: flex; gap: 8px; align-items: flex-start;";
    const left = document.createElement("div");
    const caption = document.createElement("div");
    caption.style.font = "14px sans-serif";
    caption.style.margin = "4px 0";
    left.appendChild(caption);
    host.appendChild(left);
    const lighting = mountGraph(left, 1400, 860, 13);
    const view: OneView = {
        host,
        placeholder: persistent(host, () => {
            oneView = undefined;
        }),
        caption,
        lighting,
        loaded: args.setup,
        spinning: args.spin,
        remeasure: () => undefined,
        json: document.createElement("textarea"),
    };
    const { panel, remeasure, json } = buildPanel(lighting, () => view.loaded);
    // First, so the readout stays in view beside the wide grid.
    host.prepend(panel);
    view.remeasure = remeasure;
    view.json = json;
    void lighting.then((l) => {
        spin([l], () => view.spinning);
    });

    const apply = (p: Params): void => {
        void lighting.then(async (l) => {
            applyParams(l, p);
            await applyColors(l, colorsOf(p));
        });
    };
    window.__nodeLighting = {
        setups: Object.keys(SETUPS),
        ready: lighting.then((l) => [l]),
        apply: (setup) => {
            void lighting.then((l) => {
                apply(typeof setup === "string" ? presetOf(setup) : { ...l.params, ...setup });
                if (typeof setup === "string") {
                    caption.textContent = `${SETUPS[setup].label} -- rows: ${COLOR_NAMES.join(", ")}`;
                }
            });
        },
        rotate: (x, y) => {
            void lighting.then((l) => {
                setRotation(l, x, y);
            });
        },
        spin: (on) => {
            view.spinning = on;
        },
        measure: async (setup) => {
            const l = await lighting;
            view.spinning = false;
            if (setup !== undefined) {
                applyParams(l, presetOf(setup));
                await applyColors(l, colorsOf(presetOf(setup)));
            }
            return measure(l, setup ?? "custom");
        },
    };

    return view;
}

/**
 * One large element and one setup, with a control for every lighting parameter, a live readout
 * of the measurements and a "Copy settings" button. Picking a setup loads its values into the
 * controls; moving any control switches the setup to "custom", starting from those values.
 */
export const OneSetup: StoryObj<Args> = {
    args: { setup: "matte", spin: false, ...presetOf("matte") },
    argTypes: {
        setup: {
            control: "select",
            options: [...Object.keys(SETUPS), "custom"],
            description: "A setup loads its values into every control below; moving a control makes it custom",
        },
        spin: { control: "boolean", description: "Rotate the nodes slowly" },
        ...PARAM_ARG_TYPES,
    },
    render: (args) => {
        const [, updateArgs] = useArgs<Args>();
        // Reused across control changes: rebuilding the element on every slider step would take seconds.
        if (!oneView) {
            oneView = mountOne(args);
        }
        const view = oneView;
        view.spinning = args.spin;
        const params = paramsOf(args);

        if (args.setup !== "custom" && args.setup !== view.loaded) {
            // A setup was picked: load its values into the controls (this render then re-runs).
            view.loaded = args.setup;
            const preset = presetOf(args.setup);
            if (!sameParams(params, preset)) {
                updateArgs(preset);
                return view.placeholder;
            }
        } else if (args.setup !== "custom" && !sameParams(params, presetOf(args.setup))) {
            // A control moved away from the setup's values.
            view.loaded = "custom";
            updateArgs({ setup: "custom" });
        } else if (args.setup === "custom") {
            view.loaded = "custom";
        }

        view.caption.textContent =
            view.loaded === "custom"
                ? `custom (edited from the controls) -- rows: ${COLOR_NAMES.join(", ")}`
                : `${SETUPS[view.loaded].label} -- rows: ${COLOR_NAMES.join(", ")}`;
        view.json.value = JSON.stringify(params, null, 1);
        void view.lighting.then(async (l) => {
            applyParams(l, params);
            await applyColors(l, colorsOf(params));
            view.remeasure();
        });

        return view.placeholder;
    },
};

interface AllView {
    host: HTMLElement;
    placeholder: HTMLElement;
    spinning: boolean;
    panels: Promise<{ l: Lighting; name: string }[]>;
}
let allView: AllView | undefined;

type AllArgs = Pick<Params, "background" | "emissiveFloor" | "color1" | "color2" | "color3" | "color4"> & {
    spin: boolean;
};

/**
 * Every setup at once, two per row: each panel is every shape across, the four colors down. The
 * controls are the ones every setup shares: background, emissive floor and the four node colors.
 */
export const AllSetups: StoryObj<AllArgs> = {
    args: {
        spin: false,
        background: BASE.background,
        emissiveFloor: BASE.emissiveFloor,
        color1: BASE.color1,
        color2: BASE.color2,
        color3: BASE.color3,
        color4: BASE.color4,
    },
    argTypes: {
        spin: { control: "boolean", description: "Rotate the nodes slowly" },
        background: PARAM_ARG_TYPES.background,
        emissiveFloor: PARAM_ARG_TYPES.emissiveFloor,
        color1: PARAM_ARG_TYPES.color1,
        color2: PARAM_ARG_TYPES.color2,
        color3: PARAM_ARG_TYPES.color3,
        color4: PARAM_ARG_TYPES.color4,
    },
    render: (args) => {
        if (!allView) {
            const host = document.createElement("div");
            host.style.cssText = "font: 13px sans-serif; display: flex; flex-wrap: wrap; gap: 8px;";
            // Mounted one after another: built all at once, the panels lost meshes to each other.
            const panels = (async (): Promise<{ l: Lighting; name: string }[]> => {
                const ls: { l: Lighting; name: string }[] = [];
                for (const [name, s] of Object.entries(SETUPS)) {
                    const cell = document.createElement("div");
                    const caption = document.createElement("div");
                    caption.textContent = s.label;
                    caption.style.margin = "4px 0 2px";
                    cell.appendChild(caption);
                    host.appendChild(cell);
                    ls.push({ l: await mountGraph(cell, 740, 470, 13), name });
                }
                spin(
                    ls.map((x) => x.l),
                    () => allView?.spinning ?? false,
                );
                return ls;
            })();
            allView = {
                host,
                panels,
                spinning: args.spin,
                placeholder: persistent(host, () => {
                    allView = undefined;
                }),
            };
        }
        const view = allView;
        view.spinning = args.spin;
        const shared = {
            background: args.background,
            emissiveFloor: args.emissiveFloor,
            color1: args.color1,
            color2: args.color2,
            color3: args.color3,
            color4: args.color4,
        };
        const done = view.panels.then(async (ls) => {
            for (const { l, name } of ls) {
                const p = { ...presetOf(name), ...shared };
                applyParams(l, p);
                await applyColors(l, colorsOf(p));
            }
            return ls;
        });
        (window as unknown as { __allSetupsReady: Promise<unknown> }).__allSetupsReady = done;

        return view.placeholder;
    },
};
