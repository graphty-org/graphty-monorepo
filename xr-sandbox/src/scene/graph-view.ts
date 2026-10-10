// The graph view (design section 3): nodes and edges as thin instances under one root, colors and
// sizes derived from the graph state, and node picking done here instead of by Babylon, because a
// per-mesh pick scales with the node count. Graph meshes are always opaque: dimming blends a color
// toward the background and shrinks the node.

import {
    Color3,
    type Color4,
    DynamicTexture,
    Matrix,
    type Mesh,
    MeshBuilder,
    Quaternion,
    type Scene,
    StandardMaterial,
    TransformNode,
    Vector3,
} from "@babylonjs/core";

import type { Hand } from "../core/arbiter";
import type { PreviewView } from "../core/commands";
import { type GraphState, isVisible } from "../core/state";
import type { GraphData } from "./graph-data";

/** A node picked along a ray. */
export interface NodePick {
    index: number;
    /** Angle between the ray and the node center, in radians. */
    angle: number;
    /** Distance along the ray, in meters. */
    distance: number;
}

/** The graph view's narrow interface (positions, colors, sizes, visibility, pick). */
export interface GraphView {
    readonly root: TransformNode;
    readonly data: GraphData;
    readonly meshes: Mesh[];
    /** How many times the instance buffers were rebuilt (the dry run counts them). */
    readonly rebuilds: number;
    setHover(hand: Hand, index: number): void;
    setLabelsVisible(on: boolean): void;
    markDirty(): void;
    /** Dim every node not in `keep` (the slab), or stop dimming with null. Not a history step. */
    setDim(keep: ReadonlySet<number> | null): void;
    /** Rebuild the buffers if the state, hover or preview changed. Call once per frame. */
    update(): void;
    pick(origin: Vector3, dir: Vector3, minAngleRad: number): NodePick | null;
    /** Whether a ray passes through the graph's body (context "graph"). */
    inBounds(origin: Vector3, dir: Vector3): boolean;
    nodeWorld(i: number, out: Vector3): Vector3;
    /** Node radius in world meters at the current scale. */
    radiusWorld(): number;
}

const BASE = new Color3(0.55, 0.7, 0.95);
const LOW = new Color3(0.15, 0.25, 0.65);
const HIGH = new Color3(1, 0.82, 0.2);
const WHITE = new Color3(1, 1, 1);
const CATEGORIES = [
    [0.12, 0.47, 0.71],
    [1, 0.5, 0.05],
    [0.17, 0.63, 0.17],
    [0.84, 0.15, 0.16],
    [0.58, 0.4, 0.74],
    [0.55, 0.34, 0.29],
    [0.89, 0.47, 0.76],
    [0.5, 0.5, 0.5],
    [0.74, 0.74, 0.13],
    [0.09, 0.75, 0.81],
].map(([r, g, b]) => new Color3(r, g, b));

/**
 * Build the graph view under a new root.
 * @param scene - the scene
 * @param data - the graph
 * @param state - the graph state the view derives its buffers from
 * @param preview - the open preview, if any
 * @param background - the scene's clear color, the color dimmed nodes blend toward
 * @returns the view
 */
export function createGraphView(
    scene: Scene,
    data: GraphData,
    state: GraphState,
    preview: () => PreviewView | null,
    background: Color4,
): GraphView {
    const n = data.nodeCount;
    const e = data.src.length;
    const radius = data.kind === "florentine" ? 0.012 : 0.006;
    const edgeRadius = data.kind === "florentine" ? 0.0016 : 0.0006;
    const bg = new Color3(background.r, background.g, background.b);

    const root = new TransformNode("graph-root", scene);

    const nodeMat = new StandardMaterial("graph-node", scene);
    nodeMat.diffuseColor = WHITE;
    nodeMat.specularColor = new Color3(0.15, 0.15, 0.15);
    nodeMat.emissiveColor = new Color3(0.12, 0.12, 0.12);
    const nodes = MeshBuilder.CreateIcoSphere("graph-nodes", { radius: 1, subdivisions: 2, flat: false }, scene);
    nodes.material = nodeMat;
    nodes.parent = root;

    const edgeMat = new StandardMaterial("graph-edge", scene);
    edgeMat.diffuseColor = new Color3(0.62, 0.64, 0.7);
    edgeMat.specularColor = Color3.Black();
    const edges = MeshBuilder.CreateCylinder("graph-edges", { height: 1, diameter: 2, tessellation: 6, cap: 0 }, scene);
    edges.material = edgeMat;
    edges.parent = root;

    const nodeMatrices = new Float32Array(16 * n);
    const nodeColors = new Float32Array(4 * n);
    const edgeMatrices = new Float32Array(16 * e);
    const meshes: Mesh[] = [nodes, edges];
    for (const m of meshes) {
        m.isPickable = false;
        m.alwaysSelectAsActiveMesh = true;
    }

    // Labels (Florentine only): one small texture each, drawn once, offset above the node and in a
    // later rendering group so they never z-fight with the spheres.
    const labels: Mesh[] = [];
    if (data.kind === "florentine") {
        for (let i = 0; i < n; i++) {
            const plane = MeshBuilder.CreatePlane(`label-${i}`, { width: 0.09, height: 0.0225 }, scene);
            const tex = new DynamicTexture(`label-tex-${i}`, { width: 256, height: 64 }, scene, true);
            tex.hasAlpha = true;
            tex.drawText(data.names[i], null, 46, "bold 34px sans-serif", "#ffffff", "rgba(20,24,32,0.75)", true, true);
            const mat = new StandardMaterial(`label-mat-${i}`, scene);
            mat.diffuseTexture = tex;
            mat.emissiveColor = WHITE;
            mat.disableLighting = true;
            mat.useAlphaFromDiffuseTexture = true;
            mat.backFaceCulling = false;
            plane.material = mat;
            plane.parent = root;
            plane.billboardMode = TransformNode.BILLBOARDMODE_ALL;
            plane.renderingGroupId = 1;
            plane.isPickable = false;
            plane.position.set(
                data.positions[i * 3],
                data.positions[i * 3 + 1] + radius * 2.2,
                data.positions[i * 3 + 2],
            );
            labels.push(plane);
        }
    }

    const hover: Record<Hand, number> = { left: -1, right: -1 };
    let dirty = true;
    // Edges depend only on visibility (the state), not on hover or dimming, so those skip them.
    let edgesDirty = true;
    let rebuilds = 0;
    let labelsOn = true;
    let dimKeep: ReadonlySet<number> | null = null;
    const tmpM = Matrix.Identity();
    const tmpS = new Vector3();
    const tmpP = new Vector3();
    const tmpQ = new Quaternion();
    const tmpA = new Vector3();
    const tmpB = new Vector3();
    const tmpC = new Color3();
    const up = Vector3.Up();
    const identity = Quaternion.Identity();

    const valueT = (result: string, i: number): number => {
        const v = data.results[result];
        const o = data.order[result];
        const max = v[o[0]];
        const min = v[o[o.length - 1]];
        return max > min ? (v[i] - min) / (max - min) : 0.5;
    };

    const rebuild = (): void => {
        const pv = preview();
        for (let i = 0; i < n; i++) {
            const visible = isVisible(state, i);
            let scale = visible ? radius : 0;
            if (state.colorBy) {
                if (data.categorical[state.colorBy]) {
                    tmpC.copyFrom(CATEGORIES[data.results[state.colorBy][i] % CATEGORIES.length]);
                } else {
                    Color3.LerpToRef(LOW, HIGH, valueT(state.colorBy, i), tmpC);
                }
            } else {
                tmpC.copyFrom(BASE);
            }
            if (state.sizeBy && !data.categorical[state.sizeBy]) {
                scale *= 0.6 + 1.4 * valueT(state.sizeBy, i);
            }
            if (state.selection.has(i)) {
                Color3.LerpToRef(tmpC, WHITE, 0.45, tmpC);
                scale *= 1.35;
            }
            if (hover.left === i || hover.right === i) {
                Color3.LerpToRef(tmpC, WHITE, 0.25, tmpC);
                scale *= 1.2;
            }
            if ((pv && !pv.keep.has(i)) || (dimKeep && !dimKeep.has(i))) {
                Color3.LerpToRef(tmpC, bg, 0.75, tmpC);
                scale *= 0.6;
            }
            tmpS.setAll(scale);
            tmpP.set(data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2]);
            Matrix.ComposeToRef(tmpS, identity, tmpP, tmpM);
            tmpM.copyToArray(nodeMatrices, i * 16);
            nodeColors[i * 4] = tmpC.r;
            nodeColors[i * 4 + 1] = tmpC.g;
            nodeColors[i * 4 + 2] = tmpC.b;
            nodeColors[i * 4 + 3] = 1;
            labels[i]?.setEnabled(labelsOn && visible);
        }
        for (let k = 0; edgesDirty && k < e; k++) {
            const a = data.src[k];
            const b = data.dst[k];
            tmpA.set(data.positions[a * 3], data.positions[a * 3 + 1], data.positions[a * 3 + 2]);
            tmpB.set(data.positions[b * 3], data.positions[b * 3 + 1], data.positions[b * 3 + 2]);
            tmpB.subtractToRef(tmpA, tmpP);
            const len = tmpP.length();
            const shown = len > 1e-6 && isVisible(state, a) && isVisible(state, b);
            tmpS.set(shown ? edgeRadius : 0, shown ? len : 0, shown ? edgeRadius : 0);
            if (len > 1e-6) {
                tmpP.scaleInPlace(1 / len);
                Quaternion.FromUnitVectorsToRef(up, tmpP, tmpQ);
            } else {
                tmpQ.copyFrom(identity);
            }
            tmpA.addInPlace(tmpB).scaleInPlace(0.5);
            Matrix.ComposeToRef(tmpS, tmpQ, tmpA, tmpM);
            tmpM.copyToArray(edgeMatrices, k * 16);
        }
        if (rebuilds === 0) {
            nodes.thinInstanceSetBuffer("matrix", nodeMatrices, 16, false);
            nodes.thinInstanceSetBuffer("color", nodeColors, 4, false);
            edges.thinInstanceSetBuffer("matrix", edgeMatrices, 16, false);
        } else {
            nodes.thinInstanceBufferUpdated("matrix");
            nodes.thinInstanceBufferUpdated("color");
            if (edgesDirty) {
                edges.thinInstanceBufferUpdated("matrix");
            }
        }
        nodes.thinInstanceRefreshBoundingInfo(false);
        if (edgesDirty) {
            edges.thinInstanceRefreshBoundingInfo(false);
        }
        rebuilds++;
        dirty = false;
        edgesDirty = false;
    };

    // World positions of the nodes, refreshed only when the root moved.
    const world = new Float32Array(3 * n);
    let worldStamp = -1;
    const refreshWorld = (): void => {
        const m = root.computeWorldMatrix(true);
        if (m.updateFlag === worldStamp) {
            return;
        }
        worldStamp = m.updateFlag;
        for (let i = 0; i < n; i++) {
            tmpP.set(data.positions[i * 3], data.positions[i * 3 + 1], data.positions[i * 3 + 2]);
            Vector3.TransformCoordinatesToRef(tmpP, m, tmpA);
            world[i * 3] = tmpA.x;
            world[i * 3 + 1] = tmpA.y;
            world[i * 3 + 2] = tmpA.z;
        }
    };
    const scaleOf = (): number => Math.abs(root.scaling.x);

    rebuild();
    scene.executeWhenReady(() => {
        nodeMat.freeze();
        edgeMat.freeze();
    });

    return {
        root,
        data,
        meshes: [...meshes, ...labels],
        get rebuilds() {
            return rebuilds;
        },
        setHover(hand, index) {
            if (hover[hand] !== index) {
                hover[hand] = index;
                dirty = true;
            }
        },
        setLabelsVisible(on) {
            labelsOn = on;
            dirty = true;
        },
        markDirty() {
            dirty = true;
            edgesDirty = true;
        },
        setDim(keep) {
            dimKeep = keep;
            dirty = true;
        },
        update() {
            if (dirty) {
                rebuild();
            }
        },
        pick(origin, dir, minAngleRad) {
            refreshWorld();
            const rWorld = radius * scaleOf();
            let best: NodePick | null = null;
            for (let i = 0; i < n; i++) {
                if (!isVisible(state, i)) {
                    continue;
                }
                const vx = world[i * 3] - origin.x;
                const vy = world[i * 3 + 1] - origin.y;
                const vz = world[i * 3 + 2] - origin.z;
                const t = vx * dir.x + vy * dir.y + vz * dir.z;
                if (t <= 0) {
                    continue;
                }
                const perp = Math.sqrt(Math.max(0, vx * vx + vy * vy + vz * vz - t * t));
                const angle = Math.atan2(perp, t);
                if (angle <= Math.max(minAngleRad, Math.atan2(rWorld, t)) && (!best || angle < best.angle)) {
                    best = { index: i, angle, distance: t };
                }
            }
            return best;
        },
        inBounds(origin, dir) {
            const c = root.getAbsolutePosition();
            c.subtractToRef(origin, tmpB);
            const t = Vector3.Dot(tmpB, dir);
            const r = 0.3 * scaleOf();
            return t > 0 && tmpB.lengthSquared() - t * t < r * r;
        },
        nodeWorld(i, out) {
            refreshWorld();
            return out.set(world[i * 3], world[i * 3 + 1], world[i * 3 + 2]);
        },
        radiusWorld: () => radius * scaleOf(),
    };
}
