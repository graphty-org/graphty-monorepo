// Storybook does not run src/main.tsx, which is where the app defines <graphty-element>.
// Without this import the tag is an unknown element and the canvas region is empty.
import "@graphty/graphty-element";

import type { Meta, StoryObj } from "@storybook/react";

import { App } from "../App";

const meta: Meta<typeof App> = {
    title: "Components/App",
    component: App,
    parameters: {
        layout: "fullscreen",
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
