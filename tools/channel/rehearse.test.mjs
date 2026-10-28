// Tests of the rehearsal's scratch gh (tools/channel/rehearse.mjs). The scenarios themselves run in
// release-rehearsal.yml (node tools/channel/rehearse.mjs), against the real tools.
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { emptyState, ghCall, SCENARIOS } from "./rehearse.mjs";

const NOW = "2026-10-27T12:00:00.000Z";
const dir = mkdtempSync(join(tmpdir(), "rehearse-test-"));
const body = (text) => {
    const f = join(dir, `${Math.random()}.md`);
    writeFileSync(f, text);
    return f;
};

describe("the scratch gh", () => {
    it("creates, finds, comments on and closes issues as gh and the REST API show them", () => {
        const s = emptyState();
        const url = ghCall(
            s,
            [
                "issue",
                "create",
                "--title",
                "Full run red: T4 GPU on abc",
                "--label",
                "bug",
                "--label",
                "priority:critical",
                "--body-file",
                body("red"),
            ],
            NOW,
        );
        assert.equal(url, "https://github.com/graphty-org/graphty-monorepo/issues/1");
        const listed = ghCall(s, [
            "issue",
            "list",
            "--state",
            "open",
            "--search",
            'in:title "Full run red"',
            "--json",
            "number,title",
            "--jq",
            ".[0].number",
        ]);
        assert.equal(listed, "1");
        const rest = ghCall(s, [
            "api",
            "repos/{owner}/{repo}/issues?state=open&labels=priority:critical&per_page=100",
            "--jq",
            ".[] | .title",
            "--paginate",
        ]);
        assert.equal(rest, "Full run red: T4 GPU on abc");
        ghCall(s, ["issue", "comment", "1", "--body-file", body("again")]);
        ghCall(s, ["issue", "close", "1", "--comment", "green"], NOW);
        assert.deepEqual(s.issues[0].comments, ["again", "green"]);
        assert.equal(s.issues[0].state, "closed");
        assert.equal(ghCall(s, ["api", "repos/o/r/issues?state=open&labels=priority:critical", "--jq", "length"]), "0");
        assert.equal(
            ghCall(s, ["api", "repos/o/r/issues?state=closed&labels=bug&since=2026-10-27T11:00:00Z", "--jq", "length"]),
            "1",
        );
    });

    it("keeps dispatches, re-runs, a run's jobs and its artifacts", () => {
        const s = emptyState();
        ghCall(s, ["workflow", "run", "bisect.yml", "--ref", "master", "-f", "good=a", "-f", "bad=b"]);
        assert.deepEqual(s.dispatches, [{ workflow: "bisect.yml", ref: "master", fields: ["good=a", "bad=b"] }]);
        ghCall(s, ["run", "rerun", "7", "--failed", "-R", "x/y"]);
        assert.deepEqual(s.reruns, [{ run: "7", failed: true }]);
        s.jobs["7/1"] = [{ name: "T4 GPU", conclusion: "failure" }];
        assert.equal(
            ghCall(s, ["api", "repos/x/y/actions/runs/7/attempts/1/jobs?per_page=100", "--jq", ".jobs[].name"]),
            "T4 GPU",
        );
        s.artifacts["7/verdict-1"] = body('{"deferred":true}');
        assert.equal(
            ghCall(s, ["api", "repos/x/y/actions/runs/7/artifacts?name=verdict-1", "--jq", ".total_count"]),
            "1",
        );
        assert.equal(
            ghCall(s, ["api", "repos/x/y/actions/runs/7/artifacts?name=verdict-2", "--jq", ".total_count"]),
            "0",
        );
        const to = join(dir, "dl");
        ghCall(s, ["run", "download", "7", "-R", "x/y", "-n", "verdict-1", "-D", to]);
        assert.deepEqual(JSON.parse(readFileSync(join(to, "verdict-1.json"), "utf8")), { deferred: true });
    });

    it("fails on a call it does not know, so a new gh call in a tool shows up in the rehearsal", () => {
        assert.throws(() => ghCall(emptyState(), ["pr", "merge", "1"]), /does not know: gh pr merge 1/);
        assert.throws(
            () => ghCall(emptyState(), ["api", "repos/x/y/pulls"]),
            /does not know: gh api repos\/x\/y\/pulls/,
        );
    });

    it("answers a hold issue's comments, as candidate-fix reads them", () => {
        const s = emptyState();
        ghCall(s, ["issue", "create", "--title", "Nightly held on abc", "--body", "b"]);
        ghCall(s, ["issue", "comment", "1", "--body", "first"]);
        const out = ghCall(s, ["api", "repos/{owner}/{repo}/issues/1/comments", "--paginate", "--jq", ".[].body"]);
        assert.equal(out.trim(), "first");
    });
});

describe("the driver", () => {
    it("names the design's scenarios, in order", () => {
        assert.deepEqual(Object.keys(SCENARIOS), [
            "green-clean-promote",
            "red-then-green-rerun",
            "red-twice-hold",
            "red-then-bisect-plan",
            "fix-forward",
            "approval-promotes",
            "abandon",
            "land-clean",
            "land-moved",
            "land-conflict",
            "donor-lanes",
        ]);
        const out = execFileSync("node", [fileURLToPath(new URL("rehearse.mjs", import.meta.url)), "--list"], {
            encoding: "utf8",
        });
        assert.deepEqual(out.trim().split("\n"), Object.keys(SCENARIOS));
    });
    it("lands a release cleanly, after master moved, and holds it on a version conflict", () => {
        const out = execFileSync(
            "node",
            [fileURLToPath(new URL("rehearse.mjs", import.meta.url)), "land-clean", "land-moved", "land-conflict"],
            { encoding: "utf8" },
        );
        assert.deepEqual(out.trim().split("\n"), ["ok land-clean", "ok land-moved", "ok land-conflict"]);
    });
});
