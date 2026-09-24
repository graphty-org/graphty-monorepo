// Registers the <graphty-element> custom element; nothing is referenced by name.
import "../src/graphty-element";

import type { Meta, StoryObj } from "@storybook/web-components-vite";

import {
    assertArrowCaptionsDrawn,
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
const lineInk = async (scene: Drawn): Promise<string> =>
    `grey=${String(Math.round((await pixelsOfColour(scene, "#a9a9a9")) / 1000))}k`;

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
 * How big a normal cap of the element's own size reads by {@link arrowCapSpans}, in world units.
 *
 * MEASURED, AND EXACT. `FilledArrowRenderer.applyShaderBoundingInfo` gives a 3D cap a bounding
 * cube whose half-extent is the furthest vertex of its geometry times the cap's size, so the
 * reading is 0.9327 at size 1 on every canvas, 1.8654 at size 2 and 2.3318 at size 2.5 --
 * linear in size to four figures. It changes only if the cap's own geometry does.
 */
const DEFAULT_CAP_SPAN = 0.9327;

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
 *
 * A CAPTION IS EITHER THE ARROW'S OWN OR THE EDGE'S. The arrow grids hang each name from the cap
 * it names, with `edge.arrowHeadText`; the one edge with no cap has nothing to hang a caption
 * from, so it carries its name as an ordinary edge label, as the line grids do for every edge.
 * `edgeLabelPlanes` counts both kinds -- they are planes of one class -- so the arrow captions are
 * read off the edges that own them and the rest of the planes are the edge labels.
 * @param scene - What the story drew.
 * @param kinds - The cap or pattern each layer is for.
 * @param arrowCaptions - How many of those edges are named by a caption on their arrow head
 *     rather than by an edge label.
 */
const assertGridPainted = async (scene: Drawn, kinds: readonly string[], arrowCaptions = 0): Promise<void> => {
    await assertGraphLoaded(scene, { nodes: kinds.length * 2, edges: kinds.length });

    for (const kind of kinds) {
        await assertLayerPainted(scene, `edges where data.kind == '${kind}'`, { edges: 1 });
    }

    await assertArrowCaptionsDrawn(
        scene,
        Array.from({ length: arrowCaptions }, () => "arrowHead" as const),
    );
    await assertEdgeLabelsDrawn(scene, kinds.length);

    const labels = scene.edgeLabelPlanes - scene.arrowCaptions.length;

    await holds(
        labels >= kinds.length - arrowCaptions,
        `${scene.story}: ${String(kinds.length - arrowCaptions)} edges are named by an edge label and the ` +
            `scene holds ${String(labels)} edge label planes beside its ${String(scene.arrowCaptions.length)} ` +
            `arrow captions`,
    );
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
 * One edge capped at twice the element's own arrow size.
 *
 * A SINGLE ARROW HAS NOTHING BESIDE IT TO BE COMPARED WITH, so the assertion compares it with a
 * number instead: the span a cap of the element's own size is drawn at. That number is geometry,
 * not a pixel count, so it does not move with the canvas -- see `DEFAULT_CAP_SPAN`.
 */
export const ArrowSize: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge ArrowSize");

        await assertGraphLoaded(scene, { nodes: 2, edges: 1 });

        const spans = arrowCapSpans(scene);

        await holds(
            spans.length === 1,
            `Styles/Edge ArrowSize: one edge carries a cap and the scene holds ${String(spans.length)} ` +
                `arrow meshes -- [${scene.arrowMeshNames.join(", ")}]`,
        );

        // Asked for at 2, so the cap is drawn twice the span of the element's own. The band is
        // 1.8 to 2.2 because the reading is exact -- the bounding cube is the cap's geometry times
        // its size -- and anything outside it means the size never reached the mesh builder:
        // the element's own size reads 1.0 and the 2.5 this story used to draw reads 2.5.
        const ratio = spans[0] / DEFAULT_CAP_SPAN;

        await holds(
            ratio > 1.8 && ratio < 2.2,
            `Styles/Edge ArrowSize: the cap is asked for at twice the element's own size and the scene draws ` +
                `it ${spans[0].toFixed(3)} across, ${ratio.toFixed(2)} times the ${DEFAULT_CAP_SPAN.toFixed(3)} ` +
                `a cap of the element's own size spans`,
        );

        await assertDistinctPicture(scene, "Styles/Edge");
    },
    args: {
        setup: storySetup({
            edge: { "edge.color": "darkgrey", "edge.arrowHead": "normal", "edge.arrowHeadSize": 2 },
        }),
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
        // TWO READINGS, NORMALISED BY TWO DIFFERENT THINGS, because they are two different kinds
        // of ink. What is left at full strength is LINE, whose ink is its length times its
        // thickness, so it is divided by that length: 10.69, 10.69, 10.69, 10.70 and 10.68 at
        // canvas widths 668, 968, 1168, 1200 and 1668. The faded ink is the CAP, whose pixels land
        // at the half-way blend of the line colour over the background, (0xa9 + 0xf5) / 2 = 0xcf.
        // A cap is a triangle that grows in both directions with the picture, so it is taken as a
        // share of the canvas: 0.276%, 0.278%, 0.283%, 0.282% and 0.280% over the same range.
        //
        // THE BLEND IS COUNTED AT A TOLERANCE OF 8, NOT THE DEFAULT 24. The anti-aliased rim of an
        // opaque line passes through every shade between the line and the background, and at 24
        // that rim alone is 1.4 pixels for every pixel of line -- more than a cap of the element's
        // own size covers. At 8 the rim is gone and the reading is the cap.
        //
        // Falsified on the live graph. The same edge with an opaque cap -- `Default`, which is
        // this picture at opacity 1 -- reads 0.003% to 0.013% at the blend, over 10x under the
        // floor of 0.15%. Fading the LINE instead -- `LineOpacity` -- leaves 1.3 to 3.4 pixels at
        // full strength for every pixel of line, all of it cap, under the floor of 8; fading both
        // leaves 0.03. So an opaque cap breaks the second assertion, a faded line breaks the
        // first, and neither of the pictures this story is not about can satisfy the pair.
        const ink = await pixelsOfColour(scene, "#a9a9a9");
        const faded = await pixelsOfColour(scene, "#cfcfcf", 8);
        const span = edgeSpanPx(scene, "A", "B");
        const area = canvasArea(scene);

        await holds(
            ink / span > 8,
            `Styles/Edge ArrowOpacity: only the arrow is faded here, and the canvas holds ${String(ink)} ` +
                `pixels of full-strength line over a span of ${span.toFixed(0)}px -- ` +
                `${(ink / span).toFixed(2)} for every pixel of line, where a faded line leaves under 3.5`,
        );

        await holds(
            faded / area > 0.0015,
            `Styles/Edge ArrowOpacity: the cap is asked for at half opacity and the canvas holds ` +
                `${String(faded)} pixels at the half-way blend of the line colour over the background -- ` +
                `${((faded / area) * 100).toFixed(3)}% of the canvas, where the same cap drawn opaque ` +
                `covers under 0.015%`,
        );

        await assertDistinctPicture(scene, "Styles/Edge", `grey=${String(Math.round(ink / 1000))}k`);
    },
    args: {
        setup: storySetup({
            edge: {
                "edge.color": "darkgrey",
                "edge.arrowHead": "normal",
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
        // both directions with the picture -- so it is read as a share of the canvas: 0.280%,
        // 0.282%, 0.287%, 0.286% and 0.285% at canvas widths 668, 968, 1168, 1200 and 1668, a
        // spread of 2.7% over a 2.5x range of canvas. The grey is the LINE, whose ink grows with
        // its length alone, so it is divided by that length: 10.66, 10.67, 10.69, 10.70 and 10.68
        // over the same range.
        const red = await pixelsOfColour(scene, "#ff0000");
        const grey = await pixelsOfColour(scene, "#a9a9a9");
        const span = edgeSpanPx(scene, "A", "B");
        const area = canvasArea(scene);

        // A FLOOR AT ABOUT HALF THE CAP, not a token count. A cap that is not red at all reads
        // zero, and one drawn at half the element's own size would cover a quarter of the area,
        // about 0.07% -- both under 0.15%. The `red > 200` this replaced passed on 200 stray
        // pixels at any canvas.
        await holds(
            red / area > 0.0015,
            `Styles/Edge ArrowColor: the cap is asked for in red and the canvas holds ${String(red)} red ` +
                `pixels -- ${((red / area) * 100).toFixed(3)}% of it, where a cap of the element's own size ` +
                `covers about 0.28%`,
        );

        // What this separates is "the line is still grey" from "the layer painted the line red
        // too", which is what a shared colour channel would have done -- that break reads 0.03
        // grey pixels per pixel of span, over 240x under the floor.
        await holds(
            grey / span > 8,
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
        // Each is normalised the way its own ink grows. The cap now follows the line's opacity
        // too, so almost nothing is left at full strength; the ceiling is a share of the canvas
        // because the cap, a triangle, grows in two directions -- when the cap was drawn opaque
        // it alone read 0.293% to 0.296% across canvas widths 668 to 1668. The blend is
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
        // The floor says the second, and without it this story passes with no line at all: with
        // edge.opacity set to 0 on the live graph the full-strength count did not move by a single
        // pixel (24 either way) while the blend fell from 11,353 to 2,054, which is the faded cap
        // alone -- 2.35 per pixel of span, under the floor of 8.
        //
        // THE BLEND NEEDS A NARROW TOLERANCE, AND HERE IT IS NOT OPTIONAL. Three tenths of
        // darkgrey over whitesmoke is 0xde = 222 and the background is 0xf5 = 245, which are 23
        // apart -- inside `pixelsOfColour`'s default tolerance of 24. At that tolerance this
        // colour cannot be told from the bare canvas at all and the count is the whole frame. At 8
        // it is clean, and the counterfactual with no edge drawn reads exactly zero.
        //
        // Normalised as each reading grows. The full-strength remainder is cap ink, so it is a
        // share of the canvas: 0.0072%, 0.0041%, 0.0034%, 0.0033% and 0.0021% at canvas widths
        // 668, 968, 1168, 1200 and 1668. The blend is line ink, so it is divided by the line's
        // length: 11.8, 12.4, 12.8, 12.8 and 13.8 per pixel of span. That second reading is the
        // one MIXED measurement on this page -- a faded line plus a faded cap share the colour --
        // so it spreads 1.17x where the pure readings spread under 3%. It only grows with the
        // canvas, so a floor taken under the smallest reading is safe in the direction that
        // matters, and both breaks land far below it: about 1.35 per pixel of span with both
        // halves opaque, and 0 with no edge drawn.
        const ink = await pixelsOfColour(scene, "#a9a9a9");
        const blend = await pixelsOfColour(scene, "#dedede", 8);
        const span = edgeSpanPx(scene, "A", "B");
        const area = canvasArea(scene);

        await holds(
            ink / area < 0.0005,
            `Styles/Edge CombinedOpacity: the line is drawn at three-tenths opacity and the canvas holds ` +
                `${String(ink)} pixels at its full colour -- ${((ink / area) * 100).toFixed(4)}% of the canvas, ` +
                `where both halves drawn opaque cover over 1.2%`,
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
 * Every arrow the element draws, in a grid, each arrow captioned with its own name.
 *
 * DRAWN AT TWICE THE ELEMENT'S OWN CAP SIZE, as this grid always was: fourteen caps at a camera
 * pulled back far enough to hold all fourteen are shapes a reader cannot tell apart at size one.
 *
 * THE NAME HANGS FROM THE ARROW, written with `edge.arrowHeadText` and drawn by
 * `edge.arrowHeadTextStyle`, so it sits beside the cap it names rather than at the middle of the
 * line. The "none" edge has no cap to hang one from -- a caption on an end with no arrow draws
 * nothing -- so its name is the edge's own label instead, above the line.
 */
export const TwoDAllArrows: Story = {
    play: async ({ canvasElement }) => {
        const scene = await drawn(canvasElement, "Styles/Edge TwoDAllArrows");

        await assertGridPainted(scene, ARROW_GRID, ARROW_GRID.length - 1);

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
            layers: [
                {
                    name: "edges where data.kind == 'normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'normal'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "normal",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "normal",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'inverted'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'inverted'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "inverted",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "inverted",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "dot",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "dot",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'sphere-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'sphere-dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "sphere-dot",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "sphere-dot",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'open-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "open-dot",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "open-dot",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'tee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'tee'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "tee",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "tee",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'open-normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-normal'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "open-normal",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "open-normal",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'diamond'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "diamond",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "diamond",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'open-diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-diamond'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "open-diamond",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "open-diamond",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'crow'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'crow'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "crow",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "crow",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'box'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'box'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "box",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "box",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'half-open'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'half-open'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "half-open",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "half-open",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'vee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'vee'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "vee",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "vee",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'none'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'none'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "none",
                        "edge.label": "none",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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

        await assertGridPainted(scene, ARROW_GRID, ARROW_GRID.length - 1);
        await assertArrowVariety(scene, 8);
        await assertViewMode(scene, "3d");
        await assertDistinctPicture(scene, "Styles/Edge", "camera=3d");
    },
    args: {
        setup: storySetup({
            viewMode: "3d",
            layers: [
                {
                    name: "edges where data.kind == 'normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'normal'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "normal",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "normal",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'inverted'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'inverted'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "inverted",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "inverted",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "dot",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "dot",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'sphere-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'sphere-dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "sphere-dot",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "sphere-dot",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'open-dot'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-dot'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "open-dot",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "open-dot",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'tee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'tee'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "tee",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "tee",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'open-normal'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-normal'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "open-normal",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "open-normal",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'diamond'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "diamond",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "diamond",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'open-diamond'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'open-diamond'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "open-diamond",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "open-diamond",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'crow'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'crow'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "crow",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "crow",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'box'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'box'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "box",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "box",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'half-open'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'half-open'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "half-open",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "half-open",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'vee'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'vee'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "vee",
                        "edge.arrowHeadSize": 2,
                        "edge.arrowHeadText": "vee",
                        "edge.arrowHeadTextStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            attachOffset: 1,
                        },
                    },
                },
                {
                    name: "edges where data.kind == 'none'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'none'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.arrowHead": "none",
                        "edge.label": "none",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
        await assertLinePatternsDrawn(
            scene,
            LINE_GRID.filter((line) => line !== "solid").map((line) => `pattern-${line}`),
        );
        await assertViewMode(scene, "3d");
        await assertDistinctPicture(scene, "Styles/Edge", "camera=3d");
    },
    args: {
        setup: storySetup({
            viewMode: "3d",
            layers: [
                {
                    name: "edges where data.kind == 'solid'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'solid'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "solid",
                        "edge.arrowHead": "normal",
                        "edge.arrowHeadSize": 2,
                        "edge.label": "solid",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "dot",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "star",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "box",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "dash",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "diamond",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "dash-dot",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "sinewave",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "zigzag",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
        await assertLinePatternsDrawn(
            scene,
            LINE_GRID.filter((line) => line !== "solid").map((line) => `pattern-${line}`),
        );
        await assertViewMode(scene, "2d");
        await assertDistinctPicture(scene, "Styles/Edge", "camera=2d");
    },
    args: {
        setup: storySetup({
            viewMode: "2d",
            layers: [
                {
                    name: "edges where data.kind == 'solid'",
                    target: "edge",
                    selector: { match: "expression", where: "data.kind == 'solid'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "solid",
                        "edge.arrowHead": "normal",
                        "edge.arrowHeadSize": 2,
                        "edge.label": "solid",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "dot",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "star",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "box",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "dash",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "diamond",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "dash-dot",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "sinewave",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
                        "edge.arrowHeadSize": 2,
                        "edge.label": "zigzag",
                        "edge.labelStyle": {
                            sizePx: 32,
                            color: "#000000",
                            background: "transparent",
                            location: "top",
                            attachOffset: 1,
                        },
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
