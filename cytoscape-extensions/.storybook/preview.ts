import type { Preview } from "@storybook/html-vite";

// A deploy renames the lazily loaded chunks (each dataset is one), so a page loaded before it asks for chunks that are
// gone. Vite reports the failed import as vite:preloadError: reload once to get the new chunk names, and only once per
// page, so a chunk that is really missing still shows its error.
globalThis.addEventListener("vite:preloadError", (event) => {
    const key = "graphty-chunk-reload";
    let reloaded: string | null = null;
    try {
        reloaded = sessionStorage.getItem(key);
    } catch {
        // storage blocked: reload anyway, at worst once more
    }
    if (reloaded === location.href) {
        return;
    }
    try {
        sessionStorage.setItem(key, location.href);
    } catch {
        // storage blocked
    }
    event.preventDefault();
    location.reload();
});

const preview: Preview = {
    parameters: {
        layout: "fullscreen",
        controls: {
            expanded: true,
        },
        docs: {
            // each story's code (parameters.docs.source.code, set in stories/gallery-stories.ts) beside the canvas
            codePanel: true,
        },
        // accessibility checks are reported in the panel and do not fail a story yet
        a11y: { test: "todo" },
        options: {
            // the sections in reader order; within a component, the "Side by side" story first and then its tiles in
            // catalog order (the export order)
            storySort: {
                order: [
                    "Introduction",
                    ["Welcome", "Getting started", "Choosing a backend", "WebGPU settings"],
                    "Layouts",
                    ["Overview", "All layouts"],
                    "Algorithms",
                    [
                        "Overview",
                        "Centrality",
                        "Communities",
                        "Paths and trees",
                        "Structure",
                        "Flows and cuts",
                        "Link prediction",
                    ],
                    "Data",
                    [
                        "Overview",
                        "Generators",
                        [
                            "Side by side",
                            "Classic shapes",
                            "Lattices",
                            "Random graphs",
                            "Small world",
                            "Scale-free and growth",
                            "Degree sequences",
                            "Communities",
                            "Geometric",
                            "Trees and DAGs",
                            "Flow networks",
                        ],
                        "Datasets",
                        "Formats",
                    ],
                    "Performance",
                    ["Overview", "Large graphs"],
                ],
            },
        },
    },
};

export default preview;
