import type { Preview } from "@storybook/html-vite";

const preview: Preview = {
    parameters: {
        layout: "fullscreen",
        controls: {
            expanded: true,
        },
        options: {
            storySort: {
                method: "alphabetical",
            },
        },
    },
};

export default preview;
