import type { Meta, StoryObj } from "@storybook/web-components-vite";

import { Graphty } from "../src/graphty-element";
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

export const Default: Story = {};

export const Width: Story = {
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
 * WHAT THIS NO LONGER DEMONSTRATES: an arrow's own size, colour and opacity, which were three
 * stories of their own here. A style layer chooses WHICH arrow is drawn and nothing else about
 * it -- `edge.arrowHead` is the whole of the vocabulary -- so an arrow takes its appearance from
 * the line it caps. The renderer still draws an arrow at any size, in any colour; nothing can
 * ask it to.
 */
export const ArrowHead: Story = {
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

export const LineOpacity: Story = {
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
 * A translucent line, and the arrow that caps it.
 *
 * This used to set the line's opacity and the arrow's separately, to show them combining. An
 * arrow has no opacity of its own to set any more, so what is left is the line's.
 */
export const CombinedOpacity: Story = {
    args: {
        setup: storySetup({
            edge: { "edge.color": "darkgrey", "edge.opacity": 0.3, "edge.arrowHead": "normal" },
        }),
    },
    parameters: {
        controls: {
            include: ["edge.opacity"],
        },
    },
};

/**
 * Every arrow the element draws, in a grid, each edge labelled with the arrow's name.
 *
 * THE NAME IS NOW THE EDGE'S OWN LABEL rather than a caption beside the arrow. A layer can say
 * which arrow an edge carries and what the EDGE's label says; an arrow's own caption, size and
 * colour have no channel, so the fourteen captions that used to sit beside the arrow heads are
 * drawn on the lines instead.
 */
export const TwoDAllArrows: Story = {
    args: {
        setup: storySetup({
            viewMode: "2d",
            startingCameraDistance: 54,
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.src == 'normal-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'normal-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "normal", "edge.label": "normal" },
                },
                {
                    name: "edges where data.src == 'inverted-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'inverted-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "inverted", "edge.label": "inverted" },
                },
                {
                    name: "edges where data.src == 'dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dot-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "dot", "edge.label": "dot" },
                },
                {
                    name: "edges where data.src == 'sphere-dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'sphere-dot-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "sphere-dot", "edge.label": "sphere-dot" },
                },
                {
                    name: "edges where data.src == 'open-dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'open-dot-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-dot", "edge.label": "open-dot" },
                },
                {
                    name: "edges where data.src == 'tee-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'tee-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "tee", "edge.label": "tee" },
                },
                {
                    name: "edges where data.src == 'open-normal-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'open-normal-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-normal", "edge.label": "open-normal" },
                },
                {
                    name: "edges where data.src == 'diamond-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'diamond-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "diamond", "edge.label": "diamond" },
                },
                {
                    name: "edges where data.src == 'open-diamond-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'open-diamond-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-diamond", "edge.label": "open-diamond" },
                },
                {
                    name: "edges where data.src == 'crow-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'crow-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "crow", "edge.label": "crow" },
                },
                {
                    name: "edges where data.src == 'box-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'box-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "box", "edge.label": "box" },
                },
                {
                    name: "edges where data.src == 'half-open-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'half-open-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "half-open", "edge.label": "half-open" },
                },
                {
                    name: "edges where data.src == 'vee-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'vee-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "vee", "edge.label": "vee" },
                },
                {
                    name: "edges where data.src == 'none-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'none-src'" },
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
            { src: "normal-src", dst: "normal-dst" },
            { src: "inverted-src", dst: "inverted-dst" },
            { src: "dot-src", dst: "dot-dst" },
            { src: "sphere-dot-src", dst: "sphere-dot-dst" },
            // Row 2
            { src: "open-dot-src", dst: "open-dot-dst" },
            { src: "tee-src", dst: "tee-dst" },
            { src: "open-normal-src", dst: "open-normal-dst" },
            { src: "diamond-src", dst: "diamond-dst" },
            // Row 3
            { src: "open-diamond-src", dst: "open-diamond-dst" },
            { src: "crow-src", dst: "crow-dst" },
            { src: "box-src", dst: "box-dst" },
            { src: "half-open-src", dst: "half-open-dst" },
            // Row 4
            { src: "vee-src", dst: "vee-dst" },
            { src: "none-src", dst: "none-dst" },
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
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.src == 'normal-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'normal-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "normal", "edge.label": "normal" },
                },
                {
                    name: "edges where data.src == 'inverted-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'inverted-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "inverted", "edge.label": "inverted" },
                },
                {
                    name: "edges where data.src == 'dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dot-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "dot", "edge.label": "dot" },
                },
                {
                    name: "edges where data.src == 'sphere-dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'sphere-dot-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "sphere-dot", "edge.label": "sphere-dot" },
                },
                {
                    name: "edges where data.src == 'open-dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'open-dot-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-dot", "edge.label": "open-dot" },
                },
                {
                    name: "edges where data.src == 'tee-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'tee-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "tee", "edge.label": "tee" },
                },
                {
                    name: "edges where data.src == 'open-normal-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'open-normal-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-normal", "edge.label": "open-normal" },
                },
                {
                    name: "edges where data.src == 'diamond-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'diamond-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "diamond", "edge.label": "diamond" },
                },
                {
                    name: "edges where data.src == 'open-diamond-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'open-diamond-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "open-diamond", "edge.label": "open-diamond" },
                },
                {
                    name: "edges where data.src == 'crow-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'crow-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "crow", "edge.label": "crow" },
                },
                {
                    name: "edges where data.src == 'box-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'box-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "box", "edge.label": "box" },
                },
                {
                    name: "edges where data.src == 'half-open-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'half-open-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "half-open", "edge.label": "half-open" },
                },
                {
                    name: "edges where data.src == 'vee-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'vee-src'" },
                    set: { "edge.color": "darkgrey", "edge.arrowHead": "vee", "edge.label": "vee" },
                },
                {
                    name: "edges where data.src == 'none-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'none-src'" },
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
            { src: "normal-src", dst: "normal-dst" },
            { src: "inverted-src", dst: "inverted-dst" },
            { src: "dot-src", dst: "dot-dst" },
            { src: "sphere-dot-src", dst: "sphere-dot-dst" },
            // Row 2
            { src: "open-dot-src", dst: "open-dot-dst" },
            { src: "tee-src", dst: "tee-dst" },
            { src: "open-normal-src", dst: "open-normal-dst" },
            { src: "diamond-src", dst: "diamond-dst" },
            // Row 3
            { src: "open-diamond-src", dst: "open-diamond-dst" },
            { src: "crow-src", dst: "crow-dst" },
            { src: "box-src", dst: "box-dst" },
            { src: "half-open-src", dst: "half-open-dst" },
            // Row 4
            { src: "vee-src", dst: "vee-dst" },
            { src: "none-src", dst: "none-dst" },
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
    args: {
        setup: storySetup({
            viewMode: "3d",
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.src == 'solid-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'solid-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "solid",
                        "edge.arrowHead": "normal",
                        "edge.label": "solid",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dot-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'star-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'star-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "star",
                        "edge.arrowHead": "normal",
                        "edge.label": "star",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'box-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'box-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "box",
                        "edge.arrowHead": "normal",
                        "edge.label": "box",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'dash-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dash-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'diamond-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'diamond-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "diamond",
                        "edge.arrowHead": "normal",
                        "edge.label": "diamond",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'dash-dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dash-dot-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash-dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash-dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'sinewave-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'sinewave-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "sinewave",
                        "edge.arrowHead": "normal",
                        "edge.label": "sinewave",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'zigzag-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'zigzag-src'" },
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
            { src: "solid-src", dst: "solid-dst" },
            { src: "dot-src", dst: "dot-dst" },
            { src: "star-src", dst: "star-dst" },
            // Row 2
            { src: "box-src", dst: "box-dst" },
            { src: "dash-src", dst: "dash-dst" },
            { src: "diamond-src", dst: "diamond-dst" },
            // Row 3
            { src: "dash-dot-src", dst: "dash-dot-dst" },
            { src: "sinewave-src", dst: "sinewave-dst" },
            { src: "zigzag-src", dst: "zigzag-dst" },
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
    args: {
        setup: storySetup({
            viewMode: "2d",
            node: { "node.color": "#5A67D8" },
            layers: [
                {
                    name: "edges where data.src == 'solid-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'solid-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "solid",
                        "edge.arrowHead": "normal",
                        "edge.label": "solid",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dot-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'star-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'star-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "star",
                        "edge.arrowHead": "normal",
                        "edge.label": "star",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'box-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'box-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "box",
                        "edge.arrowHead": "normal",
                        "edge.label": "box",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'dash-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dash-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'diamond-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'diamond-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "diamond",
                        "edge.arrowHead": "normal",
                        "edge.label": "diamond",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'dash-dot-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'dash-dot-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "dash-dot",
                        "edge.arrowHead": "normal",
                        "edge.label": "dash-dot",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'sinewave-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'sinewave-src'" },
                    set: {
                        "edge.color": "darkgrey",
                        "edge.style": "sinewave",
                        "edge.arrowHead": "normal",
                        "edge.label": "sinewave",
                        "edge.labelStyle": { sizePx: 32, color: "#000000", background: "transparent" },
                    },
                },
                {
                    name: "edges where data.src == 'zigzag-src'",
                    target: "edge",
                    selector: { match: "expression", where: "data.src == 'zigzag-src'" },
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
            { src: "solid-src", dst: "solid-dst" },
            { src: "dot-src", dst: "dot-dst" },
            { src: "star-src", dst: "star-dst" },
            // Row 2
            { src: "box-src", dst: "box-dst" },
            { src: "dash-src", dst: "dash-dst" },
            { src: "diamond-src", dst: "diamond-dst" },
            // Row 3
            { src: "dash-dot-src", dst: "dash-dot-dst" },
            { src: "sinewave-src", dst: "sinewave-dst" },
            { src: "zigzag-src", dst: "zigzag-dst" },
        ],
        layout: "fixed",
    },
    parameters: {
        chromatic: {
            delay: 1000,
        },
    },
};
