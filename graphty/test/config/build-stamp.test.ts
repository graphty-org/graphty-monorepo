/**
 * The build stamp: which commit and release a built page is, written into its head.
 */
import { describe, expect, it } from "vitest";

import { buildStampPlugin, readBuildStamp } from "../../vite.build-stamp";

describe("the build stamp", () => {
    it("reads the commit and the latest graphty release tag from git", () => {
        const asked: string[][] = [];
        const stamp = readBuildStamp((args) => {
            asked.push([...args]);
            return args[0] === "rev-parse" ? "0123456789ab" : "graphty@0.8.35";
        }, {});

        expect(stamp).toEqual({ commit: "0123456789ab", release: "graphty@0.8.35" });
        expect(asked[1]).toContain("graphty@*");
    });

    it("falls back to CI's commit, and says when nothing is released", () => {
        const stamp = readBuildStamp(() => null, { GITHUB_SHA: "fedcba9876543210fedcba" });

        expect(stamp).toEqual({ commit: "fedcba987654", release: "unreleased" });
    });

    it("writes one meta tag into the page head", () => {
        const plugin = buildStampPlugin({ commit: "abc", release: "graphty@1.0.0" });
        const hook = plugin.transformIndexHtml as () => unknown;

        expect(hook()).toEqual([
            {
                tag: "meta",
                attrs: { name: "graphty-build", content: "abc graphty@1.0.0" },
                injectTo: "head",
            },
        ]);
    });

    it("stamps this checkout with a real commit", () => {
        expect(readBuildStamp().commit).toMatch(/^[0-9a-f]{12}$/);
    });
});
