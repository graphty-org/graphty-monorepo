// node --test design/ui/studio/tool/dry-run-review.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkVerdicts, requestText, SCHEMA, toJudge, VERDICTS } from "./dry-run-review.mjs";

const here = dirname(fileURLToPath(import.meta.url));
const CLI = join(here, "dry-run-review.mjs");

const route = (id, over = {}) => ({
    id,
    task: "T42A",
    feature: "f",
    result: "pass",
    reason: null,
    shot: `/s/${id}.png`,
    prevShot: `/p/${id}.png`,
    aria: null,
    change: "same",
    diffImage: null,
    ...over,
});

test("only changed, new and failed routes are judged; an outcome check failure is a bug without a judge", () => {
    const summary = {
        routes: [
            route("same"),
            route("moved", { change: "changed", diffImage: "/s/moved.diff.png" }),
            route("fresh", { change: "new", prevShot: null }),
            route("flicker", { change: "unstable" }),
            route("lost", { result: "fail", reason: 'walking the route: no button "Load"' }),
            route("wrong", { result: "fail", reason: 'checking "node color": expected red' }),
        ],
    };
    const j = toJudge(summary);
    assert.deepEqual(
        j.judge.map((r) => r.id),
        ["moved", "fresh", "lost"],
    );
    assert.deepEqual(
        j.bugs.map((b) => b.route),
        ["wrong"],
    );
    assert.equal(j.bugs[0].verdict, "bug");
    assert.deepEqual(j.unstable, ["flicker"]);
});

test("nothing changed means nothing to judge", () => {
    const j = toJudge({ routes: [route("a"), route("b")] });
    assert.deepEqual(j.judge, []);
    assert.deepEqual(j.bugs, []);
});

test("the request names every judged route's evidence and the branch's commits", () => {
    const text = requestText([route("moved", { change: "changed", diffImage: "/s/moved.diff.png" })], {
        study: "/study",
        base: "origin/master",
        commits: ["abc123 feat: rename Load"],
        files: ["graphty/x.ts"],
    });
    for (const s of [
        "moved",
        "/s/moved.png",
        "/p/moved.png",
        "/s/moved.diff.png",
        "abc123",
        "graphty/x.ts",
        "/study/tasks.md",
    ])
        assert.ok(text.includes(s), `request names ${s}`);
    for (const v of VERDICTS) assert.ok(text.includes(v), `request explains ${v}`);
});

test("verdicts: one per judged route, known verdict, evidence, and intended cites what it rests on", () => {
    const ok = { route: "a", verdict: "usability", reason: "r", cites: [], evidence: ["/s/a.png"] };
    assert.deepEqual(checkVerdicts(["a"], [], [ok]), { problems: [], failing: [] });
    const bad = checkVerdicts(
        ["a", "b", "c"],
        [],
        [
            { ...ok, verdict: "fine" },
            { ...ok, route: "b", verdict: "intended" },
            { ...ok, route: "x" },
        ],
    );
    assert.equal(bad.problems.length, 4, bad.problems.join("\n")); // a unknown, b no cites, c missing, x unasked
    const fail = checkVerdicts(
        ["a", "b"],
        [{ route: "w", verdict: "bug", reason: "outcome", cites: [], evidence: [] }],
        [ok, { ...ok, route: "b", verdict: "cannot-tell" }],
    );
    assert.deepEqual(
        fail.failing.map((v) => v.route),
        ["w", "b"],
    );
});

test("the schema's verdicts are the checker's, and the studio workflow asks for the same ones", () => {
    assert.deepEqual(SCHEMA.properties.verdicts.items.properties.verdict.enum, VERDICTS);
    const wf = readFileSync(join(here, "../../../../.claude/workflows/design-studio.js"), "utf8");
    assert.ok(wf.includes("dry-run-review.mjs"), "the workflow runs the reviewer request");
    assert.ok(
        wf.replace(/\s+/g, "").includes(JSON.stringify(VERDICTS)),
        "the workflow's schema lists the same verdicts",
    );
});

test("the command writes no request and exits 0 when nothing changed, and 3 with a request otherwise", (t) => {
    const dir = mkdtempSync(join(tmpdir(), "dry-run-review-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const run = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: "utf8" });
    writeFileSync(join(dir, "summary.json"), JSON.stringify({ routes: [route("a")] }));
    assert.equal(run("request", dir).status, 0);
    assert.ok(!existsSync(join(dir, "review-request.md")));

    writeFileSync(join(dir, "summary.json"), JSON.stringify({ routes: [route("a", { change: "changed" })] }));
    assert.equal(run("request", dir).status, 3);
    assert.ok(readFileSync(join(dir, "review-request.md"), "utf8").includes("/s/a.png"));
    assert.equal(run("verdicts", dir).status, 2, "no verdicts.json yet");
    const v = (verdict) =>
        writeFileSync(
            join(dir, "verdicts.json"),
            JSON.stringify({
                verdicts: [{ route: "a", verdict, reason: "r", cites: ["abc"], evidence: ["/s/a.png"] }],
            }),
        );
    v("intended");
    assert.equal(run("verdicts", dir).status, 0);
    v("bug");
    assert.equal(run("verdicts", dir).status, 1);
});
