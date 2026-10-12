/**
 * @file EXPERIMENT, not for merging: what each node lighting setup of NodeLighting.stories.ts costs per frame.
 *
 * One real graphty-element with N nodes (3D grid, fixed layout, about N edges) and either the default
 * node shape or every shape mixed. The setups are a copy of the ones in NodeLighting.stories.ts (that
 * file was being edited at the same time; keep the two in step by hand). `window.__nodeLightingPerf`
 * is driven by tmp/node-lighting/perf/drive.mjs: it draws frames in a tight loop (no
 * requestAnimationFrame, so nothing caps at the display rate), syncs on the GPU after each one with a
 * one-pixel read, and times every frame on the GPU with EXT_disjoint_timer_query_webgl2 when the
 * browser has it.
 */
import "../../src/graphty-element";

import {
    Axis,
    Color3,
    DirectionalLight,
    FresnelParameters,
    HemisphericLight,
    InstancedMesh,
    Material,
    type Mesh,
    type Nullable,
    type Observer,
    PBRMaterial,
    type Scene,
    SceneInstrumentation,
    Space,
    StandardMaterial,
    type TransformNode,
    Vector3,
} from "@babylonjs/core";
import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { OKABE_ITO_COLORS } from "../../src/config/palettes/categorical";
import type { Graph } from "../../src/Graph";
import { nodeShapes, renderFn, storySetup } from "../helpers";

type Graphty = HTMLElementTagNameMap["graphty-element"];

// ---------------------------------------------------------------- setups (copied from NodeLighting.stories.ts)

interface SetupCtx {
    scene: Scene;
    hemi: HemisphericLight;
    materials: StandardMaterial[];
    sources: Mesh[];
    extras: { dispose(): void }[];
}

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

function editMaterials(ctx: SetupCtx, edit: (m: StandardMaterial) => void): void {
    for (const m of ctx.materials) {
        edit(m);
    }
}

function swapMaterial(ctx: SetupCtx, make: () => Material): void {
    const mat = make();
    for (const s of ctx.sources) {
        s.material = mat;
    }
    ctx.extras.push(mat);
}

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

const SETUPS: Record<string, (ctx: SetupCtx) => void> = {
    master: ({ hemi }) => {
        hemi.intensity = 1;
        hemi.specular = Color3.White();
    },
    matte: () => undefined,
    capped: (ctx) => {
        ctx.hemi.intensity = TUNE.cappedIntensity;
        ctx.hemi.specular = new Color3(TUNE.cappedSpec, TUNE.cappedSpec, TUNE.cappedSpec);
        ctx.hemi.groundColor = new Color3(TUNE.cappedGround, TUNE.cappedGround, TUNE.cappedGround);
        editMaterials(ctx, (m) => {
            m.specularPower = TUNE.cappedPower;
        });
    },
    headlight: (ctx) => {
        ctx.hemi.intensity = TUNE.headFill;
        ctx.hemi.groundColor = new Color3(TUNE.headGround, TUNE.headGround, TUNE.headGround);
        cameraLight(ctx, "headlight", new Vector3(0.25, -0.3, 1), TUNE.headlight);
    },
    threePoint: (ctx) => {
        ctx.hemi.intensity = TUNE.fillIntensity;
        cameraLight(ctx, "key", new Vector3(0.6, -0.6, 1), TUNE.keyIntensity);
        rim(ctx);
    },
    headRim: (ctx) => {
        SETUPS.headlight(ctx);
        rim(ctx);
    },
    pbr: (ctx) => {
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
    flat: (ctx) => {
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
    viewerHemi: (ctx) => {
        ctx.hemi.groundColor = new Color3(TUNE.viewerGround, TUNE.viewerGround, TUNE.viewerGround);
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
    strongFill: (ctx) => {
        ctx.hemi.groundColor = new Color3(TUNE.strongFillGround, TUNE.strongFillGround, TUNE.strongFillGround);
    },
};

interface Lighting {
    ctx: SetupCtx;
    originals: Map<Mesh, Nullable<Material>>;
}

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
    for (const m of materials) {
        m.unfreeze();
    }

    return {
        ctx: { scene, hemi, materials, sources, extras: [] },
        originals: new Map(sources.map((s) => [s, s.material])),
    };
}

const SPEC0 = new WeakMap<StandardMaterial, { power: number; fresnel: Nullable<FresnelParameters> }>();

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
    SETUPS[name](ctx);
    for (const s of ctx.sources) {
        s.material?.markAsDirty(Material.LightDirtyFlag);
    }
}

// ---------------------------------------------------------------- graph

const SPACING = 3;
const COLORS = [OKABE_ITO_COLORS[7], "#3B82F6", "#5B1A8E", "#FFF3A0"];

/** A seeded 3D grid of n nodes with a little jitter, each joined to its +x neighbour and one random node. */
function graphData(n: number, mixed: boolean): { nodes: object[]; edges: object[] } {
    let seed = 42;
    const rand = (): number => {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        return seed / 2 ** 32;
    };
    const side = Math.ceil(Math.cbrt(n));
    const half = ((side - 1) * SPACING) / 2;
    const nodes = [];
    const edges = [];
    for (let i = 0; i < n; i++) {
        const [x, y, z] = [i % side, Math.floor(i / side) % side, Math.floor(i / side / side)];
        nodes.push({
            id: i,
            color: i % COLORS.length,
            ...(mixed ? { shape: nodeShapes[i % nodeShapes.length] } : {}),
            position: {
                x: x * SPACING - half + rand() - 0.5,
                y: y * SPACING - half + rand() - 0.5,
                z: z * SPACING - half + rand() - 0.5,
            },
        });
        if (x + 1 < side && i + 1 < n) {
            edges.push({ src: i, dst: i + 1 });
        }
        if (i % 4 === 0) {
            edges.push({ src: i, dst: Math.floor(rand() * n) });
        }
    }

    return { nodes, edges };
}

type Layers = NonNullable<NonNullable<Parameters<typeof storySetup>[0]>["layers"]>;

function layers(mixed: boolean): Layers {
    return [
        ...(mixed
            ? nodeShapes.map((shape) => ({
                  name: `shape ${shape}`,
                  target: "node" as const,
                  selector: { match: "expression" as const, where: `data.shape == '${shape}'` },
                  set: { "node.shape": shape },
              }))
            : []),
        ...COLORS.map((color, i) => ({
            name: `color ${String(i)}`,
            target: "node" as const,
            selector: { match: "expression" as const, where: `data.color == \`${String(i)}\`` },
            set: { "node.color": color },
        })),
    ];
}

// ---------------------------------------------------------------- measurement

interface FrameStats {
    frames: number;
    wallMs: number[];
    gpuMs: number[];
    drawCalls: number;
    activeMeshes: number;
    heapMB: number | null;
}

/** Wait for the browser to hand control back a few times (lets query results arrive). */
const tick = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function makeProbe(graph: Graph, l: Lighting): object {
    const { scene, engine } = graph;
    const gl = (engine as unknown as { _gl: WebGL2RenderingContext })._gl;
    const timer = gl.getExtension("EXT_disjoint_timer_query_webgl2") as {
        TIME_ELAPSED_EXT: number;
        GPU_DISJOINT_EXT: number;
    } | null;
    const inst = new SceneInstrumentation(scene);
    const px = new Uint8Array(4);
    const cam = scene.activeCamera;
    if (!cam) {
        throw new Error("no camera");
    }
    const pivot = cam.parent as TransformNode;
    const fitZ = cam.position.z;
    let drawn = 0;

    /** Draw one frame and wait until the GPU has finished it; returns the wall time in ms. */
    const draw = (q: WebGLQuery | null): number => {
        pivot.rotate(Axis.Y, 0.004, Space.WORLD);
        pivot.computeWorldMatrix(true);
        const t0 = performance.now();
        if (q && timer) {
            gl.beginQuery(timer.TIME_ELAPSED_EXT, q);
        }
        scene.render();
        if (q && timer) {
            gl.endQuery(timer.TIME_ELAPSED_EXT);
        }
        gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        drawn++;
        return performance.now() - t0;
    };

    return {
        renderer: (() => {
            const dbg = gl.getExtension("WEBGL_debug_renderer_info");
            return dbg ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : String(gl.getParameter(gl.RENDERER));
        })(),
        hasTimer: timer !== null,
        /** The frame this probe draws, as a PNG data URL (for checking the views). */
        png: (): string => {
            scene.render();
            return graph.engine.getRenderingCanvas()?.toDataURL() ?? "";
        },
        camera: (): object => ({ z: cam.position.z, fitZ, parent: cam.parent?.name }),
        sources: l.ctx.sources.length,
        /** "fit": the element's own fit of the whole graph; "in": the camera inside the cloud, nodes fill the screen. */
        view: (v: "fit" | "in"): void => {
            cam.position.z = v === "fit" ? fitZ : -2 * SPACING;
            (cam as unknown as { minZ: number }).minZ = 0.1;
        },
        /** Apply a setup and time it until the first frame with it is finished on the GPU. */
        switchTo: async (name: string): Promise<number> => {
            const t0 = performance.now();
            applySetup(l, name);
            await scene.whenReadyAsync();
            draw(null);
            // The outline pass compiles its own shader, which the scene's readiness does not wait for.
            while (!engine.areAllEffectsReady()) {
                await tick();
                draw(null);
            }
            return performance.now() - t0;
        },
        /** Draw `frames` frames after `warmupMs` of unmeasured ones (the GPU clocks up from idle). */
        measure: async (frames: number, warmupMs: number): Promise<FrameStats> => {
            const until = performance.now() + warmupMs;
            for (let i = 0; i < 2 || performance.now() < until; i++) {
                draw(null);
            }
            const queries: WebGLQuery[] = [];
            const wallMs: number[] = [];
            let dc = 0;
            let am = 0;
            for (let i = 0; i < frames; i++) {
                const q = timer ? gl.createQuery() : null;
                if (q) {
                    queries.push(q);
                }
                wallMs.push(draw(q));
                dc += inst.drawCallsCounter.current;
                am += scene.getActiveMeshes().length;
            }
            const gpuMs: number[] = [];
            if (timer) {
                const disjoint = gl.getParameter(timer.GPU_DISJOINT_EXT) as boolean;
                for (const q of queries) {
                    let tries = 0;
                    while (!(gl.getQueryParameter(q, gl.QUERY_RESULT_AVAILABLE) as boolean) && tries++ < 200) {
                        await tick();
                    }
                    if (!disjoint && tries < 200) {
                        gpuMs.push((gl.getQueryParameter(q, gl.QUERY_RESULT) as number) / 1e6);
                    }
                    gl.deleteQuery(q);
                }
            }
            const mem = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;

            return {
                frames: drawn,
                wallMs,
                gpuMs,
                drawCalls: dc / frames,
                activeMeshes: am / frames,
                heapMB: mem ? mem.usedJSHeapSize / 2 ** 20 : null,
            };
        },
    };
}

declare global {
    interface Window {
        __nodeLightingPerf?: Promise<object>;
    }
}

// ---------------------------------------------------------------- story

const meta: Meta = {
    title: "Experiments/Node lighting perf",
    parameters: { layout: "fullscreen", chromatic: { disableSnapshot: true } },
};
export default meta;

/** N nodes (`n`), default shape or every shape (`shapes: mixed`); the driver reads `window.__nodeLightingPerf`. */
export const Perf: StoryObj<{ n: number | string; shapes: string }> = {
    args: { n: 1000, shapes: "default" },
    argTypes: {
        n: { control: "select", options: [1000, 10000, 50000] },
        shapes: { control: "select", options: ["default", "mixed"] },
    },
    render: (args) => {
        const n = Number(args.n);
        const mixed = args.shapes === "mixed";
        const { nodes, edges } = graphData(n, mixed);
        const el = renderFn(
            {
                setup: storySetup({ viewMode: "3d", layers: layers(mixed) }),
                layout: "fixed",
                layoutConfig: {},
                nodeData: nodes,
                edgeData: edges,
            },
            { argTypes: {} } as never,
        ) as Graphty;
        el.style.display = "block";
        el.style.width = "100vw";
        el.style.height = "100vh";
        window.__nodeLightingPerf = (async (): Promise<object> => {
            while (!(el.graph as Graph | undefined) || el.graph.getNodes().length < n) {
                await new Promise((r) => setTimeout(r, 200));
            }
            await el.graph.waitForSettled();
            await el.session.styles.settled();
            await el.graph.waitForStableFrame({ timeoutMs: 600000 });
            const l = lightingOf(el.graph);
            applySetup(l, "matte");
            return makeProbe(el.graph, l);
        })();

        return el;
    },
};
