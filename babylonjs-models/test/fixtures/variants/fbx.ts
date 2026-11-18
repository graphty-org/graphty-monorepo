/**
 * @file Writes the FBX variant fixtures: a 12-triangle cube as FBX 7.4, binary or ASCII, with a
 * plain, textured (external or embedded) or vertex-colored look, and optionally a clip that spins
 * it, bends it by a one-bone skin, or pushes its faces out by a blend shape.
 *
 * An FBX file is a tree of nodes, each with typed values and children; {@link fbxBinary} and
 * {@link fbxAscii} write the same tree both ways.
 */

import { deflateSync } from "node:zlib";

/** A typed FBX value: the type code the binary form writes, and the value. */
type Typed =
    | readonly ["I", number]
    | readonly ["D", number]
    | readonly ["L", bigint]
    | readonly ["S", string]
    | readonly ["R", Uint8Array]
    | readonly ["d" | "i" | "f" | "l", readonly number[]];

/** One node. */
export interface FbxNode {
    readonly name: string;
    readonly values: readonly Typed[];
    readonly children: readonly FbxNode[];
}

const n = (name: string, values: readonly Typed[] = [], children: readonly FbxNode[] = []): FbxNode => ({
    name,
    values,
    children,
});
const I = (v: number): Typed => ["I", v];
const D = (v: number): Typed => ["D", v];
const L = (v: number | bigint): Typed => ["L", BigInt(v)];
const S = (v: string): Typed => ["S", v];

/** A `Properties70` block. */
function props(entries: readonly (readonly Typed[])[]): FbxNode {
    return n(
        "Properties70",
        [],
        entries.map((values) => n("P", values)),
    );
}

/** An object's name as the binary form writes it ("Name\0\x01Class"); the ASCII writer turns it round. */
const objectName = (name: string, kind: string): Typed => S(`${name}\u0000\u0001${kind}`);

/** FBX time units per second. */
const SECOND = 46_186_158_000n;

/** What the cube looks like and does. */
export interface FbxCube {
    /** The diffuse color, 0 to 1. */
    readonly color?: readonly [number, number, number];
    /** A picture: named beside the file, or embedded in it. */
    readonly texture?: { readonly name: string; readonly bytes: Uint8Array; readonly embedded: boolean };
    /** A color per vertex. */
    readonly vertexColors?: readonly [number, number, number];
    /** A clip: "spin" turns the cube, "turn" bends it by its one bone, "grow" pushes its faces out. */
    readonly clip?: "spin" | "turn" | "grow";
}

/**
 * The cube's FBX tree.
 * @param cube - Its look and clip.
 * @param positions - The cube's 24 vertices (x, y, z).
 * @param uvs - Their texture coordinates.
 * @returns The top-level nodes.
 */
export function fbxCube(cube: FbxCube, positions: readonly number[], uvs: readonly number[]): FbxNode[] {
    const [MODEL, GEOMETRY, MATERIAL, TEXTURE, VIDEO] = [100n, 200n, 300n, 400n, 500n];
    const [STACK, LAYER, CURVE_NODE, CURVE] = [600n, 700n, 800n, 900n];
    const [BONE, SKIN, CLUSTER, BONE_ATTRIBUTE] = [1000n, 1100n, 1200n, 1300n];
    const [BLEND, CHANNEL, SHAPE] = [1400n, 1500n, 1600n];
    const polygons: number[] = [];
    for (let f = 0; f < 6; f++) {
        polygons.push(f * 4, f * 4 + 1, f * 4 + 2, -(f * 4 + 3) - 1);
    }

    const layerElements: FbxNode[] = [
        n(
            "LayerElementUV",
            [I(0)],
            [
                n("Version", [I(101)]),
                n("Name", [S("UVMap")]),
                n("MappingInformationType", [S("ByControlPoint")]),
                n("ReferenceInformationType", [S("Direct")]),
                n("UV", [["d", uvs]]),
            ],
        ),
        n(
            "LayerElementMaterial",
            [I(0)],
            [
                n("Version", [I(101)]),
                n("Name", [S("")]),
                n("MappingInformationType", [S("AllSame")]),
                n("ReferenceInformationType", [S("IndexToDirect")]),
                n("Materials", [["i", [0]]]),
            ],
        ),
    ];
    const layer = [n("LayerElement", [], [n("Type", [S("LayerElementUV")]), n("TypedIndex", [I(0)])])];
    layer.push(n("LayerElement", [], [n("Type", [S("LayerElementMaterial")]), n("TypedIndex", [I(0)])]));
    if (cube.vertexColors !== undefined) {
        const colors = Array.from({ length: 24 }, () => [...cube.vertexColors!, 1]).flat();
        layerElements.push(
            n(
                "LayerElementColor",
                [I(0)],
                [
                    n("Version", [I(101)]),
                    n("Name", [S("Col")]),
                    n("MappingInformationType", [S("ByControlPoint")]),
                    n("ReferenceInformationType", [S("Direct")]),
                    n("Colors", [["d", colors]]),
                ],
            ),
        );
        layer.push(n("LayerElement", [], [n("Type", [S("LayerElementColor")]), n("TypedIndex", [I(0)])]));
    }

    const objects: FbxNode[] = [
        n(
            "Geometry",
            [L(GEOMETRY), objectName("Cube", "Geometry"), S("Mesh")],
            [
                n("Vertices", [["d", positions]]),
                n("PolygonVertexIndex", [["i", polygons]]),
                n("GeometryVersion", [I(124)]),
                ...layerElements,
                n("Layer", [I(0)], [n("Version", [I(100)]), ...layer]),
            ],
        ),
        n("Model", [L(MODEL), objectName("Cube", "Model"), S("Mesh")], [n("Version", [I(232)]), props([])]),
        n(
            "Material",
            [L(MATERIAL), objectName("Look", "Material"), S("")],
            [
                n("Version", [I(102)]),
                n("ShadingModel", [S("lambert")]),
                props([[S("DiffuseColor"), S("Color"), S(""), S("A"), ...(cube.color ?? [1, 1, 1]).map(D)]]),
            ],
        ),
    ];
    const connections: FbxNode[] = [
        n("C", [S("OO"), L(MODEL), L(0)]),
        n("C", [S("OO"), L(GEOMETRY), L(MODEL)]),
        n("C", [S("OO"), L(MATERIAL), L(MODEL)]),
    ];

    if (cube.texture !== undefined) {
        const { name, bytes, embedded } = cube.texture;
        objects.push(
            n(
                "Texture",
                [L(TEXTURE), objectName("Picture", "Texture"), S("")],
                [
                    n("Type", [S("TextureVideoClip")]),
                    n("FileName", [S(`C:\\Users\\author\\${name}`)]),
                    n("RelativeFilename", [S(name)]),
                ],
            ),
        );
        connections.push(n("C", [S("OP"), L(TEXTURE), L(MATERIAL), S("DiffuseColor")]));
        if (embedded) {
            objects.push(
                n(
                    "Video",
                    [L(VIDEO), objectName("Picture", "Video"), S("Clip")],
                    [n("Type", [S("Clip")]), n("RelativeFilename", [S(name)]), n("Content", [["R", bytes]])],
                ),
            );
            connections.push(n("C", [S("OO"), L(VIDEO), L(TEXTURE)]));
        }
    }

    if (cube.clip !== undefined) {
        const keys = (values: readonly number[]): FbxNode =>
            n(
                "AnimationCurve",
                [L(CURVE), objectName("", "AnimCurve"), S("")],
                [
                    n("Default", [D(0)]),
                    n("KeyVer", [I(4009)]),
                    n("KeyTime", [["l", [0, Number(SECOND)]]]),
                    n("KeyValueFloat", [["f", values]]),
                    // Linear keys.
                    n("KeyAttrFlags", [["i", [260]]]),
                    n("KeyAttrDataFloat", [["f", [0, 0, 0, 0]]]),
                    n("KeyAttrRefCount", [["i", [2]]]),
                ],
            );
        objects.push(
            n(
                "AnimationStack",
                [L(STACK), objectName(cube.clip, "AnimStack"), S("")],
                [
                    props([
                        [S("LocalStart"), S("KTime"), S("Time"), S(""), L(0)],
                        [S("LocalStop"), S("KTime"), S("Time"), S(""), L(SECOND)],
                    ]),
                ],
            ),
            n("AnimationLayer", [L(LAYER), objectName("BaseLayer", "AnimLayer"), S("")], []),
        );
        connections.push(n("C", [S("OO"), L(LAYER), L(STACK)]));
        if (cube.clip === "grow") {
            // One blend shape channel, whose shape pushes every vertex out along its face normal.
            const deltas = positions.map((v) => v * 0.6);
            objects.push(
                n(
                    "Geometry",
                    [L(SHAPE), objectName("Grown", "Geometry"), S("Shape")],
                    [
                        n("Version", [I(100)]),
                        n("Indexes", [["i", Array.from({ length: 24 }, (_, i) => i)]]),
                        n("Vertices", [["d", deltas]]),
                    ],
                ),
                n("Deformer", [L(BLEND), objectName("Blend", "Deformer"), S("BlendShape")], [n("Version", [I(100)])]),
                n(
                    "Deformer",
                    [L(CHANNEL), objectName("Grown", "SubDeformer"), S("BlendShapeChannel")],
                    [n("Version", [I(100)]), n("DeformPercent", [D(0)]), n("FullWeights", [["d", [100]]])],
                ),
                n(
                    "AnimationCurveNode",
                    [L(CURVE_NODE), objectName("DeformPercent", "AnimCurveNode"), S("")],
                    [props([[S("d|DeformPercent"), S("Number"), S(""), S("A"), D(0)]])],
                ),
                keys([0, 100]),
            );
            connections.push(
                n("C", [S("OO"), L(BLEND), L(GEOMETRY)]),
                n("C", [S("OO"), L(CHANNEL), L(BLEND)]),
                n("C", [S("OO"), L(SHAPE), L(CHANNEL)]),
                n("C", [S("OO"), L(CURVE_NODE), L(LAYER)]),
                n("C", [S("OP"), L(CURVE_NODE), L(CHANNEL), S("DeformPercent")]),
                n("C", [S("OP"), L(CURVE), L(CURVE_NODE), S("d|DeformPercent")]),
            );
        } else {
            // "spin" turns the cube's model; "turn" turns a bone the whole cube is skinned to.
            const target = cube.clip === "turn" ? BONE : MODEL;
            objects.push(
                n(
                    "AnimationCurveNode",
                    [L(CURVE_NODE), objectName("R", "AnimCurveNode"), S("")],
                    [
                        props([
                            [S("d|X"), S("Number"), S(""), S("A"), D(0)],
                            [S("d|Y"), S("Number"), S(""), S("A"), D(0)],
                            [S("d|Z"), S("Number"), S(""), S("A"), D(0)],
                        ]),
                    ],
                ),
                keys([0, 90]),
            );
            connections.push(
                n("C", [S("OO"), L(CURVE_NODE), L(LAYER)]),
                n("C", [S("OP"), L(CURVE_NODE), L(target), S("Lcl Rotation")]),
                n("C", [S("OP"), L(CURVE), L(CURVE_NODE), S("d|Z")]),
            );
            if (cube.clip === "turn") {
                const identity = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
                objects.push(
                    n(
                        "NodeAttribute",
                        [L(BONE_ATTRIBUTE), objectName("Bone", "NodeAttribute"), S("LimbNode")],
                        [n("TypeFlags", [S("Skeleton")])],
                    ),
                    n(
                        "Model",
                        [L(BONE), objectName("Bone", "Model"), S("LimbNode")],
                        [n("Version", [I(232)]), props([])],
                    ),
                    n(
                        "Deformer",
                        [L(SKIN), objectName("Skin", "Deformer"), S("Skin")],
                        [n("Version", [I(101)]), n("Link_DeformAcuracy", [D(50)])],
                    ),
                    n(
                        "Deformer",
                        [L(CLUSTER), objectName("Cluster", "SubDeformer"), S("Cluster")],
                        [
                            n("Version", [I(100)]),
                            n("Indexes", [["i", Array.from({ length: 24 }, (_, i) => i)]]),
                            n("Weights", [["d", Array.from({ length: 24 }, () => 1)]]),
                            n("Transform", [["d", identity]]),
                            n("TransformLink", [["d", identity]]),
                        ],
                    ),
                    n(
                        "Pose",
                        [L(1700n), objectName("BindPose", "Pose"), S("BindPose")],
                        [
                            n("Type", [S("BindPose")]),
                            n("Version", [I(100)]),
                            n("NbPoseNodes", [I(2)]),
                            n("PoseNode", [], [n("Node", [L(BONE)]), n("Matrix", [["d", identity]])]),
                            n("PoseNode", [], [n("Node", [L(MODEL)]), n("Matrix", [["d", identity]])]),
                        ],
                    ),
                );
                connections.push(
                    n("C", [S("OO"), L(BONE), L(0)]),
                    n("C", [S("OO"), L(BONE_ATTRIBUTE), L(BONE)]),
                    n("C", [S("OO"), L(SKIN), L(GEOMETRY)]),
                    n("C", [S("OO"), L(CLUSTER), L(SKIN)]),
                    n("C", [S("OO"), L(BONE), L(CLUSTER)]),
                );
            }
        }
    }

    return [
        n("FBXHeaderExtension", [], [n("FBXHeaderVersion", [I(1003)]), n("FBXVersion", [I(7400)])]),
        n(
            "GlobalSettings",
            [],
            [
                n("Version", [I(1000)]),
                props([
                    [S("UpAxis"), S("int"), S("Integer"), S(""), I(1)],
                    [S("UpAxisSign"), S("int"), S("Integer"), S(""), I(1)],
                    [S("FrontAxis"), S("int"), S("Integer"), S(""), I(2)],
                    [S("FrontAxisSign"), S("int"), S("Integer"), S(""), I(1)],
                    [S("CoordAxis"), S("int"), S("Integer"), S(""), I(0)],
                    [S("CoordAxisSign"), S("int"), S("Integer"), S(""), I(1)],
                    [S("UnitScaleFactor"), S("double"), S("Number"), S(""), D(1)],
                ]),
            ],
        ),
        n("Objects", [], objects),
        n("Connections", [], connections),
    ];
}

/**
 * One value in the binary form.
 * @param value - The typed value.
 * @returns Its bytes.
 */
function binaryValue([type, value]: Typed): Buffer {
    switch (type) {
        case "I": {
            const b = Buffer.alloc(5);
            b.write("I");
            b.writeInt32LE(value, 1);
            return b;
        }
        case "D": {
            const b = Buffer.alloc(9);
            b.write("D");
            b.writeDoubleLE(value, 1);
            return b;
        }
        case "L": {
            const b = Buffer.alloc(9);
            b.write("L");
            b.writeBigInt64LE(value, 1);
            return b;
        }
        case "S":
        case "R": {
            const data = typeof value === "string" ? Buffer.from(value, "utf8") : Buffer.from(value);
            const b = Buffer.alloc(5);
            b.write(type);
            b.writeUInt32LE(data.length, 1);
            return Buffer.concat([b, data]);
        }
        default: {
            const size = type === "d" || type === "l" ? 8 : 4;
            const raw = Buffer.alloc(value.length * size);
            value.forEach((v, i) => {
                if (type === "d") {
                    raw.writeDoubleLE(v, i * size);
                } else if (type === "l") {
                    raw.writeBigInt64LE(BigInt(v), i * size);
                } else if (type === "f") {
                    raw.writeFloatLE(v, i * size);
                } else {
                    raw.writeInt32LE(v, i * size);
                }
            });
            // Arrays are deflated, as FBX SDK writes them.
            const stored = deflateSync(raw);
            const b = Buffer.alloc(13);
            b.write(type);
            b.writeUInt32LE(value.length, 1);
            b.writeUInt32LE(1, 5);
            b.writeUInt32LE(stored.length, 9);
            return Buffer.concat([b, stored]);
        }
    }
}

/**
 * Write nodes in the binary form (FBX 7.4: 32-bit offsets).
 * @param nodes - The nodes.
 * @returns The file.
 */
export function fbxBinary(nodes: readonly FbxNode[]): Uint8Array {
    const header = Buffer.concat([Buffer.from("Kaydara FBX Binary  \0", "latin1"), Buffer.from([0x1a, 0])]);
    const version = Buffer.alloc(4);
    version.writeUInt32LE(7400);
    const parts: Buffer[] = [header, version];
    let offset = 27;
    const write = (node: FbxNode): void => {
        const values = node.values.map((v) => binaryValue(v));
        const valueBytes = values.reduce((s, b) => s + b.length, 0);
        const head = Buffer.alloc(13);
        const name = Buffer.from(node.name, "latin1");
        parts.push(head, name, ...values);
        offset += 13 + name.length + valueBytes;
        for (const child of node.children) {
            write(child);
        }
        if (node.children.length > 0) {
            parts.push(Buffer.alloc(13));
            offset += 13;
        }
        head.writeUInt32LE(offset, 0);
        head.writeUInt32LE(values.length, 4);
        head.writeUInt32LE(valueBytes, 8);
        head.writeUInt8(name.length, 12);
    };
    for (const node of nodes) {
        write(node);
    }
    parts.push(Buffer.alloc(13));
    return new Uint8Array(Buffer.concat(parts));
}

/**
 * One value in the ASCII form.
 * @param value - The typed value.
 * @returns Its text.
 */
function asciiValue([type, value]: Typed): string {
    switch (type) {
        case "S": {
            // "Name\0\x01Class" is written "Class::Name".
            const [name, kind] = value.split("\u0000\u0001");
            return `"${kind === undefined ? name : `${kind}::${name}`}"`;
        }
        case "R":
            return `"${Buffer.from(value).toString("base64")}"`;
        case "L":
            return String(value);
        case "I":
        case "D":
            return String(value);
        default:
            return `*${String(value.length)} {\n\ta: ${value.join(",")}\n}`;
    }
}

/**
 * Write nodes in the ASCII form.
 * @param nodes - The nodes.
 * @returns The file.
 */
export function fbxAscii(nodes: readonly FbxNode[]): string {
    const lines = ["; FBX 7.4.0 project file", ""];
    const write = (node: FbxNode, depth: number): void => {
        const pad = "\t".repeat(depth);
        const values = node.values.map((v) => asciiValue(v)).join(", ");
        const open = node.children.length > 0 || node.values.length === 0 ? " {" : "";
        lines.push(`${pad}${node.name}: ${values.replaceAll("\n", `\n${pad}`)}${open}`);
        if (open !== "") {
            for (const child of node.children) {
                write(child, depth + 1);
            }
            lines.push(`${pad}}`);
        }
    };
    for (const node of nodes) {
        write(node, 0);
    }
    return `${lines.join("\n")}\n`;
}
