// Tests of the CI shape: the test matrix's shard groups (tools/ci-test-matrix.mjs), the parts of
// ci.yml and pr-title.yml that decide what a draft, a pull request and a merge-queue run do, the
// release train (release.yml, tools/release-diff.mjs, deploy-pages.yml, .mergify.yml's release
// rule), the record tools/pr-status-broker.mjs writes for agents, and the warning period of new
// required checks (tools/ci-advisory-checks.json).
//
//   node tools/ci-workflows.test.mjs   (pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { GROUPS, groupEntry, plan, SHARDS } from "./ci-test-matrix.mjs";
import { decide, FREEZE_PREFIX, frozenSha, mergedPr, revertTitle } from "./master-guard.mjs";
import { summarize } from "./pr-status-broker.mjs";
import { strayChanges } from "./release-diff.mjs";

const workflow = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");
const job = (text, name) => {
    const start = text.indexOf(`\n    ${name}:\n`);
    assert.ok(start > 0, `job ${name} exists`);
    const next = text.slice(start + 1).search(/\n {4}[a-z-]+:\n/);
    return next === -1 ? text.slice(start) : text.slice(start, start + 1 + next);
};
const PACKAGES = [...new Set(SHARDS.map((s) => s.package))];
const QUEUE =
    "startsWith(github.head_ref, 'mergify/merge-queue/') && github.event.pull_request.head.repo.full_name == github.repository && github.event.pull_request.user.login == 'mergify[bot]'";

describe("the test matrix", () => {
    it("runs every shard exactly once on a full run, in 13 jobs", () => {
        const include = plan(PACKAGES);
        const ran = include.flatMap((e) => (e.shard in GROUPS ? GROUPS[e.shard] : [e.shard]));
        assert.deepEqual([...ran].sort(), SHARDS.map((s) => s.shard).sort());
        assert.equal(include.length, 13);
    });

    it("puts only the affected members into a group's job", () => {
        const include = plan(["graph-io"]);
        assert.equal(include.length, 1);
        assert.equal(include[0].shard, "small-node");
        assert.match(include[0]["test-command"], /graph-io:coverage/);
        assert.doesNotMatch(include[0]["test-command"], /graph-format:coverage/);
        assert.equal(include[0].coverage, "graph-io=graph-io/coverage/lcov.info");
    });

    it("leaves out the groups and shards of unaffected packages", () => {
        assert.deepEqual(plan([]), []);
        assert.deepEqual(
            plan(["graphty-element"]).map((e) => e.shard),
            SHARDS.filter((s) => s.package === "graphty-element").map((s) => s.shard),
        );
    });

    it("uploads coverage only for the members that uploaded it before the groups", () => {
        const browser = plan(PACKAGES).find((e) => e.shard === "small-browser");
        assert.doesNotMatch(browser.coverage, /visual-review|webgpu-graph-algorithms-browser/);
        assert.match(browser.coverage, /^algorithms-browser=algorithms\/coverage\/lcov.info /);
        assert.equal(browser["needs-browser"], true);
    });

    it("runs every member of a group even after one fails, then fails naming it", () => {
        const fake = (shard, cmd) => ({ shard, package: shard, "test-command": cmd, "needs-browser": false });
        const entry = groupEntry("g", [fake("a", "echo ran-a"), fake("b", "cd / && false"), fake("c", "echo ran-c")]);
        // As Actions runs a `run:` step: bash -e.
        const r = spawnSync("bash", ["-e", "-c", entry["test-command"]], { encoding: "utf8" });
        assert.equal(r.status, 1);
        assert.match(r.stdout, /ran-a/);
        assert.match(r.stdout, /ran-c/);
        assert.match(r.stdout, /::error::failed: b$/m);
        const ok = groupEntry("g", [fake("a", "true"), fake("c", "true")]);
        assert.equal(spawnSync("bash", ["-e", "-c", ok["test-command"]]).status, 0);
    });
});

describe("ci.yml", () => {
    const ci = workflow("ci.yml");

    it("starts a run when a draft is marked ready, and skips drafts except the merge queue's", () => {
        assert.match(ci, /types: \[opened, synchronize, reopened, ready_for_review\]/);
        assert.ok(
            job(ci, "build").includes(
                `if: github.event_name != 'pull_request' || !github.event.pull_request.draft || (${QUEUE})\n`,
            ),
        );
        assert.ok(ci.includes(`    MERGE_QUEUE: \${{ ${QUEUE} }}\n`), "the workflow names the merge queue once");
    });

    it("fails, never skips, the summary checks on a draft", () => {
        // A skipped required check counts as passing, and the draft run's check stays on the head SHA
        // after "gh pr ready" until the new run reports.
        for (const name of ["all-checks", "queue-checks"]) {
            assert.match(job(ci, name), /\n {8}if: always\(\)\n/, `${name} always runs`);
        }
        assert.match(
            job(ci, "all-checks"),
            /if \[\[ "\$BUILD" == "skipped" \]\]; then\n.*draft: CI not run.*\n\s+exit 1/,
        );
    });

    it("runs the full suite on a merge-queue branch", () => {
        const step = job(ci, "build");
        assert.match(step, /"\$EVENT" == "pull_request" && "\$MERGE_QUEUE" != "true"/);
        assert.match(step, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t build/);
        assert.match(step, /if: steps.plan.outputs.full == 'true'\n\s+run: pnpm exec nx run-many -t lint/);
    });

    it("holds the merge queue to master's rule that every job succeeds", () => {
        assert.match(job(ci, "all-checks"), /\[\[ "\$FULL" == "false" \]\] && ok='\["success","skipped"\]'/);
        const queue = job(ci, "queue-checks");
        assert.match(queue, /name: Queue Checks Pass/);
        assert.match(queue, /"\$ALL_CHECKS" != "success"/);
        assert.match(queue, /"\$MERGE_QUEUE" == "true" && "\$FULL" != "true"/);
    });

    it("gates every pull request that affects graphty-element on the cost estimates", () => {
        assert.match(
            job(ci, "cost-accuracy"),
            /if: contains\(fromJSON\(needs.build.outputs.affected\), 'graphty-element'\)/,
        );
        assert.match(job(ci, "all-checks"), /\n\s+cost-accuracy,\n/);
    });

    it("keeps the benchmarks advisory", () => {
        assert.match(job(ci, "performance"), /continue-on-error: true/);
    });
});

// Every job of a workflow: its direct needs, its job-level continue-on-error (`coe`) and its steps, each
// named by its `name`, or by its `uses` when it has none, with its id, if, coe and a one-line run.
const parseJobs = (text) => {
    const jobs = {};
    let job;
    let step;
    let inNeeds = false;
    for (const line of text.slice(text.indexOf("\njobs:\n")).split("\n")) {
        let m = /^ {4}([\w-]+):\s*$/.exec(line);
        if (m) {
            job = jobs[m[1]] = { needs: [], steps: [] };
            step = undefined;
            inNeeds = false;
            continue;
        }
        if (!job) continue;
        if (/^ {8}\S/.test(line)) {
            step = undefined;
            inNeeds = line.startsWith("        needs:");
            if ((m = /^ {8}continue-on-error:\s*(.*)$/.exec(line))) job.coe = m[1];
        }
        if (inNeeds) job.needs.push(...(line.replace(/^ {8}needs:/, "").match(/[\w-]+/g) ?? []));
        if ((m = /^ {12}- (?:([\w-]+):\s*(.*))?/.exec(line))) {
            step = {};
            job.steps.push(step);
            if (m[1]) step[m[1]] = m[2];
        } else if (step && (m = /^ {14}([\w-]+):\s*(.*)$/.exec(line))) step[m[1]] = m[2];
    }
    for (const j of Object.values(jobs))
        j.steps = j.steps.map((s) => ({ ...s, name: s.name ?? s.uses, coe: s["continue-on-error"] }));
    return jobs;
};

// The (job, step) pairs that can fail "All Checks Pass" or "Queue Checks Pass": every step of every job
// in their `needs` closure, less a job or step marked `continue-on-error: true`, as { job: [step names] }.
const requiredChecks = (jobs) => {
    const closure = new Set();
    const visit = (name) => {
        if (closure.has(name) || !jobs[name]) return;
        closure.add(name);
        for (const need of jobs[name].needs) visit(need);
    };
    visit("all-checks");
    visit("queue-checks");
    return Object.fromEntries(
        [...closure]
            .filter((name) => jobs[name].coe !== "true")
            .map((name) => [name, jobs[name].steps.filter((s) => s.coe !== "true").map((s) => s.name)]),
    );
};

const DAY = 86_400_000;
const idOf = (a) => (a.step === undefined ? a.job : `${a.job}/${a.step}`);

// What is wrong with tools/ci-advisory-checks.json against ci.yml and against the base branch's copies of
// both, and which entries are due for promotion. A warning period is granted only to a check the base
// branch does not require yet, and "required" grows only by checks the base branch already runs, so a
// pull request can neither put an existing check back into a warning period nor skip a new one's.
// The dates warn and never fail: an entry past its enforce date is simply required (the build job drops
// it from the list), so no run turns red because a calendar day passed.
const advisoryProblems = ({ ci, registry, baseCi, baseRegistry, today }) => {
    const jobs = parseJobs(ci);
    const checks = requiredChecks(jobs);
    const baseChecks = requiredChecks(parseJobs(baseCi));
    const baseAdvisory = new Set((baseRegistry?.advisory ?? []).map(idOf));
    const problems = [];
    const warnings = [];
    const check = (ok, message) => {
        if (!ok) problems.push(message);
        return ok;
    };
    const isAdvisory = (job, step) =>
        registry.advisory.some((a) => a.job === job && (a.step === undefined || a.step === step));

    for (const [job, steps] of Object.entries(checks))
        for (const name of steps)
            check(
                registry.required[job]?.includes(name) || isAdvisory(job, name),
                `${job} / ${name}: unregistered: a new check goes into "advisory" first`,
            );
    for (const [job, names] of Object.entries(registry.required))
        for (const name of names) {
            check(checks[job]?.includes(name), `${job} / ${name}: in "required" but not a required check of ci.yml`);
            if (baseRegistry && !baseRegistry.required[job]?.includes(name))
                check(
                    baseChecks[job]?.includes(name),
                    `${job} / ${name}: "required" only grows by checks the base branch already runs; a new one goes into "advisory" first`,
                );
        }

    for (const a of registry.advisory) {
        const id = idOf(a);
        if (!check(/^\d{4}-\d\d-\d\d$/.test(a.added) && /^\d{4}-\d\d-\d\d$/.test(a.enforce), `${id}: dates`)) continue;
        check(Number.isInteger(a.issue), `${id}: names its tracking issue`);
        const added = Date.parse(a.added);
        const enforce = Date.parse(a.enforce);
        check(enforce > added && enforce <= added + 21 * DAY, `${id}: enforce within 21 days of added`);
        if (Date.parse(today) >= enforce - 3 * DAY)
            warnings.push(`${id}: required from ${a.enforce}: move it into "required" and drop its warning wiring`);
        if (!baseAdvisory.has(id)) {
            check(
                a.step === undefined ? !(a.job in baseChecks) : !baseChecks[a.job]?.includes(a.step),
                `${id}: the base branch already requires it, so it cannot go back to a warning period`,
            );
            check(a.added <= today, `${id}: added in the future`);
        }
        const j = jobs[a.job];
        if (!check(a.job in checks, `${id}: a job "All Checks Pass" needs`)) continue;
        const list = a.job === "build" ? "steps.advisory.outputs.checks" : "needs.build.outputs.advisory-checks";
        const coe = `\${{ contains(fromJSON(${list}), '${id}') }}`;
        if (a.job !== "build")
            check(j.needs.includes("build"), `${id}: the job needs build directly (it lists the advisory checks)`);
        let warn;
        if (a.step === undefined) {
            check(!(a.job in registry.required), `${id}: a job in "required" is not new`);
            check(j.coe === coe, `${id}: job-level continue-on-error: ${coe}`);
            warn = { if: "${{ failure() }}", step: j.steps.at(-1) };
        } else {
            check(!registry.required[a.job]?.includes(a.step), `${id}: a step in "required" is not new`);
            const i = j.steps.findIndex((s) => s.name === a.step);
            if (!check(i >= 0, `${id}: the step exists`)) continue;
            const s = j.steps[i];
            check(s.coe === coe, `${id}: continue-on-error: ${coe}`);
            check(s.id !== undefined, `${id}: has an id`);
            if (a.job === "build")
                check(i > j.steps.findIndex((x) => x.id === "advisory"), `${id}: comes after "List advisory checks"`);
            warn = { if: `\${{ steps.${s.id}.outcome == 'failure' }}`, step: j.steps[i + 1] };
        }
        check(
            warn.step?.if === warn.if &&
                warn.step.coe === "true" &&
                warn.step.run?.includes(`::warning::advisory check ${id} failed`),
            `${id}: followed by a step with if: ${warn.if}, continue-on-error: true, run: echo "::warning::advisory check ${id} failed"`,
        );
    }
    return { problems, warnings };
};

const gitShow = (path) => {
    const r = spawnSync("git", ["show", `origin/master:${path}`], { encoding: "utf8" });
    return r.status === 0 ? r.stdout : undefined;
};

describe("new required checks start as warnings", () => {
    const ci = workflow("ci.yml");
    const registry = JSON.parse(readFileSync(new URL("ci-advisory-checks.json", import.meta.url), "utf8"));

    it("finds the required jobs and steps", () => {
        const checks = requiredChecks(parseJobs(ci));
        assert.ok(checks.build.includes("Install dependencies"));
        assert.ok(checks["all-checks"].includes("Check visual changes were accepted"));
        assert.ok(!("visual" in checks) && !("performance" in checks), "continue-on-error jobs never block");
        assert.ok(!checks["all-checks"].includes("Download visual captures"));
    });

    it("registers every required check, against ci.yml and the base branch", () => {
        const baseCi = gitShow(".github/workflows/ci.yml");
        assert.ok(baseCi, "origin/master's ci.yml (git fetch origin master)");
        const base = gitShow("tools/ci-advisory-checks.json");
        const { problems, warnings } = advisoryProblems({
            ci,
            registry,
            baseCi,
            baseRegistry: base && JSON.parse(base),
            today: new Date().toISOString().slice(0, 10),
        });
        for (const w of warnings) console.log(`::warning file=tools/ci-advisory-checks.json::${w}`);
        assert.deepEqual(problems, []);
    });

    describe("the registry rules, on a small workflow", () => {
        const BASE_CI = `on: push
jobs:
    build:
        steps:
            - name: List advisory checks
              id: advisory
              run: x
            - name: Lint
              run: x
    test:
        needs: build
        steps:
            - name: Unit
              run: x
    all-checks:
        needs: [build, test]
        steps:
            - name: Check
              run: x
`;
        const HEAD_CI = BASE_CI.replace(
            "            - name: Unit\n              run: x\n",
            `            - name: Unit
              run: x
            - name: Types
              id: types
              continue-on-error: \${{ contains(fromJSON(needs.build.outputs.advisory-checks), 'test/Types') }}
              run: x
            - name: Warn that Types failed
              if: \${{ steps.types.outcome == 'failure' }}
              continue-on-error: true
              run: echo "::warning::advisory check test/Types failed"
    links:
        needs: build
        continue-on-error: \${{ contains(fromJSON(needs.build.outputs.advisory-checks), 'links') }}
        steps:
            - name: Check links
              run: x
            - name: Warn that links failed
              if: \${{ failure() }}
              continue-on-error: true
              run: echo "::warning::advisory check links failed"
`,
        ).replace("needs: [build, test]", "needs: [build, test, links]");
        const REQUIRED = { build: ["List advisory checks", "Lint"], test: ["Unit"], "all-checks": ["Check"] };
        const entry = (job, step) => ({ job, step, added: "2026-10-01", enforce: "2026-10-15", issue: 1 });
        const ADVISORY = [entry("test", "Types"), entry("links")];
        const run = ({ ci = HEAD_CI, required = REQUIRED, advisory = ADVISORY, today = "2026-10-05" } = {}) =>
            advisoryProblems({
                ci,
                registry: { required, advisory },
                baseCi: BASE_CI,
                baseRegistry: { required: REQUIRED, advisory: [] },
                today,
            });

        it("accepts a new job and a new step, each wired to warn", () => {
            assert.deepEqual(run(), { problems: [], warnings: [] });
        });

        it("warns, and never fails, from three days before an entry's enforce date", () => {
            const late = run({ today: "2026-11-30" });
            assert.deepEqual(late.problems, []);
            assert.equal(late.warnings.length, 2);
            assert.match(late.warnings[1], /^links: required from 2026-10-15/);
            assert.equal(run({ today: "2026-10-11" }).warnings.length, 0);
            assert.equal(run({ today: "2026-10-12" }).warnings.length, 2);
        });

        it("refuses to put a check the base branch requires back into a warning period", () => {
            const { problems } = run({
                required: { ...REQUIRED, build: ["List advisory checks"] },
                advisory: [...ADVISORY, entry("build", "Lint")],
            });
            assert.ok(problems.some((p) => p.startsWith("build/Lint: the base branch already requires it")));
            const job = run({ advisory: [...ADVISORY, entry("test")], required: { ...REQUIRED, test: [] } });
            assert.ok(job.problems.some((p) => p.startsWith("test: the base branch already requires it")));
        });

        it("refuses a new check that skips its warning period", () => {
            const { problems } = run({
                required: { ...REQUIRED, test: ["Unit", "Types"] },
                advisory: [entry("links")],
            });
            assert.ok(problems.some((p) => p.startsWith('test / Types: "required" only grows')));
        });

        it("refuses an unregistered check and a stale entry", () => {
            assert.ok(
                run({ advisory: [entry("links")] }).problems.includes(
                    'test / Types: unregistered: a new check goes into "advisory" first',
                ),
            );
            const stale = run({ required: { ...REQUIRED, build: [...REQUIRED.build, "Cache Nx"] } });
            assert.ok(stale.problems.includes('build / Cache Nx: in "required" but not a required check of ci.yml'));
        });

        it("refuses an entry that is not wired", () => {
            const unwired = (from, to) => run({ ci: HEAD_CI.replace(from, to) }).problems;
            assert.ok(
                unwired(/\n {8}continue-on-error: .*'links'.*/, "").some((p) =>
                    p.startsWith("links: job-level continue-on-error"),
                ),
            );
            assert.ok(
                unwired("    links:\n        needs: build", "    links:\n        needs: test").some((p) =>
                    p.includes("needs build directly"),
                ),
            );
            assert.ok(
                unwired("if: ${{ failure() }}", "if: always()").some((p) => p.startsWith("links: followed by a step")),
            );
            assert.ok(unwired("              id: types\n", "").some((p) => p === "test/Types: has an id"));
            assert.ok(
                unwired("'test/Types') }}", "'test/Type') }}").some((p) =>
                    p.startsWith("test/Types: continue-on-error"),
                ),
            );
        });
    });

    it("lists the entries before their enforce date, from the base branch on a pull request", () => {
        const step = /- name: List advisory checks\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(job(ci, "build"))[1];
        assert.match(step, /base=HEAD\^1/, "a pull request cannot loosen the list that judges it");
        const program = /jq -c --arg today "\$\(date -u \+%F\)" '([^']+)'/.exec(step);
        assert.ok(program, "the build job lists the advisory checks");
        const fixture = JSON.stringify({
            advisory: [
                { job: "links", added: "2026-10-01", enforce: "2026-10-08" },
                { job: "build", step: "Lint", added: "2026-10-01", enforce: "2026-10-08" },
                { job: "test", added: "2026-09-20", enforce: "2026-10-05" },
            ],
        });
        const r = spawnSync("jq", ["-c", "--arg", "today", "2026-10-05", program[1]], {
            input: fixture,
            encoding: "utf8",
        });
        assert.equal(r.stdout.trim(), '["links","build/Lint"]');
    });

    it("only warns about a failed job in its warning period", () => {
        const body = job(ci, "all-checks");
        const run = /- name: Check all jobs passed\n[\s\S]*?\n {14}run: \|\n([\s\S]*?)\n\n/.exec(body)[1];
        const verdict = (advisory) =>
            spawnSync("bash", ["-e", "-c", run], {
                encoding: "utf8",
                env: {
                    ...process.env,
                    BUILD: "success",
                    FULL: "true",
                    ADVISORY: advisory,
                    NEEDS: JSON.stringify({ build: { result: "success" }, links: { result: "failure" } }),
                },
            });
        const warned = verdict('["links"]');
        assert.equal(warned.status, 0, warned.stdout);
        assert.match(warned.stdout, /::warning::advisory check links: failure/);
        assert.equal(verdict("[]").status, 1);
        assert.equal(verdict('["build"]').status, 1);
    });
});

describe("pr-title.yml", () => {
    it("passes only Mergify's own merge-queue draft without linting its title", () => {
        assert.ok(workflow("pr-title.yml").includes(`- name: Lint PR title\n              if: \${{ !(${QUEUE}) }}\n`));
    });
    it("is never cancelled by a later run, so Mergify's body edits cannot interrupt the required check", () => {
        // A concurrency group cancels superseded runs even without cancel-in-progress.
        assert.doesNotMatch(workflow("pr-title.yml"), /^concurrency:/m);
    });
});

describe("the lanes outside CI", () => {
    it("run nothing on a draft and start when it is marked ready", () => {
        const hosts = workflow("hosts.yml");
        assert.match(hosts, /types: \[opened, synchronize, reopened, ready_for_review\]/);
        assert.match(
            job(hosts, "test"),
            /if: github.event_name != 'pull_request' \|\| !github.event.pull_request.draft\n/,
        );
        const gpu = workflow("gpu.yml");
        assert.match(gpu, /pull_request: \{ types: \[opened, synchronize, reopened, ready_for_review\] \}/);
        assert.match(
            job(gpu, "decide"),
            /if: github.event_name != 'pull_request' \|\| !github.event.pull_request.draft\n/,
        );
    });
});

describe("apt in the workflows", () => {
    it("drops the Microsoft apt sources before every job's first apt use", () => {
        // packages.microsoft.com, a source the hosted Ubuntu images ship and nothing here installs from,
        // sometimes answers 403 and apt-get update exits 100 (run 37244710257). A job in a `container:`
        // runs a bare image without that source.
        const dir = new URL("../.github/workflows/", import.meta.url);
        const files = readdirSync(dir)
            .filter((f) => f.endsWith(".yml"))
            .map((f) => [f, readFileSync(new URL(f, dir), "utf8")]);
        files.push([
            "visual-review template",
            readFileSync(new URL("../visual-review/templates/visual-review.yml", import.meta.url), "utf8"),
        ]);
        const APT = /--with-deps|install-deps|install-browser|apt-get/;
        let checked = 0;
        for (const [file, text] of files) {
            const code = text.replace(/^\s*#.*$/gm, "");
            for (const body of code.split(/\n(?= {4}[a-z][\w-]*:\n)/)) {
                const use = body.search(APT);
                if (use === -1 || /\n {8}container:/.test(body)) continue;
                const drop = body.search(/drop-microsoft-apt-source|grep -rl packages\.microsoft\.com/);
                assert.ok(drop !== -1 && drop < use, `${file}: ${body.trim().split("\n")[0]} drops the source first`);
                checked++;
            }
        }
        assert.ok(checked >= 4, `found the apt jobs (${checked})`);
    });
});

describe(".mergify.yml", () => {
    it("does not make the queue wait on the visual gate before the gate accepts a batch", () => {
        // In a queue run the gate's --pr is the queue draft's own number, which no review record names,
        // so a batch that changes a baseline fails "Queue Checks Pass" every time. merge_conditions may
        // name it only once the trusted gate takes a batch's pull request numbers (its usage says so).
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        const gate = readFileSync(new URL("../visual-review/trusted/gate.mjs", import.meta.url), "utf8");
        const usage = gate.slice(gate.indexOf("export const GATE_USAGE"));
        if (/^\s*merge_conditions:/m.test(mergify) || /^\s*batch_size: *([2-9]|\d{2,})/m.test(mergify)) {
            assert.match(usage.slice(0, usage.indexOf("`;")), /batch/i, "the gate accepts a batch first");
        }
    });
});

describe("gpu.yml", () => {
    const gpu = workflow("gpu.yml");

    it("runs on ready pull requests and master, never on a label or a schedule, and never cancels a paid run", () => {
        assert.match(gpu, /pull_request: \{ types: \[opened, synchronize, reopened, ready_for_review\] \}/);
        // the nightly is off until the owner turns it on (spot on hold, issue #1003): no live schedule, no spot
        assert.doesNotMatch(gpu, /^ {4}schedule:/m);
        assert.doesNotMatch(gpu, /labeled/);
        assert.match(gpu, /cancel-in-progress: false/);
        assert.doesNotMatch(job(gpu, "test-gpu"), /tenancy=spot/);
    });

    it("runs the T4 only when the decision says so, and only for this repository's pull requests", () => {
        const t4 = job(gpu, "test-gpu");
        assert.match(t4, /needs: decide/);
        assert.match(t4, /needs.decide.outputs.run == 'true'/);
        assert.match(t4, /head.repo.full_name == github.repository/);
    });

    it("always reports the gate, failing it on a draft, a missing decision or a failed T4", () => {
        const gate = job(gpu, "gate");
        assert.match(gate, /name: T4 GPU gate/);
        assert.match(gate, /if: always\(\)/);
        assert.match(gate, /"\$DRAFT" == "true" .* exit 1/);
        assert.match(gate, /"\$DECIDE" != "success" .* exit 1/);
        assert.match(gate, /"\$T4" != "success" .* exit 1/);
    });
});

describe(".mergify.yml and the GPU gate", () => {
    const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");

    it("lets a pull request skip the gate only when none of its files can affect the GPU package", () => {
        const exempt = /-files~=\^\(\?!\(([^)]+)\)\/\)/.exec(mergify)[1].split("|");
        assert.match(mergify, /- check-success=T4 GPU gate/);
        // Every workspace package the GPU package depends on, through package.json (what nx follows).
        const pkg = (dir) => JSON.parse(readFileSync(new URL(`../${dir}/package.json`, import.meta.url), "utf8"));
        const dirs = [
            "algorithms",
            "graph-format",
            "graph-io",
            "graph-samples",
            "layout",
            "graphty-element",
            "graphty",
        ];
        dirs.push("remote-logger", "compact-mantine", "visual-review", "webgpu-graph-algorithms");
        const byName = new Map(dirs.map((d) => [pkg(d).name, d]));
        const deps = new Set(["webgpu-graph-algorithms"]);
        for (const d of deps) {
            const p = pkg(d);
            for (const name of Object.keys({ ...p.dependencies, ...p.devDependencies, ...p.peerDependencies })) {
                if (byName.has(name)) {
                    deps.add(byName.get(name));
                }
            }
        }
        assert.ok(deps.has("graph-format") && deps.has("layout"), "the walk found the GPU package's dependencies");
        for (const dir of exempt) {
            assert.ok(!deps.has(dir), `${dir} is a dependency of webgpu-graph-algorithms, so it cannot skip the gate`);
        }
        const skip = new RegExp(`^(?!(${exempt.join("|")})/)`);
        assert.ok(!skip.test("graphty-element/src/Graph.ts"));
        assert.ok(skip.test("graph-format/src/index.ts"));
        assert.ok(skip.test("pnpm-lock.yaml"));
    });
});

describe("hosts.yml", () => {
    it("runs nightly, and a pull request's Windows leg on the short scope", () => {
        const hosts = workflow("hosts.yml");
        assert.match(hosts, /schedule: \[\{ cron: /);
        assert.match(hosts, /NARROW: .*github.event_name == 'pull_request'/);
    });
});

describe("master-guard", () => {
    const run = (name, conclusion, event = "push") => ({ name, conclusion, event });

    it("freezes on a red master CI, lifts on a green one, and only reports a red hardware lane", () => {
        assert.equal(decide(run("CI", "failure")), "red");
        assert.equal(decide(run("CI", "timed_out")), "red");
        assert.equal(decide(run("CI", "success")), "green");
        assert.equal(decide(run("CI", "cancelled")), "none");
        assert.equal(decide(run("CI", "failure", "workflow_dispatch")), "none");
        assert.equal(decide(run("GPU", "failure")), "hardware-red");
        assert.equal(decide(run("Hosts", "failure", "schedule")), "hardware-red");
        assert.equal(decide(run("GPU", "success")), "none");
        assert.equal(decide(run("GPU", "failure", "pull_request")), "none");
    });

    it("finds the commit in its own freezes and the pull request in a merge commit", () => {
        const sha = "a".repeat(40);
        assert.equal(frozenSha(`${FREEZE_PREFIX}${sha} (url)`), sha);
        assert.equal(frozenSha("release freeze"), null);
        assert.equal(mergedPr("Merge pull request #1011 from graphty-org/x\n\nbody"), 1011);
        assert.equal(mergedPr("chore(release): publish"), null);
    });

    it("titles a revert so Lint PR Title passes it", () => {
        const lint = (title) =>
            spawnSync("pnpm", ["exec", "commitlint"], { input: `${title}\n`, encoding: "utf8" }).status;
        assert.equal(lint(revertTitle("0123456789abcdef0123456789abcdef01234567", 1011)), 0);
        assert.equal(lint(revertTitle("0123456789abcdef0123456789abcdef01234567", null)), 0);
    });
});

describe("release.yml", () => {
    const release = workflow("release.yml");
    const train = job(release, "train");
    const publish = job(release, "publish");

    it("never pushes to master and holds no deploy key", () => {
        assert.doesNotMatch(release, /RELEASE_DEPLOY_KEY|ssh-key/);
        const pushes = release.match(/git push[^\n]*/g);
        assert.deepEqual(pushes, ['git push origin "${COMMIT}:refs/heads/${branch}"']);
    });

    it("cuts the release only from master, once a day or on dispatch, from a commit green on every lane", () => {
        assert.match(release, /schedule:\n\s+- cron: /);
        assert.match(release, /workflow_dispatch:\n\s+inputs:\n\s+packages:/);
        assert.match(train, /if: \$\{\{ github.event_name != 'push' && github.ref == 'refs\/heads\/master' \}\}/);
        assert.match(train, /case "\$ci" in \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(train, /case "\$gpu" in \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(train, /case "\$hosts" in "" \| \*" completed success"\) ;; \*\) continue ;; esac/);
        assert.match(train, /is still open; it must merge or close first/);
        assert.match(train, /node tools\/release-hold.mjs apply --only "\$PACKAGES"/);
        assert.match(train, /node tools\/release-diff.mjs "\$SHA" "\$COMMIT"/);
        assert.match(train, /--label priority:critical/);
    });

    it("publishes only on a push that lands a release branch, from the train's builds, with OIDC", () => {
        assert.match(
            publish,
            /if: \$\{\{ github.event_name == 'push' && contains\(github.event.head_commit.message, '\/release\/train-'\) \}\}/,
        );
        assert.match(publish, /id-token: write/);
        assert.match(publish, /node tools\/release-diff.mjs "\$sha" "\$commit"/);
        assert.match(publish, /\.workflow_run.head_branch == "master"/);
        assert.doesNotMatch(train, /id-token|nx release publish/);
    });

    it("lets Mergify take the release pull request alone, ahead of the default rule", () => {
        const mergify = readFileSync(new URL("../.mergify.yml", import.meta.url), "utf8");
        const rule = mergify.indexOf("- name: release");
        assert.ok(rule > 0 && rule < mergify.indexOf("- name: default"));
        assert.match(mergify.slice(rule), /^\s+- head~=\^release\/train-$/m);
    });

    it("deploys graphty.app from every green CI run of a push to master", () => {
        const deploy = workflow("deploy-pages.yml");
        assert.match(deploy, /workflow_run:\n\s+workflows: \["CI"\]/);
        assert.match(
            job(deploy, "check"),
            /github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push'/,
        );
    });
});

describe("release-diff", () => {
    const manifest = (version, extra = {}) => JSON.stringify({ name: "a", version, ...extra }, null, 4);
    const tree = (files) => (path) => files[path] ?? null;

    it("accepts version bumps, changelogs and consumed version plans", () => {
        const before = tree({ "a/package.json": manifest("1.0.0"), ".nx/version-plans/x.md": "minor" });
        const after = tree({ "a/package.json": manifest("1.1.0"), "a/CHANGELOG.md": "## 1.1.0" });
        const files = ["a/package.json", "a/CHANGELOG.md", ".nx/version-plans/x.md"];
        assert.deepEqual(strayChanges(files, before, after), []);
    });

    it("rejects any other change", () => {
        const before = tree({ "a/package.json": manifest("1.0.0"), "a/src/x.ts": "1" });
        const after = tree({
            "a/package.json": manifest("1.1.0", { main: "x" }),
            "a/src/x.ts": "2",
            "b/package.json": "{}",
        });
        const found = strayChanges(["a/package.json", "a/src/x.ts", "b/package.json"], before, after);
        assert.equal(found.length, 3);
        assert.match(found.join("\n"), /a\/package.json: changes more than "version"/);
    });
});

describe("pr-status-broker", () => {
    it("writes one compact record per pull request, the newest check of each name", () => {
        const pr = (number, rollup) => ({
            number,
            title: "t",
            headRefName: "h",
            baseRefName: "master",
            isDraft: false,
            mergeable: "MERGEABLE",
            labels: { nodes: [{ name: "hold" }] },
            commits: { nodes: rollup === undefined ? [] : [{ commit: { statusCheckRollup: rollup } }] },
        });
        const contexts = {
            pageInfo: { hasNextPage: true },
            nodes: [
                { name: "Build", status: "COMPLETED", conclusion: "SUCCESS", startedAt: "2026-10-04T10:00:00Z" },
                // The draft run's skipped check, older, listed after the real one: the newest wins.
                {
                    name: "All Checks Pass",
                    status: "COMPLETED",
                    conclusion: "SUCCESS",
                    startedAt: "2026-10-04T10:20:00Z",
                },
                {
                    name: "All Checks Pass",
                    status: "COMPLETED",
                    conclusion: "SKIPPED",
                    startedAt: "2026-10-04T09:00:00Z",
                },
                { name: "Links", status: "COMPLETED", conclusion: "FAILURE", startedAt: "2026-10-04T10:00:00Z" },
                { name: "Links", status: "QUEUED", conclusion: null, startedAt: null },
                {},
            ],
        };
        const [a, b] = summarize({
            repository: { pullRequests: { nodes: [pr(1, { state: "PENDING", contexts }), pr(2, null)] } },
        });
        assert.deepEqual(a, {
            number: 1,
            title: "t",
            head: "h",
            base: "master",
            draft: false,
            mergeable: "MERGEABLE",
            labels: ["hold"],
            state: "PENDING",
            checks: { Build: "SUCCESS", "All Checks Pass": "SUCCESS", Links: "QUEUED" },
            checksTruncated: true,
        });
        assert.equal(b.state, null);
        assert.deepEqual(b.checks, {});
    });
});
