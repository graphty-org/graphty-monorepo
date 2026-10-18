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
            // Show each story's consumer code (parameters.docs.source.code) beside the canvas
            codePanel: true,
        },
        options: {
            // The sections in reading order, each opening with its Overview; stories keep their file's order.
            // The section list matches the layout guide on graphty.app.
            storySort: {
                order: [
                    "Introduction",
                    ["Welcome", "Getting started", "All layouts"],
                    "Geometric",
                    ["Overview", "Circular", "Circular in 3D", "Shell", "Spiral", "Grid", "Random"],
                    "Structural",
                    ["Overview", "BFS", "Radial", "Bipartite", "Multipartite", "Planar"],
                    "Force-directed",
                    [
                        "Overview",
                        "ForceAtlas2",
                        "ForceAtlas2 in 3D",
                        "Spring (Fruchterman-Reingold)",
                        "Spring in 3D",
                        "Kamada-Kawai",
                        "Kamada-Kawai in 3D",
                        "ARF",
                        "Spectral",
                    ],
                    "Simulations",
                    ["Overview", "Step by step"],
                ],
            },
        },
        // Accessibility checks run on every story and are reported in the Accessibility panel, without failing yet
        a11y: { test: "todo" },
        // Visual capture settings (visual-review reads them)
        chromatic: {
            // Delay for graph layout to settle
            delay: 300,
        },
    },
};

export default preview;
