export default {
    extends: ["@commitlint/config-conventional"],
    rules: {
        "scope-enum": [
            2,
            "always",
            [
                "algorithms",
                "layout",
                "graphty-element",
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
