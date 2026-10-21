import type { Preview } from "@storybook/web-components-vite";

import { pinLabelFont } from "../../../graphty-element/test/helpers/pin-label-font";

const preview: Preview = {
    // Labels draw in the font graphty-element's own stories and tests pin, so a capture does not
    // depend on the machine's fonts.
    loaders: [
        async () => {
            await pinLabelFont();
            return {};
        },
    ],
    parameters: {
        layout: "fullscreen",
    },
};
export default preview;
