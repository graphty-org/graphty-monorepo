import "../src/index.css";

import type {Preview} from "@storybook/react";
import eruda from "eruda";

import DocumentationTemplate from "./DocumentationTemplate.mdx";

// Initialize eruda for mobile debugging
eruda.init();
eruda.show("console");
eruda.position({x: window.innerWidth - 60, y: 20});

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
                order: [
                    // App stories first
                    "App",
                    ["Default", "*"],
                    // Then Graphty stories
                    "Graphty",
                    ["Default", "*"],
                ],
                includeNames: true,
            },
        },
    },
};

export default preview;
