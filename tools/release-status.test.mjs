// Tests of tools/release-status.mjs: the comment for each release outcome, and that it lands on the one
// "Release status" issue, opened on first use.
//
//   node tools/release-status.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
    announce,
    LABEL,
    push,
    PUSHOVER_URL,
    pushMessage,
    replacedWhilePending,
    reportsFailure,
    statusComment,
    TITLE,
} from "./release-status.mjs";

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

    it("announces a red full run and an owner item, and counts both as a reported failure", () => {
        const red = statusComment("red", { run: RUN, sha: "abcdef123", what: "CI, Hosts", issue: "41" });
        assert.match(red, /\*\*Full run red\*\*: CI, Hosts failed on abcdef1\. Nothing was published.*Details: #41\./);
        assert.doesNotMatch(red, /a bisect looks/, "it claims no bisect it was not told of");
        const noBisect = statusComment("red", {
            run: RUN,
            sha: "abcdef123",
            what: "security audit",
            issue: "41",
            bisect: "No bisect: security audit: no bisect; the pipeline round looks.",
        });
        assert.match(noBisect, /Nothing was published\. No bisect: security audit/);
        const owner = statusComment("owner-item", { run: RUN, sha: "abcdef123", what: "LLM regression" });
        assert.match(owner, /\*\*Owner item\*\*: the full run on abcdef1 failed for a reason no code change fixes/);
        assert.equal(reportsFailure(red, RUN, "1"), true);
        assert.equal(reportsFailure(owner, RUN, "1"), true);
        assert.equal(pushMessage("red", { run: RUN, sha: "abcdef123", what: "CI", issue: "41" }).title, "Full run RED");
        assert.equal(pushMessage("owner-item", { run: RUN, sha: "abcdef123" }).priority, "0");
        const what = "10 screenshots differ from master's baselines: graphty 10";
        const images = statusComment("green-images", { run: RUN, sha: "abcdef123", what });
        assert.match(
            images,
            /^\*\*Screenshots changed\*\*: the full run on abcdef1 passed every lane, but 10 screenshots/,
        );
        assert.match(images, /\nACTION NEEDED: review the changed screenshots of the full run on abcdef1\n/);
        assert.equal(reportsFailure(images, RUN, "1"), false, "changed screenshots are not a failed run");
        assert.equal(
            pushMessage("green-images", { run: RUN, sha: "abcdef123", what }).title,
            "Full run SCREENSHOTS CHANGED",
        );
    });

    it("says a run ended badly without announcing, with its conclusion and attempt", () => {
        const c = statusComment("run-ended", { run: RUN, sha: "abcdef123", what: "timed_out", attempt: "2" });
        assert.match(c, /\*\*Release run ended timed_out\*\* \(re-run, attempt 2\) on abcdef1, and no comment here/);
        assert.match(c, /Run: https:\/\/github\.com\/o\/r\/actions\/runs\/1$/);
    });

    it("announces a promoted nightly, and a nightly whose site deploy failed as a failure", () => {
        const promoted = statusComment("nightly", { run: RUN, sha: "abcdef123", tags: "a@1.0.0,b@2.0.0" });
        assert.match(
            promoted,
            /\*\*Nightly promoted\*\*: abcdef1 is on nightly.graphty.app and npm `next` holds a@1.0.0, b@2.0.0\./,
        );
        assert.match(
            statusComment("nightly", { run: RUN, sha: "abcdef123" }),
            /no package changed, so npm `next` did not move/,
        );
        const failed = statusComment("nightly-failed", { run: RUN, sha: "abcdef123", issue: "77" });
        assert.match(
            failed,
            /\*\*Nightly site deploy failed\*\* on abcdef1: npm `next` and nightly.graphty.app now differ\. Details: #77\./,
        );
        assert.equal(reportsFailure(promoted, RUN, "1"), false);
        assert.equal(reportsFailure(failed, RUN, "1"), true, "the release-watch backstop does not report it twice");
        assert.equal(pushMessage("nightly", { run: RUN, sha: "abcdef123", tags: "a@1.0.0" }).title, "Nightly PROMOTED");
        assert.equal(pushMessage("nightly-failed", { run: RUN, sha: "abcdef123", issue: "77" }).priority, "1");
        const held = statusComment("nightly-held", {
            run: RUN,
            sha: "abcdef123",
            issue: "78",
            what: "landing on master",
        });
        assert.match(
            held,
            /\*\*Nightly promotion failed\*\* on abcdef1: landing on master did not finish[^\n]*Details: #78\./,
        );
        assert.doesNotMatch(held, /Release held/);
        assert.equal(reportsFailure(held, RUN, "1"), true, "the backstop does not report it twice");
        const push = pushMessage("nightly-held", { run: RUN, sha: "abcdef123", issue: "78" });
        assert.deepEqual([push.title, push.priority], ["Nightly PROMOTION FAILED", "1"]);
    });

    it("refuses an unknown outcome", () => {
        // no release pull request any more: the train publishes directly (owner decision, 2026-10-11)
        for (const gone of ["skipped", "opened", "dequeued"]) {
            assert.throws(() => statusComment(gone, { run: RUN }), /unknown outcome/, gone);
        }
    });
});

describe("reportsFailure", () => {
    const held = (attempt) => statusComment("held", { run: RUN, sha: "abc", attempt }, "@x");
    it("finds a failure comment of the same run and attempt", () => {
        assert.ok(reportsFailure(held("1"), RUN, "1"));
        assert.ok(reportsFailure(held(undefined), RUN, "1"));
        assert.ok(reportsFailure(held("2"), RUN, "2"));
        assert.ok(reportsFailure(statusComment("publish-failed", { run: RUN }), RUN, "1"));
        assert.ok(reportsFailure(statusComment("run-ended", { run: RUN, what: "failure" }), RUN, "1"));
    });
    it("ignores another attempt, another run, and the success comments a run can still fail after", () => {
        assert.ok(!reportsFailure(held("1"), RUN, "2"));
        assert.ok(!reportsFailure(held("2"), RUN, "1"));
        assert.ok(!reportsFailure(held("1"), `${RUN}0`, "1"));
        assert.ok(!reportsFailure(statusComment("published", { run: RUN }), RUN, "1"));
    });
});

describe("replacedWhilePending", () => {
    const req =
        (total_count, calls = []) =>
        async (method, path) => (calls.push(path), { total_count });
    it("is true only for a cancelled run with no job", async () => {
        const calls = [];
        assert.ok(
            await replacedWhilePending({
                request: req(0, calls),
                repo: "o/r",
                run: RUN,
                attempt: "1",
                conclusion: "cancelled",
            }),
        );
        assert.deepEqual(calls, ["/repos/o/r/actions/runs/1/attempts/1/jobs?per_page=1"]);
        assert.ok(
            !(await replacedWhilePending({
                request: req(3),
                repo: "o/r",
                run: RUN,
                attempt: "1",
                conclusion: "cancelled",
            })),
        );
        assert.ok(
            !(await replacedWhilePending({
                request: req(0),
                repo: "o/r",
                run: RUN,
                attempt: "1",
                conclusion: "startup_failure",
            })),
        );
    });
});

describe("announce", () => {
    const fake = (issues, comments = []) => {
        const calls = [];
        const request = async (method, path, body) => {
            calls.push([method, path, body]);
            if (method === "GET") return path.includes("/comments") ? comments : issues;
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

    it("skips a run-ended comment when a failure of that run attempt is already reported", async () => {
        const { calls, request } = fake([{ number: 8 }], [{ body: statusComment("held", { run: RUN }) }]);
        const unlessReported = { since: "2026-10-09T12:00:00Z", reported: (b) => reportsFailure(b, RUN, "1") };
        assert.equal(await announce({ request, repo: "o/r", body: "hi", unlessReported }), null);
        assert.deepEqual(
            calls.map(([m, p]) => `${m} ${p}`),
            [
                `GET /repos/o/r/issues?labels=${LABEL}&state=open&per_page=1`,
                "GET /repos/o/r/issues/8/comments?since=2026-10-09T12%3A00%3A00Z&per_page=100",
            ],
        );
    });

    it("posts a run-ended comment when only a success of that run was announced", async () => {
        const { calls, request } = fake([{ number: 8 }], [{ body: statusComment("published", { run: RUN }) }]);
        assert.equal(
            await announce({
                request,
                repo: "o/r",
                body: "hi",
                unlessReported: { reported: (b) => reportsFailure(b, RUN, "1") },
            }),
            8,
        );
        assert.deepEqual(calls.at(-1), ["POST", "/repos/o/r/issues/8/comments", { body: "hi" }]);
    });
});

describe("pushMessage", () => {
    const f = {
        run: RUN,
        sha: "abcdef123",
        tags: "a@1.0.0,b@2.0.0",
        issue: "12",
    };
    const loud = { priority: "1", sound: "siren" };
    const quiet = { priority: "-1", sound: "none" };
    const pick = ({ title, priority, sound, url, url_title }) => ({ title, priority, sound, url, url_title });
    const run = { url: RUN, url_title: "Open run" };

    it("titles each kind with its state word, priority, sound and link", () => {
        for (const [outcome, want] of [
            ["started", { title: "Release STARTED", ...quiet, ...run }],
            ["held", { title: "Release HELD", ...loud, ...run }],
            ["published", { title: "Release PUBLISHED", priority: "0", sound: "cashregister", ...run }],
            ["publish-failed", { title: "Release PUBLISH FAILED", ...loud, ...run }],
            ["run-ended", { title: "Release RUN ENDED BADLY", ...loud, ...run }],
        ]) {
            const m = pushMessage(outcome, f);
            assert.deepEqual(pick(m), want, outcome);
            assert.match(m.title + m.message, /^[\x20-\x7e\n]+$/, `${outcome} is plain ASCII`);
            assert.ok(m.message.split("\n").length <= 2, `${outcome} is at most two lines`);
        }
        for (const gone of ["skipped", "opened", "dequeued"]) {
            assert.throws(() => pushMessage(gone, f), /unknown outcome/, gone);
        }
    });

    it("says what: the packages and versions, or the failed lane and check", () => {
        assert.equal(pushMessage("published", f).message, "a@1.0.0, b@2.0.0");
        assert.equal(
            pushMessage("started", f).message,
            "a@1.0.0, b@2.0.0 on abcdef1\nFull suite, T4, Hosts and audit running",
        );
        assert.match(
            pushMessage("held", { ...f, what: "T4 GPU" }).message,
            /^T4 GPU failed on abcdef1\nNothing published; see #12$/,
        );
    });

    it("marks a restart after a fix and a re-run as a retry, with which attempt and after what", () => {
        const restart = pushMessage("started", { ...f, restart: true, fix: "Merge pull request #1873 from x/y" });
        assert.equal(restart.title, "Release RETRYING");
        assert.match(restart.message, /\nRestart after fix #1873 \(held #12\)$/);
        const rerun = pushMessage("started", {
            ...f,
            tags: "",
            attempt: "2",
            what: "Re-run 2 after the T4 runner was lost",
        });
        assert.equal(rerun.title, "Release RETRYING");
        assert.equal(rerun.message, "Release on abcdef1\nRe-run 2 after the T4 runner was lost");
        assert.match(pushMessage("held", { ...f, attempt: "3" }).message, /\nRe-run 3$/);
        assert.match(pushMessage("published", { ...f, attempt: "2" }).message, /\nRe-run 2$/);
    });
});

describe("push", () => {
    const env = { PUSHOVER_APP_TOKEN: "app-token-secret", PUSHOVER_USER_KEY: "user-key-secret" };
    const recorder = (res) => {
        const calls = [];
        const logs = [];
        const post = async (url, init) => {
            calls.push([url, Object.fromEntries(init.body)]);
            if (res instanceof Error) throw res;
            return res;
        };
        return { calls, logs, post, log: (l) => logs.push(l) };
    };

    it("posts the form to Pushover with both keys", async () => {
        const r = recorder({ ok: true });
        assert.equal(await push("published", { run: RUN, tags: "a@1" }, env, r.post, r.log), true);
        assert.equal(r.calls.length, 1);
        const [url, form] = r.calls[0];
        assert.equal(url, PUSHOVER_URL);
        assert.deepEqual(form, {
            token: env.PUSHOVER_APP_TOKEN,
            user: env.PUSHOVER_USER_KEY,
            title: "Release PUBLISHED",
            message: "a@1",
            url: RUN,
            url_title: "Open run",
            priority: "0",
            sound: "cashregister",
        });
        assert.deepEqual(r.logs, ['Pushover: sent "Release PUBLISHED"']);
    });

    it("skips quietly without both secrets", async () => {
        for (const e of [{}, { PUSHOVER_APP_TOKEN: "x" }, { PUSHOVER_USER_KEY: "y" }]) {
            const r = recorder({ ok: true });
            assert.equal(await push("held", { run: RUN }, e, r.post, r.log), false);
            assert.equal(r.calls.length, 0);
            assert.equal(r.logs.length, 1);
        }
    });

    it("tolerates a failure and never logs a secret", async () => {
        const echo = `token ${env.PUSHOVER_APP_TOKEN} user ${env.PUSHOVER_USER_KEY} invalid`;
        for (const res of [{ ok: false, status: 400, text: async () => echo }, new Error(echo)]) {
            const r = recorder(res);
            assert.equal(await push("held", { run: RUN }, env, r.post, r.log), false);
            assert.equal(r.logs.length, 1);
            assert.match(r.logs[0], /^::warning::Pushover notification not sent: .*invalid/);
            assert.doesNotMatch(r.logs.join("\n"), /secret/);
        }
    });
});
