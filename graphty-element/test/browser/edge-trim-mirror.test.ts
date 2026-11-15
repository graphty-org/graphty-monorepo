/**
 * @file The edge trim's two copies hold to what is drawn (design/rendering/row-renderer.md, stage 6):
 * on every node shape, across from itself and across from a sphere, with and without borders, gaps
 * and arrow heads, `trimEnds` lands within 1e-4 of `Edge.getInterceptPoints`, and the shader's
 * include, read back through transform feedback, lands within 1e-4 of `trimEnds`.
 *
 * Then stage 7: with a batch drawing either end or both, `getInterceptPoints` lands within 1e-4 of
 * what the meshes say, and neither it nor the arrow cap's placing reads a batched row's mesh.
 */

import "../../src/graphty-element";

import { type AbstractMesh, Vector3 } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import type { LayerSpec } from "../../src/catalog/types";
import { NodeShapes } from "../../src/config/NodeStyle";
import type { Edge } from "../../src/Edge";
import { operationQueueOf } from "../../src/Graph";
import type { Xyz } from "../../src/meshes/edgeRoute";
import {
    EDGE_TRIM_GLSL,
    type EdgeTrimInput,
    TRIM_CLOSED,
    TRIM_NO_HIT,
    type TrimEnd,
    trimEnds,
    type TrimmedEnds,
} from "../../src/meshes/edgeTrim";
import type { Node } from "../../src/Node";

const TOLERANCE = 1e-4;

/** The ways a line runs from its source: across the view, and on a slant through depth. */
const OFFSETS = [
    { x: 7, y: 0, z: 0 },
    { x: 5, y: 3, z: 4 },
] as const;

const POINTS = "-1,-1 1,-1 1,1 -0.5,0.5";

/** Every shape, with what some need beyond a name, and a turned box and a glyph that fills little of its box. */
const SHAPES: Record<string, Record<string, unknown>> = {
    ...Object.fromEntries(NodeShapes.options.map((shape) => [shape, { "node.shape": shape }])),
    polygon: { "node.shape": "polygon", "node.shapePoints": POINTS },
    "round-polygon": { "node.shape": "round-polygon", "node.shapePoints": POINTS },
    turned: { "node.shape": "rectangle", "node.shapeRotation": 30 },
    glyph: {
        "node.shape": "polygon",
        "node.shapePoints": "-1,0+0.1 -1+1,0+0.1 -1+1,0+0.4 -1,0+0.4",
        "node.shapeStretchPoints": false,
        "node.width": 4,
        "node.height": 2,
    },
};

/** How an edge's arrow head is dressed, in turn, on the edges with borders and gaps. */
const HEADS: Record<string, unknown>[] = [
    { "edge.arrowHead": "normal" },
    { "edge.arrowHead": "vee", "edge.arrowHeadSize": 2 },
    { "edge.arrowHead": "tee", "edge.arrowHeadGap": 0.5 },
    { "edge.arrowHead": "sphere-dot" },
    { "edge.arrowHead": "cross-delta", "edge.arrowHeadSize": 0.5 },
    { "edge.arrowHead": "normal", "edge.arrowHeadStack": "tee vee" },
    { "edge.arrowHead": "normal", "edge.arrowHeadPosition": 0.5 },
];

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Nodes and edges on a fresh element, drawn.
 * @param viewMode - The view mode.
 * @param nodes - The nodes.
 * @param edges - The edges.
 * @param layers - The style layers.
 * @returns The element.
 */
async function drawn(
    viewMode: "2d" | "3d",
    nodes: Record<string, unknown>[],
    edges: Record<string, unknown>[],
    layers: LayerSpec[],
): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = "480px";
    element.style.height = "360px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    for (const layer of layers) {
        await element.session.styles.add(layer);
    }

    await element.session.data.addNodes(nodes);
    await element.session.data.addEdges(edges);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * A layer on the nodes or edges of one tag.
 * @param target - Which.
 * @param tag - The tag in their data.
 * @param set - What it paints.
 * @returns The layer.
 */
function layer(target: "node" | "edge", tag: string, set: Record<string, unknown>): LayerSpec {
    return { name: tag, target, selector: { match: "expression", where: `data.tag == '${tag}'` }, set };
}

/**
 * The input of an edge, every end only a ray reaches measured as today's ray measures it.
 * @param edge - The edge.
 * @returns The input.
 */
function measuredInput(edge: Edge): EdgeTrimInput {
    const input = edge.trimInput;
    const [srcMesh, dstMesh] = [edge.srcNode.drawnAnchor, edge.dstNode.drawnAnchor];
    srcMesh.computeWorldMatrix(true);
    dstMesh.computeWorldMatrix(true);
    const srcWorld = srcMesh.getAbsolutePosition();
    const dstWorld = dstMesh.getAbsolutePosition();
    const worldSpan = Vector3.Distance(srcWorld, dstWorld);
    const span = Vector3.Distance(srcMesh.position, dstMesh.position);

    /**
     * How far along the line from the source a ray from one center meets the other's mesh.
     * @param from - Where it starts.
     * @param to - Where it is aimed.
     * @param mesh - What it meets.
     * @returns The fraction of the line, or null for a miss.
     */
    const hit = (from: Vector3, to: Vector3, anchor: typeof srcMesh): number | null => {
        const mesh = anchor === srcMesh ? edge.srcNode.drawnPickMesh : edge.dstNode.drawnPickMesh;
        if (mesh === null) {
            return null;
        }

        edge.ray.origin.copyFrom(from);
        to.subtractToRef(from, edge.ray.direction);
        const point = edge.ray.intersectsMeshes([mesh])[0]?.pickedPoint;
        return point ? Vector3.Distance(srcWorld, point) / worldSpan : null;
    };

    const source = hit(dstWorld, srcWorld, srcMesh);
    const target = hit(srcWorld, dstWorld, dstMesh);
    const filled = (end: TrimEnd, measured: number | null): TrimEnd =>
        end.measured === TRIM_NO_HIT ? { ...end, measured: measured ?? TRIM_NO_HIT } : end;
    return {
        ...input,
        source: filled(input.source, source === null ? null : source * span),
        target: filled(input.target, target === null ? null : (1 - target) * span),
    };
}

/**
 * How far apart two ends are, null matching only null.
 * @param a - One.
 * @param b - The other.
 * @returns The distance; infinite when only one is null.
 */
function apart(a: Xyz | null, b: Xyz | null): number {
    if (a === null || b === null) {
        return a === b ? 0 : Infinity;
    }

    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/**
 * The most two answers differ by.
 * @param a - One.
 * @param b - The other.
 * @returns The distance.
 */
function worst(a: TrimmedEnds, b: TrimmedEnds): number {
    return Math.max(apart(a.src, b.src), apart(a.dst, b.dst), apart(a.lineEnd, b.lineEnd));
}

/**
 * Every edge of an element against its mirror.
 * @param element - The element.
 * @returns The edges past tolerance, each with how far.
 */
function mirrorMisses(element: Graphty): string[] {
    return [...element.graph.getDataManager().edges.values()].flatMap((edge) => {
        const { srcPoint: src, dstPoint: dst, newEndPoint: lineEnd } = edge.getInterceptPoints();
        const miss = worst(trimEnds(measuredInput(edge)), { src, dst, lineEnd });
        return miss <= TOLERANCE ? [] : [`${String(edge.srcNode.id)}->${String(edge.dstNode.id)}: ${String(miss)}`];
    });
}

const VERTEX_INPUTS = `#version 300 es
in vec3 src;
in vec3 dst;
in vec4 capBack;
in vec4 sourceA;
in vec4 sourceB;
in vec4 sourceC;
in vec4 targetA;
in vec4 targetB;
in vec4 targetC;
out vec3 outSrc;
out vec3 outDst;
out vec3 outLineEnd;
out vec2 outHas;
`;

const VERTEX_MAIN = `
EdgeTrimEnd endOf(vec4 a, vec4 b, vec4 c) {
    return EdgeTrimEnd(a.x, b.xyz, a.y, a.z, a.w, b.w, c.x, c.y);
}

void main() {
    EdgeTrimmed ends = edgeTrimEnds(
        src, dst, endOf(sourceA, sourceB, sourceC), endOf(targetA, targetB, targetC), capBack.x);
    outSrc = ends.src;
    outDst = ends.dst;
    outLineEnd = ends.lineEnd;
    outHas = vec2(ends.hasSrc ? 1.0 : 0.0, ends.hasDst ? 1.0 : 0.0);
    gl_Position = vec4(0.0);
}
`;

const FRAGMENT = `#version 300 es
precision highp float;
out vec4 color;
void main() { color = vec4(0.0); }
`;

const ATTRIBUTES = ["src", "dst", "capBack", "sourceA", "sourceB", "sourceC", "targetA", "targetB", "targetC"] as const;

/**
 * One end as the attributes the test's vertex stage reads.
 * @param end - The end.
 * @returns Three vec4s.
 */
function packEnd(end: TrimEnd): number[] {
    const { x, y, z } = end.half;
    return [
        ...[end.radius ?? -1, end.flat === true ? 1 : 0, end.border, end.gap],
        ...[x, y, z, end.measured],
        ...[end.leaves ? 1 : 0, end.group ? 1 : 0, 0, 0],
    ];
}

/**
 * Compile and link the include into a program whose outputs transform feedback captures.
 * @param gl - The context.
 * @returns The program.
 */
function trimProgram(gl: WebGL2RenderingContext): WebGLProgram {
    const stage = (type: number, text: string): WebGLShader => {
        const shader = gl.createShader(type);
        assert.isNotNull(shader);
        gl.shaderSource(shader, text);
        gl.compileShader(shader);
        assert.isTrue(gl.getShaderParameter(shader, gl.COMPILE_STATUS), gl.getShaderInfoLog(shader) ?? "");
        return shader;
    };
    const program = gl.createProgram();
    gl.attachShader(program, stage(gl.VERTEX_SHADER, VERTEX_INPUTS + EDGE_TRIM_GLSL + VERTEX_MAIN));
    gl.attachShader(program, stage(gl.FRAGMENT_SHADER, FRAGMENT));
    gl.transformFeedbackVaryings(program, ["outSrc", "outDst", "outLineEnd", "outHas"], gl.INTERLEAVED_ATTRIBS);
    gl.linkProgram(program);
    assert.isTrue(gl.getProgramParameter(program, gl.LINK_STATUS), gl.getProgramInfoLog(program) ?? "");
    return program;
}

/**
 * Run the include on the GPU and read its answers back.
 * @param inputs - The edges.
 * @returns Its answer for each.
 */
function shaderEnds(inputs: EdgeTrimInput[]): TrimmedEnds[] {
    const gl = document.createElement("canvas").getContext("webgl2");
    assert.isNotNull(gl, "the test browser has WebGL2");
    const program = trimProgram(gl);
    gl.useProgram(program);

    // the shader takes the gap and the head as one distance
    const floats = inputs.flatMap(({ src, dst, source, target, capBack, capGap = 0 }) => [
        ...[src.x, src.y, src.z, 0],
        ...[dst.x, dst.y, dst.z, 0],
        ...[capGap + capBack, 0, 0, 0],
        ...packEnd(source),
        ...packEnd(target),
    ]);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(floats), gl.STATIC_DRAW);
    const stride = ATTRIBUTES.length * 16;
    ATTRIBUTES.forEach((name, i) => {
        const location = gl.getAttribLocation(program, name);
        assert.isAtLeast(location, 0, `${name} is read`);
        gl.enableVertexAttribArray(location);
        gl.vertexAttribPointer(location, name === "src" || name === "dst" ? 3 : 4, gl.FLOAT, false, stride, i * 16);
    });

    const OUT_FLOATS = 11;
    const captured = gl.createBuffer();
    gl.bindBuffer(gl.TRANSFORM_FEEDBACK_BUFFER, captured);
    gl.bufferData(gl.TRANSFORM_FEEDBACK_BUFFER, inputs.length * OUT_FLOATS * 4, gl.STATIC_READ);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, captured);
    gl.enable(gl.RASTERIZER_DISCARD);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, inputs.length);
    gl.endTransformFeedback();
    gl.disable(gl.RASTERIZER_DISCARD);
    const out = new Float32Array(inputs.length * OUT_FLOATS);
    gl.getBufferSubData(gl.TRANSFORM_FEEDBACK_BUFFER, 0, out);

    return inputs.map((_, i) => {
        const at = (slot: number): Xyz => {
            const base = i * OUT_FLOATS + slot * 3;
            return { x: out[base] ?? NaN, y: out[base + 1] ?? NaN, z: out[base + 2] ?? NaN };
        };
        const hasSrc = out[i * OUT_FLOATS + 9] === 1;
        const hasDst = out[i * OUT_FLOATS + 10] === 1;
        return {
            src: hasSrc ? at(0) : null,
            dst: hasDst ? at(1) : null,
            lineEnd: hasSrc && hasDst ? at(2) : null,
        };
    });
}

/**
 * The inputs of every edge the shader can answer, a polygon's outline being the CPU's alone.
 * @param element - The element.
 * @returns The inputs.
 */
function shaderInputs(element: Graphty): EdgeTrimInput[] {
    return [...element.graph.getDataManager().edges.values()]
        .map((edge) => measuredInput(edge))
        .filter(({ source, target }) => [source, target].every((end) => !(end.group && Array.isArray(end.flat))))
        .map(({ src, dst, ...rest }) => ({
            ...rest,
            // the shader's floats hold 1e-4 only near the origin, and these rows run out past y = 3000
            src: { x: 0, y: 0, z: 0 },
            dst: { x: dst.x - src.x, y: dst.y - src.y, z: dst.z - src.z },
        }));
}

/**
 * The shader against the mirror.
 * @param inputs - The edges.
 * @returns The inputs past tolerance, each with how far.
 */
function shaderMisses(inputs: EdgeTrimInput[]): string[] {
    const read = shaderEnds(inputs);
    return inputs.flatMap((input, i) => {
        const answer = read[i];
        assert.isDefined(answer);
        const miss = worst(answer, trimEnds(input));
        return miss <= TOLERANCE ? [] : [`${JSON.stringify(input)}: ${String(miss)}`];
    });
}

/**
 * A pair of nodes per shape, line and dress, in rows far enough apart not to touch.
 * @returns The graph and its layers.
 */
function everyShape(): {
    nodes: Record<string, unknown>[];
    edges: Record<string, unknown>[];
    layers: LayerSpec[];
} {
    const nodes: Record<string, unknown>[] = [];
    const edges: Record<string, unknown>[] = [];
    const layers: LayerSpec[] = [];
    HEADS.forEach((head, i) => {
        layers.push(layer("edge", `head-${String(i)}`, { "edge.nodeGap": 0.25, ...head }));
    });

    let pair = 0;
    const join = (srcTag: string, dstTag: string, dressed: boolean, offset: Xyz): void => {
        const at = { x: 0, y: pair * 12, z: 0 };
        const [src, dst] = [`${String(pair)}-from-${srcTag}`, `${String(pair)}-to-${dstTag}`];
        const border = dressed ? "-bordered" : "";
        nodes.push({ id: src, tag: srcTag + border, position: at });
        nodes.push({
            id: dst,
            tag: dstTag + border,
            position: { x: at.x + offset.x, y: at.y + offset.y, z: at.z + offset.z },
        });
        edges.push({ src, dst, tag: dressed ? `head-${String(pair % HEADS.length)}` : "plain" });
        pair++;
    };

    for (const [shape, set] of Object.entries(SHAPES)) {
        layers.push(layer("node", shape, set), layer("node", `${shape}-bordered`, { ...set, "node.borderWidth": 0.2 }));
        for (const offset of OFFSETS) {
            for (const dressed of [false, true]) {
                join(shape, shape, dressed, offset);
                join(shape, "icosphere", dressed, offset);
            }
        }
    }

    return { nodes, edges, layers };
}

describe.each(["3d", "2d"] as const)("the edge trim in %s", (viewMode) => {
    it("mirrors getInterceptPoints, and the shader mirrors it, on every shape", async () => {
        const { nodes, edges, layers } = everyShape();
        const element = await drawn(viewMode, nodes, edges, layers);

        assert.equal(element.graph.getDataManager().edges.size, edges.length, "every pair is an edge");
        assert.deepEqual(mirrorMisses(element), [], "the mirror lands where the mesh path does");
        assert.deepEqual(shaderMisses(shaderInputs(element)), [], "the shader lands where the mirror does");
    });
});

/**
 * Three groups of different shapes and one free node, joined every way.
 * @returns The element.
 */
async function grouped(): Promise<Graphty> {
    const element = await drawn("2d", [], [], []);
    const groups = ["box", "oval", "star"];
    const saved = JSON.stringify({
        elements: {
            nodes: [
                ...groups.flatMap((id, i) => [
                    { data: { id } },
                    { data: { id: `${id}-1`, parent: id }, position: { x: 0, y: i * 300 } },
                    { data: { id: `${id}-2`, parent: id }, position: { x: 100, y: i * 300 + 40 } },
                ]),
                { data: { id: "free" }, position: { x: 400, y: 20 } },
            ],
            edges: [
                ...groups.flatMap((id) => [
                    { data: { id: `${id}-out`, source: id, target: "free" } },
                    { data: { id: `${id}-in`, source: "free", target: id } },
                ]),
                { data: { id: "across", source: "box", target: "oval" } },
            ],
        },
        style: [{ selector: "edge", style: { "target-arrow-shape": "triangle", "curve-style": "straight" } }],
    });
    await element.graph.addDataFromSource("json", { data: saved });
    await operationQueueOf(element.graph).waitForCompletion();
    for (const [id, shape] of [
        ["box", "rectangle"],
        ["oval", "ellipse"],
        ["star", "star"],
    ]) {
        await element.session.styles.add({
            name: id ?? "",
            target: "node",
            selector: { match: "ids", nodes: [id ?? ""] },
            set: { "node.shape": shape },
        });
    }

    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const { nodes } = element.graph.getDataManager();
    for (const id of groups) {
        assert.isTrue(nodes.get(id)?.isDrawnAsGroup, `${id} is drawn as a region`);
    }

    return element;
}

describe("the edge trim at a group", () => {
    it("leaves the region through its outline, whatever its shape", async () => {
        const element = await grouped();

        assert.deepEqual(mirrorMisses(element), [], "the mirror lands where the mesh path does");
        assert.lengthOf(shaderInputs(element), 5, "all but a star's edges reach the shader");
        assert.deepEqual(shaderMisses(shaderInputs(element)), [], "the shader lands where the mirror does");
    });
});

/**
 * Say a batch draws a node, or that it has its own mesh again.
 * @param node - The node.
 * @param batched - Which.
 */
function batch(node: Node, batched: boolean): void {
    node.drawInBatch(batched ? node.drawnSourceMesh : null);
}

/**
 * Run something, counting every use of some nodes' meshes. Each node is handed a counting stand-in
 * for its mesh, so a use is counted however it reaches the node's private field: through `mesh`,
 * `drawnPickMesh` or any other `drawn*` accessor inside Node.
 * @param nodes - The nodes.
 * @param run - What to run; it must not wait.
 * @returns How many uses there were.
 */
function meshReads(nodes: readonly Node[], run: () => void): number {
    let reads = 0;
    const count = {
        get: (target: AbstractMesh, key: PropertyKey): unknown => {
            reads++;
            return Reflect.get(target, key);
        },
        has: (target: AbstractMesh, key: PropertyKey): boolean => {
            reads++;
            return Reflect.has(target, key);
        },
    };
    // A row a batch draws has no mesh left to count.
    const held = nodes.map((node) => node.drawnPickMesh);
    nodes.forEach((node, i) => {
        const mesh = held[i];
        if (mesh !== null) {
            node.mesh = new Proxy(mesh, count);
        }
    });
    try {
        run();
    } finally {
        nodes.forEach((node, i) => {
            const mesh = held[i];
            if (mesh !== null) {
                node.mesh = mesh;
            }
        });
    }

    return reads;
}

/**
 * Every edge's ends with a mesh against its ends with a batch drawing some of its nodes.
 * @param element - The element.
 * @param batched - Which of an edge's nodes the batch draws.
 * @returns The edges past tolerance, or reading a mesh a batch stands in for, each with how far.
 */
function meshFreeMisses(element: Graphty, batched: (edge: Edge) => readonly Node[]): string[] {
    element.graph.openRowTable();
    return [...element.graph.getDataManager().edges.values()].flatMap((edge) => {
        const name = `${String(edge.srcNode.id)}->${String(edge.dstNode.id)}`;
        const { srcPoint: src, dstPoint: dst, newEndPoint: lineEnd } = edge.getInterceptPoints();
        const rows = batched(edge);
        rows.forEach((node) => {
            batch(node, true);
        });
        let free: ReturnType<Edge["getInterceptPoints"]> | null = null;
        const reads = meshReads(rows, () => {
            free = edge.getInterceptPoints();
            edge.transformArrowCap();
        });
        rows.forEach((node) => {
            batch(node, false);
        });
        assert.isNotNull(free);
        const { srcPoint, dstPoint, newEndPoint } = free as unknown as ReturnType<Edge["getInterceptPoints"]>;
        const miss = worst({ src, dst, lineEnd }, { src: srcPoint, dst: dstPoint, lineEnd: newEndPoint });
        return [
            ...(miss <= TOLERANCE ? [] : [`${name}: ${String(miss)}`]),
            ...(reads === 0 ? [] : [`${name}: ${String(reads)} mesh reads`]),
        ];
    });
}

describe.each(["3d", "2d"] as const)("mesh-free ends in %s", (viewMode) => {
    it("land where the mesh's ends land on every shape, and read no batched row's mesh", async () => {
        const { nodes, edges, layers } = everyShape();
        const element = await drawn(viewMode, nodes, edges, layers);

        assert.deepEqual(
            meshFreeMisses(element, (e) => [e.srcNode, e.dstNode]),
            [],
            "both ends batched",
        );
        assert.deepEqual(
            meshFreeMisses(element, (e) => [e.srcNode]),
            [],
            "only the source batched",
        );
        assert.deepEqual(
            meshFreeMisses(element, (e) => [e.dstNode]),
            [],
            "only the target batched",
        );
    });

    it("land where the mesh's ends land under a turned, scaled graph root", async () => {
        const { nodes, edges, layers } = everyShape();
        const element = await drawn(viewMode, nodes, edges, layers);
        const root = element.graph.getScene().getTransformNodeByName("graph-root");
        assert.isNotNull(root);
        root.position.set(3, -2, 1);
        root.scaling.setAll(1.5);
        root.rotation.y = 0.4;
        root.computeWorldMatrix(true);

        assert.deepEqual(
            meshFreeMisses(element, (e) => [e.srcNode, e.dstNode]),
            [],
            "both ends batched",
        );
    });
});

describe("mesh-free ends of a row in motion", () => {
    it("follow a moved node, and a node a transition has shrunk", async () => {
        const element = await drawn(
            "3d",
            [
                { id: "a", tag: "solid", position: { x: 0, y: 0, z: 0 } },
                { id: "b", tag: "solid", position: { x: 6, y: 2, z: 1 } },
            ],
            [{ src: "a", dst: "b", tag: "head" }],
            [
                layer("edge", "head", { "edge.arrowHead": "normal" }),
                layer("node", "solid", { "node.shape": "octahedron" }),
            ],
        );
        const { nodes } = element.graph.getDataManager();
        const [a, b] = [nodes.get("a"), nodes.get("b")];
        assert.isDefined(a);
        assert.isDefined(b);
        element.graph.openRowTable();
        a.setMeshPosition(1, 1, 0);
        const scale = b.drawnScale;
        b.drawShrunk(scale / 2, scale);

        assert.deepEqual(
            meshFreeMisses(element, (e) => [e.srcNode, e.dstNode]),
            [],
            "moved and shrunk",
        );

        b.drawShrunk(scale, scale);
        assert.deepEqual(
            meshFreeMisses(element, (e) => [e.srcNode, e.dstNode]),
            [],
            "whole again",
        );
    });
});

describe("mesh-free ends at a group", () => {
    it("land where the mesh's ends land across from a group, which keeps its mesh", async () => {
        const element = await grouped();

        const free = (edge: Edge): Node[] => [edge.srcNode, edge.dstNode].filter((node) => !node.isDrawnAsGroup);
        assert.deepEqual(meshFreeMisses(element, free), [], "the free node batched");
    });
});

/**
 * An end with nothing set.
 * @param end - What differs.
 * @returns The end.
 */
function plainEnd(end: Partial<TrimEnd>): TrimEnd {
    return {
        radius: null,
        half: { x: 1, y: 0.5, z: 0.25 },
        flat: false,
        border: 0,
        gap: 0,
        measured: TRIM_CLOSED,
        leaves: false,
        group: false,
        ...end,
    };
}

describe("the edge trim's edge cases", () => {
    const origin = { x: 1, y: 2, z: 3 };
    const far = { x: 7, y: -2, z: 5 };
    const edge = (source: Partial<TrimEnd>, target: Partial<TrimEnd>, dst: Xyz = far): EdgeTrimInput => ({
        src: origin,
        dst,
        source: plainEnd(source),
        target: plainEnd(target),
        capBack: 0.5,
    });

    it("answers the same on the GPU where a line has no end, or nothing to trim", () => {
        const cases = [
            edge({}, {}),
            edge({ radius: 1 }, { radius: 1 }),
            // closer than their surfaces, and on one point
            edge({ radius: 9 }, { radius: 9 }),
            edge({}, {}, origin),
            // a group across a line with no length across the view
            edge({ group: true }, {}, { x: 1, y: 2, z: 9 }),
            edge({ group: true }, { group: true }),
            // a group across two round nodes too close for a line
            edge({ radius: 9, group: true }, { radius: 9 }),
            // no hit at either end
            edge({ measured: TRIM_NO_HIT }, {}),
            edge({}, { measured: TRIM_NO_HIT }),
            // borders that would cross
            edge({ border: 5 }, { gap: 5 }),
            edge({ border: 0.1, gap: 0.2 }, { border: 0.3 }),
            // measured, a box met by the line, an ellipse, and an ellipse met along z alone
            edge({ measured: 0.75 }, { measured: 1.25 }),
            edge({ leaves: true, border: 0.5 }, { leaves: true }),
            edge({ flat: true }, { flat: true }),
            edge({ flat: true }, {}, { x: 1, y: 2, z: 9 }),
        ];

        assert.deepEqual(shaderMisses(cases), []);
    });

    it("gives two round nodes closer than their surfaces no line", () => {
        const ends = trimEnds(edge({ radius: 9 }, { radius: 9 }));
        assert.deepEqual(ends, { src: null, dst: null, lineEnd: null });
    });
});
