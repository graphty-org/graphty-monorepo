// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertArrowVariety,
    assertDistinctPicture,
    assertDrawnOpacity,
    assertEdgeLabelsDrawn,
    assertGraphLoaded,
    assertLayerPainted,
    assertLinePatternsDrawn,
    assertViewMode,
    canvasArea,
    type Drawn,
    drawn,
    edgeSpanPx,
    holds,
    pixelsOfColour,
} from "./assertions";
import { arrowTypes, eventWaitingDecorator, renderFn, type StoryArgs, storySetup } from "./helpers";

const meta: Meta = {
    title: "Styles/Edge",
    component: "graphty-element",
    // XXX: https://github.com/storybookjs/storybook/issues/23343
    render: renderFn,
    decorators: [eventWaitingDecorator],
    argTypes: {
        edgeLineWidth: {
            control: { type: "range", min: 0.1, max: 10, step: 0.1 },
            table: { category: "Line" },
            name: "edge.width",
        },
        edgeLineColor: { control: "color", table: { category: "Line" }, name: "edge.color" },
        edgeLineOpacity: {
            control: { type: "range", min: 0, max: 1, step: 0.1 },
            table: { category: "Line" },
            name: "edge.opacity",
        },
        arrowHead: { control: "select", options: arrowTypes, table: { category: "Arrow" }, name: "edge.arrowHead" },
        arrowHeadSize: {
            control: { type: "range", min: 0.1, max: 5, step: 0.1 },
            table: { category: "Arrow" },
            name: "edge.arrowHeadSize",
        },
        arrowHeadColor: { control: "color", table: { category: "Arrow" }, name: "edge.arrowHeadColor" },
        arrowHeadOpacity: {
            control: { type: "range", min: 0, max: 1, step: 0.1 },
            table: { category: "Arrow" },
            name: "edge.arrowHeadOpacity",
        },
    },
    parameters: {
        // controls: {exclude: /^(#|_)/},
        controls: {
            include: ["edge.width"],
        },
        chromatic: {
            delay: 500, // Allow Babylon.js render frames to complete (30 frames at 60fps)
        },
    },
    args: {
        setup: storySetup({
            node: { "node.color": "#5A67D8" },
        }),
        nodeData: [
            { id: "A", position: { x: -3, y: 0, z: 0 } },
            { id: "B", position: { x: 3, y: 0, z: 0 } },
        ],
        edgeData: [{ src: "A", dst: "B" }],
        layout: "fixed",
        layoutConfig: {},
    },
};
export default meta;

type Story = StoryObj<StoryArgs>;

/*
 * WHY EVERY EDGE IN THE TWO GRID STORIES CARRIES A `kind` COLUMN THAT REPEATS ITS OWN SOURCE ID.
 *
 * These layers used to select on `data.src == 'normal-src'`, and all forty-six of them painted
 * nothing. A layer selects with a JMESPath expression over `data.*`, and `data.*` reaches the
 * attribute columns the importer kept -- which are the record's own fields MINUS its two
 * endpoints: `src` and `dst` are consumed as structure and published as nothing. `data.src`,
 * `data.source` and `has data.source` all match zero edges, and the style stack reports no
 * problem while they do it, so all four grids rendered fourteen identical default edges and
 * their tests passed. The column exists so the layers have something they are allowed to read.
 * See the handover note: a style layer cannot select an edge by either of its endpoints.
 */

/** The arrow caps the two arrow-grid stories draw, one edge each, in the order they are laid out. */
const ARROW_GRID = [
    "normal",
    "inverted",
    "dot",
    "sphere-dot",
    "open-dot",
    "tee",
    "open-normal",
    "diamond",
    "open-diamond",
    "crow",
    "box",
    "half-open",
    "vee",
    "none",
] as const;

/** The line patterns the two line-grid stories draw, one edge each. */
const LINE_GRID = ["solid", "dot", "star", "box", "dash", "diamond", "dash-dot", "sinewave", "zigzag"] as const;

/**
 * How much of the canvas the edge's own colour covers.
 *
 * Bucketed to the nearest thousand so that it separates one picture from another without being a
 * pixel-exact baseline, which is Chromatic's job and not this one's.
 * @param scene - What the story drew.
 * @returns The reading, as a short string for a picture digest.
 */
const lineInk = async (scene: Drawn): Promise<string> => `grey=${String(Math.round((await pixelsOfColour(scene, "#a9a9a9")) / 1000))}k`;

/**
 * How big the arrow caps in the scene are drawn, largest first.
 *
 * WHY THIS IS MEASURED RATHER THAN READ. An arrow's size is geometry: `EdgeMesh.createArrowHead`
 * multiplies the cap's length and width by `arrowHead.size` when it builds the mesh, so the only
 * reading of "how big is that arrow" is the mesh's own bounding box. The names in
 * `scene.arrowMeshNames` carry the cap's SHAPE and nothing about its size, so a story that asks
 * for a cap at two and a half times the element's own size and gets the default passes every
 * arrow assertion in stories/assertions.ts.
 * @param scene - What the story drew.
 * @returns One span per arrow mesh, in world units, largest first.
 */
const arrowCapSpans = (scene: Drawn): number[] =>
    scene.graph.scene.meshes
        .filter((mesh) => mesh.name.includes("arrow"))
        .map((mesh) => mesh.getBoundingInfo().boundingBox.extendSizeWorld.length())
        .sort((first, second) => second - first);

/**
 * How see-through each arrow cap in the scene is drawn.
 *
 * `EdgeMesh.createArrowHead` writes the cap's opacity onto the mesh as its visibility, which is
 * the one place it is legible from outside: the cap's own material is a shader material in 3D
 * and its alpha is not a property a story can read back.
 * @param scene - What the story drew.
 * @returns One visibility per arrow mesh.
 */
const arrowCapOpacities = (scene: Drawn): number[] =>
    scene.graph.scene.meshes.filter((mesh) => mesh.name.includes("arrow")).map((mesh) => mesh.visibility);

/**
 * Every layer in a grid story painted the one edge it names, and every edge is captioned.
 * @param scene - What the story drew.
 * @param kinds - The cap or pattern each layer is for.
 */
const assertGridPainted = async (scene: Drawn, kinds: readonly string[]): Promise<void> => {
    await assertGraphLoaded(scene, { nodes: kinds.length * 2, edges: kinds.length });

    for (const kind of kinds) {
        await assertLayerPainted(scene, `edges where data.kind == '${kind}'`, { edges: 1 });
    }

    await assertEdgeLabelsDrawn(scene, kinds.length);
};

export const Default: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge Default");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        // The element's own edge appearance, with no layer of the story's own: one grey line with
        // a normal cap on it.
        await assertArrowVariety(scene, 1);
        await assertDistinctPicture(scene, "Styles/Edge", await lineInk(scene));
    },
};

export const Width: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge Width");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        // MEASURED IN PIXELS, because nothing else can see it. A line's thickness is a shader
        // parameter: the source mesh is interned without it, the instance carries no buffer for
        // it, and the line's bounding box reads zero in both of the directions the thickness is
        // in. So the ink is counted -- and then divided by the line's own length on screen, which
        // turns a total into a THICKNESS.
        //
        // PER PIXEL OF SPAN, because that is the unit the story is about and the only one that
        // survives a change of canvas. The canvas is not a fixed size: this same unbroken picture
        // holds 27,222 pixels of line at a canvas 668px wide and 70,456 at 1,668px, so the raw
        // floor of 30,000 this replaces meant "the line is thick" at one size and "the story is
        // broken" at another -- it flips at a canvas 736px wide, which is inside the ordinary
        // range of a desktop window.
        //
        // Divided by the span, the same readings are 55.9, 56.6, 57.0, 57.1 and 58.0 at canvas
        // widths 668, 968, 1168, 1200 and 1668 -- a spread of 3.6% over a 2.5x range of canvas.
        // The element's own width of 8 draws 12.0 to 14.0 by the same reading and this story asks
        // for 40, so the floor of 30 sits between the two with about 1.9x of room on either side.
        const ink = await pixelsOfColour(scene, "#a9a9a9");
        const span = edgeSpanPx(scene, "A", "B");

        await holds(
            ink / span > 30,
            `Styles/Edge Width: this story asks for a line five times the element's own width and the canvas ` +
                `holds ${String(ink)} pixels of line over a span of ${span.toFixed(0)}px, which is ` +
                `${(ink / span).toFixed(1)} pixels of ink for every pixel of line -- where the element's own ` +
                `width draws about 13`,
        );

        await assertDistinctPicture(scene, "Styles/Edge", `grey=${String(Math.round(ink / 1000))}k`);
    },
    args: {
        setup: storySetup({ edge: { "edge.width": 40 } }),
    },
    parameters: {
        controls: {
            include: ["edge.width"],
        },
    },
};

/**
 * Which arrow is drawn at the head of an edge.
 *
 * The three stories below it -- size, opacity and colour -- are the rest of what a layer can say
 * about that arrow. Told nothing, a cap follows the line it caps.
 */
export const ArrowHead: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ArrowHead");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });
        await assertArrowVariety(scene, 1);

        // `normal` IS the element's own cap and `darkgrey` IS its own line colour, so this
        // story's opening picture is deliberately the default one and the control is what it
        // demonstrates. What has to be true is that a triangle cap is actually drawn.
        await holds(
            scene.arrowMeshNames.includes("filled-triangle-arrow"),
            `Styles/Edge ArrowHead: asks for the normal cap and the scene draws ` +
                `[${scene.arrowMeshNames.join(", ")}]`,
        );
    },
    args: {
        setup: storySetup({
            edge: { "edge.color": "darkgrey", "edge.arrowHead": "normal" },
        }),
    },
    parameters: {
        controls: {
            include: ["edge.arrowHead", "edge.color"],
        },
    },
};

/**
 * Two edges, one capped at a quarter of the element's own arrow size and one at two and a half
 * times it.
 *
 * TWO EDGES RATHER THAN ONE, which is the only change from the 1.x story this restores. A single
 * arrow drawn at 2.5 looks like an arrow: there is nothing in the picture to compare it with, and
 * an assertion on it can only be a number measured off this canvas once and then trusted. With a
 * small cap beside a large one the story shows what it claims and the assertion calibrates
 * itself against the scene it is reading.
 */
export const ArrowSize: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ArrowSize");

        await assertGraphLoaded(scene, { nodes: 4, edges: 2 });
        await assertLayerPainted(scene, "the small cap", { edges: 1 });
        await assertLayerPainted(scene, "the large cap", { edges: 1 });

        const spans = arrowCapSpans(scene);

        await holds(
            spans.length === 2,
            `Styles/Edge ArrowSize: two edges each carry a cap and the scene holds ${String(spans.length)} ` +
                `arrow meshes -- [${scene.arrowMeshNames.join(", ")}]`,
        );

        // The two caps are asked for at 2.5 and 0.25, a ten-to-one ratio, so a margin of three is
        // a wide one: anything narrower means the size never reached the mesh builder.
        await holds(
            spans[0] > spans[1] * 3,
            `Styles/Edge ArrowSize: the two caps are asked for at 2.5 and 0.25 and the scene draws them ` +
                `${spans.map((span) => span.toFixed(3)).join(" and ")} across`,
        );

        await assertDistinctPicture(scene, "Styles/Edge");
    },
    args: {
        setup: storySetup({
            layers: [
                {
                    name: "the small cap",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'small'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "normal", "edge.arrowHeadSize": 0.25 },
                },
                {
                    name: "the large cap",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'large'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "normal", "edge.arrowHeadSize": 2.5 },
                },
            ],
        }),
        nodeData: [
            { id: "small-src", position: { x: -4, y: 2, z: 0 } },
            { id: "small-dst", position: { x: 4, y: 2, z: 0 } },
            { id: "large-src", position: { x: -4, y: -2, z: 0 } },
            { id: "large-dst", position: { x: 4, y: -2, z: 0 } },
        ],
        edgeData: [
            { src: "small-src", dst: "small-dst", kind: "small" },
            { src: "large-src", dst: "large-dst", kind: "large" },
        ],
    },
    parameters: {
        controls: {
            include: ["edge.arrowHeadSize"],
        },
    },
};

/**
 * A half-transparent arrow on an opaque line.
 *
 * The line and the cap carry their own opacities, so one can be faded without the other. The
 * `CombinedOpacity` story below fades both at once.
 */
export const ArrowOpacity: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ArrowOpacity");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        const opacities = arrowCapOpacities(scene);

        await holds(
            opacities.length === 1 && Math.abs(opacities[0] - 0.5) < 0.01,
            `Styles/Edge ArrowOpacity: the cap is asked for at half opacity and the scene draws ` +
                `[${opacities.map((value) => value.toFixed(2)).join(", ")}]`,
        );

        // THE LINE IS NOT FADED AND THE CAP IS. Both halves of that are read off the canvas,
        // because either half on its own passes for the wrong reason.
        //
        // A cap at this size does not sit on top of its line -- the edge is shortened to make room
        // for it, which is the same thing the ArrowColor story below measures -- so the
        // full-strength count is NOT all of the line. The cap's own pixels land at the half-way
        // blend of the line colour over the background, (0xa9 + 0xf5) / 2 = 0xcf, which is what
        // half opacity MEANS on this canvas.
        //
        // TWO READINGS, NORMALISED BY TWO DIFFERENT THINGS, because they are two different kinds
        // of ink. What is left at full strength is LINE, whose ink is its length times its
        // thickness, so it is divided by that length: 9.34, 9.35, 9.36, 9.36 and 9.35 at canvas
        // widths 668, 968, 1168, 1200 and 1668 -- a spread of 0.2% over a 2.5x range of canvas.
        // The faded ink is the CAP, a triangle that grows in both directions with the picture, so
        // it is taken as a share of the canvas: 1.470%, 1.367%, 1.341%, 1.339% and 1.292% over
        // the same range.
        //
        // WHY NOT THE RAW COUNTS THIS REPLACES. They were measured on a 968px canvas -- 6,595 at
        // full strength and 6,405 at the blend -- and the band `ink > 5000 && ink < 9000` was cut
        // to fit them. The same unbroken picture reads 8,185 on the 1,200px canvas vitest gives
        // it, 815 pixels under the ceiling, and 11,358 on a 1,668px one, which is over it. The
        // band was one browser window away from failing on canvas size alone.
        //
        // Falsified on the live graph. Putting the cap back to opacity 1 with a layer of its own
        // takes the full-strength reading to 14.8, 18.8 and 22.8 per pixel of span -- over the
        // ceiling of 12 -- and the faded reading down to 0.354%, 0.205% and 0.131% of the canvas,
        // under the floor of 0.8%. Fading the LINE as well takes the first reading to 0.027, 185x
        // under its floor. So an opaque cap breaks both assertions, a faded line breaks the
        // first, and neither of the pictures this story is not about can satisfy the pair.
        const ink = await pixelsOfColour(scene, "#a9a9a9");
        const faded = await pixelsOfColour(scene, "#cfcfcf");
        const span = edgeSpanPx(scene, "A", "B");
        const area = canvasArea(scene);

        await holds(
            ink / span > 5 && ink / span < 12,
            `Styles/Edge ArrowOpacity: only the arrow is faded here, and the canvas holds ${String(ink)} ` +
                `pixels of full-strength line over a span of ${span.toFixed(0)}px -- ` +
                `${(ink / span).toFixed(2)} for every pixel of line, where a faded line of this width draws ` +
                `under 0.1 and an opaque cap pushes this over 14`,
        );

        await holds(
            faded / area > 0.008,
            `Styles/Edge ArrowOpacity: the cap is asked for at half opacity and the canvas holds ` +
                `${String(faded)} pixels at the half-way blend of the line colour over the background -- ` +
                `${((faded / area) * 100).toFixed(3)}% of the canvas, where the same cap drawn opaque ` +
                `covers under 0.36%`,
        );

        await assertDistinctPicture(scene, "Styles/Edge", `grey=${String(Math.round(ink / 1000))}k`);
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.color": "darkgrey",
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 2,
                "edge.arrowHeadOpacity": 0.5,
            },
        }),
    },
    parameters: {
        controls: {
            include: ["edge.arrowHeadOpacity"],
        },
    },
};

/**
 * A red arrow on a grey line.
 *
 * TOLD NOTHING, A CAP FOLLOWS ITS LINE -- that is what every other story on this page draws, and
 * it is why this one sets the two to different colours. Until the arrow channels were published
 * the head did not follow its line either: the element's own defaults pinned it to `darkgrey` and
 * the schema defaulted it to white, so every arrow head in every graph was grey whatever its line
 * was painted, while an arrow TAIL -- which the defaults never mentioned -- did follow. One edge,
 * two ends, two colours.
 */
export const ArrowColor: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ArrowColor");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        // PIXELS, because a cap's colour is a shader uniform in 3D: it is not on the mesh, not on
        // the mesh's name, and not anywhere else a scene reading can reach.
        //
        // NORMALISED, AND BY TWO DIFFERENT THINGS. The red is the CAP -- a triangle that grows in
        // both directions with the picture -- so it is read as a share of the canvas: 1.811%,
        // 1.807%, 1.816%, 1.815% and 1.822% at canvas widths 668, 968, 1168, 1200 and 1668, a
        // spread of 0.8% over a 2.5x range of canvas. The grey is the LINE, whose ink grows with
        // its length alone, so it is divided by that length: 8.68, 8.67, 8.68, 8.68 and 8.67 over
        // the same range.
        const red = await pixelsOfColour(scene, "#ff0000");
        const grey = await pixelsOfColour(scene, "#a9a9a9");
        const span = edgeSpanPx(scene, "A", "B");
        const area = canvasArea(scene);

        // A FLOOR THAT ALSO SEES A CAP DRAWN AT THE WRONG SIZE, which is what the `red > 200` it
        // replaces did not. 200 was under a twentieth of the true reading at any canvas, so it
        // passed on a picture this story is not about: with the cap drawn at the element's own
        // size 1 instead of the 2.5 asked for here, the red falls to 0.280%, 0.287% and 0.285% of
        // the canvas -- 1,960 pixels at a 1,168px canvas, which cleared 200 nine times over. At a
        // floor of 1.0% that break is 3.5x under and caught. A cap that is not red at all reads
        // zero.
        await holds(
            red / area > 0.01,
            `Styles/Edge ArrowColor: the cap is asked for in red at two and a half times the element's own ` +
                `size, and the canvas holds ${String(red)} red pixels -- ${((red / area) * 100).toFixed(2)}% of ` +
                `it, where the same cap at the element's own size covers under 0.3%`,
        );

        // A CAP THIS SIZE EATS INTO THE LINE, which is why this floor is well under the line's
        // own full length: a 2.5x arrow covers the last stretch of it. What it separates is "the
        // line is still grey" from "the layer painted the line red too", which is what a shared
        // colour channel would have done -- that break reads 0.027 grey pixels per pixel of span,
        // 148x under the floor.
        await holds(
            grey / span > 4,
            `Styles/Edge ArrowColor: the line is asked for in grey and the canvas holds ${String(grey)} grey ` +
                `pixels over a span of ${span.toFixed(0)}px -- ${(grey / span).toFixed(2)} for every pixel of ` +
                `line, where a line painted the cap's colour instead leaves under 0.1`,
        );

        await assertDistinctPicture(scene, "Styles/Edge", `red=${String(Math.round(red / 100))}h`);
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.color": "darkgrey",
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 2.5,
                "edge.arrowHeadColor": "#FF0000",
            },
        }),
    },
    parameters: {
        controls: {
            include: ["edge.arrowHeadColor", "edge.color"],
        },
    },
};

export const LineOpacity: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge LineOpacity");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        // A half-transparent grey line over whitesmoke is not grey any more, so the count of
        // full-strength pixels is what falls -- and the count at the half-way blend of the line
        // colour over the background, (0xa9 + 0xf5) / 2 = 0xcf, is what takes its place.
        //
        // BOTH ARE ASSERTED, AND THE SECOND IS WHAT CLOSES A HOLE. A ceiling on full-strength ink
        // says only that the line is not opaque, and a line that is not drawn AT ALL is not
        // opaque either: with edge.opacity set to 0 on the live graph, the full-strength reading
        // did not move by a single pixel (2,021 either way, all of it cap) while the blend fell
        // from 9,140 to 212. So the old ceiling passed on a blank edge. The floor on the blend
        // says the thing the story is named for -- there IS a line, and it is drawn at the
        // half-way blend.
        //
        // Each is normalised the way its own ink grows. What is left at full strength is cap, a
        // triangle that grows in two directions, so it is a share of the canvas: 0.293%, 0.294%,
        // 0.296%, 0.293% and 0.296% at canvas widths 668, 968, 1168, 1200 and 1668. The blend is
        // line, which grows with its length alone: 10.77, 10.76, 10.74, 10.75 and 10.80 per pixel
        // of span over the same range. The raw `ink < 4000` this replaces reads 4,118 at the
        // 1,668px canvas -- the unbroken picture, failing on nothing but size.
        const ink = await pixelsOfColour(scene, "#a9a9a9");
        const faded = await pixelsOfColour(scene, "#cfcfcf");
        const span = edgeSpanPx(scene, "A", "B");
        const area = canvasArea(scene);

        await holds(
            ink / area < 0.005,
            `Styles/Edge LineOpacity: this story draws the line at half opacity and the canvas still holds ` +
                `${String(ink)} pixels at the line's full colour -- ${((ink / area) * 100).toFixed(3)}% of the ` +
                `canvas, where an opaque line of this width covers over 1.2%`,
        );

        await holds(
            faded / span > 6,
            `Styles/Edge LineOpacity: the line is asked for at half opacity and the canvas holds ` +
                `${String(faded)} pixels at the half-way blend of its colour over the background -- ` +
                `${(faded / span).toFixed(2)} for every pixel of line, where an opaque line leaves under 1.7 ` +
                `and no line at all leaves under 0.3`,
        );

        await assertDistinctPicture(scene, "Styles/Edge", `grey=${String(Math.round(ink / 1000))}k`);
    },
    args: {
        setup: storySetup({
            edge: { "edge.color": "darkgrey", "edge.opacity": 0.5, "edge.arrowHead": "normal" },
        }),
    },
    parameters: {
        controls: {
            include: ["edge.opacity"],
        },
    },
};

/**
 * A translucent line and a translucent arrow, faded together.
 *
 * The two opacities are separate channels, which is what `LineOpacity` and `ArrowOpacity` each
 * show one of. This is both at once.
 */
export const CombinedOpacity: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge CombinedOpacity");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        // The nodes are opaque and neither half of the edge is, which is what "combined" means.
        await assertDrawnOpacity(scene, { A: 1, B: 1 });

        const opacities = arrowCapOpacities(scene);

        await holds(
            opacities.length === 1 && Math.abs(opacities[0] - 0.3) < 0.01,
            `Styles/Edge CombinedOpacity: the cap is asked for at three-tenths opacity and the scene draws ` +
                `[${opacities.map((value) => value.toFixed(2)).join(", ")}]`,
        );

        // NEITHER HALF IS DRAWN AT FULL STRENGTH, AND BOTH ARE DRAWN. The ceiling says the first.
        // The floor says the second, and without it this story passes on an empty canvas: with
        // edge.opacity set to 0 on the live graph the full-strength count did not move by a single
        // pixel (24 either way) while the blend fell from 15,790 to nothing at all.
        //
        // THE BLEND NEEDS A NARROWER TOLERANCE THAN ANYTHING ELSE ON THIS PAGE. Three tenths of
        // darkgrey over whitesmoke is 0xde = 222 and the background is 0xf5 = 245, which are 23
        // apart -- inside `pixelsOfColour`'s default tolerance of 24. At that tolerance this
        // colour cannot be told from the bare canvas at all and the count is the whole frame. At 8
        // it is clean, and the counterfactual with no edge drawn reads exactly zero.
        //
        // Normalised as each reading grows. The full-strength remainder is cap ink, so it is a
        // share of the canvas: 0.0072%, 0.0041%, 0.0034%, 0.0033% and 0.0021% at canvas widths
        // 668, 968, 1168, 1200 and 1668. The blend is line ink, so it is divided by the line's
        // length: 14.6, 16.9, 18.6, 18.8 and 22.6 per pixel of span. That second reading is the
        // one MIXED measurement on this page -- a faded line plus a faded cap share the colour --
        // so it spreads 1.55x where the pure readings spread under 1%. It only grows with the
        // canvas, so a floor taken at the smallest reading is safe in the direction that matters,
        // and both breaks land far below it: 1.24 per pixel of span with both halves opaque, and
        // 0 with no edge drawn.
        const ink = await pixelsOfColour(scene, "#a9a9a9");
        const blend = await pixelsOfColour(scene, "#dedede", 8);
        const span = edgeSpanPx(scene, "A", "B");
        const area = canvasArea(scene);

        await holds(
            ink / area < 0.0005,
            `Styles/Edge CombinedOpacity: the line is drawn at three-tenths opacity and the canvas holds ` +
                `${String(ink)} pixels at its full colour -- ${((ink / area) * 100).toFixed(4)}% of the canvas, ` +
                `where both halves drawn opaque cover over 2.3%`,
        );

        await holds(
            blend / span > 8,
            `Styles/Edge CombinedOpacity: the line is asked for at three-tenths opacity and the canvas holds ` +
                `${String(blend)} pixels at that blend of its colour over the background -- ` +
                `${(blend / span).toFixed(1)} for every pixel of line, where no line at all leaves none`,
        );

        await assertDistinctPicture(scene, "Styles/Edge", `grey=${String(Math.round(ink / 1000))}k`);
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.color": "darkgrey",
                "edge.opacity": 0.3,
                "edge.arrowHead": "normal",
                "edge.arrowHeadSize": 2,
                "edge.arrowHeadOpacity": 0.3,
            },
        }),
    },
    parameters: {
        controls: {
            include: ["edge.opacity", "edge.arrowHeadOpacity"],
        },
    },
};

/**
 * Every arrow the element draws, in a grid, each edge labelled with the arrow's name.
 *
 * DRAWN AT TWICE THE ELEMENT'S OWN CAP SIZE, as this grid always was: fourteen caps at a camera
 * pulled back far enough to hold all fourteen are shapes a reader cannot tell apart at size one.
 *
 * THE NAME IS THE EDGE'S OWN LABEL rather than a caption beside the arrow. A layer can say which
 * arrow an edge carries, how big it is, what colour it is drawn in and what the EDGE's label
 * says; an arrow's own caption is the one thing here with no channel, so the fourteen captions
 * that used to sit beside the arrow heads are drawn on the lines instead.
 */
export const TwoDAllArrows: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge TwoDAllArrows");

        await assertGridPainted(scene, ARROW_GRID);

        // Thirteen caps are drawn and one is "none", and several share one mesh -- an inverted
        // triangle is a triangle -- so the reading is how many distinct arrow meshes the scene
        // holds, not how many names the story listed.
        await assertArrowVariety(scene, 8);
        await assertViewMode(scene, "2d");

        // This story and its 3D twin build the same nodes and the same edges; the camera is the
        // whole of the difference, so it is what separates the two pictures.
        await assertDistinctPicture(scene, "Styles/Edge", "camera=2d");
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            startingCameraDistance: 54,
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.kind == 'normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'normal'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "normal", "edge.arrowHeadSize": 2, "edge.label": "normal" },
                },
                {
                    name: "edges where data.kind == 'inverted'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'inverted'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "inverted", "edge.arrowHeadSize": 2, "edge.label": "inverted" },
                },
                {
                    name: "edges where data.kind == 'dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dot'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "dot", "edge.arrowHeadSize": 2, "edge.label": "dot" },
                },
                {
                    name: "edges where data.kind == 'sphere-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'sphere-dot'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "sphere-dot", "edge.arrowHeadSize": 2, "edge.label": "sphere-dot" },
                },
                {
                    name: "edges where data.kind == 'open-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-dot'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-dot", "edge.arrowHeadSize": 2, "edge.label": "open-dot" },
                },
                {
                    name: "edges where data.kind == 'tee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'tee'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "tee", "edge.arrowHeadSize": 2, "edge.label": "tee" },
                },
                {
                    name: "edges where data.kind == 'open-normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-normal'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-normal", "edge.arrowHeadSize": 2, "edge.label": "open-normal" },
                },
                {
                    name: "edges where data.kind == 'diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'diamond'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "diamond", "edge.arrowHeadSize": 2, "edge.label": "diamond" },
                },
                {
                    name: "edges where data.kind == 'open-diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-diamond'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-diamond", "edge.arrowHeadSize": 2, "edge.label": "open-diamond" },
                },
                {
                    name: "edges where data.kind == 'crow'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'crow'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "crow", "edge.arrowHeadSize": 2, "edge.label": "crow" },
                },
                {
                    name: "edges where data.kind == 'box'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'box'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "box", "edge.arrowHeadSize": 2, "edge.label": "box" },
                },
                {
                    name: "edges where data.kind == 'half-open'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'half-open'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "half-open", "edge.arrowHeadSize": 2, "edge.label": "half-open" },
                },
                {
                    name: "edges where data.kind == 'vee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'vee'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "vee", "edge.arrowHeadSize": 2, "edge.label": "vee" },
                },
                {
                    name: "edges where data.kind == 'none'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'none'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "none",
                        "edge.label": "none",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
            ],
        }),
        nodeData: [
            // Grid layout: 4 columns x 4 rows (14 arrow types)
            // Row 1: normal, inverted, dot, sphere-dot
            { id: "normal-src", position: { x: -12, y: 6, z: 0 } },
            { id: "normal-dst", position: { x: -8, y: 6, z: 0 } },
            { id: "inverted-src", position: { x: -4, y: 6, z: 0 } },
            { id: "inverted-dst", position: { x: 0, y: 6, z: 0 } },
            { id: "dot-src", position: { x: 4, y: 6, z: 0 } },
            { id: "dot-dst", position: { x: 8, y: 6, z: 0 } },
            { id: "sphere-dot-src", position: { x: 12, y: 6, z: 0 } },
            { id: "sphere-dot-dst", position: { x: 16, y: 6, z: 0 } },
            // Row 2: open-dot, tee, open-normal, diamond
            { id: "open-dot-src", position: { x: -12, y: 0, z: 0 } },
            { id: "open-dot-dst", position: { x: -8, y: 0, z: 0 } },
            { id: "tee-src", position: { x: -4, y: 0, z: 0 } },
            { id: "tee-dst", position: { x: 0, y: 0, z: 0 } },
            { id: "open-normal-src", position: { x: 4, y: 0, z: 0 } },
            { id: "open-normal-dst", position: { x: 8, y: 0, z: 0 } },
            { id: "diamond-src", position: { x: 12, y: 0, z: 0 } },
            { id: "diamond-dst", position: { x: 16, y: 0, z: 0 } },
            // Row 3: open-diamond, crow, box, half-open
            { id: "open-diamond-src", position: { x: -12, y: -6, z: 0 } },
            { id: "open-diamond-dst", position: { x: -8, y: -6, z: 0 } },
            { id: "crow-src", position: { x: -4, y: -6, z: 0 } },
            { id: "crow-dst", position: { x: 0, y: -6, z: 0 } },
            { id: "box-src", position: { x: 4, y: -6, z: 0 } },
            { id: "box-dst", position: { x: 8, y: -6, z: 0 } },
            { id: "half-open-src", position: { x: 12, y: -6, z: 0 } },
            { id: "half-open-dst", position: { x: 16, y: -6, z: 0 } },
            // Row 4: vee, none
            { id: "vee-src", position: { x: -12, y: -12, z: 0 } },
            { id: "vee-dst", position: { x: -8, y: -12, z: 0 } },
            { id: "none-src", position: { x: -4, y: -12, z: 0 } },
            { id: "none-dst", position: { x: 0, y: -12, z: 0 } },
        ],
        edgeData: [
            // Row 1
            { src: "normal-src", dst: "normal-dst", kind: "normal" },
            { src: "inverted-src", dst: "inverted-dst", kind: "inverted" },
            { src: "dot-src", dst: "dot-dst", kind: "dot" },
            { src: "sphere-dot-src", dst: "sphere-dot-dst", kind: "sphere-dot" },
            // Row 2
            { src: "open-dot-src", dst: "open-dot-dst", kind: "open-dot" },
            { src: "tee-src", dst: "tee-dst", kind: "tee" },
            { src: "open-normal-src", dst: "open-normal-dst", kind: "open-normal" },
            { src: "diamond-src", dst: "diamond-dst", kind: "diamond" },
            // Row 3
            { src: "open-diamond-src", dst: "open-diamond-dst", kind: "open-diamond" },
            { src: "crow-src", dst: "crow-dst", kind: "crow" },
            { src: "box-src", dst: "box-dst", kind: "box" },
            { src: "half-open-src", dst: "half-open-dst", kind: "half-open" },
            // Row 4
            { src: "vee-src", dst: "vee-dst", kind: "vee" },
            { src: "none-src", dst: "none-dst", kind: "none" },
        ],
        layout: "fixed",
    },
    parameters: {
        chromatic: {
            delay: 1000,
        },
    },
};

// 3D version showing all 14 arrowhead types with labels
export const ThreeDAllArrows: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ThreeDAllArrows");

        await assertGridPainted(scene, ARROW_GRID);
        await assertArrowVariety(scene, 8);
        await assertViewMode(scene, "3d");
        await assertDistinctPicture(scene, "Styles/Edge", "camera=3d");
    },
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.kind == 'normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'normal'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "normal", "edge.arrowHeadSize": 2, "edge.label": "normal" },
                },
                {
                    name: "edges where data.kind == 'inverted'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'inverted'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "inverted", "edge.arrowHeadSize": 2, "edge.label": "inverted" },
                },
                {
                    name: "edges where data.kind == 'dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dot'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "dot", "edge.arrowHeadSize": 2, "edge.label": "dot" },
                },
                {
                    name: "edges where data.kind == 'sphere-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'sphere-dot'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "sphere-dot", "edge.arrowHeadSize": 2, "edge.label": "sphere-dot" },
                },
                {
                    name: "edges where data.kind == 'open-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-dot'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-dot", "edge.arrowHeadSize": 2, "edge.label": "open-dot" },
                },
                {
                    name: "edges where data.kind == 'tee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'tee'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "tee", "edge.arrowHeadSize": 2, "edge.label": "tee" },
                },
                {
                    name: "edges where data.kind == 'open-normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-normal'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-normal", "edge.arrowHeadSize": 2, "edge.label": "open-normal" },
                },
                {
                    name: "edges where data.kind == 'diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'diamond'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "diamond", "edge.arrowHeadSize": 2, "edge.label": "diamond" },
                },
                {
                    name: "edges where data.kind == 'open-diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-diamond'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-diamond", "edge.arrowHeadSize": 2, "edge.label": "open-diamond" },
                },
                {
                    name: "edges where data.kind == 'crow'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'crow'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "crow", "edge.arrowHeadSize": 2, "edge.label": "crow" },
                },
                {
                    name: "edges where data.kind == 'box'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'box'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "box", "edge.arrowHeadSize": 2, "edge.label": "box" },
                },
                {
                    name: "edges where data.kind == 'half-open'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'half-open'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "half-open", "edge.arrowHeadSize": 2, "edge.label": "half-open" },
                },
                {
                    name: "edges where data.kind == 'vee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'vee'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "vee", "edge.arrowHeadSize": 2, "edge.label": "vee" },
                },
                {
                    name: "edges where data.kind == 'none'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'none'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "none",
                        "edge.label": "none",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
            ],
        }),
        nodeData: [
            // 3D grid layout: 4 columns x 4 rows spread across Z-axis for 3D effect (14 arrow types)
            // Row 1 (front): normal, inverted, dot, sphere-dot
            { id: "normal-src", position: { x: -12, y: 4, z: 6 } },
            { id: "normal-dst", position: { x: -8, y: 4, z: 6 } },
            { id: "inverted-src", position: { x: -4, y: 4, z: 6 } },
            { id: "inverted-dst", position: { x: 0, y: 4, z: 6 } },
            { id: "dot-src", position: { x: 4, y: 4, z: 6 } },
            { id: "dot-dst", position: { x: 8, y: 4, z: 6 } },
            { id: "sphere-dot-src", position: { x: 12, y: 4, z: 6 } },
            { id: "sphere-dot-dst", position: { x: 16, y: 4, z: 6 } },
            // Row 2 (mid-front): open-dot, tee, open-normal, diamond
            { id: "open-dot-src", position: { x: -12, y: 0, z: 2 } },
            { id: "open-dot-dst", position: { x: -8, y: 0, z: 2 } },
            { id: "tee-src", position: { x: -4, y: 0, z: 2 } },
            { id: "tee-dst", position: { x: 0, y: 0, z: 2 } },
            { id: "open-normal-src", position: { x: 4, y: 0, z: 2 } },
            { id: "open-normal-dst", position: { x: 8, y: 0, z: 2 } },
            { id: "diamond-src", position: { x: 12, y: 0, z: 2 } },
            { id: "diamond-dst", position: { x: 16, y: 0, z: 2 } },
            // Row 3 (mid-back): open-diamond, crow, box, half-open
            { id: "open-diamond-src", position: { x: -12, y: -4, z: -2 } },
            { id: "open-diamond-dst", position: { x: -8, y: -4, z: -2 } },
            { id: "crow-src", position: { x: -4, y: -4, z: -2 } },
            { id: "crow-dst", position: { x: 0, y: -4, z: -2 } },
            { id: "box-src", position: { x: 4, y: -4, z: -2 } },
            { id: "box-dst", position: { x: 8, y: -4, z: -2 } },
            { id: "half-open-src", position: { x: 12, y: -4, z: -2 } },
            { id: "half-open-dst", position: { x: 16, y: -4, z: -2 } },
            // Row 4 (back): vee, none
            { id: "vee-src", position: { x: -12, y: -8, z: -6 } },
            { id: "vee-dst", position: { x: -8, y: -8, z: -6 } },
            { id: "none-src", position: { x: -4, y: -8, z: -6 } },
            { id: "none-dst", position: { x: 0, y: -8, z: -6 } },
        ],
        edgeData: [
            // Row 1
            { src: "normal-src", dst: "normal-dst", kind: "normal" },
            { src: "inverted-src", dst: "inverted-dst", kind: "inverted" },
            { src: "dot-src", dst: "dot-dst", kind: "dot" },
            { src: "sphere-dot-src", dst: "sphere-dot-dst", kind: "sphere-dot" },
            // Row 2
            { src: "open-dot-src", dst: "open-dot-dst", kind: "open-dot" },
            { src: "tee-src", dst: "tee-dst", kind: "tee" },
            { src: "open-normal-src", dst: "open-normal-dst", kind: "open-normal" },
            { src: "diamond-src", dst: "diamond-dst", kind: "diamond" },
            // Row 3
            { src: "open-diamond-src", dst: "open-diamond-dst", kind: "open-diamond" },
            { src: "crow-src", dst: "crow-dst", kind: "crow" },
            { src: "box-src", dst: "box-dst", kind: "box" },
            { src: "half-open-src", dst: "half-open-dst", kind: "half-open" },
            // Row 4
            { src: "vee-src", dst: "vee-dst", kind: "vee" },
            { src: "none-src", dst: "none-dst", kind: "none" },
        ],
        layout: "fixed",
    },
    parameters: {
        chromatic: {
            delay: 1000,
        },
    },
};

// 3D version showing all 9 line types with labels
export const ThreeDAllLines: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ThreeDAllLines");

        await assertGridPainted(scene, LINE_GRID);

        // Solid is the element's own line and the other eight are drawn by the patterned-line
        // renderer, which names one mesh per pattern.
        await assertLinePatternsDrawn(scene, LINE_GRID.filter((line) => line !== "solid").map((line) => `pattern-${line}`));
        await assertViewMode(scene, "3d");
        await assertDistinctPicture(scene, "Styles/Edge", "camera=3d");
    },
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.kind == 'solid'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'solid'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "solid",
                        "edge.arrowHead": "normal",
                        "edge.label": "solid",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'star'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'star'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "star",
                        "edge.arrowHead": "normal",
                        "edge.label": "star",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'box'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'box'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "box",
                        "edge.arrowHead": "normal",
                        "edge.label": "box",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'dash'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dash'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'diamond'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "diamond",
                        "edge.arrowHead": "normal",
                        "edge.label": "diamond",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'dash-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dash-dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash-dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash-dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'sinewave'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'sinewave'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "sinewave",
                        "edge.arrowHead": "normal",
                        "edge.label": "sinewave",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'zigzag'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'zigzag'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "zigzag",
                        "edge.arrowHead": "normal",
                        "edge.label": "zigzag",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
            ],
        }),
        nodeData: [
            // 3D grid layout: 3 columns x 3 rows spread across Z-axis for 3D effect (9 line types)
            // Row 1 (front): solid, dot, star
            { id: "solid-src", position: { x: -8, y: 4, z: 4 } },
            { id: "solid-dst", position: { x: -4, y: 4, z: 4 } },
            { id: "dot-src", position: { x: 0, y: 4, z: 4 } },
            { id: "dot-dst", position: { x: 4, y: 4, z: 4 } },
            { id: "star-src", position: { x: 8, y: 4, z: 4 } },
            { id: "star-dst", position: { x: 12, y: 4, z: 4 } },
            // Row 2 (middle): box, dash, diamond
            { id: "box-src", position: { x: -8, y: 0, z: 0 } },
            { id: "box-dst", position: { x: -4, y: 0, z: 0 } },
            { id: "dash-src", position: { x: 0, y: 0, z: 0 } },
            { id: "dash-dst", position: { x: 4, y: 0, z: 0 } },
            { id: "diamond-src", position: { x: 8, y: 0, z: 0 } },
            { id: "diamond-dst", position: { x: 12, y: 0, z: 0 } },
            // Row 3 (back): dash-dot, sinewave, zigzag
            { id: "dash-dot-src", position: { x: -8, y: -4, z: -4 } },
            { id: "dash-dot-dst", position: { x: -4, y: -4, z: -4 } },
            { id: "sinewave-src", position: { x: 0, y: -4, z: -4 } },
            { id: "sinewave-dst", position: { x: 4, y: -4, z: -4 } },
            { id: "zigzag-src", position: { x: 8, y: -4, z: -4 } },
            { id: "zigzag-dst", position: { x: 12, y: -4, z: -4 } },
        ],
        edgeData: [
            // Row 1
            { src: "solid-src", dst: "solid-dst", kind: "solid" },
            { src: "dot-src", dst: "dot-dst", kind: "dot" },
            { src: "star-src", dst: "star-dst", kind: "star" },
            // Row 2
            { src: "box-src", dst: "box-dst", kind: "box" },
            { src: "dash-src", dst: "dash-dst", kind: "dash" },
            { src: "diamond-src", dst: "diamond-dst", kind: "diamond" },
            // Row 3
            { src: "dash-dot-src", dst: "dash-dot-dst", kind: "dash-dot" },
            { src: "sinewave-src", dst: "sinewave-dst", kind: "sinewave" },
            { src: "zigzag-src", dst: "zigzag-dst", kind: "zigzag" },
        ],
        layout: "fixed",
    },
    parameters: {
        chromatic: {
            delay: 1000,
        },
    },
};

// 2D version showing all 9 line types with labels
export const TwoDAllLines: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge TwoDAllLines");

        await assertGridPainted(scene, LINE_GRID);
        await assertLinePatternsDrawn(scene, LINE_GRID.filter((line) => line !== "solid").map((line) => `pattern-${line}`));
        await assertViewMode(scene, "2d");
        await assertDistinctPicture(scene, "Styles/Edge", "camera=2d");
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.kind == 'solid'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'solid'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "solid",
                        "edge.arrowHead": "normal",
                        "edge.label": "solid",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'star'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'star'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "star",
                        "edge.arrowHead": "normal",
                        "edge.label": "star",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'box'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'box'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "box",
                        "edge.arrowHead": "normal",
                        "edge.label": "box",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'dash'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dash'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'diamond'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "diamond",
                        "edge.arrowHead": "normal",
                        "edge.label": "diamond",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'dash-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dash-dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash-dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash-dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'sinewave'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'sinewave'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "sinewave",
                        "edge.arrowHead": "normal",
                        "edge.label": "sinewave",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.kind == 'zigzag'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'zigzag'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "zigzag",
                        "edge.arrowHead": "normal",
                        "edge.label": "zigzag",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
            ],
        }),
        nodeData: [
            // 2D grid layout: 3 columns x 3 rows (9 line types)
            // Row 1: solid, dot, star
            { id: "solid-src", position: { x: -8, y: 6, z: 0 } },
            { id: "solid-dst", position: { x: -4, y: 6, z: 0 } },
            { id: "dot-src", position: { x: 0, y: 6, z: 0 } },
            { id: "dot-dst", position: { x: 4, y: 6, z: 0 } },
            { id: "star-src", position: { x: 8, y: 6, z: 0 } },
            { id: "star-dst", position: { x: 12, y: 6, z: 0 } },
            // Row 2: box, dash, diamond
            { id: "box-src", position: { x: -8, y: 0, z: 0 } },
            { id: "box-dst", position: { x: -4, y: 0, z: 0 } },
            { id: "dash-src", position: { x: 0, y: 0, z: 0 } },
            { id: "dash-dst", position: { x: 4, y: 0, z: 0 } },
            { id: "diamond-src", position: { x: 8, y: 0, z: 0 } },
            { id: "diamond-dst", position: { x: 12, y: 0, z: 0 } },
            // Row 3: dash-dot, sinewave, zigzag
            { id: "dash-dot-src", position: { x: -8, y: -6, z: 0 } },
            { id: "dash-dot-dst", position: { x: -4, y: -6, z: 0 } },
            { id: "sinewave-src", position: { x: 0, y: -6, z: 0 } },
            { id: "sinewave-dst", position: { x: 4, y: -6, z: 0 } },
            { id: "zigzag-src", position: { x: 8, y: -6, z: 0 } },
            { id: "zigzag-dst", position: { x: 12, y: -6, z: 0 } },
        ],
        edgeData: [
            // Row 1
            { src: "solid-src", dst: "solid-dst", kind: "solid" },
            { src: "dot-src", dst: "dot-dst", kind: "dot" },
            { src: "star-src", dst: "star-dst", kind: "star" },
            // Row 2
            { src: "box-src", dst: "box-dst", kind: "box" },
            { src: "dash-src", dst: "dash-dst", kind: "dash" },
            { src: "diamond-src", dst: "diamond-dst", kind: "diamond" },
            // Row 3
            { src: "dash-dot-src", dst: "dash-dot-dst", kind: "dash-dot" },
            { src: "sinewave-src", dst: "sinewave-dst", kind: "sinewave" },
            { src: "zigzag-src", dst: "zigzag-dst", kind: "zigzag" },
        ],
        layout: "fixed",
    },
    parameters: {
        chromatic: {
            delay: 1000,
        },
    },
};
