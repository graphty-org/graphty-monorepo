// node --test design/ui/studio/tool/dry-run-review.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { checkVerdicts, citeChecker, MACHINE, requestText, SCHEMA, toJudge, VERDICTS } from "./dry-run-review.mjs";

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
    const files = { a: ["/s/a.png"], b: ["/s/a.png"], c: [] };
    assert.deepEqual(checkVerdicts(["a"], [], [ok], { files }), { problems: [], failing: [] });
    const bad = checkVerdicts(
        ["a", "b", "c"],
        [],
        [
            { ...ok, verdict: "fine" },
            { ...ok, route: "b", verdict: "intended" },
            { ...ok, route: "x" },
        ],
        { files },
    );
    assert.equal(bad.problems.length, 4, bad.problems.join("\n")); // a unknown, b no cites, c missing, x unasked
    const fail = checkVerdicts(
        ["a", "b"],
        [{ route: "w", verdict: "bug", reason: "outcome", cites: [], evidence: [] }],
        [ok, { ...ok, route: "b", verdict: "cannot-tell" }],
        { files },
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
                verdicts: [
                    {
                        route: "a",
                        verdict,
                        reason: "r",
                        cites: ["design/ui/studio/tool/README.md:1"],
                        evidence: ["/s/a.png"],
                    },
                ],
            }),
        );
    v("intended");
    assert.equal(run("verdicts", dir).status, 0);
    v("bug");
    assert.equal(run("verdicts", dir).status, 1);
});

test("a route the machine could not run is never judged", () => {
    const j = toJudge({
        routes: [
            route("gpu", {
                result: "fail",
                reason: 'launching the browser: draws with "SwiftShader", not the NVIDIA card',
            }),
            route("lost", { result: "not run", reason: "no worker reached it (worker exits: 1)" }),
            route("moved", { change: "changed" }),
        ],
    });
    assert.deepEqual(
        j.judge.map((r) => r.id),
        ["moved"],
    );
    assert.deepEqual(j.machine, ["gpu", "lost"]);
});

test("the workflow selects the same routes as toJudge", () => {
    const wf = readFileSync(join(here, "../../../../.claude/workflows/design-studio.js"), "utf8");
    const body = /const reviewed = (\(r\) =>[\s\S]*?);\n/.exec(wf)[1];
    const lookAt = new Function(`return ${body}`)();
    const routes = [
        route("same"),
        route("moved", { change: "changed" }),
        route("fresh", { change: "new" }),
        route("flicker", { change: "unstable" }),
        route("lost", { result: "fail", reason: 'walking the route: no button "Load"' }),
        route("wrong", { result: "fail", change: "changed", reason: 'checking "x": no' }),
        route("gpu", { result: "fail", reason: "launching the browser: no" }),
    ];
    // the workflow also starts the reviewer for a machine failure, so its tool reports could-not-run
    const j = toJudge({ routes });
    assert.deepEqual(
        routes.filter(lookAt).map((r) => r.id),
        [...j.judge.map((r) => r.id), ...j.machine],
    );
});

test("evidence must be a path shown for that route, and fields must be lists of strings", () => {
    const files = { a: ["/s/a.png", "/p/a.png"] };
    const base = { route: "a", verdict: "bug", reason: "r", cites: [] };
    const check = (v) => checkVerdicts(["a"], [], [v], { files }).problems;
    assert.equal(check({ ...base, evidence: ["/p/a.png"] }).length, 0);
    assert.equal(check({ ...base, evidence: ["none"] }).length, 1);
    assert.equal(check({ ...base, evidence: ["/made/up.png"] }).length, 1);
    assert.equal(check({ ...base, evidence: "/s/a.png" }).length, 1);
    assert.equal(check({ ...base, evidence: ["/s/a.png"], cites: "x" }).length, 1);
    assert.equal(check({ ...base, evidence: ["/s/a.png"], verdict: "intended", cites: [""] }).length, 1);
});

test("intended must cite a branch commit, a real commit or an existing file:line", () => {
    const head = spawnSync("git", ["rev-parse", "HEAD"], { cwd: here, encoding: "utf8" }).stdout.trim();
    const onBranch = citeChecker({ commits: ["abc1234def feat: rename Load"] });
    assert.ok(onBranch("abc1234def"));
    assert.ok(onBranch("abc1234"));
    assert.ok(!onBranch("abc"), "too short to be a sha");
    assert.ok(!onBranch(head), "a real commit that is not the branch's");
    const anyCommit = citeChecker({});
    assert.ok(anyCommit(head));
    assert.ok(!anyCommit("0123456789abcdef0123"), "a made-up sha");
    assert.ok(anyCommit("design/ui/studio/tool/README.md:1"));
    assert.ok(!anyCommit("design/ui/studio/tool/README.md:999999"), "past the end");
    assert.ok(!anyCommit("design/no/such.md:3"));
});

test("a crash, a machine failure and a bad base never read as a result", (t) => {
    const dir = mkdtempSync(join(tmpdir(), "dry-run-review-"));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const run = (...a) => spawnSync(process.execPath, [CLI, ...a], { encoding: "utf8" });
    writeFileSync(join(dir, "summary.json"), "{ not json");
    assert.equal(run("request", dir).status, 2, "corrupt summary");
    writeFileSync(join(dir, "summary.json"), JSON.stringify({ routes: [route("a", { change: "changed" })] }));
    assert.equal(run("request", dir, "--base", "no-such-ref-3272").status, 2, "unknown base");
    writeFileSync(
        join(dir, "summary.json"),
        JSON.stringify({
            routes: [
                route("a", { change: "changed" }),
                route("b", { result: "not run", reason: "no worker reached it (worker exits: 1)" }),
            ],
        }),
    );
    const r = run("request", dir);
    assert.equal(r.status, 4, "could not run");
    assert.match(r.stderr, /COULD NOT RUN/);
    assert.ok(!existsSync(join(dir, "review-request.json")));
    assert.ok(MACHINE.test("launching the browser: x"));
});
