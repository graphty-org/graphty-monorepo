/**
 * @file The measured style combination matrix (issue #10370): node style settings that draw together
 * (border, outer border, plates, shadow, halo, outline, label, size space, extents) on every shape,
 * under the viewing conditions that change how they draw (2D and 3D, zoom, camera angle, pixel ratio),
 * judged only by mesh geometry and pixel measurement (test/helpers/style-matrix.ts says what each
 * setting promises and how it is measured).
 *
 * Two modes.
 * - Unset, this is the regression suite: a few cases that must pass, each also run against wrong
 *   expected values to prove that every check it makes can fail.
 * - With VITE_STYLE_SHARD and VITE_STYLE_SHARDS set, it is one shard of the sweep: every case of the
 *   shard is drawn and measured, nothing fails the test, and the results go to
 *   `tmp/style-matrix/shard-<i>.json` (and a PNG for each failing case) under graphty-element.
 *   VITE_STYLE_CASES (comma-separated ids) narrows the shard to those cases; VITE_STYLE_LIMIT takes
 *   only the first N. test/browser/style-combination-matrix.sh runs a shard.
 */

import "../../src/graphty-element";

import { type AbstractMesh, Camera, type InstancedMesh, Matrix, Vector3 } from "@babylonjs/core";
import { afterAll, assert, beforeAll, describe, it } from "vitest";
import { commands } from "vitest/browser";

import type { Graphty } from "../../index.js";
import type { LayerSpec } from "../../src/catalog/types";
import { operationQueueOf } from "../../src/Graph";
import { haloAxisScale } from "../../src/meshes/flatHalo";
import { convexHull } from "../../src/meshes/shapeOutlines";
import {
    allCases,
    AMOUNTS,
    BACKGROUND,
    borderEdgeWorld,
    cameraOf,
    type Check,
    type Classes,
    classify,
    CONCAVE,
    type Expectations,
    fillMeshReach,
    type Frame,
    hex,
    isFlat,
    type MatrixCase,
    measureNode,
    meshRingChecks,
    nodeStyle,
    type P2,
    PER_SIZE,
    pixelsPerUnit,
    type Plane,
    planeOf,
    type Settings,
    shardOf,
    SYMMETRIC,
    toPlane,
    toScreen,
} from "../helpers/style-matrix";

const env = import.meta.env as Record<string, string | undefined>;
const SHARD = env.VITE_STYLE_SHARD;
const SHARDS = Number(env.VITE_STYLE_SHARDS ?? "1");
const OUT = env.VITE_STYLE_OUT ?? "tmp/style-matrix";
const PNG_DIR = env.VITE_STYLE_RESULTS_DIR ?? OUT;

const WIDTH = 480;
const HEIGHT = 360;

/** Node a in the middle; b nearer the camera and to one side; c further and to the other, out of every camera's line to a. */
const NODES = [
    { id: "a", position: { x: 0, y: 0, z: 0 } },
    { id: "b", position: { x: -3.8, y: 1.2, z: -3 } },
    { id: "c", position: { x: 3.8, y: -1.2, z: 2 } },
];
const EDGES = [
    { src: "a", dst: "b" },
    { src: "a", dst: "c" },
];

/**
 * How far past its halo a node's rings, plates and shadow reach, in world units at view scale 1 (the border, the
 * outer border's gap and width, the plate's padding and the shadow's offset are in size units, not multiples of
 * the size). The measuring reach is the node's drawn extent grown by its halo, plus this.
 */
const RING_REACH = 1.5;

/** A node's measuring plane and the world frame it was built from. */
interface Measure {
    plane: Plane;
    mesh: AbstractMesh;
    center: Vector3;
    ex: Vector3;
    ey: Vector3;
    /** A flat slab: a mesh is measured in its plane by dropping each vertex onto it, so both faces are one face. */
    flat: boolean;
}

let element: Graphty;
let layerIds: string[] = [];
let view = "";
let dpr = 0;

/**
 * Put one set of layers on the graph in place of the last.
 * @param set - The node channels.
 */
async function restyle(set: Record<string, unknown>, edges: boolean): Promise<void> {
    const { styles } = element.session;
    for (const id of layerIds) {
        await styles.remove(id);
    }
    const node: LayerSpec = { name: "matrix nodes", target: "node", selector: { match: "everything" }, set };
    const edge: LayerSpec = {
        name: "matrix edges",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": hex("edge"), "edge.visible": edges },
    };
    layerIds = [];
    for (const spec of [node, edge]) {
        const layer = await styles.add(spec);
        layerIds.push(layer.id);
    }
    await styles.settled();
}

/**
 * Draw the frame for the current styles under a condition, and read it back.
 * @param c - The case.
 * @returns The frame.
 */
async function draw(c: MatrixCase): Promise<Frame> {
    await element.setCameraState(cameraOf(c.condition), { animate: false });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    const { engine, scene } = element.graph;
    scene.render();
    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const data = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    return { data: new Uint8Array(data), width, height };
}

/**
 * A node's measuring plane in the current view: its slab for a flat shape, else the camera-facing plane.
 * @param id - The node.
 * @param shape - Its shape.
 * @returns The plane and the node's mesh.
 */
function planeFor(id: string, shape: string): Measure {
    const { engine, scene } = element.graph;
    const node = element.graph.getDataManager().nodes.get(id);
    assert.isDefined(node, `node ${id} exists`);
    const { mesh } = node;
    mesh.computeWorldMatrix(true);
    const camera = scene.activeCamera;
    assert.isNotNull(camera);
    const center = mesh.getAbsolutePosition();
    let ex: Vector3;
    let ey: Vector3;
    if (isFlat(shape)) {
        const world = mesh.getWorldMatrix();
        ex = Vector3.TransformNormal(Vector3.Right(), world).normalize();
        ey = Vector3.TransformNormal(Vector3.Up(), world).normalize();
    } else if (view === "2d") {
        // the 2D camera looks down the graph's z and may be rolled: a shadow's offset is along the graph's x and y
        ex = Vector3.Right();
        ey = Vector3.Up();
    } else {
        // A solid's rings face the node's own line of sight (faceEachNode), which for a node off the view's axis is
        // turned from the camera's forward, and its silhouette is a cone round that line: the plane square to it is
        // the one they are drawn in. The camera's right and up, made square to that line (Gram-Schmidt).
        const sight = center.subtract(camera.globalPosition).normalize();
        const right = camera.getDirection(Vector3.Right());
        ex = right.subtract(sight.scale(Vector3.Dot(right, sight))).normalize();
        const up = camera.getDirection(Vector3.Up());
        ey = up
            .subtract(sight.scale(Vector3.Dot(up, sight)))
            .subtract(ex.scale(Vector3.Dot(up, ex)))
            .normalize();
    }
    const plane = planeOf(
        scene.getTransformMatrix().m,
        [center.x, center.y, center.z],
        [ex.x, ex.y, ex.z],
        [ey.x, ey.y, ey.z],
        engine.getRenderWidth(),
        engine.getRenderHeight(),
    );
    return { plane, mesh, center, ex, ey, flat: isFlat(shape) };
}

/**
 * Whether a node's whole measuring window is on the canvas and in front of the camera.
 * @param plane - Its plane.
 * @param classes - A classified frame.
 * @param reach - How far round the node to look, in plane units.
 * @returns True when it can be measured.
 */
function onCanvas(plane: Plane, classes: Classes, reach: number): boolean {
    for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const [x, y] = toScreen(plane, reach * Math.cos(a), reach * Math.sin(a));
        if (!(x >= 0 && y >= 0 && x < classes.width && y < classes.height)) {
            return false;
        }
    }
    return pixelsPerUnit(plane).min > 0;
}

/**
 * A mesh's world vertices in a node's measuring plane, as a convex hull: through the camera onto a solid's plane,
 * dropped straight onto a flat slab's (so a tilted slab's two faces, and a plate lying on one, are compared in the
 * face's own plane rather than as the hull of both faces on screen).
 * @param mesh - The mesh.
 * @param measure - The node's plane and world frame.
 * @returns The hull, empty when the mesh has no vertices.
 */
function hullOf(mesh: AbstractMesh, measure: Measure, stretch?: Vector3): P2[] {
    const { plane } = measure;
    const { scene, engine } = element.graph;
    mesh.computeWorldMatrix(true);
    const source = (mesh as InstancedMesh).sourceMesh ?? mesh;
    const positions = source.getVerticesData("position") ?? [];
    const world = mesh.getWorldMatrix();
    const transform = scene.getTransformMatrix();
    const viewport = { x: 0, y: 0, width: engine.getRenderWidth(), height: engine.getRenderHeight() };
    const points: P2[] = [];
    for (let i = 0; i < positions.length; i += 3) {
        const local = new Vector3(positions[i], positions[i + 1], positions[i + 2]);
        const p = Vector3.TransformCoordinates(stretch ? local.multiply(stretch) : local, world);
        if (measure.flat) {
            const d = p.subtract(measure.center);
            points.push([Vector3.Dot(d, measure.ex), Vector3.Dot(d, measure.ey)]);
            continue;
        }
        const s = Vector3.Project(p, Matrix.Identity(), transform, viewport as never);
        points.push(toPlane(plane, s.x, s.y));
    }
    return points.length < 3 ? [] : convexHull(points);
}

/** A mesh field on a node, read to measure it. */
type Rings = Record<"border" | "outerBorder" | "underlay" | "overlay" | "halo", AbstractMesh | null>;

/**
 * The checks on a node's ring meshes against its fill mesh.
 * @param settings - The case's settings.
 * @param id - The node.
 * @param measure - Its plane and world frame.
 * @param sizeFactor - Its view scale.
 * @returns The checks.
 */
function meshChecks(settings: Settings, id: string, measure: Measure, sizeFactor: number): Check[] {
    const { plane } = measure;
    const node = element.graph.getDataManager().nodes.get(id) as unknown as Rings;
    const fill = hullOf(measure.mesh, measure);
    if (fill.length === 0) {
        return [];
    }
    const symmetric = SYMMETRIC.has(settings.shape);
    // a mesh edge is exact: allow half a pixel, or a hundredth of a unit and 5% of the border
    // (a solid's silhouette in 2D is its tessellation's, measured 0.02 off its true outline)
    const rounding = !measure.flat && view === "2d" ? 0.02 : 0;
    const tol = Math.max(
        0.01 + rounding + 0.05 * borderEdgeWorld(settings, sizeFactor),
        0.5 / pixelsPerUnit(plane).min,
    );
    const checks: Check[] = [];
    // every ring is measured from the drawn fill mesh, which an inside or centered border insets but on a solid in
    // 3D, whose ring is drawn over its plain fill's edge
    const width =
        settings.border === "none" || settings.border === "screen" ? 0 : AMOUNTS.borderWidth * PER_SIZE * sizeFactor;
    const { inset, border } = fillMeshReach(settings, sizeFactor, !measure.flat && view === "3d");
    // a dashed ring's hull is the hull of its dashes, so it is not read
    if (node.border !== null && width > 0 && settings.border !== "dashed") {
        const ring = hullOf(node.border, measure);
        if (ring.length > 0) {
            if (!CONCAVE.has(settings.shape)) {
                checks.push(...meshRingChecks(fill, ring, border, tol, symmetric, "border"));
            }
        }
    }
    if (node.outerBorder !== null && settings.border !== "screen") {
        const ring = hullOf(node.outerBorder, measure);
        const reach =
            border + ((settings.outer === "gap" ? AMOUNTS.outerGap : 0) + AMOUNTS.outerWidth) * PER_SIZE * sizeFactor;
        if (ring.length > 0 && !CONCAVE.has(settings.shape)) {
            checks.push(...meshRingChecks(fill, ring, reach, tol, symmetric, "outer-border"));
        }
    }
    for (const [field, padding] of [
        ["underlay", AMOUNTS.underlayPadding],
        ["overlay", AMOUNTS.overlayPadding],
    ] as const) {
        const mesh = node[field];
        if (mesh !== null && settings.border !== "screen") {
            const ring = hullOf(mesh, measure);
            if (ring.length > 0 && !CONCAVE.has(settings.shape)) {
                // a plate round a solid seen in perspective sits at its own depth, in front or behind, so it is not
                // the silhouette's exact offset in this plane: only its median is read there
                const exact = measure.flat || view === "2d";
                checks.push(
                    ...meshRingChecks(
                        fill,
                        ring,
                        padding * PER_SIZE * sizeFactor + inset,
                        tol,
                        symmetric,
                        field,
                        exact,
                    ),
                );
            }
        }
    }
    return checks;
}

/**
 * How much the element stretches a node's halo along its measuring plane's axes: haloAxisScale (Node.ts) over the
 * node's own geometry and scaling, with its border's reach, each axis's stretch taken along the plane's u and v.
 * @param measure - The node's plane and world frame.
 * @param haloScale - The halo's scale.
 * @param border - The border's reach, in world units.
 * @returns The stretch along u and v.
 */
function haloGrowOf(measure: Measure, haloScale: number, border: number): [number, number] {
    const { mesh } = measure;
    const own = mesh.scaling;
    const grow = haloAxisScale(
        mesh.getBoundingInfo().boundingBox.extendSize,
        haloScale,
        own.x === 0 ? 0 : border / Math.abs(own.x),
    );
    const toLocal = mesh.getWorldMatrix().clone().invert();
    const along = (axis: Vector3): number => {
        const d = Vector3.TransformNormal(axis, toLocal).normalize();
        return Math.hypot(grow.x * d.x, grow.y * d.y, grow.z * d.z);
    };
    return [along(measure.ex), along(measure.ey)];
}

/**
 * Where a node's halo should be, as a hull in its measuring plane: the halo mesh's own vertices with the scaling
 * haloAxisScale gives (in place of the scaling it has), projected as hullOf projects them. Perspective, and an oblique
 * view of a solid stretched unequally per axis, are then in the expectation exactly.
 * @param id - The node.
 * @param measure - Its plane and world frame.
 * @param haloScale - The halo's scale.
 * @param border - The border's reach, in world units.
 * @returns The hull, empty without a halo mesh.
 */
function haloHullOf(id: string, measure: Measure, haloScale: number, border: number): P2[] {
    const { halo } = element.graph.getDataManager().nodes.get(id) as unknown as Rings;
    if (halo === null) {
        return [];
    }
    const own = measure.mesh.scaling;
    const grow = haloAxisScale(
        halo.getBoundingInfo().boundingBox.extendSize,
        haloScale,
        own.x === 0 ? 0 : border / Math.abs(own.x),
    );
    const has = halo.scaling;
    const ratio = (want: number, got: number): number => (got === 0 ? 1 : want / got);
    const stretch = new Vector3(
        ratio(own.x * grow.x, has.x),
        ratio(own.y * grow.y, has.y),
        ratio(own.z * grow.z, has.z),
    );
    return hullOf(halo, measure, stretch);
}

/** Every mesh a node draws, read to find where it covers the frame. */
type Drawn = Rings & { mesh: AbstractMesh | null; shadow: AbstractMesh[]; decorations: AbstractMesh[] };

/**
 * Every enabled, visible mesh a node draws.
 * @param id - The node.
 * @returns Its meshes.
 */
function meshesOf(id: string): AbstractMesh[] {
    const node = element.graph.getDataManager().nodes.get(id) as unknown as Drawn;
    const all = [
        node.mesh,
        node.border,
        node.outerBorder,
        node.underlay,
        node.overlay,
        node.halo,
        ...node.shadow,
        ...node.decorations,
    ];
    return all.filter((m): m is AbstractMesh => m !== null && m.isEnabled() && m.isVisible && m.visibility > 0);
}

/**
 * The convex hull, in device pixels, of everything a node draws: its meshes' vertices projected by the camera.
 * @param id - The node.
 * @returns The hull.
 */
function screenHullOf(id: string): P2[] {
    const { scene, engine } = element.graph;
    const transform = scene.getTransformMatrix();
    const viewport = { x: 0, y: 0, width: engine.getRenderWidth(), height: engine.getRenderHeight() };
    const points: P2[] = [];
    for (const mesh of meshesOf(id)) {
        mesh.computeWorldMatrix(true);
        const source = (mesh as InstancedMesh).sourceMesh ?? mesh;
        const positions = source.getVerticesData("position") ?? [];
        const world = mesh.getWorldMatrix();
        for (let i = 0; i < positions.length; i += 3) {
            const p = Vector3.TransformCoordinates(
                new Vector3(positions[i], positions[i + 1], positions[i + 2]),
                world,
            );
            const s = Vector3.Project(p, Matrix.Identity(), transform, viewport as never);
            points.push([s.x, s.y]);
        }
    }
    return points.length < 3 ? [] : convexHull(points);
}

/**
 * A flat node's shadow plane: parallel to its slab, at the depth the element draws the shadow behind it.
 * @param id - The node.
 * @param measure - Its plane and world frame.
 * @returns The plane at a point of the node's plane, or undefined without a shadow.
 */
function shadowPlaneOf(id: string, measure: Measure): ((u: number, v: number) => Plane) | undefined {
    const node = element.graph.getDataManager().nodes.get(id) as unknown as Drawn;
    const layer = node.shadow.at(-1);
    if (layer === undefined) {
        return undefined;
    }
    layer.computeWorldMatrix(true);
    const normal = Vector3.Cross(measure.ex, measure.ey).normalize();
    // only the depth is taken from the element (how it orders the shadow behind the slab), never the offset
    const depth = Vector3.Dot(layer.getBoundingInfo().boundingBox.centerWorld.subtract(measure.center), normal);
    const { scene, engine } = element.graph;
    return (u, v) => {
        const at = measure.center.add(measure.ex.scale(u)).add(measure.ey.scale(v)).add(normal.scale(depth));
        return planeOf(
            scene.getTransformMatrix().m,
            [at.x, at.y, at.z],
            [measure.ex.x, measure.ex.y, measure.ex.z],
            [measure.ey.x, measure.ey.y, measure.ey.z],
            engine.getRenderWidth(),
            engine.getRenderHeight(),
        );
    };
}

/**
 * The sharpest corner of a convex hull, in radians.
 * @param hull - The hull.
 * @returns Its smallest interior angle, pi for fewer than three points.
 */
function sharpestCornerOf(hull: readonly P2[]): number {
    let best = Math.PI;
    hull.forEach((p, i) => {
        const a = hull[(i - 1 + hull.length) % hull.length];
        const b = hull[(i + 1) % hull.length];
        const [ax, ay, bx, by] = [a[0] - p[0], a[1] - p[1], b[0] - p[0], b[1] - p[1]];
        const la = Math.hypot(ax, ay);
        const lb = Math.hypot(bx, by);
        if (la > 1e-4 && lb > 1e-4) {
            best = Math.min(best, Math.acos(Math.max(-1, Math.min(1, (ax * bx + ay * by) / (la * lb)))));
        }
    });
    return best;
}

/**
 * Write a frame as a PNG.
 * @param frame - The frame.
 * @param path - Where, relative to graphty-element.
 */
async function writePng(frame: Frame, path: string): Promise<void> {
    const canvas = new OffscreenCanvas(frame.width, frame.height);
    const context = canvas.getContext("2d");
    assert.isNotNull(context);
    const image = context.createImageData(frame.width, frame.height);
    for (let row = 0; row < frame.height; row++) {
        const from = (frame.height - 1 - row) * frame.width * 4;
        image.data.set(frame.data.subarray(from, from + frame.width * 4), row * frame.width * 4);
    }
    context.putImageData(image, 0, 0);
    const blob = await canvas.convertToBlob({ type: "image/png" });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    let binary = "";
    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }
    await commands.writeFile(path, btoa(binary), "base64");
}

/** One measured case. */
interface CaseResult {
    id: string;
    family: string;
    settings: Settings;
    condition: MatrixCase["condition"];
    nodes: Record<string, { measured: boolean; numbers?: Record<string, number>; checks?: Check[] }>;
    checks: Check[];
    pass: boolean;
    png?: string;
    error?: string;
}

/**
 * Draw and measure one case.
 * @param c - The case.
 * @param override - Wrong expected values, to prove a check can fail.
 * @returns The result, with the full frame.
 */
async function runCase(c: MatrixCase, override: Expectations = {}): Promise<{ result: CaseResult; frame: Frame }> {
    if (c.condition.view !== view) {
        ({ view } = c.condition);
        await element.setViewMode(view as "2d" | "3d");
        await operationQueueOf(element.graph).waitForCompletion();
    }
    if (Number(c.condition.dpr) !== dpr) {
        dpr = Number(c.condition.dpr);
        element.pixelRatio = dpr;
        await element.waitForSettled();
    }
    await restyle(nodeStyle(c.settings, "plain"), c.settings.edges === "on");
    const plainFrame = await draw(c);
    const plain = classify(plainFrame, BACKGROUND);
    // A node's view scale under "pivot" or "screen": its fill mesh's world scale over its world scale under "scene".
    // Taken from the mesh, not from projected outlines: perspective magnifies a large near node more than a small one.
    const worldScale = (id: string): number => {
        const { mesh } = planeFor(id, c.settings.shape);
        return mesh.absoluteScaling.x;
    };
    const scale = new Map(NODES.map(({ id }) => [id, 1]));
    if (c.settings.sizeSpace !== "scene") {
        const own = new Map(NODES.map(({ id }) => [id, worldScale(id)]));
        await restyle(nodeStyle(c.settings, "scene-plain"), c.settings.edges === "on");
        await draw(c);
        for (const { id } of NODES) {
            scale.set(id, (own.get(id) ?? Number.NaN) / worldScale(id));
        }
    }
    await restyle(nodeStyle(c.settings, "full"), c.settings.edges === "on");
    const frame = await draw(c);
    const full = classify(frame, BACKGROUND);

    const result: CaseResult = {
        id: c.id,
        family: c.family,
        settings: c.settings,
        condition: c.condition,
        nodes: {},
        checks: [],
        pass: true,
    };
    const sizes: number[] = [];
    // under perspective, how far each measured node is down the view's axis over its world scale
    const depthPerScale: number[] = [];
    const camera = element.graph.scene.activeCamera;
    assert.isNotNull(camera);
    const forward = camera.getDirection(Vector3.Forward()).normalize();
    for (const { id } of NODES.slice(0, 2)) {
        const measure = planeFor(id, c.settings.shape);
        const { plane, mesh } = measure;
        // lengths are in the units of node.size (not multiples of it), so only the view scale changes them
        const sizeFactor = scale.get(id) ?? 1;
        // another node in front of this one, or merged with it, makes its fill reach past its own mesh
        const hull = hullOf(mesh, measure);
        const meshReach = hull.length === 0 ? Infinity : Math.max(...hull.map((p) => Math.hypot(p[0], p[1])));
        // the node's drawn extent grown by its halo, and the rings past it
        // (a mesh with no vertices to read: the reach a size-1 sphere's would give)
        const reach = (Number.isFinite(meshReach) ? meshReach : 0.75) * AMOUNTS.haloScale + RING_REACH * sizeFactor;
        if (!onCanvas(plane, full, reach)) {
            result.nodes[id] = { measured: false };
            continue;
        }
        const { checks, numbers } = measureNode(
            c.settings,
            {
                full,
                plain,
                plane,
                reach,
                dpr,
                sizeFactor,
                view: c.condition.view,
                // "bottom" is the screen's bottom only in an unturned view
                labelReadable: c.condition.angle === "0",
                haloGrow: (haloScale, border) => haloGrowOf(measure, haloScale, border),
                // a hull bridges a concave shape's hollows, so there the model above is used
                haloHull: (haloScale, border) =>
                    CONCAVE.has(c.settings.shape) ? [] : haloHullOf(id, measure, haloScale, border),
                others: NODES.filter((n) => n.id !== id).map((n) => screenHullOf(n.id)),
                ...(measure.flat && view === "3d" ? { shadowPlaneAt: shadowPlaneOf(id, measure) } : {}),
                // the convex hull of a concave shape hides its sharp corners
                sharpestCorner: CONCAVE.has(c.settings.shape) ? Number.NaN : sharpestCornerOf(hull),
            },
            override,
        );
        checks.push(...meshChecks(c.settings, id, measure, sizeFactor));
        if (hull.length > 0) {
            const xs = hull.map((p) => p[0]);
            const ys = hull.map((p) => p[1]);
            numbers.fillMeshMiddleU = (Math.min(...xs) + Math.max(...xs)) / 2;
            numbers.fillMeshMiddleV = (Math.min(...ys) + Math.max(...ys)) / 2;
            numbers.fillMeshHalfU = (Math.max(...xs) - Math.min(...xs)) / 2;
        }
        numbers.reach = reach;
        // (an inside or centered border insets the fill mesh by up to the border's width)
        if (!(numbers.plainRadiusMedian <= meshReach * 1.2 + numbers.borderWorld + 1.5 / numbers.pxPerUnitMin)) {
            result.nodes[id] = { measured: false, numbers: { ...numbers, meshReach } };
            continue;
        }
        // the fill mesh's extent on screen: a ray radius reads a flat slab's foreshortening and the pixel grid
        const screen = hull.map((p) => toScreen(plane, p[0], p[1]));
        const extent = (k: 0 | 1): number =>
            Math.max(...screen.map((p) => p[k])) - Math.min(...screen.map((p) => p[k]));
        if (screen.length > 0) {
            sizes.push(Math.max(extent(0), extent(1)));
        }
        depthPerScale.push(
            Vector3.Dot(measure.center.subtract(camera.globalPosition), forward) / mesh.absoluteScaling.x,
        );
        result.nodes[id] = { measured: true, numbers, checks };
    }
    if (c.settings.sizeSpace === "screen" && sizes.length === 2 && camera.mode === Camera.PERSPECTIVE_CAMERA) {
        // Under perspective a node of world size s at view depth z is s f / z pixels on the axis, so a constant share
        // of the view's height is a constant z / s. Its extent on screen also depends on where it sits: a solid off the
        // axis projects larger (a sphere by about 1 / cos of its angle off it) and a box shows a side, which no size
        // can undo, so the ratio itself is the promise. Off by less than half a pixel across the node draws the same.
        const [a, b] = depthPerScale;
        const measured = (Math.abs(a - b) / Math.max(a, b)) * Math.max(...sizes);
        result.checks.push({
            name: "screen-size-same-at-any-depth",
            promise: "under sizeSpace screen a node's size is a share of the view's height, whatever its depth",
            measured,
            expected: 0,
            tolerance: 0.5,
            pass: measured <= 0.5,
        });
    } else if (c.settings.sizeSpace === "screen" && sizes.length === 2) {
        const [a, b] = sizes;
        result.checks.push({
            name: "screen-size-same-at-any-depth",
            promise: "under sizeSpace screen a node's size is a share of the view's height, whatever its depth",
            measured: Math.abs(a - b),
            expected: 0,
            tolerance: 1 + 0.03 * Math.max(a, b),
            pass: Math.abs(a - b) <= 1 + 0.03 * Math.max(a, b),
        });
    }
    const all = [...result.checks, ...Object.values(result.nodes).flatMap((n) => n.checks ?? [])];
    result.pass = all.every((k) => k.pass);
    return { result, frame };
}

/**
 * Mount the element with the matrix's nodes and edges.
 */
async function mount(): Promise<void> {
    element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    // the classifier's background is this clear color, never a frame corner a node may cover
    element.background = {
        backgroundType: "color",
        color: `#${BACKGROUND.map((v) => v.toString(16).padStart(2, "0")).join("")}`,
    };
    document.body.appendChild(element);
    await element.updateComplete;
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
}

if (SHARD === undefined) {
    describe("style combination matrix: the checks can be trusted", () => {
        beforeAll(mount);
        afterAll(() => {
            element.remove();
        });

        const base: MatrixCase = {
            id: "self",
            family: "pairwise",
            settings: {
                shape: "sphere",
                border: "outside",
                outer: "none",
                plate: "none",
                shadow: "none",
                effect: "none",
                sizeSpace: "scene",
                extents: "uniform",
                label: "none",
                edges: "off",
            },
            condition: { view: "2d", zoom: "mid", angle: "0", dpr: "1" },
        };
        const names = (r: CaseResult, node = "a"): Map<string, boolean> =>
            new Map((r.nodes[node]?.checks ?? []).map((k) => [k.name, k.pass]));

        /** Each known-good case, and the wrong expectations that must fail each of its checks. */
        const proofs: { label: string; c: MatrixCase; wrong: [Expectations, string[]][] }[] = [
            {
                label: "a sphere with an outside border, in 2D",
                c: base,
                wrong: [
                    [{ borderWidth: 0.45 * 1.6 }, ["border-width-thinnest"]],
                    [{ borderWidth: 0.45 * 0.2 }, ["border-width-thinnest", "border-width-thickest"]],
                    [{ borderOffset: 0.9 }, ["border-position"]],
                    [{ centerShift: [0.1, 0] }, ["border-concentric"]],
                ],
            },
            {
                // a slab seen 76 degrees off its normal: the concentric check reads the shift in true device pixels
                label: "a rectangle with an outside border, seen obliquely in 3D",
                c: {
                    ...base,
                    settings: { ...base.settings, shape: "rectangle" },
                    condition: { view: "3d", zoom: "near", angle: "4", dpr: "1" },
                },
                wrong: [[{ centerShift: [0.1, 0] }, ["border-concentric"]]],
            },
            {
                label: "a rectangle with an outer border, in 2D",
                c: { ...base, settings: { ...base.settings, shape: "rectangle", outer: "gap" } },
                wrong: [[{ outerStart: 0.2 }, ["outer-start"]]],
            },
            {
                // with a border as wide as the offset, the border would hide the shadow on every ray
                label: "a rectangle with a shadow and no border, in 2D",
                c: { ...base, settings: { ...base.settings, shape: "rectangle", border: "none", shadow: "offset" } },
                wrong: [[{ shadowOffset: [-0.45, 0.45] }, ["shadow-offset"]]],
            },
            {
                label: "a hexagon with an underlay, in 2D",
                c: { ...base, settings: { ...base.settings, shape: "hexagon", plate: "underlay" } },
                wrong: [[{ platePadding: 0.3 }, ["underlay-padding"]]],
            },
            {
                label: "a sphere with an outside border, seen from the front in 3D",
                c: { ...base, condition: { view: "3d", zoom: "mid", angle: "0", dpr: "1" } },
                wrong: [
                    [{ borderWidth: 0.45 * 1.6 }, ["border-width-thinnest"]],
                    [{ borderOffset: 0.9 }, ["border-position"]],
                    [{ centerShift: [0.1, 0] }, ["border-concentric"]],
                ],
            },
            {
                label: "a hexagon with an overlay, in 2D",
                c: { ...base, settings: { ...base.settings, shape: "hexagon", border: "none", plate: "overlay" } },
                wrong: [[{ platePadding: 0.2 }, ["overlay-padding"]]],
            },
            {
                label: "a rectangle with a screen-pixel border, in 2D",
                c: { ...base, settings: { ...base.settings, shape: "rectangle", border: "screen" } },
                wrong: [[{ borderWidth: 0.3 }, ["border-width-thinnest"]]],
            },
            {
                label: "an ellipse with a halo, in 2D",
                c: { ...base, settings: { ...base.settings, shape: "ellipse", border: "none", effect: "halo" } },
                wrong: [[{ haloScale: 1.25 }, ["halo-scale"]]],
            },
        ];

        for (const proof of proofs) {
            it(`${proof.label}: every check passes`, async () => {
                const { result } = await runCase(proof.c);
                const failed = Object.values(result.nodes)
                    .flatMap((n) => n.checks ?? [])
                    .filter((k) => !k.pass);
                assert.isTrue(result.nodes.a.measured, "node a is measured");
                assert.deepEqual(
                    failed.map(
                        (k) => `${k.name}: ${String(k.measured)} vs ${String(k.expected)} +- ${String(k.tolerance)}`,
                    ),
                    [],
                );
            });
            for (const [wrong, mustFail] of proof.wrong) {
                it(`${proof.label}: fails ${mustFail.join(", ")} when expecting ${JSON.stringify(wrong)}`, async () => {
                    const { result } = await runCase(proof.c, wrong);
                    const passes = names(result);
                    for (const name of mustFail) {
                        assert.strictEqual(passes.get(name), false, `${name} fails`);
                    }
                });
            }
        }
    });
} else {
    const index = Number(SHARD);
    let cases = shardOf(allCases(), index, SHARDS);
    if (env.VITE_STYLE_CASES !== undefined) {
        const wanted = new Set(env.VITE_STYLE_CASES.split(","));
        cases = allCases().filter((c) => wanted.has(c.id));
    }
    if (env.VITE_STYLE_LIMIT !== undefined) {
        cases = cases.slice(0, Number(env.VITE_STYLE_LIMIT));
    }
    const results: CaseResult[] = [];
    const save = async (): Promise<void> => {
        await commands.writeFile(
            `${OUT}/shard-${String(index)}.json`,
            JSON.stringify({ shard: index, shards: SHARDS, cases: results.length, results }, null, 1),
        );
    };

    describe(`style combination matrix, shard ${String(index)} of ${String(SHARDS)} (${String(cases.length)} cases)`, () => {
        beforeAll(mount);
        afterAll(async () => {
            await save();
            element.remove();
        });

        it.each(cases.map((c) => [c.id, c] as const))("%s", async (_, c) => {
            try {
                const { result, frame } = await runCase(c);
                if (!result.pass) {
                    await writePng(frame, `${OUT}/png/${c.id}.png`);
                    result.png = `${PNG_DIR}/png/${c.id}.png`;
                }
                results.push(result);
            } catch (error) {
                results.push({
                    id: c.id,
                    family: c.family,
                    settings: c.settings,
                    condition: c.condition,
                    nodes: {},
                    checks: [],
                    pass: false,
                    error: String(error),
                });
            }
            if (results.length % 25 === 0) {
                await save();
            }
        });
    });
}
