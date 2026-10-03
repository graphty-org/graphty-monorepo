// Tests of tools/release-hold.mjs: which release-hold.json files are rejected, and how a hold
// rewrites nx.json's release.projects.
//
//   node --test tools/release-hold.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { problems, releaseProjects } from "./release-hold.mjs";

const PROJECTS = ["graphty-element", "algorithms", "@graphty/remote-logger"];
const held = (entry) => ({
    hold: [{ project: "graphty-element", reason: "API not reviewed", since: "2026-10-03", ...entry }],
});

describe("problems", () => {
    it("accepts an empty hold list", () => {
        assert.deepEqual(problems({ hold: [] }, PROJECTS), []);
    });

    it("accepts a complete entry, scoped names included", () => {
        assert.deepEqual(problems(held(), PROJECTS), []);
        assert.deepEqual(problems(held({ project: "@graphty/remote-logger" }), PROJECTS), []);
    });

    it("rejects a file without a hold list", () => {
        assert.equal(problems({}, PROJECTS).length, 1);
        assert.equal(problems({ hold: "graphty-element" }, PROJECTS).length, 1);
        assert.equal(problems(null, PROJECTS).length, 1);
    });

    it("rejects an unknown project name", () => {
        const [p] = problems(held({ project: "@graphty/graphty-element" }), PROJECTS);
        assert.match(p, /"@graphty\/graphty-element" is not an nx project/);
    });

    it("rejects a project listed twice", () => {
        const entry = held().hold[0];
        assert.match(problems({ hold: [entry, entry] }, PROJECTS).join("\n"), /listed twice/);
    });

    it("rejects a missing or blank reason", () => {
        assert.match(problems(held({ reason: undefined }), PROJECTS).join(), /"reason"/);
        assert.match(problems(held({ reason: "  " }), PROJECTS).join(), /"reason"/);
    });

    it("rejects a since that is not YYYY-MM-DD", () => {
        assert.match(problems(held({ since: "Oct 3" }), PROJECTS).join(), /"since"/);
        assert.match(problems(held({ since: undefined }), PROJECTS).join(), /"since"/);
    });

    it("rejects holding every project", () => {
        const hold = PROJECTS.map((project) => ({ project, reason: "r", since: "2026-10-03" }));
        assert.match(problems({ hold }, PROJECTS).join(), /every project is held/);
    });
});

describe("releaseProjects", () => {
    it("leaves the list alone when nothing is held", () => {
        assert.deepEqual(releaseProjects(["*"], []), ["*"]);
    });

    it("excludes each held project from the release graph", () => {
        assert.deepEqual(releaseProjects(["*"], ["graphty-element", "@graphty/remote-logger"]), [
            "*",
            "!graphty-element",
            "!@graphty/remote-logger",
        ]);
    });
});
