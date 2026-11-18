import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { filesOf, heldBy, MASTER_BREAK, refresh } from "./refresh-inherited-prs.mjs";

const FILE = "graphty-element/test/browser/layout-visible-only-accelerated.test.ts";
const pr = (number, paths) => ({
    number,
    headRefOid: `h${number}`,
    commits: {
        nodes: [
            {
                commit: {
                    checkSuites: {
                        nodes: [
                            { checkRuns: { nodes: [{ annotations: { nodes: paths.map((path) => ({ path })) } }] } },
                        ],
                    },
                },
            },
        ],
    },
});
const answer = {
    data: { repository: { pullRequests: { nodes: [pr(1, [FILE]), pr(2, ["other.test.ts"]), pr(3, [])] } } },
};

describe("refresh-inherited-prs", () => {
    it("knows a master break's issue by its title", () => {
        for (const t of [
            "Red master: Test fails x in open pull requests",
            "Full run red: graphty-element-browser",
            "Failing on master: a.test.ts > b",
            "Flaky test: a.test.ts > b",
            "Flaky test quarantined: a.test.ts > b",
            "t4 lane red on master",
        ])
            assert.match(t, MASTER_BREAK);
        assert.doesNotMatch("fix: red master banner", MASTER_BREAK);
    });

    it("reads the test files an issue names", () => {
        const issue = {
            title: `Failing on master: ${FILE} > n1 inert`,
            body: "also `graphty/src/a.spec.tsx` and x.ts",
        };
        assert.deepEqual(filesOf(issue), [FILE, "graphty/src/a.spec.tsx"]);
    });

    it("updates only the pull requests whose failed check is annotated on the issue's test file", () => {
        assert.deepEqual(heldBy(answer, [FILE]), [{ number: 1, head: "h1" }]);
        const calls = [];
        const gh = (args) => {
            calls.push(args);
            return args[1] === "graphql" ? JSON.stringify(answer) : "{}";
        };
        const issue = { number: 9, title: `Red master: Test fails ${FILE}`, body: "", state_reason: "completed" };
        assert.deepEqual(refresh(issue, gh, "o/r"), [1]);
        assert.deepEqual(calls[1], [
            "api",
            "-X",
            "PUT",
            "repos/o/r/pulls/1/update-branch",
            "-f",
            "expected_head_sha=h1",
        ]);
        assert.equal(calls.length, 2, "one GraphQL query, one update");
    });

    it("leaves everything alone for an issue closed as not planned, another kind of issue, or one naming no test", () => {
        const gh = () => assert.fail("no GitHub call");
        assert.deepEqual(
            refresh({ number: 1, title: `Red master: ${FILE}`, state_reason: "not_planned" }, gh, "o/r"),
            [],
        );
        assert.deepEqual(refresh({ number: 2, title: `fix ${FILE}`, state_reason: "completed" }, gh, "o/r"), []);
        assert.deepEqual(
            refresh({ number: 3, title: "Red master: build", body: "", state_reason: "completed" }, gh, "o/r"),
            [],
        );
    });

    it("warns and goes on when one pull request cannot be updated", () => {
        const two = { data: { repository: { pullRequests: { nodes: [pr(1, [FILE]), pr(4, [FILE])] } } } };
        const gh = (args) => {
            if (args[1] === "graphql") return JSON.stringify(two);
            if (args[3].includes("/1/")) throw new Error("HTTP 422: merge conflict");
            return "{}";
        };
        assert.deepEqual(
            refresh({ number: 9, title: `Flaky test: ${FILE}`, state_reason: "completed" }, gh, "o/r"),
            [4],
        );
    });
});
