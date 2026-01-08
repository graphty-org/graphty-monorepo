import type { Preview } from "@storybook/html";
import DocumentationTemplate from "./DocumentationTemplate.mdx";

const preview: Preview = {
    parameters: {
        controls: {
            expanded: true,
            matchers: {
                color: /(background|color)$/i,
                date: /Date$/i,
            },
        },
        docs: {
            page: DocumentationTemplate,
        },
        options: {
            storySort: {
                method: "alphabetical",
            },
        },
        // Chromatic visual testing configuration
        chromatic: {
            // Delay for graph layout to settle
            delay: 300,
        },
    },
};

export default preview;
