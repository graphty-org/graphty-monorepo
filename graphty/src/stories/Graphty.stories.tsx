// Storybook does not run src/main.tsx, so the story defines the real <graphty-element> itself.
// A stand-in element must never be registered under the tag: whichever story file loads first
// would own it, and the real element would then find its name taken.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";

import { Graphty } from "../components/Graphty";

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
    // One box per story, sized by its `box` parameter. A story-level decorator would sit INSIDE
    // this one, so a larger story box overflowed the default 800 x 600 and widened the page.
    decorators: [
        (Story, { parameters }) => {
            const { width, height } = (parameters.box as { width: number; height: number } | undefined) ?? {
                width: 800,
                height: 600,
            };
            return (
                <div style={{ width: `${width}px`, height: `${height}px` }}>
                    <Story />
                </div>
            );
        },
    ],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Small: Story = {
    parameters: { box: { width: 400, height: 300 } },
};

// The largest 4:3 box that fits the 1200 x 900 viewport inside the centered layout's padding.
export const Large: Story = {
    parameters: { box: { width: 1100, height: 825 } },
};
