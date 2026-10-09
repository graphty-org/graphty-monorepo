// Tests of tools/release-status.mjs: the comment for each release outcome, and that it lands on the one
// "Release status" issue, opened on first use.
//
//   node tools/release-status.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { announce, LABEL, statusComment, TITLE } from "./release-status.mjs";

const RUN = "https://github.com/o/r/actions/runs/1";

describe("statusComment", () => {
    it("mentions the people to notify and links the run", () => {
        const c = statusComment("published", { run: RUN, tags: "layout@1.2.3" }, "@apowers313 ");
        assert.match(c, /^@apowers313 \*\*Released\*\*: layout@1\.2\.3 tagged and on npm\./);
        assert.match(c, /Run: https:\/\/github\.com\/o\/r\/actions\/runs\/1$/);
        assert.doesNotMatch(statusComment("published", { run: RUN }), /^@/);
    });

    it("names every published package and version", () => {
        assert.match(statusComment("published", { run: RUN, tags: "a@1.0.0,b@2.0.0" }), /a@1\.0\.0, b@2\.0\.0 tagged/);
    });

    it("says when a re-run of a failed publish succeeded or failed again", () => {
        assert.match(
            statusComment("published", { run: RUN, tags: "a@1", attempt: "2" }),
            /Released\*\* \(re-run, attempt 2\)/,
        );
        assert.match(
            statusComment("publish-failed", { run: RUN, sha: "abcdef123", attempt: "3", issue: "12" }),
            /Publish failed\*\* \(re-run, attempt 3\) on abcdef1.*#12/,
        );
        assert.doesNotMatch(statusComment("published", { run: RUN, attempt: "1" }), /re-run/);
    });

    it("says which lane held the release and where, also after a restart", () => {
        const c = statusComment("held", { run: RUN, sha: "abcdef123", what: "T4 GPU", issue: "99", restart: true });
        assert.match(
            c,
            /Release held\*\*: T4 GPU failed on abcdef1 after a restart following a fix\. Nothing was published\. Details: #99\./,
        );
        assert.match(
            statusComment("held", { run: RUN, issue: "https://github.com/o/r/issues/5" }),
            /Details: https:\/\/github\.com\/o\/r\/issues\/5\./,
        );
    });

    it("names the release pull request a passing train opened", () => {
        const c = statusComment("opened", {
            run: RUN,
            sha: "abcdef123",
            pr: "https://github.com/o/r/pull/7",
            tags: "a@1",
        });
        assert.match(
            c,
            /Release train passed\*\* on abcdef1: release pull request https:\/\/github\.com\/o\/r\/pull\/7 is open for a@1\./,
        );
    });

    it("refuses an unknown outcome", () => {
        assert.throws(() => statusComment("skipped", { run: RUN }), /unknown outcome/);
    });
});

describe("announce", () => {
    const fake = (issues) => {
        const calls = [];
        const request = async (method, path, body) => {
            calls.push([method, path, body]);
            if (method === "GET") return issues;
            if (path.endsWith("/labels")) throw new Error("422 already_exists");
            if (path.endsWith("/issues")) return { number: 42 };
            return {};
        };
        return { calls, request };
    };

    it("comments on the open Release status issue", async () => {
        const { calls, request } = fake([{ number: 8 }]);
        assert.equal(await announce({ request, repo: "o/r", body: "hi" }), 8);
        assert.deepEqual(calls, [
            ["GET", `/repos/o/r/issues?labels=${LABEL}&state=open&per_page=1`, undefined],
            ["POST", "/repos/o/r/issues/8/comments", { body: "hi" }],
        ]);
    });

    it("opens the issue and its label on first use, then comments", async () => {
        const { calls, request } = fake([]);
        assert.equal(await announce({ request, repo: "o/r", body: "hi" }), 42);
        assert.deepEqual(
            calls.map(([m, p]) => `${m} ${p}`),
            [
                `GET /repos/o/r/issues?labels=${LABEL}&state=open&per_page=1`,
                "POST /repos/o/r/labels",
                "POST /repos/o/r/issues",
                "POST /repos/o/r/issues/42/comments",
            ],
        );
        assert.equal(calls[2][2].title, TITLE);
        assert.deepEqual(calls[2][2].labels, [LABEL]);
    });
});
