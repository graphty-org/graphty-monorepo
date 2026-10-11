/**
 * @file EXPERIMENT, not for merging: compares lighting setups for 3D nodes on every node shape.
 *
 * Each setup is applied from outside, through `graph.scene`, to the real meshes and materials the
 * element builds, so what is on screen is the element's own geometry and node material with only
 * the lights (and, for PBR and flat, the material) swapped. `window.__nodeLighting` exposes the
 * setups, a rotation control and an in-page measurement for the Playwright driver in
 * tmp/node-lighting/.
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
    type Observer,
    PBRMaterial,
    type Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import type { Meta, StoryObj } from "@storybook/web-components-vite";
import Color from "colorjs.io";

import { OKABE_ITO_COLORS } from "../../src/config/palettes/categorical";
import type { Graph } from "../../src/Graph";
import { nodeShapes, renderFn, storySetup } from "../helpers";

type Graphty = HTMLElementTagNameMap["graphty-element"];

/** The four test colors: palest default palette color, a mid blue, a dark saturated purple, a light yellow. */
const COLORS = {
    "palest default": OKABE_ITO_COLORS[7],
    "mid blue": "#3B82F6",
    "dark purple": "#5B1A8E",
    "light yellow": "#FFF3A0",
} as const;
const COLOR_LIST = Object.values(COLORS);
const COLOR_NAMES = Object.keys(COLORS);

interface SetupCtx {
    scene: Scene;
    hemi: HemisphericLight;
    materials: StandardMaterial[];
    sources: Mesh[];
    extras: { dispose(): void }[];
}

/**
 * A light whose direction follows the camera: `local` is in camera space (z forward, y up).
 * @param ctx - The setup being built.
 * @param name - Light name.
 * @param local - Direction the light travels, in camera space.
 * @param intensity - Diffuse intensity.
 * @returns The light.
 */
function cameraLight(ctx: SetupCtx, name: string, local: Vector3, intensity: number): DirectionalLight {
    const light = new DirectionalLight(name, local.normalizeToNew(), ctx.scene);
    light.intensity = intensity;
    light.specular = Color3.Black();
    const follow = (): void => {
        const cam = ctx.scene.activeCamera;
        if (cam) {
            light.direction = Vector3.TransformNormal(local, cam.getWorldMatrix()).normalize();
        }
    };
    follow();
    const obs: Nullable<Observer<Scene>> = ctx.scene.onBeforeRenderObservable.add(follow);
    ctx.extras.push({ dispose: () => ctx.scene.onBeforeRenderObservable.remove(obs) }, light);

    return light;
}

/** Edit a frozen shared material. */
function editMaterials(ctx: SetupCtx, edit: (m: StandardMaterial) => void): void {
    for (const m of ctx.materials) {
        edit(m);
    }
}

/** Replace every node source mesh's material; the originals are put back by `reset`. */
function swapMaterial(ctx: SetupCtx, make: () => Material): void {
    const mat = make();
    for (const s of ctx.sources) {
        s.material = mat;
    }
    ctx.extras.push(mat);
}

/**
 * A rim: the emissive floor lifted toward the silhouette (fresnel), in the node's own color, so an
 * edge separates from the background without adding white.
 */
function rim(ctx: SetupCtx): void {
    editMaterials(ctx, (m) => {
        const f = new FresnelParameters();
        f.bias = 0.1;
        f.power = TUNE.rimPower;
        f.leftColor = new Color3(TUNE.rimBoost, TUNE.rimBoost, TUNE.rimBoost);
        f.rightColor = Color3.White();
        m.emissiveFresnelParameters = f;
    });
}

/** Tunables the iteration rounds adjust from the console or the driver. */
const TUNE = {
    cappedSpec: 0.08,
    cappedPower: 24,
    cappedIntensity: 0.8,
    cappedGround: 0.45,
    headlight: 0.45,
    headFill: 0.4,
    headGround: 0.65,
    keyIntensity: 0.55,
    fillIntensity: 0.45,
    viewerGround: 0.45,
    rimBoost: 1.8,
    rimPower: 2.5,
    pbrRoughness: 0.7,
    pbrIntensity: 2.2,
    strongFillGround: 0.6,
    outline: 0.05,
};

/** The lighting setups, in the order they are drawn. */
const SETUPS: Record<string, { label: string; apply: (ctx: SetupCtx) => void }> = {
    master: {
        label: "a. master: hemispheric, intensity 1, white specular",
        apply: ({ hemi }) => {
            hemi.intensity = 1;
            hemi.specular = Color3.White();
        },
    },
    matte: {
        label: "b. matte (design/studio-tier1): intensity 0.8, no specular",
        apply: () => undefined,
    },
    capped: {
        label: "c. matte + small capped specular",
        apply: (ctx) => {
            ctx.hemi.intensity = TUNE.cappedIntensity;
            ctx.hemi.specular = new Color3(TUNE.cappedSpec, TUNE.cappedSpec, TUNE.cappedSpec);
            ctx.hemi.groundColor = new Color3(TUNE.cappedGround, TUNE.cappedGround, TUNE.cappedGround);
            editMaterials(ctx, (m) => {
                m.specularPower = TUNE.cappedPower;
            });
        },
    },
    headlight: {
        label: "d. camera headlight + soft hemispheric fill",
        apply: (ctx) => {
            ctx.hemi.intensity = TUNE.headFill;
            ctx.hemi.groundColor = new Color3(TUNE.headGround, TUNE.headGround, TUNE.headGround);
            // From slightly above and to the left of the camera, so a face square to the viewer is
            // lit but not every face of a polyhedron is lit identically.
            cameraLight(ctx, "headlight", new Vector3(0.25, -0.3, 1), TUNE.headlight);
        },
    },
    threePoint: {
        label: "e. key + fill + rim (rim = fresnel lift of the node's own color)",
        apply: (ctx) => {
            ctx.hemi.intensity = TUNE.fillIntensity;
            cameraLight(ctx, "key", new Vector3(0.6, -0.6, 1), TUNE.keyIntensity);
            rim(ctx);
        },
    },
    headRim: {
        label: "j. camera headlight + soft fill + rim",
        apply: (ctx) => {
            SETUPS.headlight.apply(ctx);
            rim(ctx);
        },
    },
    pbr: {
        label: "f. PBR, roughness 0.7, metallic 0, hemispheric",
        apply: (ctx) => {
            ctx.hemi.intensity = TUNE.pbrIntensity;
            ctx.hemi.specular = Color3.White();
            swapMaterial(ctx, () => {
                const m = new PBRMaterial("exp-pbr", ctx.scene);
                m.albedoColor = Color3.White();
                m.metallic = 0;
                m.roughness = TUNE.pbrRoughness;
                return m;
            });
        },
    },
    flat: {
        label: "g. unlit flat color + dark outline",
        apply: (ctx) => {
            swapMaterial(ctx, () => {
                const m = new StandardMaterial("exp-flat", ctx.scene);
                m.disableLighting = true;
                m.diffuseColor = Color3.White();
                m.emissiveColor = Color3.White();
                return m;
            });
            for (const s of ctx.sources) {
                s.renderOutline = true;
                s.outlineWidth = TUNE.outline;
                s.outlineColor = new Color3(0.25, 0.25, 0.25);
            }
            ctx.extras.push({
                dispose: () => {
                    for (const s of ctx.sources) {
                        s.renderOutline = false;
                    }
                },
            });
        },
    },
    viewerHemi: {
        label: "i. matte hemispheric aimed from above the viewer (follows the camera)",
        apply: (ctx) => {
            ctx.hemi.groundColor = new Color3(TUNE.viewerGround, TUNE.viewerGround, TUNE.viewerGround);
            // The hemispheric light's direction points at its sky: up, left and back toward the viewer.
            const local = new Vector3(-0.35, 0.6, -1);
            const follow = (): void => {
                const cam = ctx.scene.activeCamera;
                if (cam) {
                    ctx.hemi.direction = Vector3.TransformNormal(local, cam.getWorldMatrix()).normalize();
                }
            };
            follow();
            const obs = ctx.scene.onBeforeRenderObservable.add(follow);
            ctx.extras.push({
                dispose: () => {
                    ctx.scene.onBeforeRenderObservable.remove(obs);
                    ctx.hemi.direction = new Vector3(1, 1, 0);
                },
            });
        },
    },
    strongFill: {
        label: "h. matte + stronger ground fill",
        apply: (ctx) => {
            ctx.hemi.groundColor = new Color3(TUNE.strongFillGround, TUNE.strongFillGround, TUNE.strongFillGround);
        },
    },
};

interface Lighting {
    graph: Graph;
    ctx: SetupCtx;
    originals: Map<Mesh, Nullable<Material>>;
    current: string;
    rotation: { x: number; y: number };
}

/** Capture the element's own lighting state once, so every setup starts from it. */
function lightingOf(graph: Graph): Lighting {
    const { scene } = graph;
    const hemi = scene.lights.find((l) => l instanceof HemisphericLight) as HemisphericLight;
    const sources = [
        ...new Set(
            graph
                .getNodes()
                .map((n) => n.mesh)
                .map((m) => (m instanceof InstancedMesh ? m.sourceMesh : (m as Mesh))),
        ),
    ];
    const materials = [...new Set(sources.map((s) => s.material))].filter(
        (m): m is StandardMaterial => m instanceof StandardMaterial,
    );
    const originals = new Map(sources.map((s) => [s, s.material] as const));
    // Left unfrozen for the experiment, so a lighting change can recompile the shader.
    for (const m of materials) {
        m.unfreeze();
    }

    return {
        graph,
        ctx: { scene, hemi, materials, sources, extras: [] },
        originals,
        current: "matte",
        rotation: { x: 0, y: 0 },
    };
}

const SPEC0 = new WeakMap<StandardMaterial, { power: number; fresnel: Nullable<FresnelParameters> }>();

/** Put the element's matte lighting back, then apply a setup. */
function applySetup(l: Lighting, name: string): void {
    const { ctx } = l;
    for (const e of ctx.extras.splice(0)) {
        e.dispose();
    }
    for (const [s, m] of l.originals) {
        s.material = m;
    }
    ctx.hemi.intensity = 0.8;
    ctx.hemi.specular = Color3.Black();
    ctx.hemi.groundColor = new Color3(0.35, 0.35, 0.35);
    for (const m of ctx.materials) {
        const saved = SPEC0.get(m) ?? { power: m.specularPower, fresnel: m.emissiveFresnelParameters };
        SPEC0.set(m, saved);
        m.specularPower = saved.power;
        m.emissiveFresnelParameters = saved.fresnel as FresnelParameters;
    }
    SETUPS[name].apply(ctx);
    // A light's specular is compiled into the shader (it is a define, on only when some light had a
    // non-black specular when the material was prepared), so every lighting change recompiles.
    for (const s of ctx.sources) {
        s.material?.markAsDirty(Material.LightDirtyFlag);
    }
    l.current = name;
    requestFrame(l.graph);
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
    for (let c = 0; c < COLOR_LIST.length; c++) {
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
    ...COLOR_LIST.map((color, i) => ({
        name: `color ${String(i)}`,
        target: "node" as const,
        selector: { match: "expression" as const, where: `data.color == \`${String(i)}\`` },
        set: { "node.color": color },
    })),
];

/** Build one element, wait for it, and hand back its lighting handle. */
function mountGraph(
    host: HTMLElement,
    width: number,
    height: number,
    cols: number,
): { el: Graphty; ready: Promise<Lighting> } {
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
    const ready = (async (): Promise<Lighting> => {
        while (el.graph.getNodes().length < nodeShapes.length * COLOR_LIST.length) {
            await new Promise((r) => setTimeout(r, 100));
        }
        await el.graph.waitForSettled();
        await el.session.styles.settled();
        await el.graph.waitForStableFrame({ timeoutMs: 30000 });

        return lightingOf(el.graph);
    })();

    return { el, ready };
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
 * Measure every node of the measurement grid under one setup, pooled over the fixed angles.
 * A node's pixels are those inside its screen cell that change when the nodes are hidden,
 * eroded by 2 px so the anti-aliased silhouette is left out.
 */
async function measure(l: Lighting, setup: string): Promise<NodeReading[]> {
    applySetup(l, setup);
    const { graph } = l;
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
    setRotation(l, 0, 0);

    const out: NodeReading[] = [];
    for (const [id, e] of acc) {
        const [shape, ci] = id.split("|");
        const style = new Color(COLOR_LIST[Number(ci)]).to("oklch").coords;
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

declare global {
    interface Window {
        __nodeLighting?: {
            setups: string[];
            tune: typeof TUNE;
            ready: Promise<Lighting[]>;
            apply: (name: string) => void;
            rotate: (x: number, y: number) => void;
            spin: (on: boolean) => void;
            measure: (setup: string) => Promise<NodeReading[]>;
        };
    }
}

// ---------------------------------------------------------------- stories

const meta: Meta = {
    title: "Experiments/Node lighting",
};
export default meta;

interface Args {
    setup: string;
    spin: boolean;
}

/**
 * One large element, one setup at a time (pick it in Controls), and the measurement hook. The
 * nodes rotate slowly while Spin is on.
 */
export const OneSetup: StoryObj<Args> = {
    args: { setup: "matte", spin: true },
    argTypes: { setup: { control: "select", options: Object.keys(SETUPS) } },
    render: (args) => {
        const host = document.createElement("div");
        const caption = document.createElement("div");
        caption.style.font = "14px sans-serif";
        caption.style.margin = "4px 0";
        host.appendChild(caption);
        const { ready } = mountGraph(host, 1400, 860, 13);
        let spinning = args.spin;
        const all = ready.then((l) => {
            applySetup(l, args.setup);
            caption.textContent = `${SETUPS[args.setup].label} -- rows: ${COLOR_NAMES.join(", ")}`;
            spin([l], () => spinning);
            return [l];
        });
        window.__nodeLighting = {
            setups: Object.keys(SETUPS),
            tune: TUNE,
            ready: all,
            apply: (name) => {
                void all.then(([l]) => {
                    applySetup(l, name);
                    caption.textContent = `${SETUPS[name].label} -- rows: ${COLOR_NAMES.join(", ")}`;
                });
            },
            rotate: (x, y) => {
                void all.then(([l]) => {
                    setRotation(l, x, y);
                });
            },
            spin: (on) => {
                spinning = on;
            },
            measure: async (setup) => {
                const [l] = await all;
                spinning = false;
                return measure(l, setup);
            },
        };

        return host;
    },
};

/** Every setup at once, two per row: each panel is every shape across, the four colors down. */
export const AllSetups: StoryObj<{ spin: boolean }> = {
    args: { spin: true },
    render: (args) => {
        const host = document.createElement("div");
        host.style.cssText = "font: 13px sans-serif; display: flex; flex-wrap: wrap; gap: 8px;";
        // Mounted one after another: built all at once, the panels lost meshes to each other.
        const all = (async (): Promise<Lighting[]> => {
            const ls: Lighting[] = [];
            for (const [name, s] of Object.entries(SETUPS)) {
                const cell = document.createElement("div");
                const caption = document.createElement("div");
                caption.textContent = s.label;
                caption.style.margin = "4px 0 2px";
                cell.appendChild(caption);
                host.appendChild(cell);
                const l = await mountGraph(cell, 740, 470, 13).ready;
                applySetup(l, name);
                ls.push(l);
            }
            spin(ls, () => args.spin);
            return ls;
        })();
        (window as unknown as { __allSetupsReady: Promise<unknown> }).__allSetupsReady = all;

        return host;
    },
};
