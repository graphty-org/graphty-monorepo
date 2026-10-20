import type { Preview } from "@storybook/web-components-vite";

const preview: Preview = {
    parameters: {
        layout: "fullscreen",
        controls: { expanded: true, matchers: { color: /color$/i } },
        options: { storySort: { order: ["Shader Lab", ["Overview", "Basics", "*"]] } },
    },
};
export default preview;
