export default {
    extends: ["@commitlint/config-conventional"],
    // Older merge commits in master's history are titled "land: <branch>" (and "Reapply ..." of one);
    // the commits they brought in are checked on their own.
    ignores: [(message) => /^(land: \S+|Reapply "land: \S+")\s*$/m.test(message.split("\n")[0])],
    rules: {
        "scope-enum": [
            2,
            "always",
            [
                "graph-format",
                "graph-io",
                "graph-samples",
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
                "gpu-3d-force-layout",
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
