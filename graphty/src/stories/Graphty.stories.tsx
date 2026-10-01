// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
// A stand-in element must never be registered under the tag: whichever story file loads first
// would own it, and the real element would then find its name taken.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";

import { Graphty } from "../components/Graphty";

/** Eight nodes on a ring, with two chords across it. */
const NODES = Array.from({ length: 8 }, (_, i) => ({ id: `n${String(i)}` }));
const EDGES = [
    ...NODES.map((node, i) => ({ source: node.id, target: NODES[(i + 1) % NODES.length].id })),
    { source: "n0", target: "n4" },
    { source: "n2", target: "n6" },
];

const meta: Meta<typeof Graphty> = {
    title: "Components/Graphty",
    component: Graphty,
    parameters: {
        layout: "centered",
    },
    args: {
        // Provide default empty layers array to prevent "e is not iterable" error
        layers: [],
    },
    // An empty element is an empty canvas: load a small graph so the story shows what it draws.
    play: async ({ canvasElement }) => {
        await customElements.whenDefined("graphty-element");
        const element = canvasElement.querySelector("graphty-element");
        if (element === null) {
            throw new Error("the story rendered no <graphty-element>");
        }

        // A flat circle is placed the same way every time, so the picture never depends on a seed.
        await element.session.layout.setDimension("2d");
        await element.session.layout.set("circular");
        await element.session.data.addNodes(NODES);
        await element.session.data.addEdges(EDGES);
        await element.waitForStableFrame();
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The element at a fixed size, set per story: Storybook nests a story's decorators inside the
 * meta's, so a size on the meta would box every other story inside it.
 */
function sized(width: number, height: number): Story["decorators"] {
    return [
        (Story) => (
            <div style={{ width: `${String(width)}px`, height: `${String(height)}px` }}>
                <Story />
            </div>
        ),
    ];
}

export const Default: Story = { decorators: sized(800, 600) };

export const Small: Story = { decorators: sized(400, 300) };

// The largest that fits the 1200 x 900 canvas inside the centered layout's padding.
export const Large: Story = { decorators: sized(1100, 800) };
