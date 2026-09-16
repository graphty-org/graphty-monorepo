export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            [
                "graph-format",
                "graph-io",
                "algorithms",
                "layout",
                "graphty-element",
		"compact-mantine",
		"remote-logger",
                "graphty",
		"compact-mantine",
		"remote-logger",
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
