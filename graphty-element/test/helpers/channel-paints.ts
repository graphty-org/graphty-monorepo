/**
 * @file The instrument behind the channel gates (channel-paints-node, channel-paints-edge, channel-drawn-matches-render,
 * channel-enum-values-*): a probe value for every channel, what each channel needs written first, a fingerprint of
 * the drawn scene, and one measurement of whether writing a value changed it.
 *
 * WHY THE GATES EXIST, as the single file they replace said it:
 *
 * WHAT IT REPLACES. `test/session/styles/channels.test.ts` checks the same thing like this:
 *
 * ```
 * const unrenderable = CHANNELS.filter((channel) => !CHANNEL_DESCRIPTORS[channel].renderable);
 * assert.deepEqual(unrenderable, ["node.marker"]);
 * ```
 *
 * It reads `renderable` out of the table and asserts the table said what it said. There is no
 * input to that test from the renderer, so it cannot fail for any reason connected to whether
 * anything is drawn -- and that is how `node.tooltip` and `edge.tooltip` came to be published as
 * `renderable: true`, sold in `docs/guide/styling.md` as "the words to show on hover", and drawn
 * by nothing in any released version of this package.
 *
 * WHAT THIS DOES INSTEAD. It mounts one graph per target, and for each renderable channel it
 * takes a fingerprint of the scene, adds a layer writing that one channel a value far from the
 * default, takes the fingerprint again, and requires the two to differ. Then it removes the layer
 * and requires the fingerprint to come back -- so a channel cannot pass by breaking the scene
 * permanently, and one channel's test cannot leak into the next.
 *
 * THE FINGERPRINT IS STRUCTURE AND PIXELS, and it needs both. The structure -- mesh names,
 * visibility, scaling, bounding extents, outline settings, material colours, alpha, wireframe,
 * instance colour buffers and the scene's effect layers -- catches a channel that builds or
 * resizes something, and misses one that only changes what a shader does with a mesh already
 * there. Measured while writing this file: a node's glow colour and its outline colour both draw
 * through a Babylon effect LAYER, which keeps its per-mesh colours in a private map, so a purely
 * structural reading called both of them unpainted. They paint; the instrument was blind.
 *
 * So each reading also carries a coarse histogram of the frame: every pixel quantised to four
 * bits per channel and counted. Two renderings of an unchanged scene in headless Chromium give
 * byte-identical histograms, which is what lets "the picture changed" be asked with a threshold
 * near zero rather than a tolerance wide enough to swallow a real change.
 *
 * THE PROBE VALUES ARE DERIVED FROM THE CHANNEL TABLE. A number is placed away from the default
 * inside whatever bounds the descriptor declares, an enum takes its last member, a colour is
 * magenta. So a channel added to the table is tested here with no edit to this file -- which is
 * the property that makes this a gate rather than a checklist.
 *
 * WHEN A CHANNEL CANNOT PASS, the answer is `UNPAINTED_CHANNELS` in `src/catalog/unreachable.ts`:
 * a published list naming the channel and saying plainly that nothing draws it. A consumer reads
 * that list instead of discovering the gap by writing a layer that does nothing. A channel in
 * that list which HAS started painting fails too, so the entry cannot outlive the gap.
 *
 * THE BATCHED PATH GETS A PASS OF ITS OWN, in channel-paints-node.test.ts. The node prerequisites
 * write a label and a border, either of which keeps a row off the batch, so the measurements here
 * are of object rows whatever the render path.
 */

import { assert } from "vitest";

import type { LabelStyle } from "../../src/catalog/types";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import type { ChannelDescriptor } from "../../src/session/styles/channels";

/** Two nodes and the edge between them: enough for every channel, small enough to be quick. */
export const NODES = [{ id: "alpha" }, { id: "omega" }];

/** Where the probe graph's nodes stand. */
const PLACES = [
    { x: -8, y: -6, z: 0 },
    { x: 22, y: 2, z: 0 },
];

/**
 * The edge every edge channel is measured on, and a second one beside it: a bundle's spacing is
 * drawn only between two edges. Straight, the two lie on one line and draw as one.
 */
export const EDGES = [
    { src: "alpha", dst: "omega" },
    { src: "alpha", dst: "omega" },
];

/** A curved edge with a support point, at a unit that sets the circular layout's nodes 100 support units apart. */
const SUPPORTED = { "edge.curvature": true, "edge.supportModel": "barnesHut", "edge.supportUnit": 0.32 };

/**
 * What a channel needs written before it has anything to change, in a layer of its own around its
 * measurement: a bundle fans apart only when its edges are curved.
 */
export const PREREQUISITES: Readonly<Partial<Record<string, Record<string, unknown>>>> = {
    "edge.fanSpacing": { "edge.curvature": true },
    "edge.fanned": { "edge.curvature": true },
    // An arc radius bends only a curved edge that does not fan out of its bundle, and a bend curve only a
    // curved edge that has a bend to curve through: the table's own caveats say each ignores a straight edge.
    "edge.arcRadius": { "edge.curvature": true, "edge.fanned": false },
    "edge.bendCurve": { "edge.curvature": true, "edge.bends": "0.5,0.5" },
    // A support point bends only a curved edge, and its numbers move only a support point there is. The nodes stand
    // 32 scene units apart (scale 0.2 of the circular layout's 80), so a support unit of 0.32 puts them 100 units apart.
    "edge.supportModel": { "edge.curvature": true },
    "edge.supportSpringLength": SUPPORTED,
    "edge.supportSpringConstant": SUPPORTED,
    "edge.supportRepulsion": SUPPORTED,
    "edge.supportCentralGravity": SUPPORTED,
    "edge.supportUnit": SUPPORTED,
    "edge.supportScale": SUPPORTED,
    // An arc height raises only a raised route; every other layout draws edges straight.
    "edge.arcHeight": { "edge.route": "arc" },
    // A direction turns a gradient; with no second colour the fill is flat whichever way it runs.
    "node.gradientDirection": { "node.gradientColor": "#00ff00" },
    "node.gradientKind": { "node.gradientColor": "#00ff00" },
    // Stops place colours, three of them so the middle one has somewhere to move.
    "node.gradientStops": { "node.gradientColors": "#ff0000 #00ff00 #0000ff" },
    // a radial gradient's middle and reach move only a radial gradient
    "node.gradientCenterX": { "node.gradientColor": "#00ff00", "node.gradientKind": "radial" },
    "node.gradientCenterY": { "node.gradientColor": "#00ff00", "node.gradientKind": "radial" },
    "node.gradientRadius": { "node.gradientColor": "#00ff00", "node.gradientKind": "radial" },
    // A wrap option changes only a label wider than its wrap width; the blank count only one with blanks.
    "node.labelWrapEllipsis": { "node.labelWrapWidth": 0.05 },
    "node.labelWrapAnywhere": { "node.labelWrapWidth": 0.05 },
    "node.labelWrapSpaceCount": { "node.label": "a b c d e f g h", "node.labelWrapWidth": 3 },
    "edge.labelWrapEllipsis": { "edge.labelWrapWidth": 0.05 },
    "edge.labelWrapAnywhere": { "edge.labelWrapWidth": 0.05 },
    "edge.labelWrapSpaceCount": { "edge.label": "a b c d e f g h", "edge.labelWrapWidth": 3 },
    // A minimum screen size hides only a label drawn smaller than it: letters a pixel or two tall
    // are, at this canvas and zoom, under the probe's 4 px.
    "node.labelMinScreenSize": { "node.labelSize": 1 },
    "edge.labelMinScreenSize": { "edge.labelSize": 1 },
    // A wave's own swing and period shape only a sine-wave or zigzag line or border, and a period only
    // a wave that has a swing of its own.
    "edge.waveAmplitude": { "edge.style": "sinewave" },
    "edge.wavePeriod": { "edge.style": "sinewave", "edge.waveAmplitude": 1 },
    // A dash length shapes only a dashed line, a gap only a dashed or dotted one.
    "edge.dashLength": { "edge.style": "dash" },
    "edge.dashGap": { "edge.style": "dot" },
    "node.borderWaveAmplitude": { "node.borderStyle": "zigzag", "node.borderWidth": 0.1 },
    "node.borderWavePeriod": { "node.borderStyle": "zigzag", "node.borderWidth": 0.1, "node.borderWaveAmplitude": 1 },
    // Where runs of different sizes meet changes only a line holding runs of different sizes.
    "node.labelRunAlign": { "node.label": "a<size='300%'>M</size>" },
    "edge.labelRunAlign": { "edge.label": "a<size='300%'>M</size>" },
    // A node's further parts are outlined, and its lines drawn, in its border; a line's own width needs a line.
    "node.shapeParts": { "node.shape": "polygon", "node.borderWidth": 0.1, "node.borderColor": "#000000" },
    "node.shapeLines": { "node.shape": "rectangle", "node.borderWidth": 0.1, "node.borderColor": "#000000" },
    "node.shapeLineWidth": { "node.shape": "rectangle", "node.borderColor": "#000000", "node.shapeLines": "-1,0 1,0" },
    "node.shapeLineHaloColor": {
        "node.shape": "rectangle",
        "node.borderColor": "#000000",
        "node.shapeLines": "-1,0 1,0",
        "node.shapeLineHaloWidth": 0.2,
    },
    "node.shapeLineHaloWidth": {
        "node.shape": "rectangle",
        "node.borderColor": "#000000",
        "node.shapeLines": "-1,0 1,0",
        "node.shapeLineHaloColor": "#ff0000",
    },
    // An external label's place and look change only an external label there is: its words switch it on.
    "node.xlabelStyle": { "node.xlabel": "OUT" },
    "node.xlabelLocation": { "node.xlabel": "OUT" },
    "node.xlabelOffsetX": { "node.xlabel": "OUT" },
    "node.xlabelOffsetY": { "node.xlabel": "OUT" },
    "edge.xlabelStyle": { "edge.xlabel": "OUT" },
    "edge.xlabelLocation": { "edge.xlabel": "OUT" },
    "edge.xlabelOffsetX": { "edge.xlabel": "OUT" },
    "edge.xlabelOffsetY": { "edge.xlabel": "OUT" },
};

/** How wide the canvas is. */
export const WIDTH = 480;

/** How tall it is. */
export const HEIGHT = 360;

/**
 * How many pixels must fall in a different bucket before the picture counts as changed.
 *
 * Deliberately tiny. Two renderings of an unchanged scene agree exactly, so any margin at all is
 * only insurance against a driver that dithers; a margin wide enough to hide a real change would
 * turn this file's central question into a formality. The arrow caps at the end of one edge are
 * some hundreds of pixels, which is the smallest thing any channel here draws.
 */
export const PIXEL_CHANGE = 32;

/** How many buckets the histogram has: four bits per channel, three channels. */
const BUCKETS = 16 * 16 * 16;

/**
 * A label style far enough from the default to change the plane a label is drawn on.
 *
 * Both fields, because a colour alone repaints the same texture at the same size and a size
 * alone leaves a monochrome fingerprint unchanged in a scene read structurally.
 */
const LABEL_PROBE: LabelStyle = { sizePx: 96, color: "#ff00ff", background: "#00ff00", padding: 20 };

/**
 * A value for one channel that no default could be mistaken for.
 * @param descriptor - The channel to write.
 * @returns What to write, or undefined when the channel takes no value.
 */
export function probeFor(descriptor: ChannelDescriptor): unknown {
    switch (descriptor.accepts) {
        case "color":
            return "#ff00ff";
        case "number": {
            const low = descriptor.min ?? 0;

            // A bounded channel is placed a third of the way up its range, because its default is
            // usually one end of it -- an opacity's default is 1, which is its maximum. An
            // unbounded one is placed well above whatever its default is, which for every size,
            // width and speed in the table is 1 or 0.
            return descriptor.max === undefined ? low + 4 : low + (descriptor.max - low) * 0.35;
        }
        case "text":
            // A route is text in a grammar of its own: one bend halfway along, half a length off.
            if (descriptor.channel === "edge.bends") {
                return "0.5,0.5";
            }
            // So is a port: the middle of the node's top, where an unported line never ends.
            if (descriptor.channel === "edge.sourcePort" || descriptor.channel === "edge.targetPort") {
                return "0,1";
            }
            // A gradient's colors and stops are lists of their own.
            if (descriptor.channel === "node.gradientColors") {
                return "#ff0000 #00ff00 #0000ff";
            }
            if (descriptor.channel === "node.gradientStops") {
                return "0 0.1 1";
            }
            // A node's further parts are polygons beside it, and its lines polylines across it.
            if (descriptor.channel === "node.shapeParts") {
                return "1,-1 3,-1 2,1";
            }
            if (descriptor.channel === "node.shapeLines") {
                return "-1,-1 1,1; -1,1 1,-1";
            }
            // and its further texts a JSON list of points and words
            if (descriptor.channel === "node.shapeTexts") {
                return '[[0, 0, "CHANNEL PROBE WORDS"]]';
            }
            // and its table label rows of cells
            if (descriptor.channel === "node.labelTable") {
                return '{"cellBorder":0.1,"rows":[{"cells":[{"lines":[{"text":"CHANNEL PROBE WORDS"}]}]}]}';
            }
            // an edge label's table, in the label's own units (its font size's)
            if (descriptor.channel === "edge.labelTable") {
                return '{"cellBorder":4,"cellPadding":8,"rows":[{"cells":[{"lines":[{"text":"CHANNEL PROBE WORDS"}]}]}]}';
            }
            return "CHANNEL PROBE WORDS";
        case "boolean":
            // The other state from the default: a switch that is on by default (`node.visible`)
            // changes the picture only when it is turned off, and a bundle fans unless told not to.
            return descriptor.default !== true && descriptor.channel !== "edge.fanned";
        case "enum": {
            const values = descriptor.values ?? [];

            return values[values.length - 1];
        }
        case "labelStyle":
            return LABEL_PROBE;
        case "shaderUses":
            // An empty list draws the plain look on every build.
            return [];
        default:
            return undefined;
    }
}

/**
 * What one mesh contributes to the fingerprint.
 * @param mesh - The mesh, as Babylon hands it back from the scene.
 * @returns A line describing everything about it a style channel could have changed.
 */
export function describeMesh(mesh: Record<string, unknown>): string {
    const material = mesh.material as Record<string, unknown> | null | undefined;
    const buffers = mesh.instancedBuffers as Record<string, unknown> | undefined;
    const parts = [
        String(mesh.name),
        String(mesh.isVisible),
        String(mesh.visibility),
        // Which pass draws it: a label drawn over the whole graph is in a group of its own.
        String(mesh.renderingGroupId),
        String(mesh.scaling),
        String(mesh.renderOutline),
        String(mesh.outlineWidth),
        String(mesh.outlineColor),
        String(material?.name),
        String(material?.alpha),
        String(material?.wireframe),
        String(material?.diffuseColor),
        String(material?.emissiveColor),
        String(material?.specularColor),
        String(buffers?.color),
    ];

    try {
        const bounds = (mesh.getBoundingInfo as () => { boundingBox: { extendSize: unknown } })();
        parts.push(String(bounds.boundingBox.extendSize));
    } catch {
        // A mesh with no geometry yet has no bounding info, which is itself a stable reading.
        parts.push("unbounded");
    }

    return parts.join("|");
}

/** One reading of the drawn scene: what is in it, and what it looks like. */
export interface Reading {
    /** Everything about the scene graph a style channel could have changed. */
    readonly structure: string;
    /** How many pixels fall in each coarse colour bucket. */
    readonly histogram: Uint32Array;
    /** The frame itself, RGBA, for {@link pixelsChanged}. */
    readonly pixels: Uint8Array;
}

/**
 * How many pixels moved between two readings of the frame.
 * @param one - The earlier reading.
 * @param other - The later one.
 * @returns The number of pixels that changed bucket, counting each move once.
 */
export function pixelsMoved(one: Reading, other: Reading): number {
    let moved = 0;

    for (let bucket = 0; bucket < BUCKETS; bucket++) {
        moved += Math.abs(one.histogram[bucket] - other.histogram[bucket]);
    }

    return moved / 2;
}

/**
 * How many pixels differ between two readings of the frame, place by place. The histogram ({@link pixelsMoved}) is
 * blind to a change that keeps every colour's count: a cap turned to its other side, a diamond for an arrow of the
 * same area. Two renderings of an unchanged scene are byte-identical, so any difference is a change.
 * @param one - The earlier reading.
 * @param other - The later one.
 * @returns The number of pixels whose colour changed.
 */
export function pixelsChanged(one: Reading, other: Reading): number {
    let changed = 0;
    const length = Math.min(one.pixels.length, other.pixels.length);
    for (let at = 0; at < length; at += 4) {
        if (
            one.pixels[at] !== other.pixels[at] ||
            one.pixels[at + 1] !== other.pixels[at + 1] ||
            one.pixels[at + 2] !== other.pixels[at + 2]
        ) {
            changed++;
        }
    }

    return changed;
}

/**
 * Mount the probe graph in one view: two nodes, two edges between them, a circular layout, and the prerequisites
 * every channel of the target needs (words, a border, caps, captions, a band).
 * @param view - The view.
 * @param renderPath - How nodes are drawn.
 * @returns The container, the graph and its session.
 */
export async function mountProbeGraph(
    view: "2d" | "3d",
    renderPath: "objects" | "batched" = "objects",
): Promise<{ container: HTMLElement; graph: Graph; session: GraphSession }> {
    const container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    const graph = new Graph(container);
    graph.setRenderPath(renderPath);
    await graph.init();
    const session = graph.getSession();
    // Placed rather than laid out by physics: a scene fingerprint taken while nodes are still drifting differs from
    // one frame to the next for reasons that have nothing to do with a channel. About 32 units apart (see the
    // support unit above), and not on opposite sides of the origin, where a great-circle route is a straight line.
    await graph.addNodes(NODES.map((node, i) => ({ ...node, position: PLACES[i] })));
    await graph.addEdges(EDGES);
    // A flat layout in the element's opening 3D view: an edge's lift is drawn only for a flat layout in the 3D
    // view, and asking for the 3D view again lays the graph out in 3D.
    await graph.setLayout("fixed", { dim: 2 });
    if (view === "2d") {
        await graph.setViewMode(view);
    }
    await operationQueueOf(graph).waitForCompletion();
    return { container, graph, session };
}

/**
 * Switch on what the channels of one target need to have anything to change, in a layer of its own, once.
 * @param session - The session.
 * @param graph - The graph.
 */
export async function addProbePrerequisites(session: GraphSession, graph: Graph): Promise<void> {
    await session.styles.add({
        name: "channel probe prerequisites",
        target: "node",
        selector: { match: "everything" },
        // A border to recolour and restyle: its colour and style draw nothing alone. No halo: any halo channel
        // switches the halo on alone, so one drawn here would leave node.halo nothing to change.
        set: { "node.label": "WORDS", "node.borderWidth": 0.3 },
    });
    await session.styles.add({
        name: "channel probe prerequisites",
        target: "edge",
        selector: { match: "everything" },
        set: {
            "edge.label": "WORDS",
            "edge.arrowHead": "normal",
            "edge.arrowTail": "normal",
            // Big caps: at the default size an arrow is a few dozen pixels, too near the threshold for a cap COLOUR.
            "edge.arrowHeadSize": 3,
            "edge.arrowTailSize": 3,
            // The words switch a caption on, so the caption STYLE channels have something to change; they differ
            // from the probe's, so the channel that writes the words still has something to move.
            "edge.arrowHeadText": "HEAD",
            "edge.arrowTailText": "TAIL",
            // A band's width and opacity need a color that draws one.
            "edge.bandColor": "#0077BB",
        },
    });
    await operationQueueOf(graph).waitForCompletion();
}

/**
 * Let the last repaint reach the scene, then read what is drawn.
 * @param graph - The graph.
 * @param settle - Whether to wait for the final picture first.
 * @returns The structure of the scene and a histogram of the frame.
 */
export async function readScene(graph: Graph, settle = true): Promise<Reading> {
    // The element's own "this is on screen" signal, NOT the queue: a style edit resolves once its pass has run,
    // and the meshes take its paint on the render loop's next update. Unsettled, the frame as it is: a play in
    // progress, which the final picture is after.
    if (settle) {
        await graph.waitForStableFrame();
    }
    // One more frame, so the buffer read below is a frame of that picture.
    graph.scene.render();
    const { scene, engine } = graph;
    const meshes = [...scene.meshes].map((mesh) => describeMesh(mesh as unknown as Record<string, unknown>)).sort();
    const layers = scene.effectLayers
        .map((layer) => `${layer.name}:${String((layer as unknown as { intensity?: number }).intensity)}`)
        .sort();
    const pixels = (await engine.readPixels(
        0,
        0,
        engine.getRenderWidth(),
        engine.getRenderHeight(),
    )) as unknown as Uint8Array;
    const histogram = new Uint32Array(BUCKETS);
    for (let at = 0; at < pixels.length; at += 4) {
        const bucket = ((pixels[at] >> 4) << 8) | ((pixels[at + 1] >> 4) << 4) | (pixels[at + 2] >> 4);
        histogram[bucket]++;
    }

    return { structure: [...meshes, `effects:${layers.join(",")}`].join("\n"), histogram, pixels };
}

/** What writing one value did. */
export interface PaintMeasure {
    /** Whether the scene's structure or picture changed. */
    readonly painted: boolean;
    /** How many pixels moved by writing it. */
    readonly moved: number;
    /** How many pixels changed colour, place by place, by writing it ({@link pixelsChanged}). */
    readonly changed: number;
    /** How many pixels stayed moved after the layer was removed. */
    readonly leftMoved: number;
}

/**
 * Write one channel's value over a baseline and read whether the scene changed, then take it away again.
 * @param graph - The graph.
 * @param session - The session.
 * @param target - Nodes or edges.
 * @param channel - The channel.
 * @param value - The value to write.
 * @param base - What both frames hold besides (the channel's prerequisites, a baseline value of it).
 * @returns The measurement.
 */
export async function measurePaint(
    graph: Graph,
    session: GraphSession,
    target: "node" | "edge",
    channel: string,
    value: unknown,
    base: Record<string, unknown> = {},
): Promise<PaintMeasure> {
    const prerequisite =
        Object.keys(base).length === 0
            ? null
            : await session.styles.add({
                  name: `probe base ${channel}`,
                  target,
                  selector: { match: "everything" },
                  set: base,
              } as never);
    const before = await readScene(graph);
    const added = await session.styles.add({
        name: `probe ${channel}`,
        target,
        selector: { match: "everything" },
        set: { [channel]: value },
    } as never);
    const after = await readScene(graph);
    await session.styles.remove(added.id);
    const restored = await readScene(graph);
    if (prerequisite !== null) {
        await session.styles.remove(prerequisite.id);
    }

    const moved = pixelsMoved(before, after);
    return {
        painted: after.structure !== before.structure || moved > PIXEL_CHANGE,
        moved,
        changed: pixelsChanged(before, after),
        leftMoved: pixelsMoved(before, restored),
    };
}

/**
 * The views a channel's `drawnWhen` lets it draw in.
 * @param descriptor - The channel.
 * @returns The views.
 */
export function viewsOf(descriptor: ChannelDescriptor): readonly ("2d" | "3d")[] {
    const only = descriptor.drawnWhen?.find((condition) => "dimension" in condition);
    return only === undefined ? ["2d", "3d"] : [(only as { dimension: "2d" | "3d" }).dimension];
}

/** Every channel on the table, in a fixed order, so a failure names the same thing twice. */
export function sortedDescriptors(descriptors: Record<string, ChannelDescriptor>): ChannelDescriptor[] {
    assert.isAbove(Object.keys(descriptors).length, 0);
    return Object.values(descriptors).sort((one, other) => one.channel.localeCompare(other.channel));
}

/** A picture that loads at once, twice as wide as tall, red on the left and blue on the right. */
const PICTURE = `data:image/svg+xml;utf8,${encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="20">' +
        '<rect width="20" height="20" fill="#ff0000"/><rect x="20" width="20" height="20" fill="#0000ff"/></svg>',
)}`;

/**
 * What an enum channel's values need written beside them to look different from its default, beyond its
 * prerequisites: a halo's own shape shows only against a node of another shape, a cap part-way along a line only
 * in a color the line is not.
 */
export const ENUM_SETUP: Readonly<Partial<Record<string, Record<string, unknown>>>> = {
    // a picture's fit, repeat, clip and size show only on a picture that loads, drawn at a small size of its own
    // ("none" with no size of its own is contained in the node, as "contain" draws it)
    "node.imageFit": { "node.image": PICTURE, "node.imageWidth": 0.5 },
    "node.imageRepeat": { "node.image": PICTURE, "node.imageFit": "none", "node.imageWidth": 0.5 },
    "node.imageClip": { "node.image": PICTURE, "node.imageFit": "none" },
    "node.imageAutoSize": { "node.image": PICTURE, "node.imageFit": "none", "node.imageWidth": 0.5 },
    // a chart's kind shows only on a chart with values, in two colors
    "node.chartKind": { "node.chartValues": "1 3 2", "node.chartColors": "#ff0000 #00ff00" },
    // a stripe's direction shows only on stripes
    "node.stripeDirection": { "node.stripeColors": "#ff0000 #00ff00" },
    // an outer border's style shows only on an outer border wide enough to see
    "node.outerBorderStyle": { "node.outerBorderWidth": 0.4, "node.outerBorderColor": "#ff0000" },
    // "uniform" sizes every shape as the default icosphere is drawn, so it differs on any other solid
    "node.sizeMode": { "node.shape": "box" },
    // a line's gradient kind shows only on a line with two colors; an outline's style only on an outline
    "edge.gradientKind": { "edge.gradientColors": "#ff0000 #00ff00", "edge.width": 2 },
    "edge.outlineStyle": { "edge.outlineWidth": 0.4, "edge.outlineColor": "#ff0000", "edge.width": 2 },
    // a picture cap draws only with a picture
    "edge.arrowHead": { "edge.arrowHeadImage": PICTURE },
    "edge.arrowTail": { "edge.arrowTailImage": PICTURE },
    "node.underlayShape": { "node.shape": "star", "node.underlayOpacity": 1, "node.underlayPadding": 0.5 },
    "node.overlayShape": { "node.shape": "star", "node.overlayOpacity": 0.6, "node.overlayPadding": 0.5 },
    // the middle head's open caps are filled, so their frame and inside are two materials, each of which must be
    // drawn in front of the line; the middle tail's are not, so both kinds are measured
    "edge.arrowMiddleHead": {
        "edge.arrowMiddleHeadColor": "#ff0000",
        "edge.arrowMiddleHeadSize": 6,
        "edge.arrowMiddleHeadImage": PICTURE,
        "edge.arrowMiddleHeadFillColor": "#00ff00",
    },
    "edge.arrowMiddleTail": {
        "edge.arrowMiddleTailColor": "#ff0000",
        "edge.arrowMiddleTailSize": 6,
        "edge.arrowMiddleTailImage": PICTURE,
    },
    // a cap's side shows only on a cap there is, part-way along the line in a color the line is not
    "edge.arrowMiddleHeadSide": {
        "edge.arrowMiddleHead": "normal",
        "edge.arrowMiddleHeadColor": "#ff0000",
        "edge.arrowMiddleHeadSize": 6,
    },
    "edge.arrowMiddleTailSide": {
        "edge.arrowMiddleTail": "normal",
        "edge.arrowMiddleTailColor": "#ff0000",
        "edge.arrowMiddleTailSize": 6,
    },
    // a label's panel, border, alignment and shift show only on a panel, a border, lines of different widths
    "node.labelBackgroundShape": { "node.labelBackground": "#00ff00" },
    "node.labelBorderAlign": { "node.labelBorderWidth": 6, "node.labelBorder": "#ff0000" },
    "node.labelTextAlign": { "node.label": "WORDS\nA" },
    "node.labelShiftOf": { "node.labelShiftX": 1, "node.labelPadding": 20, "node.labelBackground": "#00ff00" },
    // a box shows its sizing only on an inside label too large for its node, against a side
    "node.labelBox": {
        "node.labelBackground": "#00ff00",
        "node.labelLetterSize": 3,
        "node.labelLocation": "inside-left",
    },
    // where runs of different sizes meet moves a few pixels on letters this small: larger letters show it
    "node.labelRunAlign": { "node.labelLetterSize": 3 },
    "edge.labelBackgroundShape": { "edge.labelBackground": "#00ff00" },
    "edge.labelBorderAlign": { "edge.labelBorderWidth": 6, "edge.labelBorder": "#ff0000" },
    "edge.labelTextAlign": { "edge.label": "WORDS\nA" },
    "edge.labelShiftOf": { "edge.labelShiftX": 1, "edge.labelPadding": 20, "edge.labelBackground": "#00ff00" },
    // where runs of different sizes meet moves a few pixels on letters this small: larger letters show it
    "edge.labelRunAlign": { "edge.labelLetterSize": 3 },
    // a padding ratio is measured against the side this names
    "node.groupPaddingOf": { "node.groupPaddingRatio": 1 },
};

/**
 * What an enum value is measured against where its default cannot differ from every value: a padding measured
 * against the members' box's longer side is its width or its height, whichever is longer, so "max" or "min" always
 * equals the default "width" on some box. The average of the two sides differs from each.
 */
const ENUM_AGAINST: Readonly<Partial<Record<string, string | ((value: string) => string)>>> = {
    "node.groupPaddingOf": "average",
    // A halo's own shape has no default (it follows the node's) and a solid one is drawn as its flat silhouette,
    // so neighbours in the list draw alike (torus and torus-knot are both an ellipse): each is measured against a
    // star, which no other value draws, and the star against an ellipse.
    "node.underlayShape": (value) => (value === "star" ? "ellipse" : "star"),
    "node.overlayShape": (value) => (value === "star" ? "ellipse" : "star"),
};

/**
 * The enum values whose change the probe scene shows only in its structure, never in its pixels, each with why.
 * Every other value of an enum must move pixels where it draws: a value that builds a mesh which is then hidden,
 * covered or off screen changes the structure and nothing a reader sees (a middle cap under its line did that).
 * Keyed `channel=value` for an enum value, or `channel` for a channel that names a view; may only shrink.
 */
export const STRUCTURE_ONLY_VALUES: Readonly<Partial<Record<string, string>>> = {
    ...Object.fromEntries(
        [
            "node.modelCenter=origin",
            "node.modelDoubleSided=false",
            "node.modelDoubleSided=true",
            "node.modelFit=stretch",
            ...["-x", "x", "-y", "y", "-z", "z"].map((up) => `node.modelSourceUp=${up}`),
            "node.modelTint=replace",
            "node.modelTint=true",
            "node.modelTint=untextured",
        ].map((key) => [
            key,
            "The probe scene has no model that loads (a model is a served file); each value's pixels are measured " +
                "on a real model in test/browser/models/ (model-animation.test.ts: up axes, origin, fit, sides; " +
                "model-looks.test.ts: tints).",
        ]),
    ),
    "node.labelDeclutter=degree":
        "Declutter thins overlapping labels; the probe's two labels never overlap. Measured in label-declutter.test.ts.",
    "node.labelDeclutter=size":
        "Declutter thins overlapping labels; the probe's two labels never overlap. Measured in label-declutter.test.ts.",
    "node.labelLocation=automatic":
        'By design "automatic" draws a node label at its normal place, the top, which is the default (Node.ts).',
    "edge.xlabelLocation=automatic":
        'By design "automatic" draws an edge text at its normal place, the default (Edge.ts resolveAttach).',
};

/**
 * Whether a measurement shows a value drawn: pixels changed, or, for a value on {@link STRUCTURE_ONLY_VALUES}, the
 * structure changed. A listed value that starts changing pixels fails until its entry is deleted, so the list only
 * shrinks.
 * @param measure - The measurement.
 * @param key - `channel=value`, or `channel`.
 * @returns Whether it drew.
 */
export function drewPixels(measure: PaintMeasure, key: string): boolean {
    if (STRUCTURE_ONLY_VALUES[key] === undefined) {
        return measure.changed > PIXEL_CHANGE;
    }

    assert.isAtMost(
        measure.changed,
        PIXEL_CHANGE,
        `${key} now changes ${String(measure.changed)} pixels: delete its STRUCTURE_ONLY_VALUES entry.`,
    );
    return measure.painted;
}

/** vitest's describe, beforeAll, afterAll and it, handed in so this module registers no tests by itself. */
interface Suite {
    describe: (title: string, body: () => void) => void;
    beforeAll: (body: () => Promise<void>) => void;
    afterAll: (body: () => void) => void;
    it: (title: string, body: () => Promise<void>) => void;
}

/**
 * A camera turned 60 degrees about its target, for a value that shows only where nodes stand at different depths
 * (`node.sizeSpace` "pivot"); returns what puts it back.
 * @param graph - The graph.
 * @returns The undo.
 */
export async function turnedCamera(graph: Graph): Promise<() => Promise<void>> {
    const state = graph.getCameraState();
    const target = state.target ?? { x: 0, y: 0, z: 0 };
    const position = state.position ?? { x: 0, y: 0, z: -1 };
    const [dx, dz] = [position.x - target.x, position.z - target.z];
    const turn = Math.PI / 3;
    await graph.setCameraState({
        position: {
            x: target.x + dx * Math.cos(turn) - dz * Math.sin(turn),
            y: position.y,
            z: target.z + dx * Math.sin(turn) + dz * Math.cos(turn),
        },
        target,
    });
    return async () => {
        await graph.setCameraState(state);
    };
}

/** What a channel's values need done to the scene, in the views they draw in, before they are measured. */
const ENUM_PREPARE: Readonly<Partial<Record<string, (graph: Graph) => Promise<() => Promise<void>>>>> = {
    "node.sizeSpace": turnedCamera,
};

/** A compound graph: a group the two nodes name as their parent, as a Cytoscape.js file writes it. */
const GROUPED = JSON.stringify({
    elements: [
        { data: { id: "box" } },
        { data: { id: "alpha", parent: "box" }, position: { x: -60, y: 0 } },
        { data: { id: "omega", parent: "box" }, position: { x: 60, y: 10 } },
        { data: { id: "e", source: "alpha", target: "omega" } },
    ],
});

/**
 * Mount the compound probe graph in one view, for the group channels (`node.group*`), which size a group drawn
 * round its members. Group sizing is read from a file's styles, so the caller switches the file-styles feature on.
 * @param view - The view.
 * @returns The container, the graph and its session.
 */
export async function mountGroupGraph(
    view: "2d" | "3d",
): Promise<{ container: HTMLElement; graph: Graph; session: GraphSession }> {
    const container = document.createElement("div");
    container.style.width = `${String(WIDTH)}px`;
    container.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    await graph.addDataFromSource("json", { data: GROUPED });
    // where the file put them: a members' box wider than tall, so each side a padding is measured against differs
    await graph.setLayout("fixed", { dim: 2 });
    if (view === "2d") {
        await graph.setViewMode(view);
    }
    await operationQueueOf(graph).waitForCompletion();
    return { container, graph, session: graph.getSession() };
}

/**
 * Every value of every renderable enum channel the filter picks, in both views, against the channel's own
 * default: each must change the picture. One graph per view.
 * @param name - What the suite covers.
 * @param pick - Which channels.
 * @param suite - vitest's describe, beforeAll, afterAll and it.
 * @param suite.describe - describe.
 * @param suite.beforeAll - beforeAll.
 * @param suite.afterAll - afterAll.
 * @param suite.it - it.
 * @param descriptors - The channel table.
 */
export function enumValuesSuite(
    name: string,
    pick: (descriptor: ChannelDescriptor) => boolean,
    suite: Suite,
    descriptors: Record<string, ChannelDescriptor>,
): void {
    const channels = sortedDescriptors(descriptors).filter(
        (descriptor) => descriptor.renderable && descriptor.accepts === "enum" && pick(descriptor),
    );
    // the group channels size a group drawn round its members, which only a compound graph has
    const isGroup = (descriptor: ChannelDescriptor): boolean => descriptor.channel.startsWith("node.group");
    for (const [kind, ofKind] of [
        ["", channels.filter((entry) => !isGroup(entry))],
        [" on a group", channels.filter(isGroup)],
    ] as const) {
        if (ofKind.length > 0) {
            valuesInViews(`${name}${kind}`, ofKind, kind !== "", suite);
        }
    }

    suite.it("measures some channels", async () => {
        assert.isAbove(channels.length, 0, name);
        await Promise.resolve();
    });
}

/**
 * The enum suite's measurements, for some channels, in both views.
 * @param name - What the suite covers.
 * @param channels - The channels.
 * @param grouped - Whether they are measured on the compound graph.
 * @param suite - vitest's describe, beforeAll, afterAll and it.
 */
function valuesInViews(name: string, channels: readonly ChannelDescriptor[], grouped: boolean, suite: Suite): void {
    for (const view of ["2d", "3d"] as const) {
        suite.describe(`every value of ${name} draws in ${view}`, () => {
            let container: HTMLElement;
            let graph: Graph;
            let session: GraphSession;

            suite.beforeAll(async () => {
                if (grouped) {
                    ({ container, graph, session } = await mountGroupGraph(view));
                    return;
                }

                ({ container, graph, session } = await mountProbeGraph(view));
                await addProbePrerequisites(session, graph);
            });

            suite.afterAll(() => {
                graph.dispose();
                container.remove();
            });

            for (const descriptor of channels.filter((entry) => viewsOf(entry).includes(view))) {
                const fallback = descriptor.default === undefined ? undefined : String(descriptor.default);
                const values = descriptor.values ?? [];
                const chosen = ENUM_AGAINST[descriptor.channel];
                const skipped = typeof chosen === "function" ? undefined : (chosen ?? fallback);
                for (const value of values.filter((entry) => entry !== skipped)) {
                    // With no declared default (the layout decides `edge.route`), a value is measured against the
                    // next one in the list, so every value must be told apart from its neighbour.
                    const against =
                        (typeof chosen === "function" ? chosen(value) : chosen) ??
                        descriptor.default ??
                        values[(values.indexOf(value) + 1) % values.length];
                    // a value narrower than its channel draws in its own views only, and nothing in the others
                    const drawsHere = descriptor.valueViews?.[value]?.includes(view) ?? true;
                    suite.it(`${descriptor.channel} = ${value}`, async () => {
                        const base = {
                            ...PREREQUISITES[descriptor.channel],
                            ...ENUM_SETUP[descriptor.channel],
                            [descriptor.channel]: against,
                        };
                        const prepare = drawsHere ? ENUM_PREPARE[descriptor.channel] : undefined;
                        const undo = prepare === undefined ? undefined : await prepare(graph);
                        const measure = await measurePaint(
                            graph,
                            session,
                            descriptor.target,
                            descriptor.channel,
                            value,
                            base,
                        );
                        await undo?.();
                        // Where it draws, its pixels must move (drewPixels); where it draws nothing, neither the
                        // picture nor the structure may change.
                        assert.strictEqual(
                            drawsHere ? drewPixels(measure, `${descriptor.channel}=${value}`) : measure.painted,
                            drawsHere,
                            drawsHere
                                ? `${descriptor.channel} = ${value} draws as ${String(against)} in ${view} ` +
                                      `(${String(measure.changed)} pixels changed).`
                                : `${descriptor.channel} = ${value} names ${String(descriptor.valueViews?.[value])} ` +
                                      `and draws in ${view} (${String(measure.moved)} pixels moved).`,
                        );
                    });
                }
            }
        });
    }
}
