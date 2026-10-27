// Tests of tools/release-hold.mjs: which release-hold.json files are rejected, and how a hold
// rewrites nx.json's release.projects.
//
//   node --test tools/release-hold.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { holdAllBut, holdAlso, privateProjects, problems, releaseProjects, unversionable } from "./release-hold.mjs";

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

describe("holdAllBut", () => {
    const empty = { hold: [] };

    it("holds every project the ad hoc release does not name", () => {
        const { hold, problems: found } = holdAllBut(empty, PROJECTS, ["algorithms"], "2026-10-04");
        assert.deepEqual(found, []);
        assert.deepEqual(
            hold.hold.map((h) => h.project),
            ["graphty-element", "@graphty/remote-logger"],
        );
        assert.deepEqual(problems(hold, PROJECTS), []);
    });

    it("keeps the holds already in the file, so a named but held project stays held", () => {
        const { hold } = holdAllBut(held(), PROJECTS, ["graphty-element", "algorithms"], "2026-10-04");
        assert.deepEqual(
            hold.hold.map((h) => h.project),
            ["graphty-element", "@graphty/remote-logger"],
        );
        const onlyHeld = holdAllBut(held(), PROJECTS, ["graphty-element"], "2026-10-04").hold;
        assert.match(problems(onlyHeld, PROJECTS).join(), /every project is held/);
    });

    it("rejects a name that is not an nx project, and an empty list", () => {
        assert.match(holdAllBut(empty, PROJECTS, ["algorithms", "algorithm"], "x").problems.join(), /algorithm$/);
        assert.equal(holdAllBut(empty, PROJECTS, [], "x").problems.length, 1);
    });
});

describe("holdAlso", () => {
    it("holds the named projects for this run like file entries, each once, keeping the file's holds (#4021)", () => {
        const { hold } = holdAlso(held(), ["algorithms", "graphty-element", "algorithms"], "2026-10-27");
        assert.deepEqual(
            hold.map((h) => h.project),
            ["graphty-element", "algorithms"],
        );
        assert.deepEqual(problems({ hold }, PROJECTS), []);
        assert.deepEqual(
            releaseProjects(
                ["*"],
                hold.map((h) => h.project),
            ),
            ["*", "!graphty-element", "!algorithms"],
        );
    });

    it("leaves an unknown name for problems to reject", () => {
        const { hold } = holdAlso({ hold: [] }, ["algorithm"], "2026-10-27");
        assert.match(problems({ hold }, PROJECTS).join(), /"algorithm" is not an nx project/);
    });
});

describe("unversionable", () => {
    const project = (entry) => ({ name: "x", version: "1.0.0", tagged: false, ...entry });

    it("accepts a project with a tag, a version on disk, or both", () => {
        assert.deepEqual(unversionable([project({ tagged: true, version: undefined })]), []);
        assert.deepEqual(unversionable([project({ version: "0.0.0" })]), []);
        assert.deepEqual(unversionable([project({ tagged: true })]), []);
    });

    it("rejects a project with no tag and no version on disk", () => {
        assert.match(
            unversionable([project({ version: undefined })]).join(),
            /x has no x@<version> tag and no version/,
        );
        assert.equal(unversionable([project({ version: "" }), project({ name: "y", tagged: true })]).length, 1);
    });
});

describe("privateProjects", () => {
    it("accepts projects that are not private", () => {
        assert.deepEqual(privateProjects([{ name: "x", isPrivate: false }, { name: "y" }]), []);
    });

    it("rejects a private project", () => {
        const found = privateProjects([
            { name: "x", isPrivate: true },
            { name: "y", isPrivate: false },
        ]);
        assert.equal(found.length, 1);
        assert.match(found[0], /x is private/);
    });
});
