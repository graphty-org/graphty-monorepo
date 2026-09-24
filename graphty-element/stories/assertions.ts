/**
 * @file What a story asserts about the picture it drew.
 *
 * WHY THIS FILE IS NOT A TEST HELPER. Every story in this package is one test in the `storybook`
 * vitest project, and the whole of that test is `composeStory(...).run()`: mount the story, run
 * its `play` function, pass if nothing threw. A `play` function is therefore the only place a
 * per-story assertion can live -- and a `play` function is also loaded by `npm run storybook` and
 * `npm run build-storybook`, where nothing from `vitest` resolves, because vitest's entry pulls
 * in node:fs, node:module, node:path and half a dozen more. So the assertions here import
 * `expect` from `storybook/test`, which is the browser-safe instrumented build, and they cannot
 * import `test/helpers/paint-assertions.ts`, which imports vitest.
 *
 * WHAT THESE ASSERT, AND WHY THAT IS THE POINT. They read THE SCENE, not the style model:
 *
 * - the source mesh each node is instanced from, which is the shape and size actually drawn;
 * - the per-instance colour buffer, which is the colour actually drawn;
 * - `mesh.visibility`, which is the opacity actually drawn;
 * - the label plane and the ink on its own texture, which is the text actually drawn;
 * - the curve flag and the vertex path of an edge line, which is whether it actually bows;
 * - the arrow and line-pattern meshes in the scene, which is which caps and dashes are drawn.
 *
 * That distinction is the whole reason the suite missed the blank labels and the identical layer
 * stories: the element's own arithmetic agreed with itself the entire time. `node.color == "red"`
 * proves a value was stored. `instancedBuffers.color == [1,0,0,1]` proves a red node was drawn.
 */

import {
    type AbstractMesh,
    DynamicTexture,
    type InstancedMesh,
    Matrix,
    type StandardMaterial,
    Vector3,
} from "@babylonjs/core";
import { expect } from "storybook/test";

import type { Graph } from "../src/Graph";
import type { Graphty } from "../src/graphty-element";
import type { GraphSession } from "../src/session";

/** How long a story may wait for its graph to arrive and its style stack to come to rest. */
const SETTLE_BUDGET_MS = 15000;

/** How often to look again while waiting. */
const POLL_MS = 50;

/** How many frames to let the renderer draw after the model settles, before reading the scene. */
const RENDER_SETTLE_MS = 350;

/** How opaque a pixel of a label's own texture must be to count as ink. */
const INK_ALPHA = 16;

/** How many of a label's own colours are kept, most-used first. */
const MAX_LABEL_COLOURS = 6;

/** How many offenders a failure message lists before it stops and quotes the count instead. */
const MAX_LISTED = 8;

/** How far a curved edge's path must leave the straight line between its ends, in world units. */
const CURVE_MIN_SAGITTA = 0.05;

/** How far apart two colour channels may be and still count as the same colour. */
const COLOUR_TOLERANCE = 24;

/** How many frames to draw before reading the frame buffer, so the shaders have compiled. */
const WARMUP_FRAMES = 40;

/** What one node is actually drawn as. */
interface DrawnNode {
    /** The node's id, as a string. */
    readonly id: string;
    /** Its place in the graph's own node list. */
    readonly index: number;
    /** The source mesh it is instanced from, which is named after the shape that built it. */
    readonly shape: string;
    /**
     * One key per distinct piece of geometry in the scene.
     *
     * Two nodes share this when and only when they are drawn from the same source mesh, which is
     * what makes "these 24 nodes are 24 different shapes" a scene reading rather than a style one.
     */
    readonly geometryKey: string;
    /** How many vertices that source mesh has, which separates one shape from another. */
    readonly vertexCount: number;
    /**
     * The geometry itself, as a digest of the source mesh's own vertex positions.
     *
     * NOT `geometryKey`, AND THE DIFFERENCE IS A HOLE THIS CLOSED. `geometryKey` is the source
     * mesh's identity, and the element's mesh cache keys on the STYLE id -- so twenty-four nodes
     * with twenty-four different shape styles get twenty-four source meshes whatever geometry was
     * put in them. Counting those counted style ids wearing a scene reading's clothes: with
     * `NodeMesh.createMeshWithoutCache` forced to the sphere builder for every shape, the
     * twenty-four-shape grid drew twenty-four spheres and "the story promises 24 different node
     * shapes" passed. A digest of the positions cannot be fooled that way, because two spheres
     * built the same way digest the same however many meshes they live in.
     */
    readonly geometryDigest: string;
    /** Whether the source mesh's material is drawn as a wireframe. */
    readonly wireframe: boolean;
    /** What `mesh.visibility` is, which is where opacity lands. */
    readonly opacity: number;
    /** Half the drawn bounding box's width in world units, which is where size lands. */
    readonly radius: number;
    /** The per-instance colour buffer, as `#rrggbb`, or null for a node carrying none. */
    readonly hex: string | null;
    /** Where the mesh actually is. */
    readonly position: readonly [number, number, number];
    /** Whether a label plane is in the scene, parented to this node, and enabled. */
    readonly hasLabelMesh: boolean;
    /** Opaque pixels on the label's own texture; -1 when the node draws no label at all. */
    readonly labelInk: number;
    /**
     * The colours actually drawn on this node's label, most-used first, as `#rrggbb`.
     *
     * READ OFF THE LABEL'S OWN CANVAS. A label is drawn onto a `DynamicTexture`, so the letters,
     * their outline and the panel behind them can be counted directly -- which is the only way to
     * tell "the text is indigo" from "the style model says the text is indigo".
     */
    readonly labelColours: readonly string[];
}

/** One caption drawn at the end of an edge. */
interface DrawnCaption {
    /** Which end of the edge it hangs from. */
    readonly end: "arrowHead" | "arrowTail";
    /** Opaque pixels on the caption's own texture; -1 when there is no texture to read. */
    readonly ink: number;
    /** The colours actually drawn on it, most-used first, as `#rrggbb`. */
    readonly colours: readonly string[];
}

/** Everything one story drew, read off the scene. */
export interface Drawn {
    /** How the story is named in a failure message. */
    readonly story: string;
    /** The element the story put on screen. */
    readonly element: Graphty;
    /** Its graph. */
    readonly graph: Graph;
    /** Its session. */
    readonly session: GraphSession;
    /** Every node, in the order the graph holds them. */
    readonly nodes: readonly DrawnNode[];
    /** Every edge id, which is the only way to address an edge from outside the element. */
    readonly edgeIds: readonly string[];
    /** Nodes the session says it holds. */
    readonly nodeCount: number;
    /** Edges the session says it holds. */
    readonly edgeCount: number;
    /** Edge lines drawn as a bowed path rather than a straight segment. */
    readonly curvedEdges: number;
    /** The largest distance any curved edge's path leaves its own straight line, in world units. */
    readonly maxSagitta: number;
    /** The distinct arrow-cap meshes in the scene, by the name the renderer gave each one. */
    readonly arrowMeshNames: readonly string[];
    /** The distinct line-pattern meshes in the scene, by name. */
    readonly linePatternNames: readonly string[];
    /** Label planes in the scene that belong to an edge rather than to a node. */
    readonly edgeLabelPlanes: number;
    /**
     * Every caption drawn at the end of an edge: which end it hangs from, and the ink on it.
     *
     * READ OFF THE EDGES THEMSELVES, the way a node's label is read off its node. A caption, an
     * edge's own middle label and a node's label are three planes of the same class with the
     * same generated name, so counting planes cannot tell a story that drew two captions from
     * one that drew two labels -- which is the reading the arrow story needs.
     */
    readonly arrowCaptions: readonly DrawnCaption[];
    /**
     * The distinct appearances the edge lines in the picture are drawn with.
     *
     * TWO RENDERERS DRAW AN EDGE AND THIS HAS TO SEE BOTH. In 3D a solid edge is an instance of a
     * source mesh the element interns per appearance, and Babylon names the instance after the
     * cache key -- `edge-style-s1|#d55e00|` -- so the name IS the appearance. In 2D there is no
     * interning at all: `EdgeMesh.createLineMesh` routes a solid line to
     * `Simple2DLineRenderer.create`, which builds one mesh per edge, names every one of them
     * `line-2d`, and puts the colour in that mesh's own material. Counting names alone therefore
     * answered "0 different edge appearances" for every 2D picture ever drawn, however many
     * colours were on screen -- which is what two Flow stories were failing on while drawing
     * exactly what they promised. So an individually built line is keyed by what it is DRAWN
     * with: its material colour, its opacity and its width.
     *
     * Hidden meshes are left out, because a cached source mesh is a template parked off screen
     * rather than an edge anybody can see.
     */
    readonly edgeStyleNames: readonly string[];
    /**
     * Every edge line in the scene, by the appearance it is drawn with, sorted.
     *
     * Repeats kept, because "three thin edges and three thick ones" and "six identical ones" are
     * the same set and different pictures.
     */
    readonly edgeMeshNames: readonly string[];
    /**
     * Every mesh that draws an edge or an arrow, by name and drawn size.
     *
     * THE ONLY READING OF AN EDGE'S APPEARANCE THERE IS. The element publishes no way to
     * enumerate edges and no handle on an edge object, so the width, the pattern and the cap an
     * edge is drawn with can only be read back off the meshes in the scene. The name carries the
     * interned style and the colour; the bounding extent carries the width.
     */
    readonly edgeDigest: readonly string[];
    /** What the scene is cleared to behind everything, as `#rrggbb`. */
    readonly backgroundHex: string;
    /** How many dome meshes are in the scene, which is how a photo-dome skybox shows up. */
    readonly skyboxMeshes: number;
}

/**
 * Fail with a sentence.
 *
 * One `expect` per assertion rather than one per element: a hundred instrumented comparisons
 * inside a loop is a slow test and an unreadable panel, and the offenders belong in the message
 * anyway.
 * @param condition - What must be true.
 * @param complaint - What to say when it is not.
 */
export async function holds(condition: boolean, complaint: string): Promise<void> {
    await expect(condition ? "ok" : complaint, complaint).toBe("ok");
}

/**
 * Cut a list of offenders down to something a person can read.
 * @param offenders - What went wrong.
 * @returns The list, with a count when it was cut.
 */
function listed(offenders: readonly string[]): string {
    if (offenders.length <= MAX_LISTED) {
        return offenders.join(", ");
    }

    return `${offenders.slice(0, MAX_LISTED).join(", ")} (and ${String(offenders.length - MAX_LISTED)} more)`;
}

/**
 * Wait for something to become true, and fail with a sentence when it never does.
 * @param done - What is being waited for.
 * @param deadline - When to give up, as a timestamp.
 * @param complaint - What to say when it never happened.
 */
async function until(done: () => boolean, deadline: number, complaint: string): Promise<void> {
    while (!done()) {
        await holds(Date.now() <= deadline, complaint);
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
}

/**
 * Give a promise a deadline, so a queue that never drains fails with a sentence.
 * @param work - The promise to wait on.
 * @param deadline - When to give up, as a timestamp.
 * @param complaint - What to say when it never finished.
 */
async function within(work: Promise<unknown>, deadline: number, complaint: string): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const expired = new Promise<"expired">((resolve) => {
        timer = setTimeout(() => {
            resolve("expired");
        }, Math.max(0, deadline - Date.now()));
    });

    const outcome = await Promise.race([work.then(() => "done" as const), expired]);

    if (timer !== undefined) {
        clearTimeout(timer);
    }

    await holds(outcome === "done", complaint);
}

/**
 * The colour a node is actually drawn in, read from the buffer the GPU is handed.
 * @param mesh - The node's mesh.
 * @returns The colour as `#rrggbb`, or null when the mesh carries no instance colour.
 */
function instanceHex(mesh: AbstractMesh): string | null {
    const colour = (mesh as unknown as { instancedBuffers?: { color?: { r: number; g: number; b: number } } })
        .instancedBuffers?.color;

    if (colour === undefined) {
        return null;
    }

    const channel = (value: number): string =>
        Math.round(Math.min(1, Math.max(0, value)) * 255)
            .toString(16)
            .padStart(2, "0");

    return `#${channel(colour.r)}${channel(colour.g)}${channel(colour.b)}`;
}

/**
 * How much ink is on one label's own texture.
 *
 * READ FROM THE TEXTURE, NOT FROM THE FRAME. A label is drawn on a `DynamicTexture` with a 2D
 * canvas behind it, so the letters can be counted directly for a fraction of a millisecond --
 * where reading them back off the GPU costs the better part of a second per story and cannot tell
 * a label from a dark node without a colour heuristic.
 * @param mesh - The label plane.
 * @returns Opaque pixels, or -1 when there is no texture to read.
 */
function labelInk(mesh: AbstractMesh | null | undefined): { ink: number; colours: readonly string[] } {
    if (!mesh) {
        return { ink: -1, colours: [] };
    }

    const texture = (mesh.material as StandardMaterial | null)?.diffuseTexture;

    if (!(texture instanceof DynamicTexture)) {
        return { ink: -1, colours: [] };
    }

    const { width, height } = texture.getSize();

    if (width === 0 || height === 0) {
        return { ink: 0, colours: [] };
    }

    const image = texture.getContext().getImageData(0, 0, width, height);
    const tally = new Map<string, number>();
    let ink = 0;

    for (let offset = 0; offset < image.data.length; offset += 4) {
        if (image.data[offset + 3] <= INK_ALPHA) {
            continue;
        }

        ink++;

        // Quantised to five bits a channel, so that one anti-aliased letter is one colour rather
        // than forty near-identical ones.
        const key =
            ((image.data[offset] >> 3) << 10) | ((image.data[offset + 1] >> 3) << 5) | (image.data[offset + 2] >> 3);

        tally.set(String(key), (tally.get(String(key)) ?? 0) + 1);
    }

    const colours = [...tally.entries()]
        .sort((left, right) => right[1] - left[1])
        .slice(0, MAX_LABEL_COLOURS)
        .map(([key]) => {
            const packed = Number(key);
            const channel = (value: number): string => ((value << 3) | 0b100).toString(16).padStart(2, "0");

            return `#${channel((packed >> 10) & 31)}${channel((packed >> 5) & 31)}${channel(packed & 31)}`;
        });

    return { ink, colours };
}

/** The names the element gives a mesh that draws one edge line on its own, rather than as an instance. */
const OWN_LINE_MESHES = ["line-2d", "custom-line", "edge-plain"] as const;

/**
 * The colour and opacity one mesh's own material draws in.
 *
 * READ OFF WHATEVER THE MATERIAL CARRIES, by shape rather than by class. A 2D line is drawn with
 * `disableLighting` and its colour in `emissiveColor`; other materials put theirs in
 * `diffuseColor`; a shader material carries neither, and says so by answering null.
 * @param mesh - The mesh.
 * @returns The colour as `#rrggbb` and the alpha, or null for a material with no colour to read.
 */
function materialPaint(mesh: AbstractMesh): { hex: string; alpha: number } | null {
    const material = mesh.material as {
        emissiveColor?: { r: number; g: number; b: number };
        diffuseColor?: { r: number; g: number; b: number };
        alpha?: number;
    } | null;

    if (material === null) {
        return null;
    }

    const colour = material.emissiveColor ?? material.diffuseColor;

    if (colour === undefined) {
        return null;
    }

    const channel = (value: number): string =>
        Math.round(Math.min(1, Math.max(0, value)) * 255)
            .toString(16)
            .padStart(2, "0");

    return {
        hex: `#${channel(colour.r)}${channel(colour.g)}${channel(colour.b)}`,
        alpha: Number((material.alpha ?? 1).toFixed(2)),
    };
}

/**
 * What one mesh draws an edge line as, or null when it is not a drawn edge line.
 *
 * The one reading of edge appearance there is, because the element publishes no way to enumerate
 * edges and no handle on an Edge object. See {@link Drawn.edgeStyleNames} for why it has two
 * branches.
 * @param mesh - A mesh in the scene.
 * @returns The appearance, as a key two edges share when and only when they look the same.
 */
function edgeLineAppearance(mesh: AbstractMesh): string | null {
    // A cached source mesh is hidden and parked below the graph; only its instances are drawn.
    if (!mesh.isVisible) {
        return null;
    }

    // 3D: the instance is named after the cache key, which the element mints per appearance.
    if (mesh.name.startsWith("edge-style-")) {
        return mesh.name;
    }

    if (!OWN_LINE_MESHES.includes(mesh.name as (typeof OWN_LINE_MESHES)[number]) && !mesh.name.startsWith("pattern-")) {
        return null;
    }

    const paint = materialPaint(mesh);
    // `Simple2DLineRenderer` scales a unit rectangle by the line's length in x and its width in y,
    // so the width is `scaling.y` and never the bounding box, which carries the length as well.
    const width = (mesh.metadata as { lineWidth?: number } | null)?.lineWidth ?? mesh.scaling.y;

    return `${mesh.name}|${paint?.hex ?? "no-colour"}|a${String(paint?.alpha ?? 1)}|w${width.toFixed(3)}`;
}

/**
 * How far a line's drawn path leaves the straight segment between its own two ends.
 * @param mesh - The line mesh.
 * @returns The largest perpendicular distance, in world units.
 */
function sagittaOf(mesh: AbstractMesh): number {
    const positions = mesh.getVerticesData("position");

    if (!positions || positions.length < 9) {
        return 0;
    }

    const last = positions.length - 3;
    const ax = positions[0];
    const ay = positions[1];
    const az = positions[2];
    const bx = positions[last] - ax;
    const by = positions[last + 1] - ay;
    const bz = positions[last + 2] - az;
    const span = Math.hypot(bx, by, bz);

    if (span === 0) {
        return 0;
    }

    let furthest = 0;

    for (let offset = 0; offset < positions.length; offset += 3) {
        const px = positions[offset] - ax;
        const py = positions[offset + 1] - ay;
        const pz = positions[offset + 2] - az;
        const cross = Math.hypot(by * pz - bz * py, bz * px - bx * pz, bx * py - by * px);

        furthest = Math.max(furthest, cross / span);
    }

    return furthest;
}

/**
 * Read what a story actually drew, once its graph has arrived and its style stack has come to rest.
 *
 * WAITING IS PART OF THE READING. Every wait here fails rather than expiring quietly, because a
 * wait that gives up and returns anyway cannot be told apart from a wait that succeeded: a story
 * whose fetch died would render an empty canvas and pass. That used to be true of the helpers in
 * `stories/helpers.ts` as well -- both of their waits raced a five-second timer that resolved
 * either way -- and is not any more: they throw, naming what never happened.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name the story in a failure message.
 * @returns What is on screen.
 */
export async function drawn(canvasElement: HTMLElement, story: string): Promise<Drawn> {
    const element = canvasElement.querySelector<HTMLElement>("graphty-element") as Graphty | null;

    await holds(element !== null, `${story}: the story rendered no <graphty-element> at all`);

    const live = element as Graphty;
    const { graph, session } = live;
    const deadline = Date.now() + SETTLE_BUDGET_MS;

    await until(
        () => session.status.counts.nodes > 0,
        deadline,
        `${story}: no graph ever arrived, so the story's data never loaded`,
    );

    await within(
        graph.operationQueue.waitForCompletion(),
        deadline,
        `${story}: the element's operation queue never drained`,
    );

    await within(
        session.styles.settled(),
        deadline,
        `${story}: the element still has painting of its own in flight after ${String(SETTLE_BUDGET_MS)}ms`,
    );

    // The renderer is a frame behind the style model by design: a pass marks an element dirty and
    // the render loop hands the new paint over on its next tick.
    await new Promise((resolve) => setTimeout(resolve, RENDER_SETTLE_MS));

    // One read per SOURCE mesh, not per node: a thousand nodes instanced from three shapes cost
    // three digests.
    const digests = new Map<number, string>();
    const digestOf = (mesh: { uniqueId: number; getVerticesData: (kind: string) => Float32Array | number[] | null }): string => {
        const seen = digests.get(mesh.uniqueId);

        if (seen !== undefined) {
            return seen;
        }

        const positions = mesh.getVerticesData("position");
        let hash = 0x811c9dc5;

        if (positions === null) {
            digests.set(mesh.uniqueId, "no-geometry");

            return "no-geometry";
        }

        // Hashed rather than kept whole, because a source mesh's position list is thousands of
        // numbers and a story with a thousand nodes would otherwise carry one copy per node into
        // the picture digest below.
        for (const value of positions) {
            hash ^= Math.round(value * 10000);
            hash = Math.imul(hash, 0x01000193);
        }

        const digest = `g${(hash >>> 0).toString(16)}:${String(positions.length)}`;

        digests.set(mesh.uniqueId, digest);

        return digest;
    };

    const nodes: DrawnNode[] = graph.getNodes().map((node, index) => {
        const source = (node.mesh as InstancedMesh).sourceMesh as InstancedMesh["sourceMesh"] | undefined;
        const box = node.mesh.getBoundingInfo().boundingBox.extendSizeWorld;
        const plane = node.label?.labelMesh ?? null;
        const label = labelInk(plane);

        return {
            id: String(node.id),
            index,
            shape: source?.name ?? node.mesh.name,
            geometryKey: `${source?.name ?? node.mesh.name}#${String(source?.uniqueId ?? node.mesh.uniqueId)}`,
            vertexCount: source?.getTotalVertices() ?? node.mesh.getTotalVertices(),
            geometryDigest: digestOf(source ?? (node.mesh as unknown as Parameters<typeof digestOf>[0])),
            wireframe: source?.material?.wireframe ?? false,
            opacity: node.mesh.visibility,
            radius: Number(box.x.toFixed(4)),
            hex: instanceHex(node.mesh),
            position: [node.mesh.absolutePosition.x, node.mesh.absolutePosition.y, node.mesh.absolutePosition.z],
            hasLabelMesh: plane !== null && !plane.isDisposed() && plane.isEnabled(),
            labelInk: label.ink,
            labelColours: label.colours,
        };
    });

    const scope = await session.scope.resolve("graph");
    const curves = graph.scene.meshes.filter(
        (mesh) => (mesh.metadata as { isBezierCurve?: boolean } | null)?.isBezierCurve === true,
    );
    const planes = graph.scene.meshes.filter((mesh) => mesh.name.startsWith("richTextPlane"));

    // READ OFF THE EDGES THEMSELVES, the way a node's label is read off its node. A caption, an
    // edge's own middle label and a node's label are three planes of one class with the same
    // generated name, so nothing in the scene graph distinguishes them; the edge that owns a
    // caption knows which end it hangs from, and that is the only place the answer exists.
    const captions: DrawnCaption[] = [...graph.getDataManager().edges.values()].flatMap((edge) =>
        ([
            ["arrowHead", edge.arrowHeadText],
            ["arrowTail", edge.arrowTailText],
        ] as const)
            .filter(([, caption]) => caption !== null)
            .map(([end, caption]) => {
                const read = labelInk(caption?.labelMesh ?? null);

                return { end, ink: read.ink, colours: read.colours };
            }),
    );
    const nodePlanes = nodes.filter((node) => node.hasLabelMesh).length;
    const drawnEdgeLines = graph.scene.meshes
        .map((mesh) => edgeLineAppearance(mesh))
        .filter((appearance): appearance is string => appearance !== null);

    return {
        story,
        element: live,
        graph,
        session,
        nodes,
        edgeIds: [...scope.edges].map((id) => String(id)),
        nodeCount: session.status.counts.nodes,
        edgeCount: session.status.counts.edges,
        curvedEdges: curves.length,
        maxSagitta: curves.reduce((most, mesh) => Math.max(most, sagittaOf(mesh)), 0),
        arrowMeshNames: [
            ...new Set(graph.scene.meshes.filter((mesh) => mesh.name.includes("arrow")).map((mesh) => mesh.name)),
        ].sort(),
        linePatternNames: [
            ...new Set(graph.scene.meshes.filter((mesh) => mesh.name.startsWith("pattern-")).map((mesh) => mesh.name)),
        ].sort(),
        edgeLabelPlanes: Math.max(0, planes.length - nodePlanes),
        arrowCaptions: captions,
        edgeStyleNames: [...new Set(drawnEdgeLines)].sort(),
        edgeMeshNames: [...drawnEdgeLines].sort(),
        edgeDigest: graph.scene.meshes
            .filter(
                (mesh) =>
                    mesh.name.startsWith("edge-style-") ||
                    mesh.name.startsWith("pattern-") ||
                    mesh.name.startsWith("custom-line") ||
                    mesh.name.includes("arrow"),
            )
            .map((mesh) => {
                const box = mesh.getBoundingInfo().boundingBox.extendSizeWorld;

                return `${mesh.name}@${box.x.toFixed(3)},${box.y.toFixed(3)},${box.z.toFixed(3)}:${String(
                    mesh.visibility,
                )}`;
            })
            .sort(),
        backgroundHex: `#${[graph.scene.clearColor.r, graph.scene.clearColor.g, graph.scene.clearColor.b]
            .map((value) =>
                Math.round(Math.min(1, Math.max(0, value)) * 255)
                    .toString(16)
                    .padStart(2, "0"),
            )
            .join("")}`,
        skyboxMeshes: graph.scene.meshes.filter((mesh) => mesh.name.toLowerCase().includes("dome")).length,
    };
}

/**
 * The graph the story asked for arrived whole, and every node of it reached the screen.
 *
 * THE HIGHEST-REACH ASSERTION THERE IS, and the one nothing had: the project-level check asks
 * only whether `counts.nodes > 0`, so a GraphML fetch that returned three nodes of thirty-four,
 * or a CSV importer that dropped half its edges, passed.
 * @param scene - What the story drew.
 * @param expected - The counts the story's own data declares.
 */
export async function assertGraphLoaded(
    scene: Drawn,
    expected: { readonly nodes: number; readonly edges: number },
): Promise<void> {
    await holds(
        scene.nodeCount === expected.nodes && scene.edgeCount === expected.edges,
        `${scene.story}: the story's data declares ${String(expected.nodes)} nodes and ${String(expected.edges)} ` +
            `edges; the element loaded ${String(scene.nodeCount)} and ${String(scene.edgeCount)}`,
    );

    await holds(
        scene.nodes.length === expected.nodes,
        `${scene.story}: the session holds ${String(scene.nodeCount)} nodes and the scene holds ` +
            `${String(scene.nodes.length)} drawn ones, so ${String(scene.nodeCount - scene.nodes.length)} were ` +
            "loaded and never drawn",
    );

    const report = scene.session.data.lastImport();

    if (report !== null) {
        await holds(
            report.counts.rejected === 0,
            `${scene.story}: the importer rejected ${String(report.counts.rejected)} records of the ` +
                `${String(report.counts.edgeRecords)} it was handed, so the picture is missing edges the data has`,
        );
    }
}

/**
 * Every node is drawn somewhere real, and no two sit on top of one another.
 *
 * `dim: 2` adds the assertion the twelve 2D layout stories exist to make: the picture is flat.
 * Positions are read off the meshes rather than out of the coordinate array, because a layout that
 * wrote coordinates the renderer never applied is exactly the failure this is for.
 * @param scene - What the story drew.
 * @param options - The dimensionality the story claims, and whether its nodes may coincide.
 */
export async function assertLayoutPlaced(
    scene: Drawn,
    options: { readonly dim?: 2 | 3; readonly distinct?: boolean } = {},
): Promise<void> {
    const unplaced = scene.nodes
        .filter((node) => node.position.some((value) => !Number.isFinite(value)))
        .map((node) => node.id);

    await holds(
        unplaced.length === 0,
        `${scene.story}: ${String(unplaced.length)} nodes are drawn at a coordinate that is not a number ` +
            `-- ${listed(unplaced)}`,
    );

    if (options.distinct !== false) {
        const seen = new Map<string, string>();
        const collisions: string[] = [];

        for (const node of scene.nodes) {
            const key = node.position.map((value) => value.toFixed(3)).join(",");
            const first = seen.get(key);

            if (first === undefined) {
                seen.set(key, node.id);
            } else {
                collisions.push(`${first}=${node.id}@(${key})`);
            }
        }

        await holds(
            collisions.length === 0,
            `${scene.story}: ${String(collisions.length)} nodes are drawn on top of another node, so the layout ` +
                `placed fewer nodes than the graph has -- ${listed(collisions)}`,
        );
    }

    if (options.dim === 2) {
        const offPlane = scene.nodes
            .filter((node) => Math.abs(node.position[2]) > 1e-6)
            .map((node) => `${node.id}@z=${node.position[2].toFixed(3)}`);

        await holds(
            offPlane.length === 0,
            `${scene.story}: this is a 2D layout and ${String(offPlane.length)} nodes are drawn off the z=0 ` +
                `plane -- ${listed(offPlane)}`,
        );
    }
}

/**
 * Every node is drawn in the colour the story asked for, or in one of the colours it listed.
 * @param scene - What the story drew.
 * @param expected - The colour every node must be, as `#rrggbb`, or one colour per node id.
 */
export async function assertDrawnColour(
    scene: Drawn,
    expected: string | Readonly<Record<string, string>>,
): Promise<void> {
    const wanted = (node: DrawnNode): string | undefined =>
        typeof expected === "string" ? expected.toLowerCase() : expected[node.id]?.toLowerCase();

    const wrong = scene.nodes
        .filter((node) => {
            const want = wanted(node);

            return want !== undefined && node.hex !== want;
        })
        .map((node) => `${node.id} is ${node.hex ?? "uncoloured"} not ${String(wanted(node))}`);

    await holds(
        wrong.length === 0,
        `${scene.story}: ${String(wrong.length)} nodes are drawn in a colour the story did not ask for ` +
            `-- ${listed(wrong)}`,
    );
}

/**
 * The nodes named in each group are drawn differently from the nodes in every other group.
 *
 * THE ASSERTION THE LAYERED STORIES NEEDED. "Two layers set two colours" is invisible to a check
 * that only asks whether the layers are in the stack -- which is what every one of those stories
 * had, and why thirteen of them could render identically and pass. Reading one drawn property per
 * group and requiring the groups to disagree is what notices.
 * @param scene - What the story drew.
 * @param property - Which drawn property separates the groups.
 * @param groups - The node ids in each group, keyed by what the group is called.
 */
export async function assertGroupsDrawnDifferently(
    scene: Drawn,
    property: "hex" | "shape" | "geometryKey" | "radius" | "opacity" | "wireframe",
    groups: Readonly<Record<string, readonly string[]>>,
): Promise<void> {
    const byId = new Map(scene.nodes.map((node) => [node.id, node]));
    const values = new Map<string, string>();

    for (const [group, ids] of Object.entries(groups)) {
        const missing = ids.filter((id) => !byId.has(id));

        await holds(missing.length === 0, `${scene.story}: the graph drew no node called ${listed(missing)}`);

        const readings = [...new Set(ids.map((id) => String(byId.get(id)?.[property])))];

        await holds(
            readings.length === 1,
            `${scene.story}: the nodes in "${group}" were all asked for the same ${property} and are drawn with ` +
                `${String(readings.length)} different ones -- ${listed(readings)}`,
        );

        values.set(group, readings[0]);
    }

    const collisions: string[] = [];
    const entries = [...values.entries()];

    for (let first = 0; first < entries.length; first++) {
        for (let second = first + 1; second < entries.length; second++) {
            if (entries[first][1] === entries[second][1]) {
                collisions.push(`"${entries[first][0]}" and "${entries[second][0]}" are both ${entries[first][1]}`);
            }
        }
    }

    await holds(
        collisions.length === 0,
        `${scene.story}: this story exists to show ${String(entries.length)} groups drawn differently, and ` +
            `the ${property} it draws them with does not tell them apart -- ${listed(collisions)}`,
    );
}

/**
 * Every node the story gave a label to has a label plane on screen with letters on it.
 *
 * TWO READINGS, BOTH FROM THE SCENE. The plane's existence catches the label that was never built
 * -- which is what the eleven blank label stories were -- and the ink on its own texture catches
 * the plane that was built and drew nothing, which no amount of style-model agreement can see.
 * @param scene - What the story drew.
 * @param options - Which nodes must carry a label, when it is not all of them.
 */
export async function assertLabelsDrawn(
    scene: Drawn,
    options: { readonly ids?: readonly string[]; readonly minimumInk?: number } = {},
): Promise<void> {
    const wanted = options.ids === undefined ? scene.nodes : scene.nodes.filter((node) => options.ids?.includes(node.id));
    const minimumInk = options.minimumInk ?? 1;

    await holds(
        wanted.length > 0,
        `${scene.story}: no node of the ones this assertion names is in the graph at all`,
    );

    const missing = wanted.filter((node) => !node.hasLabelMesh).map((node) => node.id);

    await holds(
        missing.length === 0,
        `${scene.story}: ${String(missing.length)} of ${String(wanted.length)} nodes were given a label and have ` +
            `no label mesh in the scene, so the words are not on screen -- ${listed(missing)}`,
    );

    const blank = wanted
        .filter((node) => node.labelInk < minimumInk)
        .map((node) => `${node.id} has ${String(node.labelInk)} inked pixels`);

    await holds(
        blank.length === 0,
        `${scene.story}: ${String(blank.length)} label planes are on screen with nothing drawn on them ` +
            `-- ${listed(blank)}`,
    );

    if (options.ids !== undefined) {
        const extra = scene.nodes.filter((node) => !options.ids?.includes(node.id) && node.hasLabelMesh).map((n) => n.id);

        await holds(
            extra.length === 0,
            `${scene.story}: only ${listed(options.ids)} were given a label and ${String(extra.length)} other ` +
                `nodes are drawing one -- ${listed(extra)}`,
        );
    }
}

/**
 * No node draws a label, which is what a story that never asked for one must show.
 * @param scene - What the story drew.
 */
export async function assertNoLabelsDrawn(scene: Drawn): Promise<void> {
    const labelled = scene.nodes.filter((node) => node.hasLabelMesh).map((node) => node.id);

    await holds(
        labelled.length === 0,
        `${scene.story}: this story asks for no label and ${String(labelled.length)} nodes are drawing one ` +
            `-- ${listed(labelled)}`,
    );
}

/**
 * The scene holds at least this many distinct node geometries.
 *
 * A SHAPE COUNT THE SCENE ANSWERS, and the second attempt at one. The first counted distinct
 * SOURCE MESHES, on the premise that two nodes are the same shape exactly when they are instanced
 * from the same mesh. That premise is false here: the element's mesh cache is keyed on the STYLE
 * id, so twenty-four nodes with twenty-four different shape styles get twenty-four source meshes
 * whatever geometry went into them. Measured -- with `NodeMesh.createMeshWithoutCache` forced to
 * the sphere builder for every shape, the twenty-four-shape grid drew twenty-four spheres and this
 * assertion passed. It counts the geometry itself now, so one sphere drawn twenty-four times reads
 * back as one.
 * @param scene - What the story drew.
 * @param atLeast - How many distinct geometries the story promises.
 */
export async function assertShapeVariety(scene: Drawn, atLeast: number): Promise<void> {
    const geometries = new Set(scene.nodes.map((node) => node.geometryDigest));
    const meshes = new Set(scene.nodes.map((node) => node.geometryKey));
    const shapes = new Set(scene.nodes.map((node) => node.shape));

    await holds(
        geometries.size >= atLeast,
        `${scene.story}: the story promises ${String(atLeast)} different node shapes and the scene draws ` +
            `${String(geometries.size)} distinct geometries -- spread over ${String(meshes.size)} source meshes ` +
            `and ${String(shapes.size)} shape names -- ${listed([...shapes])}`,
    );
}

/**
 * The named layer is in the stack AND painted the number of elements the story says it does.
 *
 * THE TWO FACTS ARE DIFFERENT. A layer can be in `styles.list()`, enabled, with a selector that
 * matches every node, and have painted nothing. The project-level check asserts the first; this
 * asserts the second, which is what every scoped layer in this package actually promises.
 * @param scene - What the story drew.
 * @param layerName - What the layer is called.
 * @param expected - How many nodes and edges it must have painted.
 */
export async function assertLayerPainted(
    scene: Drawn,
    layerName: string,
    expected: { readonly nodes?: number; readonly edges?: number },
): Promise<void> {
    const present = scene.session.styles.list().map((layer) => layer.name);

    await holds(
        present.includes(layerName),
        `${scene.story}: the story asked for a layer called "${layerName}" and the stack holds ` +
            `[${present.join(", ")}], so it never landed`,
    );

    if (expected.nodes !== undefined) {
        const painted = scene.nodes.filter((node) =>
            scene.session.styles
                .explain({ node: node.id })
                .contributions.some((contribution) => contribution.name === layerName),
        ).length;

        await holds(
            painted === expected.nodes,
            `${scene.story}: "${layerName}" is in the stack and painted ${String(painted)} nodes, where the ` +
                `story says it paints ${String(expected.nodes)}`,
        );
    }

    if (expected.edges !== undefined) {
        const painted = scene.edgeIds.filter((id) =>
            scene.session.styles
                .explain({ edge: id })
                .contributions.some((contribution) => contribution.name === layerName),
        ).length;

        await holds(
            painted === expected.edges,
            `${scene.story}: "${layerName}" is in the stack and painted ${String(painted)} edges, where the ` +
                `story says it paints ${String(expected.edges)}`,
        );
    }
}

/**
 * Every edge line in the picture bows away from the straight segment between its ends.
 * @param scene - What the story drew.
 * @param expected - How many curved lines the story promises.
 */
export async function assertEdgesCurved(scene: Drawn, expected: number): Promise<void> {
    await holds(
        scene.curvedEdges === expected,
        `${scene.story}: the story asks for ${String(expected)} curved edges and the scene holds ` +
            `${String(scene.curvedEdges)} curved line meshes`,
    );

    await holds(
        scene.maxSagitta >= CURVE_MIN_SAGITTA,
        `${scene.story}: the edges are flagged as curves and the furthest any of them leaves its own straight ` +
            `line is ${scene.maxSagitta.toFixed(4)} world units, so a bezier drew a straight line`,
    );
}

/**
 * The scene draws every one of these arrow caps, each from its own mesh.
 * @param scene - What the story drew.
 * @param expected - The mesh names the renderer builds for the caps the story lists.
 */
export async function assertArrowCapsDrawn(scene: Drawn, expected: readonly string[]): Promise<void> {
    const missing = expected.filter((name) => !scene.arrowMeshNames.includes(name));

    await holds(
        missing.length === 0,
        `${scene.story}: the story draws one edge per arrow cap and the scene is missing ` +
            `${String(missing.length)} of them -- ${listed(missing)}. It holds ` +
            `[${scene.arrowMeshNames.join(", ")}]`,
    );
}

/**
 * The scene draws every one of these line patterns, each from its own mesh.
 * @param scene - What the story drew.
 * @param expected - The pattern mesh names the story's layers ask for.
 */
export async function assertLinePatternsDrawn(scene: Drawn, expected: readonly string[]): Promise<void> {
    const missing = expected.filter((name) => !scene.linePatternNames.some((drawn_) => drawn_.startsWith(name)));

    await holds(
        missing.length === 0,
        `${scene.story}: the story draws one edge per line pattern and the scene is missing ` +
            `${String(missing.length)} of them -- ${listed(missing)}. It holds ` +
            `[${scene.linePatternNames.join(", ")}]`,
    );
}

/**
 * An algorithm ran, finished, and its suggestion is what is painting the picture.
 *
 * `applySuggestedStyles` RETURNS A BOOLEAN THAT EVERY ALGORITHM STORY THREW AWAY. It is false
 * when no finished run of that algorithm has anything per element to paint -- which is to say
 * when the story is a picture of the element's defaults. Twenty-seven stories called it as a bare
 * statement.
 *
 * WHICH RUN BELONGS TO WHICH ADDRESS IS THE ELEMENT'S QUESTION, NOT THIS FILE'S. A run records a
 * catalogue key that is often not the address a story names: `graphty:dijkstra` and
 * `graphty:bellman-ford` both record `shortest-path`, and `graphty:scc` records `components`. So
 * the element is ASKED -- `getSuggestedStyles` resolves the address through its own map -- rather
 * than the map being copied here, where it would drift.
 * @param scene - What the story drew.
 * @param algorithm - The address the story runs, such as "graphty:degree".
 * @param options - Which kind of element the algorithm's picture paints, and how many.
 */
export async function assertAlgorithmPainted(
    scene: Drawn,
    algorithm: string,
    options: { readonly paints?: "node" | "edge" | "either"; readonly atLeast?: number } = {},
): Promise<void> {
    const finished = scene.session.runs.list().filter((run) => run.status === "succeeded");

    await holds(
        finished.length > 0,
        `${scene.story}: no run in this session succeeded, so the picture is the element's defaults. It holds ` +
            `[${scene.session.runs
                .list()
                .map((run) => `${String(run.algorithm)}:${run.status}`)
                .join(", ")}]`,
    );

    await holds(
        scene.graph.getSuggestedStyles(algorithm).length > 0,
        `${scene.story}: "${algorithm}" finished and suggests nothing to draw, so applySuggestedStyles had ` +
            "nothing to apply and the picture is the element's defaults",
    );

    const fromRun = scene.session.styles
        .list()
        .filter((layer) => (layer.source as { by?: string } | undefined)?.by === "run");

    await holds(
        fromRun.length > 0,
        `${scene.story}: "${algorithm}" succeeded and no layer in the stack is sourced from a run, so nothing ` +
            `it computed is being drawn. The stack is [${scene.session.styles
                .list()
                .map((layer) => layer.name)
                .join(", ")}]`,
    );

    const names = new Set(fromRun.map((layer) => layer.name));
    const paintedNodes = scene.nodes.filter((node) =>
        scene.session.styles
            .explain({ node: node.id })
            .contributions.some((contribution) => names.has(contribution.name)),
    ).length;
    const paintedEdges = scene.edgeIds.filter((id) =>
        scene.session.styles.explain({ edge: id }).contributions.some((contribution) => names.has(contribution.name)),
    ).length;

    const paints = options.paints ?? "either";
    const atLeast = options.atLeast ?? 1;
    let counted = paintedNodes + paintedEdges;
    if (paints === "node") {
        counted = paintedNodes;
    } else if (paints === "edge") {
        counted = paintedEdges;
    }

    await holds(
        counted >= atLeast,
        `${scene.story}: "${algorithm}" has a layer in the stack and it painted ${String(paintedNodes)} nodes ` +
            `and ${String(paintedEdges)} edges, where the story says it paints at least ${String(atLeast)} ` +
            `${paints === "either" ? "elements" : `${paints}s`}`,
    );
}
/**
 * What one story drew, as a short string two sibling stories can be compared by.
 * @param scene - What the story drew.
 * @returns The digest.
 */
function fingerprint(scene: Drawn): string {
    const nodes = scene.nodes
        .map((node) =>
            [
                node.id,
                node.shape,
                node.geometryDigest,
                node.vertexCount,
                node.radius,
                node.opacity,
                node.wireframe ? "wire" : "solid",
                node.hex ?? "-",
                node.hasLabelMesh ? node.labelInk : "-",
            ].join(":"),
        )
        .join("|");

    // The edges are half the picture in several of these families, and nothing about them reaches
    // a node reading: three stories whose layers differ only in edge width, edge colour and arrow
    // cap draw the same five nodes.
    const edges = [
        scene.edgeDigest.join("|"),
        `curved=${String(scene.curvedEdges)}`,
        `edgeLabels=${String(scene.edgeLabelPlanes)}`,
        `background=${scene.backgroundHex}`,
        `skybox=${String(scene.skyboxMeshes)}`,
    ].join("!");

    return `${nodes}!!${edges}`;
}

/** What each family of sibling stories has drawn so far, by the story that drew it. */
const pictures = new Map<string, Map<string, string>>();

/**
 * No two stories in this family draw the same picture.
 *
 * THE ONLY THING THAT CAN SEE THE REPORTED SYMPTOM. Chromatic compares a story to its own past
 * and never to its siblings, so "these fourteen stories render identically to one another" is
 * invisible to it, and was invisible to every test in this package. The digest is built from what
 * the SCENE drew -- shape, geometry, size, opacity, colour, label ink -- and deliberately not
 * from positions, because a physics layout gives a different picture every run and a position
 * would make every story look distinct whatever it painted.
 *
 * Module state is shared by exactly the stories in one story FILE, because the vitest addon
 * generates one test file per story file. That is the set this compares.
 * @param scene - What the story drew.
 * @param family - What the sibling set is called.
 * @param extra - A further DRAWN measurement the digest above cannot reach, such as a pixel count
 *     for a line whose thickness is a shader parameter rather than geometry.
 */
export async function assertDistinctPicture(scene: Drawn, family: string, extra = ""): Promise<void> {
    const digest = `${fingerprint(scene)}!!${extra}`;
    const drawnHere = pictures.get(family) ?? new Map<string, string>();

    pictures.set(family, drawnHere);

    const twin = [...drawnHere.entries()].find(([, existing]) => existing === digest)?.[0];

    await holds(
        twin === undefined,
        `${scene.story}: draws exactly the same picture as "${String(twin)}" -- same shapes, sizes, colours, ` +
            "opacities and labels on every node. Two stories in one family that promise different pictures and " +
            "draw one have collapsed onto each other, which is the one thing a per-story visual baseline cannot see.",
    );

    drawnHere.set(scene.story, digest);
}

/** Where each family of sibling stories put its nodes, by the story that put them there. */
const arrangements = new Map<string, Map<string, ReadonlyMap<string, readonly [number, number, number]>>>();

/**
 * How far apart two arrangements of one graph are, as a number that ignores where the camera is.
 *
 * Both clouds are moved to the origin and divided by their own root-mean-square radius, so a
 * layout that drew the same shape twice as large, or half a screen to the left, reads as the same
 * shape -- which is what makes this a measure of the ARRANGEMENT rather than of the framing. The
 * answer is the root-mean-square distance between corresponding nodes afterwards: 0 is the same
 * shape, and two clouds with nothing to do with each other sit near 1.414.
 * @param a - One story's nodes, by id.
 * @param b - The other story's nodes, by id.
 * @returns The distance, over the ids both stories drew.
 */
function arrangementDistance(
    a: ReadonlyMap<string, readonly [number, number, number]>,
    b: ReadonlyMap<string, readonly [number, number, number]>,
): number {
    const shared = [...a.keys()].filter((id) => b.has(id));
    if (shared.length === 0) {
        return Number.POSITIVE_INFINITY;
    }

    const normalise = (
        cloud: ReadonlyMap<string, readonly [number, number, number]>,
    ): [number, number, number][] => {
        const points = shared.map((id) => cloud.get(id) as readonly [number, number, number]);
        const centre = [0, 1, 2].map((axis) => points.reduce((sum, p) => sum + p[axis], 0) / points.length);
        const radius =
            Math.sqrt(
                points.reduce((sum, p) => sum + [0, 1, 2].reduce((d, axis) => d + (p[axis] - centre[axis]) ** 2, 0), 0) /
                    points.length,
            ) || 1;

        return points.map((p) => [0, 1, 2].map((axis) => (p[axis] - centre[axis]) / radius) as [number, number, number]);
    };

    const left = normalise(a);
    const right = normalise(b);
    const sum = left.reduce(
        (total, p, i) => total + [0, 1, 2].reduce((d, axis) => d + (p[axis] - right[i][axis]) ** 2, 0),
        0,
    );

    return Math.sqrt(sum / shared.length);
}

/**
 * No two stories in this family arrange the graph the same way.
 *
 * THE COMPANION TO {@link assertDistinctPicture} FOR A FAMILY THAT DIFFERS IN NOTHING ELSE. That
 * one builds its digest from shape, size, colour and label and deliberately leaves position out,
 * because a physics layout gives a different picture every run. The accelerated layout stories
 * are the case it cannot serve: they draw one graph with one styling and two layouts, so the
 * arrangement is the only thing that differs, and they pin a seed so the arrangement is the same
 * on every machine and every run. Without this, two stories that promise two layouts and compute
 * one are invisible -- which is exactly what happened when the fake accelerator translated the
 * graph instead of laying it out, and both stories drew the seed scatter reframed to fill the
 * canvas.
 *
 * Measured on the 150-node, 250-edge story graph from seed 42: ForceAtlas2 and
 * Fruchterman-Reingold sit 0.61 apart, the same model from two different seeds sits 1.5 to 1.6
 * apart, and the translating fake sat at 0. A floor of about a quarter is therefore clear of
 * anything a real pair of layouts produces and nowhere near the zero that a collapse produces.
 * @param scene - What the story drew.
 * @param family - What the sibling set is called.
 * @param minimum - How far apart the stories promise to be. See the figures above.
 */
export async function assertDistinctArrangement(scene: Drawn, family: string, minimum: number): Promise<void> {
    const cloud = new Map(scene.nodes.map((node) => [node.id, node.position]));
    const arrangedHere = arrangements.get(family) ?? new Map<string, typeof cloud>();

    arrangements.set(family, arrangedHere);

    const offenders = [...arrangedHere.entries()]
        .map(([story, other]) => [story, arrangementDistance(cloud, other)] as const)
        .filter(([, distance]) => distance < minimum);

    await holds(
        offenders.length === 0,
        `${scene.story}: arranges the graph the same way as ${listed(
            offenders.map(([story, distance]) => `"${story}" (${distance.toFixed(3)} apart)`),
        )} -- the two stories promise different layouts and at least ${String(minimum)} between their ` +
            "arrangements, and a per-story visual baseline cannot see two siblings that have collapsed onto " +
            "each other.",
    );

    arrangedHere.set(scene.story, cloud);
}

/**
 * The edges in the picture are drawn with this many different appearances.
 *
 * READ FROM THE SCENE, off the meshes that draw the lines: the interned source mesh an instanced
 * 3D line comes from, and the material colour, opacity and width of a line the renderer built on
 * its own, which is every line in a 2D picture. A story whose two layers set two widths and draws
 * every edge the same reads back as one.
 * @param scene - What the story drew.
 * @param atLeast - How many the story promises.
 */
export async function assertEdgeVariety(scene: Drawn, atLeast: number): Promise<void> {
    await holds(
        scene.edgeStyleNames.length >= atLeast,
        `${scene.story}: the story's layers ask for ${String(atLeast)} different edge appearances and the scene ` +
            `draws ${String(scene.edgeStyleNames.length)} -- [${scene.edgeStyleNames.join(", ")}]`,
    );
}

/**
 * Every edge in the picture carries a label with letters on it.
 * @param scene - What the story drew.
 * @param expected - How many edge labels the story asks for.
 */
export async function assertEdgeLabelsDrawn(scene: Drawn, expected: number): Promise<void> {
    await holds(
        scene.edgeLabelPlanes >= expected,
        `${scene.story}: the story puts a label on ${String(expected)} edges and the scene holds ` +
            `${String(scene.edgeLabelPlanes)} edge label planes`,
    );
}

/**
 * The edge captions the story asked for are on screen, at the ends it named, with words on them.
 *
 * TWO READINGS, THE SAME PAIR `assertLabelsDrawn` TAKES. The plane's existence catches a caption
 * the renderer never built -- which is what every arrow caption was until they were published,
 * since no channel could ask for one -- and the ink on its own texture catches the plane that was
 * built and drew nothing.
 * @param scene - What the story drew.
 * @param expected - Which end each caption hangs from, one entry per caption the story asks for.
 */
export async function assertArrowCaptionsDrawn(
    scene: Drawn,
    expected: readonly ("arrowHead" | "arrowTail")[],
): Promise<void> {
    const drawnEnds = scene.arrowCaptions.map((caption) => caption.end).sort();

    await holds(
        drawnEnds.length === expected.length && drawnEnds.join(",") === [...expected].sort().join(","),
        `${scene.story}: the story asks for captions at ${listed([...expected])} and the scene draws ` +
            `${String(drawnEnds.length)} -- ${listed(drawnEnds)}`,
    );

    const blank = scene.arrowCaptions
        .filter((caption) => caption.ink < 1)
        .map((caption) => `${caption.end} has ${String(caption.ink)} inked pixels`);

    await holds(
        blank.length === 0,
        `${scene.story}: ${String(blank.length)} caption planes are on screen with nothing drawn on them ` +
            `-- ${listed(blank)}`,
    );
}

/**
 * Each of these nodes is drawn from the source mesh the named shape builds.
 *
 * SHAPE NAMES ARE NOT UNIQUE, which is why this is not the whole story: every polyhedron is built
 * by `MeshBuilder.CreatePolyhedron` and named "polyhedron", and a cone is a degenerate cylinder
 * and named "cylinder". Use this where the story names a shape with a mesh of its own, and
 * {@link assertGroupsDrawnDifferently} on `geometryKey` where it does not.
 * @param scene - What the story drew.
 * @param expected - The mesh name each node must be drawn from, by node id.
 */
export async function assertDrawnShape(scene: Drawn, expected: Readonly<Record<string, string>>): Promise<void> {
    const byId = new Map(scene.nodes.map((node) => [node.id, node]));
    const wrong = Object.entries(expected)
        .filter(([id, shape]) => byId.get(id)?.shape !== shape)
        .map(([id, shape]) => `${id} is drawn from "${byId.get(id)?.shape ?? "nothing"}" not "${shape}"`);

    await holds(
        wrong.length === 0,
        `${scene.story}: ${String(wrong.length)} nodes are drawn from the wrong source mesh -- ${listed(wrong)}`,
    );
}

/**
 * These nodes are drawn at these opacities.
 * @param scene - What the story drew.
 * @param expected - The opacity each node must be drawn at, by node id.
 */
export async function assertDrawnOpacity(scene: Drawn, expected: Readonly<Record<string, number>>): Promise<void> {
    const byId = new Map(scene.nodes.map((node) => [node.id, node]));
    const wrong = Object.entries(expected)
        .filter(([id, opacity]) => Math.abs((byId.get(id)?.opacity ?? -1) - opacity) > 1e-3)
        .map(([id, opacity]) => `${id} is drawn at ${String(byId.get(id)?.opacity)} not ${String(opacity)}`);

    await holds(
        wrong.length === 0,
        `${scene.story}: ${String(wrong.length)} nodes are drawn at the wrong opacity -- ${listed(wrong)}`,
    );
}

/**
 * These nodes are drawn as wireframes and the rest are drawn solid.
 * @param scene - What the story drew.
 * @param ids - The nodes whose material must be a wireframe.
 */
export async function assertWireframes(scene: Drawn, ids: readonly string[]): Promise<void> {
    const wrong = scene.nodes
        .filter((node) => node.wireframe !== ids.includes(node.id))
        .map((node) => `${node.id} is drawn ${node.wireframe ? "as a wireframe" : "solid"}`);

    await holds(
        wrong.length === 0,
        `${scene.story}: the story asks for wireframes on [${ids.join(", ")}] and ${String(wrong.length)} nodes ` +
            `disagree -- ${listed(wrong)}`,
    );
}

/**
 * The nodes in the picture are drawn with this many different values of one property.
 *
 * FOR A RESULT THAT IS A RAMP RATHER THAN A SET OF NAMES. A centrality drawn as a colour ramp
 * cannot be asserted node by node without re-implementing the algorithm; what it promises is that
 * the picture SEPARATES the nodes, and a run that produced nothing paints them all alike.
 * @param scene - What the story drew.
 * @param property - Which drawn property the story varies.
 * @param atLeast - How many distinct values the story promises.
 */
export async function assertDrawnVariety(
    scene: Drawn,
    property: "hex" | "radius" | "shape" | "geometryKey" | "opacity",
    atLeast: number,
): Promise<void> {
    const values = new Set(scene.nodes.map((node) => String(node[property])));

    await holds(
        values.size >= atLeast,
        `${scene.story}: this story draws its result as a range of node ${property}, and every node is drawn ` +
            `with one of only ${String(values.size)} values where it promises at least ${String(atLeast)} ` +
            `-- [${listed([...values])}]`,
    );
}

/**
 * The scene draws this many different arrow caps.
 *
 * COUNTED AS MESHES, not as the names a story listed: several caps share one geometry -- an
 * inverted triangle is a triangle, and a sphere-dot is a circle in 2D -- so the number the scene
 * can answer is how many distinct arrow meshes it holds.
 * @param scene - What the story drew.
 * @param atLeast - How many the story promises.
 */
export async function assertArrowVariety(scene: Drawn, atLeast: number): Promise<void> {
    await holds(
        scene.arrowMeshNames.length >= atLeast,
        `${scene.story}: the story's layers ask for ${String(atLeast)} different arrow caps and the scene draws ` +
            `${String(scene.arrowMeshNames.length)} -- [${scene.arrowMeshNames.join(", ")}]`,
    );
}

/**
 * How many pixels of one colour are on the canvas.
 *
 * THE READING OF LAST RESORT, and the only one for a property the scene graph does not carry. An
 * edge's drawn thickness is a shader parameter: the source mesh is interned without it, the
 * instance carries no buffer for it, and the bounding box of the line reads zero in both of the
 * directions the thickness is in. So "is this line drawn thicker than that one" has exactly one
 * honest answer, which is to count the pixels.
 *
 * It costs about half a second, so it is spent on the few stories whose whole subject is a
 * property no other reading reaches.
 * A COUNT ON ITS OWN MEANS NOTHING, because the canvas is not a fixed size. The same picture
 * reads 27,222 pixels of line at a canvas 668px wide and 70,456 at 1,668px, and the two contexts
 * that run these stories disagree: the headless sweep draws them 968px wide and vitest draws them
 * 1,200px wide. Divide the count by something measured in the same frame -- `canvasArea` for ink
 * that grows in two directions, `edgeSpanPx` for ink that grows in one -- and the reading means
 * the same thing wherever it is taken.
 * @param scene - What the story drew.
 * @param hex - The colour to count, as `#rrggbb`.
 * @param tolerance - How far one channel may be from `hex` and still count as it. The default of
 *     24 suits a colour well clear of the background. A colour NEARER the background than that
 *     cannot be counted at this tolerance at all -- three tenths of darkgrey over whitesmoke is
 *     0xde against a background of 0xf5, 23 apart, so the window swallows the whole empty canvas
 *     and the count is meaningless. Narrow it for a colour like that, and say what was measured.
 * @returns How many pixels are within tolerance of it.
 */
export async function pixelsOfColour(scene: Drawn, hex: string, tolerance: number = COLOUR_TOLERANCE): Promise<number> {
    const { engine } = scene.graph;

    for (let frame = 0; frame < WARMUP_FRAMES; frame++) {
        scene.graph.scene.render();
        await new Promise<void>((done) => {
            setTimeout(done, 10);
        });
    }

    const width = engine.getRenderWidth();
    const height = engine.getRenderHeight();
    const pixels = (await engine.readPixels(0, 0, width, height)) as unknown as Uint8Array;
    const want = [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
    ];

    let found = 0;

    for (let offset = 0; offset < pixels.length; offset += 4) {
        if (
            Math.abs(pixels[offset] - want[0]) <= tolerance &&
            Math.abs(pixels[offset + 1] - want[1]) <= tolerance &&
            Math.abs(pixels[offset + 2] - want[2]) <= tolerance
        ) {
            found++;
        }
    }

    return found;
}

/**
 * How many pixels the canvas holds, at whatever size the page gave it.
 *
 * THE DENOMINATOR FOR INK THAT GROWS IN TWO DIRECTIONS. An arrow cap is a triangle: draw the
 * picture twice as wide and it covers four times as many pixels. So "the cap is drawn, and drawn
 * at the size the story asks for" is honestly a SHARE OF THE CANVAS, and a raw count is a number
 * that only means what it meant on the canvas it was measured on.
 * @param scene - What the story drew.
 * @returns The canvas's area in pixels, which is the area `pixelsOfColour` counts over.
 */
export function canvasArea(scene: Drawn): number {
    const { engine } = scene.graph;

    return engine.getRenderWidth() * engine.getRenderHeight();
}

/**
 * How far apart two nodes are drawn, in canvas pixels.
 *
 * THE DENOMINATOR FOR INK THAT GROWS IN ONE DIRECTION. A line's ink is its length times its
 * thickness, so dividing it by the line's length leaves its THICKNESS -- which is the quantity a
 * width story is actually about, and a quantity that does not move when the canvas does. Measured
 * at five canvas widths from 668 to 1,668 px, `Styles/Edge Width` varies by 3.6% read this way
 * and by 2.4x read as a share of canvas area.
 *
 * READ THROUGH THE CAMERA rather than taken as a fraction of the canvas's width. The two are
 * proportional today -- this span is 0.72834 of the canvas width in every context measured, to
 * five figures -- because nothing gives <graphty-element> a definite height, so its canvas falls
 * back to its intrinsic 2:1 shape and the picture scales with width alone. A span read off the
 * camera keeps tracking the picture if that ever changes. A fraction of the width silently
 * stops.
 *
 * THE TWO IDS ARE ARGUMENTS rather than "the first two nodes", because only a two-node story can
 * assume which pair the line runs between.
 * @param scene - What the story drew.
 * @param from - The id of the node at one end.
 * @param to - The id of the node at the other end.
 * @returns The distance between the two, projected onto the canvas, in pixels.
 */
export function edgeSpanPx(scene: Drawn, from: string, to: string): number {
    const { engine } = scene.graph;
    const babylon = scene.graph.scene;
    const camera = babylon.activeCamera;

    if (camera === null) {
        throw new Error(`${scene.story}: the scene has no active camera, so nothing is being drawn`);
    }

    // The matrices the next frame will be drawn with. A story reads this after counting pixels,
    // so they are already current -- but a reading that is only right when it is called in a
    // particular order is a reading that breaks the first time somebody moves two lines.
    babylon.updateTransformMatrix();

    const viewport = camera.viewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
    const transform = babylon.getTransformMatrix();

    const at = (id: string): Vector3 => {
        const node = scene.nodes.find((candidate) => candidate.id === id);

        if (node === undefined) {
            throw new Error(
                `${scene.story}: asks how far "${from}" is drawn from "${to}" and the graph holds no node "${id}"`,
            );
        }

        // `DrawnNode.position` is the mesh's ABSOLUTE position, so the world matrix in this
        // projection is the identity and no mesh handling is needed here.
        return Vector3.Project(new Vector3(...node.position), Matrix.Identity(), transform, viewport);
    };

    const one = at(from);
    const other = at(to);

    return Math.hypot(one.x - other.x, one.y - other.y);
}

/**
 * The camera the story is actually drawn through.
 *
 * ORTHOGRAPHIC IS WHAT 2D MEANS HERE, and it is the element's own test: `Graph` reads
 * `camera.mode === Camera.ORTHOGRAPHIC_CAMERA` to decide which drawing mode it is in. A story
 * that asks for 2D and is drawn through a perspective camera is a 3D picture with a 2D label on
 * it, and nothing else in this file would notice.
 * @param scene - What the story drew.
 * @param expected - The view mode the story asks for.
 */
export async function assertViewMode(scene: Drawn, expected: "2d" | "3d"): Promise<void> {
    const camera = scene.graph.scene.activeCamera;

    await holds(camera !== null, `${scene.story}: the scene has no active camera, so nothing is being drawn`);

    // 1 is Camera.ORTHOGRAPHIC_CAMERA. Compared as a number rather than imported, because the
    // enum is a static on a class this module has no other reason to load.
    const orthographic = camera?.mode === 1;
    const drawn_ = orthographic ? "2d" : "3d";

    await holds(
        drawn_ === expected,
        `${scene.story}: asks for ${expected} and is drawn through ` +
            `${orthographic ? "an orthographic" : "a perspective"} camera (${String(camera?.getClassName())}), ` +
            `which is the element's own test for which mode it is in`,
    );
}

/**
 * The labels on screen are actually drawn in this colour.
 *
 * READ OFF THE LABEL'S OWN CANVAS, which is the whole point: the eleven label stories differ from
 * one another only in how the words are lettered, and every one of those differences is invisible
 * to the style model's own agreement with itself. What is asked here is whether the pixels are
 * that colour.
 * @param scene - What the story drew.
 * @param hex - The colour the story asks for, as `#rrggbb`.
 * @param what - What that colour is FOR, for the failure message: the text, its outline, its
 *     background.
 */
export async function assertLabelColour(scene: Drawn, hex: string, what: string): Promise<void> {
    const want = [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
    ];
    const near = (candidate: string): boolean =>
        Math.abs(Number.parseInt(candidate.slice(1, 3), 16) - want[0]) <= COLOUR_TOLERANCE &&
        Math.abs(Number.parseInt(candidate.slice(3, 5), 16) - want[1]) <= COLOUR_TOLERANCE &&
        Math.abs(Number.parseInt(candidate.slice(5, 7), 16) - want[2]) <= COLOUR_TOLERANCE;

    const labelled = scene.nodes.filter((node) => node.hasLabelMesh);

    await holds(labelled.length > 0, `${scene.story}: no node is drawing a label, so there is no ${what} to read`);

    const without = labelled
        .filter((node) => !node.labelColours.some(near))
        .map((node) => `${node.id} drew [${node.labelColours.join(", ")}]`);

    await holds(
        without.length === 0,
        `${scene.story}: ${String(without.length)} of ${String(labelled.length)} labels are drawn with no ` +
            `${what} anywhere near ${hex} -- ${listed(without)}`,
    );
}

/**
 * Every label on screen carries at least this much ink.
 *
 * FOR THE STORIES WHOSE SUBJECT IS THE SIZE OF THE LETTERING. A 96px label covers far more of its
 * own canvas than a 48px one, and nothing in the style model can tell whether it was drawn at all.
 * @param scene - What the story drew.
 * @param atLeast - How many opaque pixels the story's lettering must cover.
 */
export async function assertLabelInkAtLeast(scene: Drawn, atLeast: number): Promise<void> {
    const labelled = scene.nodes.filter((node) => node.hasLabelMesh);

    await holds(labelled.length > 0, `${scene.story}: no node is drawing a label at all`);

    const thin = labelled
        .filter((node) => node.labelInk < atLeast)
        .map((node) => `${node.id} covers ${String(node.labelInk)}`);

    await holds(
        thin.length === 0,
        `${scene.story}: ${String(thin.length)} labels cover fewer than ${String(atLeast)} pixels of their own ` +
            `canvas -- ${listed(thin)}`,
    );
}

/**
 * The graph is drawn against the background the story asks for.
 *
 * READ FROM THE SCENE'S CLEAR COLOUR, which is what is actually painted behind everything. A
 * story that sets a background the element never applied looks exactly like one that set none.
 * @param scene - What the story drew.
 * @param hex - The colour, as `#rrggbb`.
 */
export async function assertBackgroundColour(scene: Drawn, hex: string): Promise<void> {
    const clear = scene.graph.scene.clearColor;
    const want = [
        Number.parseInt(hex.slice(1, 3), 16),
        Number.parseInt(hex.slice(3, 5), 16),
        Number.parseInt(hex.slice(5, 7), 16),
    ];
    const drawn_ = [clear.r, clear.g, clear.b].map((value) => Math.round(value * 255));
    const close = drawn_.every((value, index) => Math.abs(value - want[index]) <= COLOUR_TOLERANCE);

    await holds(
        close,
        `${scene.story}: asks for a ${hex} background and the scene is cleared to ` +
            `rgb(${drawn_.join(", ")})`,
    );
}

/**
 * Every node is drawn the same distance from the graph's centre.
 *
 * WHAT A CIRCULAR LAYOUT PROMISES, and the only thing about it that "every node has a position"
 * does not already say.
 * @param scene - What the story drew.
 * @param tolerance - How far the radii may spread, as a fraction of the mean.
 */
export async function assertNodesOnACircle(scene: Drawn, tolerance = 0.05): Promise<void> {
    const centre = scene.nodes
        .reduce(
            (sum, node) => [sum[0] + node.position[0], sum[1] + node.position[1], sum[2] + node.position[2]],
            [0, 0, 0],
        )
        .map((total) => total / scene.nodes.length);
    const radii = scene.nodes.map((node) =>
        Math.hypot(node.position[0] - centre[0], node.position[1] - centre[1], node.position[2] - centre[2]),
    );
    const mean = radii.reduce((sum, radius) => sum + radius, 0) / radii.length;
    const spread = Math.max(...radii) - Math.min(...radii);

    await holds(
        mean > 0 && spread / mean <= tolerance,
        `${scene.story}: a circular layout draws every node the same distance from the centre, and these run ` +
            `from ${Math.min(...radii).toFixed(3)} to ${Math.max(...radii).toFixed(3)} around a mean of ${ 
            mean.toFixed(3)}`,
    );
}

/**
 * The nodes are drawn in this many distinct bands along one axis.
 *
 * WHAT A SHELL, A BIPARTITE AND A MULTIPARTITE LAYOUT ALL PROMISE: the nodes are not merely
 * placed, they are placed in the groups the story named.
 * @param scene - What the story drew.
 * @param axis - Which axis the bands run along.
 * @param expected - How many bands the story promises.
 * @param tolerance - How far apart two coordinates may be and still be the same band.
 */
export async function assertNodeBands(
    scene: Drawn,
    axis: 0 | 1 | 2,
    expected: number,
    tolerance = 0.25,
): Promise<void> {
    const sorted = scene.nodes.map((node) => node.position[axis]).sort((left, right) => left - right);
    let bands = 1;

    for (let index = 1; index < sorted.length; index++) {
        if (sorted[index] - sorted[index - 1] > tolerance) {
            bands++;
        }
    }

    await holds(
        bands === expected,
        `${scene.story}: this layout draws its nodes in ${String(expected)} bands along ` +
            `${["x", "y", "z"][axis]} and the scene holds ${String(bands)}`,
    );
}

/**
 * A skybox is actually in the scene.
 * @param scene - What the story drew.
 */
export async function assertSkyboxDrawn(scene: Drawn): Promise<void> {
    const dome = scene.graph.scene.meshes.filter((mesh) => mesh.name.toLowerCase().includes("dome"));

    await holds(
        dome.length > 0,
        `${scene.story}: asks for a photo-dome skybox and the scene holds no dome mesh at all -- it holds ` +
            `[${[...new Set(scene.graph.scene.meshes.map((mesh) => mesh.name))].join(", ")}]`,
    );
}

/**
 * Selecting a node puts the element's own highlight on screen.
 *
 * THE SCENE'S ANSWER TO "IS IT SELECTED", rather than the session's. The element draws a halo
 * mesh around the selected node and around nothing else, so the picture and the model can be
 * compared with each other -- which is the whole subject of the four selection stories.
 * @param scene - What the story drew.
 * @param id - The node the story selects.
 */
export async function assertSelectionDrawn(scene: Drawn, id: string): Promise<void> {
    scene.graph.selectNode(id);

    await new Promise((resolve) => setTimeout(resolve, RENDER_SETTLE_MS));

    const selected = [...scene.session.selection.nodes].map(String);

    await holds(
        selected.length === 1 && selected[0] === id,
        `${scene.story}: selecting "${id}" left the session holding [${selected.join(", ")}]`,
    );

    const haloed = scene.graph
        .getNodes()
        .filter((node) => {
            const {halo} = (node as unknown as { halo?: { isDisposed: () => boolean } | null });

            return halo !== undefined && halo !== null && !halo.isDisposed();
        })
        .map((node) => String(node.id));

    await holds(
        haloed.length === 1 && haloed[0] === id,
        `${scene.story}: "${id}" is selected and the scene draws a selection highlight around ` +
            `[${haloed.join(", ")}]`,
    );
}

/**
 * Every named element is in the DOM the story built around the graph.
 * @param canvasElement - Where the story was rendered.
 * @param story - How to name it in a failure message.
 * @param selectors - The CSS selectors the story's own controls answer to.
 */
export async function assertControlsPresent(
    canvasElement: HTMLElement,
    story: string,
    selectors: readonly string[],
): Promise<void> {
    const missing = selectors.filter((selector) => canvasElement.querySelector(selector) === null);

    await holds(
        missing.length === 0,
        `${story}: the story's own controls are part of what it demonstrates and ${String(missing.length)} of ` +
            `them are not on the page -- ${listed(missing)}`,
    );
}

/**
 * Heavily weighted edges are drawn shorter, on average, than lightly weighted ones.
 *
 * WHAT A WEIGHTED LAYOUT PROMISES and an unweighted one does not. The edges are split at the
 * median weight; the mean drawn length of those above it must be well under the mean of the
 * rest. Read from where the nodes are DRAWN, so a layout that computed weighted positions the
 * renderer never applied fails too.
 * @param scene - What the story drew.
 * @param column - The edge data field the story's data carries its weights in.
 * @param atMost - The largest heavy-to-light ratio of mean lengths that still counts as weighted.
 *     On Les Miserables the unweighted Kamada-Kawai and ForceAtlas2 stories measure 0.83 to 0.95
 *     and the weighted ones 0.33 to 0.60, so 0.7 separates them with room on both sides.
 */
export async function assertHeavyEdgesShorter(scene: Drawn, column: string, atMost = 0.7): Promise<void> {
    const at = new Map(scene.nodes.map((node) => [node.id, node.position]));
    const edges = [...scene.graph.getDataManager().edges.values()].map((edge) => {
        const from = at.get(String(edge.srcId)) ?? [0, 0, 0];
        const to = at.get(String(edge.dstId)) ?? [0, 0, 0];

        return {
            weight: Number((edge.data as Record<string, unknown>)[column]),
            length: Math.hypot(from[0] - to[0], from[1] - to[1], from[2] - to[2]),
        };
    });
    const weights = edges.map((edge) => edge.weight).sort((a, b) => a - b);
    const median = weights[Math.floor(weights.length / 2)];
    const mean = (lengths: number[]): number => lengths.reduce((sum, length) => sum + length, 0) / lengths.length;
    const heavy = mean(edges.filter((edge) => edge.weight > median).map((edge) => edge.length));
    const light = mean(edges.filter((edge) => edge.weight <= median).map((edge) => edge.length));

    await holds(
        heavy / light <= atMost,
        `${scene.story}: a weighted layout draws heavy edges shorter, and the edges weighing more than ` +
            `${String(median)} average ${heavy.toFixed(3)} long against ${light.toFixed(3)} for the rest ` +
            `(ratio ${(heavy / light).toFixed(3)}, at most ${String(atMost)} expected)`,
    );
}
