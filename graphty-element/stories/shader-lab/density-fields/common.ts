/**
 * Helpers for the render-target stories: off-screen float targets that nodes or edges are
 * splatted into, full-screen passes that run simulations between two targets (ping-pong), and a
 * background quad that draws a target under the graph.
 *
 * Two kinds of target:
 * - screen targets follow the camera (a splat is drawn with the camera, so the texture lines up
 *   with the screen); the background reads them at the pixel's screen position.
 * - world targets cover a fixed square of the graph's xy plane (a splat is drawn with an
 *   orthographic mapping of that square); the background is a quad lying on that square.
 */
import {
    Color4,
    Constants,
    type Effect,
    EffectRenderer,
    EffectWrapper,
    RawTexture,
    RenderTargetTexture,
    Texture,
} from "@babylonjs/core";

import { GLSL_LIBRARY, type InstanceOptions, type LabContext, type LabGraph, type LabLayer, PALETTE } from "../harness";

/** Meshes on this layer are skipped by the main camera; render targets still draw them. */
export const HIDDEN_LAYER = 0x10000000;

export type TexType = "half" | "float" | "byte";

const TEX_TYPES: Record<TexType, number> = {
    half: Constants.TEXTURETYPE_HALF_FLOAT,
    float: Constants.TEXTURETYPE_FLOAT,
    byte: Constants.TEXTURETYPE_UNSIGNED_BYTE,
};

export interface TargetOptions {
    /** A fixed size in texels, or a fraction of the canvas (follows resizes). */
    size: number | { width: number; height: number };
    type?: TexType;
    /** Nearest sampling (needed for float data and exact lookups). Default linear. */
    nearest?: boolean;
}

/**
 * An off-screen color target cleared to transparent black every time it renders.
 * @param ctx - the lab context
 * @param name - a name for debugging
 * @param o - size, texel type and filtering
 * @returns the target
 */
export function makeTarget(ctx: LabContext, name: string, o: TargetOptions): RenderTargetTexture {
    const { engine, scene } = ctx;
    const sizeNow = (): { width: number; height: number } =>
        typeof o.size === "number"
            ? {
                  width: Math.max(4, Math.round(engine.getRenderWidth() * o.size)),
                  height: Math.max(4, Math.round(engine.getRenderHeight() * o.size)),
              }
            : o.size;
    const rtt = new RenderTargetTexture(name, sizeNow(), scene, {
        generateMipMaps: false,
        type: TEX_TYPES[o.type ?? "half"],
        samplingMode: o.nearest ? Texture.NEAREST_SAMPLINGMODE : Texture.BILINEAR_SAMPLINGMODE,
        generateDepthBuffer: false,
    });
    rtt.wrapU = Texture.CLAMP_ADDRESSMODE;
    rtt.wrapV = Texture.CLAMP_ADDRESSMODE;
    rtt.clearColor = new Color4(0, 0, 0, 0);
    rtt.renderList = [];
    if (typeof o.size === "number") {
        const obs = engine.onResizeObservable.add(() => {
            rtt.resize(sizeNow());
        });
        rtt.onDisposeObservable.add(() => {
            engine.onResizeObservable.remove(obs);
        });
    }
    return rtt;
}

/**
 * Render a target every frame, before the main pass (after the frame's uniforms are set).
 * @param ctx - the lab context
 * @param target - the target
 */
export function autoRender(ctx: LabContext, target: RenderTargetTexture): void {
    ctx.scene.customRenderTargets.push(target);
}

/**
 * A thin-instanced mesh drawn only into the given targets (the main camera never sees it).
 * @param ctx - the lab context
 * @param targets - the targets to draw into
 * @param o - instance options, as for ctx.addInstances
 * @returns the layer
 */
export function splat(ctx: LabContext, targets: RenderTargetTexture[], o: InstanceOptions): LabLayer {
    const layer = ctx.addInstances(o);
    if (o.blend === "add") {
        sumBlend(layer);
    }
    layer.mesh.layerMask = HIDDEN_LAYER;
    for (const t of targets) {
        t.renderList?.push(layer.mesh);
    }
    return layer;
}

/**
 * Make an additive layer add alpha too (rgb and alpha both summed: ONE, ONE), so a target can
 * count overlaps in its alpha channel.
 * @param layer - the layer
 */
export function sumBlend(layer: LabLayer): void {
    layer.material.alphaMode = Constants.ALPHA_ONEONE_ONEONE;
}

/**
 * Move an existing lab layer (the node or edge layer) into targets only.
 * @param layer - the layer
 * @param targets - the targets
 */
export function hideInto(layer: LabLayer, targets: RenderTargetTexture[]): void {
    layer.mesh.layerMask = HIDDEN_LAYER;
    for (const t of targets) {
        t.renderList?.push(layer.mesh);
    }
}

const NODE_SPLAT_VARYINGS = `
varying vec2 vUV;
varying vec4 vColor;
varying vec4 vData;
varying vec4 vInfo;
`;

export interface NodeSplatOptions {
    name: string;
    /** GLSL float expression: the splat radius in world units (attributes and uniforms in scope). */
    radius: string;
    /** Fragment shader (full main); varyings vUV (-1..1 over the quad), vColor, vData, vInfo. */
    fragment: string;
    blend?: "opaque" | "alpha" | "add";
    /** "camera" (default) draws with the camera; "world" maps the bounds square onto the target. */
    space?: "camera" | "world";
    /** Node positions to use (shared, so updating it moves the splat); default a copy of the graph's. */
    positions?: Float32Array;
}

/**
 * Splat one quad per node into targets.
 * @param ctx - the lab context
 * @param targets - where to draw
 * @param o - radius, fragment and space
 * @returns the layer (buffers: nodePos, nodeColor, nodeData, nodeInfo)
 */
export function nodeSplat(ctx: LabContext, targets: RenderTargetTexture[], o: NodeSplatOptions): LabLayer {
    const g = ctx.graph;
    const color = new Float32Array(g.n * 4);
    const data = new Float32Array(g.n * 4);
    const info = new Float32Array(g.n * 4);
    for (let i = 0; i < g.n; i++) {
        const c = PALETTE[g.community[i] % PALETTE.length];
        color.set([c[0], c[1], c[2], 1], i * 4);
        data.set([g.degree[i], g.rank[i], g.value[i], g.community[i]], i * 4);
        info.set([g.random[i], i, 0, 0.75 + 0.75 * Math.sqrt(g.degree[i])], i * 4);
    }
    const place =
        (o.space ?? "camera") === "camera"
            ? `vec4 vc = view * vec4(nodePos, 1.0);
    gl_Position = projection * (vc + vec4(position.xy * r, 0.0, 0.0));`
            : `gl_Position = vec4((nodePos.xy + position.xy * r - boundsCenter) / boundsHalf, 0.0, 1.0);`;
    return splat(ctx, targets, {
        name: o.name,
        count: g.n,
        attributes: {
            nodePos: [3, o.positions ?? Float32Array.from(g.pos)],
            nodeColor: [4, color],
            nodeData: [4, data],
            nodeInfo: [4, info],
        },
        varyings: NODE_SPLAT_VARYINGS,
        vertex: `
void main() {
    float r = ${o.radius};
    ${place}
    vUV = position.xy;
    vColor = nodeColor; vData = nodeData; vInfo = nodeInfo;
}`,
        fragment: o.fragment,
        blend: o.blend ?? "add",
    });
}

/** A square of the xy plane holding the graph: center and half side, in world units. */
export interface Bounds {
    cx: number;
    cy: number;
    half: number;
}

/**
 * The square around the graph's xy positions, grown by a margin.
 * @param g - the graph
 * @param margin - extra half side, as a fraction
 * @returns the bounds
 */
export function graphBounds(g: LabGraph, margin = 0.25): Bounds {
    let x0 = Infinity;
    let x1 = -Infinity;
    let y0 = Infinity;
    let y1 = -Infinity;
    for (let i = 0; i < g.n; i++) {
        x0 = Math.min(x0, g.pos[i * 3]);
        x1 = Math.max(x1, g.pos[i * 3]);
        y0 = Math.min(y0, g.pos[i * 3 + 1]);
        y1 = Math.max(y1, g.pos[i * 3 + 1]);
    }
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, half: (Math.max(x1 - x0, y1 - y0) / 2) * (1 + margin) };
}

/** Uniforms a world-space story declares so its shaders can map world xy to the bounds square. */
export function boundsUniforms(b: Bounds): { boundsCenter: number[]; boundsHalf: number } {
    return { boundsCenter: [b.cx, b.cy], boundsHalf: b.half };
}

/**
 * A full-screen background behind the graph that samples the given textures. The fragment gets
 * vUV (0..1 over the screen) and must write the whole background (opaque).
 * @param ctx - the lab context
 * @param fragment - fragment shader with sampler declarations and main
 * @param textures - sampler name -> texture
 * @returns the layer
 */
export function screenBackground(ctx: LabContext, fragment: string, textures: Record<string, Texture>): LabLayer {
    const layer = ctx.addInstances({
        name: "background",
        count: 1,
        attributes: {},
        varyings: "varying vec2 vUV;",
        vertex: `void main() { vUV = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.99999, 1.0); }`,
        fragment,
    });
    finishBackground(layer, textures);
    return layer;
}

/**
 * A quad on the bounds square (z = 0) behind the graph that samples world targets. vUV is the
 * texture coordinate of the square, vWorld the world xy.
 * @param ctx - the lab context
 * @param fragment - fragment shader with sampler declarations and main
 * @param textures - sampler name -> texture
 * @returns the layer
 */
export function worldBackground(ctx: LabContext, fragment: string, textures: Record<string, Texture>): LabLayer {
    const layer = ctx.addInstances({
        name: "world-background",
        count: 1,
        attributes: {},
        varyings: "varying vec2 vUV;\nvarying vec2 vWorld;",
        vertex: `void main() {
    vUV = position.xy * 0.5 + 0.5;
    vWorld = boundsCenter + position.xy * boundsHalf;
    gl_Position = viewProjection * vec4(vWorld, 0.05, 1.0);
}`,
        fragment,
    });
    finishBackground(layer, textures);
    return layer;
}

function finishBackground(layer: LabLayer, textures: Record<string, Texture>): void {
    layer.material.disableDepthWrite = true;
    layer.mesh.renderingGroupId = 0;
    for (const [name, tex] of Object.entries(textures)) {
        layer.material.setTexture(name, tex);
    }
}

export type PassValue = number | number[] | Texture;

/** A full-screen fragment pass that can be run into any target. */
export interface Pass {
    /** True once the shader compiled; run() does nothing before. */
    ready(): boolean;
    /** Draw into `out` with these uniform and sampler values. */
    run(out: RenderTargetTexture, values: Record<string, PassValue>): void;
}

/**
 * A full-screen pass. The fragment gets `varying vec2 vUV` (0..1), the GLSL library, and must
 * declare its own uniforms and samplers (listed here so they can be set).
 * @param ctx - the lab context
 * @param renderer - an effect renderer (one per story)
 * @param name - a name
 * @param fragment - the fragment shader with declarations and main
 * @param uniforms - uniform names
 * @param samplers - sampler names
 * @returns the pass
 */
export function makePass(
    ctx: LabContext,
    renderer: EffectRenderer,
    name: string,
    fragment: string,
    uniforms: string[],
    samplers: string[],
): Pass {
    const wrapper = new EffectWrapper({
        engine: ctx.engine,
        name,
        fragmentShader: `precision highp float;\nvarying vec2 vUV;\n${ctx.defines}${GLSL_LIBRARY}\n${fragment}`,
        uniformNames: uniforms,
        samplerNames: samplers,
    });
    let pending: Record<string, PassValue> = {};
    wrapper.onApplyObservable.add(() => {
        applyValues(wrapper.effect, pending);
    });
    ctx.scene.onDisposeObservable.add(() => {
        wrapper.dispose();
    });
    return {
        ready: () => wrapper.effect.isReady(),
        run(out, values) {
            pending = values;
            renderer.render(wrapper, out);
        },
    };
}

function applyValues(effect: Effect, values: Record<string, PassValue>): void {
    for (const [n, v] of Object.entries(values)) {
        if (v instanceof Texture) {
            effect.setTexture(n, v);
        } else if (typeof v === "number") {
            effect.setFloat(n, v);
        } else if (v.length === 2) {
            effect.setFloat2(n, v[0], v[1]);
        } else if (v.length === 3) {
            effect.setFloat3(n, v[0], v[1], v[2]);
        } else {
            effect.setFloat4(n, v[0], v[1], v[2], v[3]);
        }
    }
}

/**
 * One effect renderer per story, disposed with the scene.
 * @param ctx - the lab context
 * @returns the renderer
 */
export function effectRenderer(ctx: LabContext): EffectRenderer {
    const r = new EffectRenderer(ctx.engine);
    ctx.scene.onDisposeObservable.add(() => {
        r.dispose();
    });
    return r;
}

/** Two targets of the same shape; read `src`, write `dst`, then swap(). */
export class PingPong {
    src: RenderTargetTexture;
    dst: RenderTargetTexture;
    constructor(ctx: LabContext, name: string, o: TargetOptions) {
        this.src = makeTarget(ctx, `${name}-a`, o);
        this.dst = makeTarget(ctx, `${name}-b`, o);
    }
    swap(): void {
        [this.src, this.dst] = [this.dst, this.src];
    }
}

/**
 * A float RGBA texture holding data written from the CPU (nearest sampling).
 * @param ctx - the lab context
 * @param data - width * height * 4 floats
 * @param width - texels across
 * @param height - texels down
 * @returns the texture
 */
export function floatTexture(ctx: LabContext, data: Float32Array, width: number, height: number): RawTexture {
    return RawTexture.CreateRGBATexture(
        data,
        width,
        height,
        ctx.scene,
        false,
        false,
        Texture.NEAREST_SAMPLINGMODE,
        Constants.TEXTURETYPE_FLOAT,
    );
}

/** GLSL: matplotlib's magma and inferno ramps (polynomial fits), 0..1 -> rgb. */
export const GLSL_RAMPS = `
vec3 magma(float t) {
    t = clamp(t, 0.0, 1.0);
    const vec3 c0 = vec3(-0.002136485053939582, -0.000749655052795221, -0.005386127855323933);
    const vec3 c1 = vec3(0.2516605407371642, 0.6775232436837668, 2.494026599312351);
    const vec3 c2 = vec3(8.353717279216625, -3.577719514958484, 0.3144679030132573);
    const vec3 c3 = vec3(-27.66873308576866, 14.26473078096533, -13.64921318813922);
    const vec3 c4 = vec3(52.17613981234068, -27.94360607168351, 12.94416944238394);
    const vec3 c5 = vec3(-50.76852536473588, 29.04658282127291, 4.23415299384598);
    const vec3 c6 = vec3(18.65570506591883, -11.48977351997711, -5.601961508734096);
    return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}
vec3 inferno(float t) {
    t = clamp(t, 0.0, 1.0);
    const vec3 c0 = vec3(0.0002189403691192265, 0.001651004631001012, -0.01948089843709184);
    const vec3 c1 = vec3(0.1065134194856116, 0.5639564367884091, 3.932712388889277);
    const vec3 c2 = vec3(11.60249308247187, -3.972853965665698, -15.9423941062914);
    const vec3 c3 = vec3(-41.70399613139459, 17.43639888205313, 44.35414519872813);
    const vec3 c4 = vec3(77.162935699427, -33.40235894210092, -81.80730925738993);
    const vec3 c5 = vec3(-71.31942824499214, 32.62606426397723, 73.20951985803202);
    const vec3 c6 = vec3(25.13112622477341, -12.24266895238567, -23.07032500287172);
    return c0 + t * (c1 + t * (c2 + t * (c3 + t * (c4 + t * (c5 + t * c6)))));
}
`;

/** GLSL: the lab's community palette as a function of a community id. */
export const GLSL_COMMUNITY = `
vec3 communityRGB(float c) {
    float k = mod(floor(c + 0.5), ${PALETTE.length}.0);
${PALETTE.map((p, i) => `    if (k < ${i}.5) return vec3(${p.map((v) => v.toFixed(4)).join(", ")});`).join("\n")}
    return vec3(1.0);
}
`;

/** Select-control options shared by the field stories. */
export const RAMPS = ["viridis", "magma", "inferno", "ocean"] as const;
export type Ramp = (typeof RAMPS)[number];

/** GLSL: `vec3 ramp(float t)` for a ramp chosen in TypeScript. */
export function rampGlsl(r: Ramp): string {
    const body: Record<Ramp, string> = {
        viridis: "return viridis(t);",
        magma: "return magma(t);",
        inferno: "return inferno(t);",
        ocean: "return palette(t * 0.8, vec3(0.2, 0.45, 0.6), vec3(0.3, 0.35, 0.35), vec3(1.0), vec3(0.55, 0.45, 0.35)) * smoothstep(0.0, 0.25, t + 0.05);",
    };
    return `${GLSL_RAMPS}\nvec3 ramp(float t) { t = clamp(t, 0.0, 1.0); ${body[r]} }`;
}

/** What a density splat counts per node. */
export const MEASURES = ["count", "rank", "degree", "value"] as const;
export type Measure = (typeof MEASURES)[number];

/**
 * Fragment for a Gaussian density splat: alpha = the node's weight times a Gaussian of the quad
 * (sigma one third of the radius), rgb = the community color times the same. Needs the float
 * uniform `measure` (an index into MEASURES).
 */
export const DENSITY_SPLAT = `
void main() {
    float r2 = dot(vUV, vUV);
    if (r2 > 1.0) discard;
    float w = 1.0;
    if (measure > 0.5 && measure < 1.5) w = 0.15 + 4.0 * vData.y;
    else if (measure > 1.5 && measure < 2.5) w = 0.15 + 4.0 * vData.x;
    else if (measure > 2.5) w = 0.1 + 2.0 * vData.z;
    float k = w * exp(-4.5 * r2) * (1.0 - r2);
    gl_FragColor = vec4(vColor.rgb * k, k);
}
`;

/** Screen-space target scale of the density stories (half the canvas resolution). */
export const DENSITY_SCALE = 0.5;

/**
 * Run full-screen passes every frame after the auto-rendered targets and before the main pass,
 * then put the canvas framebuffer and viewport back.
 * @param ctx - the lab context
 * @param fn - the passes (time and frame delta in seconds)
 * @returns a function that stops them
 */
export function everyFrame(ctx: LabContext, fn: (time: number, dt: number) => void): () => void {
    let last = ctx.time;
    let lastFrame = -1;
    const obs = ctx.scene.onAfterRenderTargetsRenderObservable.add(() => {
        // Babylon fires this twice a frame (after the scene's targets and again per camera); a
        // second run would step every simulation again with dt = 0, which froze the wind-map
        // particles into dots and doubled the trail fade and the fluid steps
        const frame = ctx.scene.getFrameId();
        if (frame === lastFrame) {
            return;
        }
        lastFrame = frame;
        const now = ctx.time;
        const dt = Math.min(0.05, Math.max(0, now - last));
        last = now;
        fn(now, dt);
        ctx.engine.restoreDefaultFramebuffer();
        ctx.engine.setViewport(ctx.camera.viewport);
    });
    return () => ctx.scene.onAfterRenderTargetsRenderObservable.remove(obs);
}
