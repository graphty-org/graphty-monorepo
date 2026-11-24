import type { Meta, StoryObj } from "@storybook/react";

import { App } from "../App";
import { paintSettled } from "./paintSettled";

const meta: Meta<typeof App> = {
    title: "Components/App",
    component: App,
    parameters: {
        layout: "fullscreen",
    },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
    play: async ({ canvasElement }) => {
        // The start page's graph draws after the page, and its loading cover then fades out:
        // wait for the cover to be done and the fade to end, then draw the page afresh.
        await new Promise<void>((resolve) => {
            const check = (): void => {
                if (canvasElement.querySelector(".ws-land-loading[data-done]") === null) {
                    requestAnimationFrame(check);
                } else {
                    resolve();
                }
            };
            check();
        });
        await paintSettled(canvasElement.ownerDocument);
    },
};
