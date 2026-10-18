// Storybook does not run src/main.tsx, which is where the app defines <graphty-element>.
// Without this import the tag is an unknown element and the canvas region is empty.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";

import { App } from "../App";

const meta: Meta<typeof App> = {
    title: "Examples/Full app",
    // The old title's component id, so the story id (and its approved image) stays the same.
    id: "components-app",
    tags: ["autodocs"],
    component: App,
    parameters: {
        layout: "fullscreen",
        docs: {
            description: {
                component:
                    "The whole graphty app, as it runs at https://graphty.app/. It opens on the start screen: pick a sample graph or open a file of your own, then analyze, style and export it. Files you open are read on this computer and never uploaded.",
            },
        },
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
