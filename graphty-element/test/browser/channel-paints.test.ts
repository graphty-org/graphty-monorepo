/**
 * @file A channel that says it paints has to change the picture.
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
 */

import { afterAll, assert, beforeAll, describe, it } from "vitest";

import type { LabelStyle, LayerSpec } from "../../src/catalog/types";
import { UNPAINTED_CHANNELS } from "../../src/catalog/unreachable";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session";
import { CHANNEL_DESCRIPTORS, type ChannelDescriptor } from "../../src/session/styles/channels";

/** Two nodes and the edge between them: enough for every channel, small enough to be quick. */
const NODES = [{ id: "alpha" }, { id: "omega" }];

/**
 * The edge every edge channel is measured on, and a second one beside it: a bundle's spacing is
 * drawn only between two edges. Straight, the two lie on one line and draw as one.
 */
const EDGES = [
    { src: "alpha", dst: "omega" },
    { src: "alpha", dst: "omega" },
];

/** A curved edge with a support point, at a unit that sets the circular layout's nodes 100 support units apart. */
const SUPPORTED = { "edge.curvature": true, "edge.supportModel": "barnesHut", "edge.supportUnit": 0.32 };

/**
 * What a channel needs written before it has anything to change, in a layer of its own around its
 * measurement: a bundle fans apart only when its edges are curved.
 */
const PREREQUISITES: Readonly<Partial<Record<string, Record<string, unknown>>>> = {
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
    "node.borderWaveAmplitude": { "node.borderStyle": "zigzag", "node.borderWidth": 0.1 },
    "node.borderWavePeriod": { "node.borderStyle": "zigzag", "node.borderWidth": 0.1, "node.borderWaveAmplitude": 1 },
    // Where runs of different sizes meet changes only a line holding runs of different sizes.
    "node.labelRunAlign": { "node.label": "a<size='300%'>M</size>" },
    "edge.labelRunAlign": { "edge.label": "a<size='300%'>M</size>" },
    // A node's further parts are outlined, and its lines drawn, in its border; a line's own width needs a line.
    "node.shapeParts": { "node.shape": "polygon", "node.borderWidth": 0.1, "node.borderColor": "#000000" },
    "node.shapeLines": { "node.shape": "rectangle", "node.borderWidth": 0.1, "node.borderColor": "#000000" },
    "node.shapeLineWidth": { "node.shape": "rectangle", "node.borderColor": "#000000", "node.shapeLines": "-1,0 1,0" },
};

/** How wide the canvas is. */
const WIDTH = 480;

/** How tall it is. */
const HEIGHT = 360;

/**
 * How many pixels must fall in a different bucket before the picture counts as changed.
 *
 * Deliberately tiny. Two renderings of an unchanged scene agree exactly, so any margin at all is
 * only insurance against a driver that dithers; a margin wide enough to hide a real change would
 * turn this file's central question into a formality. The arrow caps at the end of one edge are
 * some hundreds of pixels, which is the smallest thing any channel here draws.
 */
const PIXEL_CHANGE = 32;

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
function probeFor(descriptor: ChannelDescriptor): unknown {
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
function describeMesh(mesh: Record<string, unknown>): string {
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
interface Reading {
    /** Everything about the scene graph a style channel could have changed. */
    readonly structure: string;
    /** How many pixels fall in each coarse colour bucket. */
    readonly histogram: Uint32Array;
}

/**
 * How many pixels moved between two readings of the frame.
 * @param one - The earlier reading.
 * @param other - The later one.
 * @returns The number of pixels that changed bucket, counting each move once.
 */
function pixelsMoved(one: Reading, other: Reading): number {
    let moved = 0;

    for (let bucket = 0; bucket < BUCKETS; bucket++) {
        moved += Math.abs(one.histogram[bucket] - other.histogram[bucket]);
    }

    return moved / 2;
}

describe("every channel the table says is renderable", () => {
    /** The channels on the table, in a fixed order, so a failure names the same thing twice. */
    const channels = Object.values(CHANNEL_DESCRIPTORS).sort((one, other) => one.channel.localeCompare(other.channel));

    /** The waivers, by channel, so a test can ask whether one is expected to paint. */
    const waived = new Map(UNPAINTED_CHANNELS.map((entry) => [entry.channel, entry]));

    for (const target of ["node", "edge"] as const) {
        describe(`on ${target}s`, () => {
            let container: HTMLElement;
            let graph: Graph;
            let session: GraphSession;

            beforeAll(async () => {
                container = document.createElement("div");
                container.style.width = `${String(WIDTH)}px`;
                container.style.height = `${String(HEIGHT)}px`;
                document.body.appendChild(container);
                graph = new Graph(container);
                await graph.init();
                session = graph.getSession();

                await graph.addNodes(NODES);
                await graph.addEdges(EDGES);

                // Circular rather than a physics layout: a scene fingerprint taken while nodes
                // are still drifting differs from one frame to the next for reasons that have
                // nothing to do with a channel.
                await graph.setLayout("circular", { scale: 0.2 });
                await operationQueueOf(graph).waitForCompletion();

                // THE PREREQUISITES. Some channels describe a thing that is only drawn once
                // something else asked for it: a label style needs words, an arrow's size needs a
                // cap. Switching those on in a layer of their own, once, is what lets the
                // per-channel measurement below be about the channel alone.
                await session.styles.add({
                    name: "channel probe prerequisites",
                    target: "node",
                    selector: { match: "everything" },
                    // A border to recolour and restyle: its colour and style draw nothing alone.
                    // No halo: any halo channel switches the halo on alone, so one drawn here
                    // would leave node.halo nothing to change.
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
                        // Big caps on purpose: at the default size an arrow is a few dozen
                        // pixels, which is too near the threshold for a cap COLOUR to be
                        // measurable at all. Three times that is a few hundred.
                        "edge.arrowHeadSize": 3,
                        "edge.arrowTailSize": 3,
                        // The words are what switch a caption on, the same way `edge.label`
                        // switches the edge's own label on, so the two caption STYLE channels
                        // have nothing to change until an end carries a caption at all. The
                        // words differ from the probe's, so the channel that writes the words
                        // still has something to move.
                        "edge.arrowHeadText": "HEAD",
                        "edge.arrowTailText": "TAIL",
                        // A band's width and opacity, likewise, need a color that draws one.
                        "edge.bandColor": "#0077BB",
                    },
                });
                await operationQueueOf(graph).waitForCompletion();
            });

            afterAll(() => {
                graph.dispose();
                container.remove();
            });

            /**
             * Let the last repaint reach the scene, then read what is drawn.
             * @returns The structure of the scene and a histogram of the frame.
             */
            async function read(): Promise<Reading> {
                // The element's own "this is on screen" signal, NOT the queue: a style edit
                // resolves once its pass has run, and the meshes take its paint on the render
                // loop's next update.
                await graph.waitForStableFrame();

                // One more frame, so the buffer read below is a frame of that picture.
                graph.scene.render();

                const { scene, engine } = graph;
                const meshes = [...scene.meshes]
                    .map((mesh) => describeMesh(mesh as unknown as Record<string, unknown>))
                    .sort();
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

                return { structure: [...meshes, `effects:${layers.join(",")}`].join("\n"), histogram };
            }

            for (const descriptor of channels.filter((entry) => entry.target === target && entry.renderable)) {
                it(`changes the picture: ${descriptor.channel}`, async () => {
                    const probe = probeFor(descriptor);

                    assert.isDefined(
                        probe,
                        `${descriptor.channel} is published as renderable and this file has no ` +
                            `value to write to it. Teach probeFor about its value kind -- a ` +
                            `channel nothing can write is a channel nothing can test.`,
                    );

                    const needs = PREREQUISITES[descriptor.channel];
                    const prerequisite =
                        needs === undefined
                            ? null
                            : await session.styles.add({
                                  name: `probe prerequisites ${descriptor.channel}`,
                                  target,
                                  selector: { match: "everything" },
                                  set: needs,
                              });
                    const before = await read();
                    const layer: LayerSpec = {
                        name: `probe ${descriptor.channel}`,
                        target,
                        selector: { match: "everything" },
                        set: { [descriptor.channel]: probe },
                    };
                    const added = await session.styles.add(layer);
                    const after = await read();

                    await session.styles.remove(added.id);

                    const restored = await read();
                    if (prerequisite !== null) {
                        await session.styles.remove(prerequisite.id);
                    }

                    const movedByWriting = pixelsMoved(before, after);
                    const painted = after.structure !== before.structure || movedByWriting > PIXEL_CHANGE;
                    const waiver = waived.get(descriptor.channel);

                    if (waiver === undefined) {
                        assert.isTrue(
                            painted,
                            `Writing ${descriptor.channel} changed nothing that is drawn: the ` +
                                `scene holds the same meshes with the same materials, and ` +
                                `${String(movedByWriting)} pixels moved. The channel table ` +
                                `publishes it as renderable, so either the renderer never reads ` +
                                `the field it lands on -- which is what a consumer discovers by ` +
                                `writing a layer that does nothing -- or it draws something ` +
                                `neither half of this reading can see. Fix the renderer, widen ` +
                                `the reading, or add the channel to UNPAINTED_CHANNELS in ` +
                                `src/catalog/unreachable.ts with the reason.`,
                        );

                        // PIXELS, NOT STRUCTURE. `MeshCache` keeps the source mesh a removed
                        // layer caused to be built, so the scene legitimately holds more meshes
                        // afterwards than before; what must come back is the PICTURE.
                        assert.isAtMost(
                            pixelsMoved(before, restored),
                            PIXEL_CHANGE,
                            `Removing the layer that wrote ${descriptor.channel} left the picture ` +
                                `changed. A probe that does not clean up after itself makes every ` +
                                `channel measured after it untrustworthy.`,
                        );

                        return;
                    }

                    const stale =
                        `${descriptor.channel} is listed in UNPAINTED_CHANNELS and something is ` +
                        `drawn for it now -- ${String(movedByWriting)} pixels moved. Delete the ` +
                        `waiver: while it is there, the catalogue tells a consumer the ` +
                        `capability is missing when it has arrived. The waiver said: `;

                    assert.isFalse(painted, stale + waiver.reason);
                });
            }
        });
    }

    it("waives only channels that exist and claim to paint", () => {
        const stray = UNPAINTED_CHANNELS.filter((entry) => {
            const descriptor = CHANNEL_DESCRIPTORS[entry.channel] as ChannelDescriptor | undefined;

            return descriptor === undefined || !descriptor.renderable;
        })
            .map((entry) => entry.channel)
            .sort();

        assert.deepEqual(
            stray,
            [],
            `These waivers in UNPAINTED_CHANNELS name a channel that is gone, or one already ` +
                `published as renderable: false. A channel marked unrenderable says so in the ` +
                `table itself and needs no second record.`,
        );
    });

    it("gives every waiver a reason", () => {
        const silent = UNPAINTED_CHANNELS.filter((entry) => entry.reason.trim().length === 0)
            .map((entry) => entry.channel)
            .sort();

        assert.deepEqual(silent, [], `These waivers have an empty reason, which is the whole entry.`);
    });
});
