export default {
    extends: ["@commitlint/config-conventional"],
    // The merge commits the retired golden landing tool made ("land: <branch>") and its reapply of a
    // reverted landing, still in master's history; the commits they brought in are checked on their own.
    ignores: [(message) => /^(land: \S+|Reapply "land: \S+")\s*$/m.test(message.split("\n")[0])],
    rules: {
        "scope-enum": [
            2,
            "always",
            [
                "graph-format",
                "graph-io",
                "graph-samples",
                "gazetteer",
                "babylonjs-map",
                "webgpu-graph-algorithms",
                "algorithms",
                "layout",
                "cytoscape-extensions",
                "graphty-element",
                "compact-mantine",
                "remote-logger",
                "graphty",
                "visual-review",
                "githerd",
                "deps",
                "release",
                "ci",
                "docs",
                "tools",
                "workspace",
            ],
        ],
    },
};
