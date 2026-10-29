#!/usr/bin/env node
/**
 * dry-run-review.mjs -- the reviewer step of the scripted dry run: what a fresh-context agent judges
 * after dry-run-pass.mjs, and the check of what it answered. No model is called here.
 *
 *   node design/ui/studio/tool/dry-run-review.mjs request <script dir> [--base <ref>] [--study <tier dir>]
 *   node design/ui/studio/tool/dry-run-review.mjs verdicts <script dir>
 *
 * <script dir> is dry-run-pass.mjs's --out (it holds summary.json). `request` picks the routes to
 * judge: a route whose end screen changed since the earlier pass or has no earlier one, and a route
 * whose walk broke (a control not found). A route whose outcome check failed is a bug with no judge
 * (the check is the answer key's success state); an "unstable" screen is not judged
 * (design/ci/ai-checked-acceptance-tests.md, sections 7.2 and 8). A route the machine could not run
 * (no browser on the NVIDIA card, no worker reached it) has no screen to judge: the pass could not
 * run, exit 4, no request. With something to judge it writes <script dir>/review-request.md (the
 * reviewer's whole prompt, with every route's evidence) and review-request.json, and exits 3; with
 * nothing to judge it writes neither, and exits 0 (or 1 when an outcome check failed). --base names
 * the branch's base: its commits and changed files go into the request, so "intended" can name the
 * commit that explains a change. git runs in the repository holding this file, so run the copy in
 * the branch's own worktree.
 *
 * The reviewer writes <script dir>/verdicts.json ({ verdicts: [...] }, SCHEMA below). `verdicts`
 * checks it: exactly one verdict per judged route, a known verdict, a reason, evidence taken only
 * from that route's own files (new and earlier screen, diff, accessibility tree), and "intended"
 * citing a commit that exists (one of the branch's, with --base) or an existing file:line. Exit 0
 * when no bug or cannot-tell remains, 1 when one does, 2 when the answer is missing or malformed or
 * the tool itself failed.
 * See README.md beside this file, "The scripted dry run".
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";

const here = dirname(fileURLToPath(import.meta.url));
const repo = resolve(here, "../../../..");

/** The verdicts, as design/ci/ai-checked-acceptance-tests.md section 8.3 defines them. */
export const VERDICTS = ["bug", "intended", "usability", "cannot-tell"];
const FAILING = new Set(["bug", "cannot-tell"]);

/** The reviewer's answer, as written to verdicts.json and returned to a workflow. */
export const SCHEMA = {
    type: "object",
    properties: {
        verdicts: {
            type: "array",
            items: {
                type: "object",
                properties: {
                    route: { type: "string" },
                    verdict: { type: "string", enum: VERDICTS },
                    reason: { type: "string" },
                    cites: { type: "array", items: { type: "string" } },
                    evidence: { type: "array", items: { type: "string" } },
                },
                required: ["route", "verdict", "reason", "cites", "evidence"],
            },
        },
    },
    required: ["verdicts"],
};

const outcomeFailed = (r) => r.result !== "pass" && /^checking "/.test(r.reason || "");
/** Reasons graphty/dry-run/run.mjs gives when the machine, not the build, stopped a route. */
export const MACHINE = /^(launching the browser|no worker reached it)/;
const couldNotRun = (r) => r.result !== "pass" && MACHINE.test(r.reason || "");

/**
 * Which routes of a pass a reviewer judges.
 * @param summary dry-run-pass.mjs's summary.json
 * @returns judge (routes to judge), bugs (outcome check failures, already verdicts), unstable (ids)
 *   and machine (routes the machine could not run; ids)
 */
export function toJudge(summary) {
    const routes = summary.routes || [];
    const bugs = routes.filter(outcomeFailed).map((r) => ({
        route: r.id,
        verdict: "bug",
        reason: `outcome check failed: ${r.reason}`,
        cites: [],
        evidence: [r.shot, r.aria].filter(Boolean),
    }));
    const judge = routes.filter(
        (r) =>
            !outcomeFailed(r) &&
            !couldNotRun(r) &&
            r.change !== "unstable" &&
            (r.result !== "pass" || r.change === "changed" || r.change === "new"),
    );
    return {
        judge,
        bugs,
        unstable: routes.filter((r) => r.change === "unstable").map((r) => r.id),
        machine: routes.filter(couldNotRun).map((r) => r.id),
    };
}

const evidenceOf = (r) =>
    [
        `- route ${r.id} (task ${r.task}; ${r.feature}): walk ${r.result === "pass" ? "passed its outcome checks" : `BROKE: ${r.reason}`}; screen ${r.change}`,
        `  new end screen: ${r.shot ?? "none"}`,
        `  earlier end screen: ${r.prevShot ?? "none"}`,
        r.diffImage ? `  diff (changed pixels in red): ${r.diffImage}` : null,
        r.aria ? `  accessibility tree when it broke: ${r.aria}` : null,
    ]
        .filter(Boolean)
        .join("\n");

/**
 * The reviewer's prompt.
 * @param routes the routes to judge (toJudge(...).judge)
 * @param ctx where the request's context comes from
 * @param ctx.study the study tier folder (tasks.md, answers.md, decided.md)
 * @param ctx.base on a branch, the ref the earlier screens are from
 * @param ctx.commits on a branch, its commits since base (one line each)
 * @param ctx.files on a branch, the files changed since base
 * @param ctx.out the script folder the verdicts are written to
 * @returns the request text
 */
export function requestText(routes, { study, base, commits = [], files = [], out = "<script dir>" }) {
    const branch = base
        ? [
              `The build is the branch's head; the earlier screens are from ${base}. Commits on the branch since ${base}:`,
              ...commits.map((c) => `- ${c}`),
              `Files changed since ${base} (read any with git diff ${base}...HEAD -- <file>):`,
              ...files.map((f) => `- ${f}`),
          ].join("\n")
        : "The earlier screens are from the earlier dry-run pass of the study; the fixes since are the studio branch's commits (git log).";
    return `You judge the changed steps of the scripted dry run with a fresh context: you did not write the change, so do not defend it. The dry run walked each study task's success path in the built graphty app with real clicks and keys on the GPU, with no model; its outcome checks read the result through graphty-element's API. Below are the routes whose end screen changed since the earlier run, has no earlier screen, or whose walk broke before its checks.

For each route, open the new end screen, the earlier one and the diff image with the Read tool (and the accessibility tree where a walk broke), beside the task in ${study}/tasks.md, its success state in ${study}/answers.md and the binding decisions in ${study}/decided.md. Judge only what a participant sees: an error or blank screen, a control missing, cut off or overlapping, a wrong or misleading label or count, focus or data lost. Walk nothing and change nothing.

Give each route exactly one verdict:
- bug: the change breaks or degrades the task (a control gone, a wrong count, an error, a layout regression nobody asked for), or a broken walk is the build's fault.
- intended: the change is what a commit says it does (or what a decided.md or answers.md line asks for) and the task still succeeds; a broken walk whose route is out of date with such a change is intended too. Name that commit or line in cites; a change nothing explains is never intended.
- usability: it works as intended but makes the task harder for a person (more steps, a less clear name, something pushed out of view).
- cannot-tell: the screenshots themselves leave the question open. Never use it to avoid deciding.

Each verdict: route (its id), verdict, reason (one line), cites (commit shas${base ? " from the list below" : ""} or repo-relative file:line it rests on; [] if none), evidence (the paths listed for that route that you looked at, exactly as written). Write { "verdicts": [...] } to ${out}/verdicts.json, run node ${join(repo, "design/ui/studio/tool/dry-run-review.mjs")} verdicts ${out} and fix the file until it accepts it (exit 0 or 1), then return the same object.

${branch}

${routes.map(evidenceOf).join("\n")}
`;
}

const strings = (a) => Array.isArray(a) && a.every((x) => typeof x === "string" && x.trim());

/**
 * Check a reviewer's answer.
 * @param asked the judged route ids
 * @param bugs the verdicts given with no judge (outcome check failures)
 * @param verdicts the reviewer's verdicts
 * @param opts what an answer may rest on
 * @param opts.files route id to the paths shown for it; evidence must be among them
 * @param opts.cites (cite) => whether a cite names a real commit or file:line
 * @returns problems (why the answer is not acceptable) and failing (bug and cannot-tell verdicts)
 */
export function checkVerdicts(asked, bugs, verdicts, { files = {}, cites: citeOk = () => true } = {}) {
    const problems = [];
    for (const id of asked) {
        const n = verdicts.filter((v) => v.route === id).length;
        if (n !== 1) problems.push(`route ${id}: ${n} verdicts, not 1`);
    }
    for (const v of verdicts) {
        const where = `route ${v.route}`;
        if (!asked.includes(v.route)) problems.push(`${where}: was not asked about`);
        else if (!VERDICTS.includes(v.verdict)) problems.push(`${where}: unknown verdict "${v.verdict}"`);
        else if (!String(v.reason || "").trim()) problems.push(`${where}: no reason`);
        else if (!strings(v.cites)) problems.push(`${where}: cites must be a list of non-empty strings`);
        else if (!strings(v.evidence) || !v.evidence.length)
            problems.push(`${where}: evidence must be a non-empty list of paths`);
        else if (v.evidence.some((e) => !(files[v.route] || []).includes(e)))
            problems.push(
                `${where}: evidence not shown for this route: ${v.evidence.filter((e) => !(files[v.route] || []).includes(e)).join(", ")}`,
            );
        else if (v.verdict === "intended" && !v.cites.length)
            problems.push(`${where}: intended names no commit or line`);
        else if (v.verdict === "intended" && v.cites.some((c) => !citeOk(c)))
            problems.push(
                `${where}: cites no known commit or existing file:line: ${v.cites.filter((c) => !citeOk(c)).join(", ")}`,
            );
    }
    return { problems, failing: [...bugs, ...verdicts].filter((v) => FAILING.has(v.verdict)) };
}

const git = (...a) => execFileSync("git", a, { cwd: repo, encoding: "utf8" }).split("\n").filter(Boolean);
const routeFiles = (r) => [r.shot, r.prevShot, r.diffImage, r.aria].filter(Boolean);

/**
 * Whether a cite is a commit (one of the branch's when the request had a base, else any commit in
 * the repository) or an existing file:line (repo-relative, study-relative or absolute).
 * @param req review-request.json
 * @returns (cite) => boolean
 */
export function citeChecker(req) {
    return (c) => {
        const m = /^(.+):(\d+)$/.exec(c.trim());
        if (m) {
            const f = [resolve(m[1]), resolve(repo, m[1]), resolve(req.study || repo, m[1])].find(
                (p) => existsSync(p) && statSync(p).isFile(),
            );
            return Boolean(f) && Number(m[2]) >= 1 && Number(m[2]) <= readFileSync(f, "utf8").split("\n").length;
        }
        const sha = c.trim().split(/\s/)[0];
        if (!/^[0-9a-f]{7,40}$/i.test(sha)) return false;
        if (req.commits) {
            const shas = req.commits.map((line) => line.split(" ")[0]);
            return shas.some((s) => s.startsWith(sha) || sha.startsWith(s));
        }
        try {
            execFileSync("git", ["cat-file", "-e", `${sha}^{commit}`], { cwd: repo, stdio: "ignore" });
            return true;
        } catch {
            return false;
        }
    };
}

function request(dir, v) {
    const summary = JSON.parse(readFileSync(join(dir, "summary.json"), "utf8"));
    const { judge, bugs, unstable, machine } = toJudge(summary);
    // ponytail: a rerun drops verdicts already given (section 8.4 reuses them); reuse when reruns cost.
    for (const f of ["review-request.md", "review-request.json", "verdicts.json"])
        rmSync(join(dir, f), { force: true });
    if (machine.length) {
        const why = (summary.routes || []).find((r) => r.id === machine[0]).reason;
        console.error(
            `COULD NOT RUN: the machine stopped ${machine.length} routes (${machine.join(", ")}); first: ${why}. Nothing is judged: fix the machine and run the pass again.`,
        );
        return 4;
    }
    for (const b of bugs) console.log(`bug, not judged: ${b.route}: ${b.reason}`);
    if (unstable.length) console.log(`not judged, differs between two runs of one build: ${unstable.join(", ")}`);
    if (!judge.length) {
        console.log("nothing to review: no end screen changed and no walk broke");
        return bugs.length ? 1 : 0;
    }
    const ctx = { study: resolve(v.study ?? join(repo, "design/ui/studio/tier3")), out: dir };
    if (v.base)
        Object.assign(ctx, {
            base: v.base,
            commits: git("log", "--oneline", `${v.base}..HEAD`),
            files: git("diff", "--name-only", `${v.base}...HEAD`),
        });
    writeFileSync(join(dir, "review-request.md"), requestText(judge, ctx));
    const req = {
        asked: judge.map((r) => r.id),
        bugs,
        files: Object.fromEntries(judge.map((r) => [r.id, routeFiles(r)])),
        study: ctx.study,
        ...(v.base ? { base: v.base, commits: ctx.commits } : {}),
    };
    writeFileSync(join(dir, "review-request.json"), JSON.stringify(req, null, 1) + "\n");
    console.log(
        `needs judgment: ${judge.length} routes; give ${join(dir, "review-request.md")} to a fresh-context reviewer`,
    );
    return 3;
}

function verdicts(dir) {
    const read = (f) => (existsSync(join(dir, f)) ? JSON.parse(readFileSync(join(dir, f), "utf8")) : null);
    let req;
    let ans;
    try {
        req = read("review-request.json");
        ans = read("verdicts.json");
    } catch (err) {
        console.error(`unreadable: ${err.message}`);
        return 2;
    }
    if (!req || !Array.isArray(ans?.verdicts)) {
        console.error(`need ${join(dir, "review-request.json")} and a verdicts.json holding { "verdicts": [...] }`);
        return 2;
    }
    const { problems, failing } = checkVerdicts(req.asked, req.bugs, ans.verdicts, {
        files: req.files || {},
        cites: citeChecker(req),
    });
    if (problems.length) {
        console.error(problems.join("\n"));
        return 2;
    }
    const count = (k) => ans.verdicts.filter((x) => x.verdict === k).length;
    console.log(VERDICTS.map((k) => `${count(k)} ${k}`).join(", ") + `; ${req.bugs.length} outcome check failures`);
    for (const f of failing) console.log(`${f.verdict}: ${f.route}: ${f.reason} -- ${f.evidence.join(" ")}`);
    return failing.length ? 1 : 0;
}

function main() {
    let parsed;
    try {
        parsed = parseArgs({
            allowPositionals: true,
            options: { base: { type: "string" }, study: { type: "string" } },
        });
    } catch (err) {
        console.error(err.message);
        process.exit(2);
    }
    const [cmd, dir] = parsed.positionals;
    if (!dir || !["request", "verdicts"].includes(cmd) || !existsSync(join(dir, "summary.json"))) {
        console.error(
            "usage: request|verdicts <script dir holding summary.json>; see the comment at the top of this file",
        );
        process.exit(2);
    }
    const abs = resolve(dir);
    let code;
    try {
        code = cmd === "request" ? request(abs, parsed.values) : verdicts(abs);
    } catch (err) {
        // a broken check must never read as a result (1 means "a bug remains")
        console.error(`dry-run-review failed: ${err.stack || err.message}`);
        code = 2;
    }
    process.exit(code);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
