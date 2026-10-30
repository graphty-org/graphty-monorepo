// Tests of tools/channel/story-slices.mjs (design/visual-testing/early-capture.md, 4a and 4c) and of
// .github/workflows/story-slices.yml.
//
//   node tools/channel/story-slices.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parse } from "yaml";

import { STORY_BIN_LIMIT_MS } from "../test-select.mjs";
import {
    captureRows,
    matrixOf,
    nextSlot,
    notices,
    orderUnits,
    queueSize,
    reachKeys,
    sliceBins,
} from "./story-slices.mjs";

// allUnits() of master's real story files, recorded on 2026-10-29 (280 units, about 98 capture-minutes)
const RECORDED = JSON.parse(readFileSync(new URL("fixtures/story-slices-units.json", import.meta.url), "utf8"));
const PLANS = RECORDED.plans.map((p) => ({ project: p.project, storybook: p.storybook, unitMs: new Map(p.units) }));
const ALL = PLANS.flatMap((p) => [...p.unitMs.keys()].map((u) => `${p.project}:${u}`));

const plans = [
    {
        project: "graphty",
        storybook: "graphty/storybook-static",
        unitMs: new Map([
            ["graphty/src/A.stories.tsx", 60_000],
            ["graphty/src/S.stories.tsx#1/2", 150_000],
            ["graphty/src/S.stories.tsx#2/2", 150_000],
        ]),
    },
    {
        project: "layout",
        storybook: "layout/storybook-static",
        unitMs: new Map([
            ["layout/stories/A.stories.ts", 20_000],
            ["layout/stories/B.stories.ts", 20_000],
        ]),
    },
];

describe("the slice order (4a)", () => {
    it("puts reached units first, then the rest oldest first, never captured oldest of all", () => {
        const ages = new Map([
            ["graphty:graphty/src/A.stories.tsx", 300],
            ["layout:layout/stories/A.stories.ts", 100],
            ["layout:layout/stories/B.stories.ts", 200],
        ]);
        // a reached file reaches every part of it
        const order = orderUnits(plans, ages, new Set(["graphty:graphty/src/S.stories.tsx"]));
        assert.deepEqual(
            order.map((u) => [u.unit, u.reached]),
            [
                ["graphty/src/S.stories.tsx#1/2", true],
                ["graphty/src/S.stories.tsx#2/2", true],
                ["layout/stories/A.stories.ts", false],
                ["layout/stories/B.stories.ts", false],
                ["graphty/src/A.stories.tsx", false],
            ],
        );
        // a project selected whole reaches all of its units
        assert.deepEqual(
            orderUnits(plans, ages, new Set(["layout:*"]))
                .map((u) => u.unit)
                .slice(0, 2),
            ["layout/stories/A.stories.ts", "layout/stories/B.stories.ts"],
        );
    });

    it("packs units in order into at most the asked bins of 3 minutes, passing over one that does not fit", () => {
        const order = orderUnits(plans, new Map(), new Set(["graphty:graphty/src/S.stories.tsx"]));
        const bins = sliceBins(plans, order, 1);
        assert.equal(bins.length, 1);
        // the first reached part fits; every later unit would need a second bin (a project's units never share a
        // bin with another project's), so it is passed over
        assert.deepEqual(bins[0].files, ["graphty/src/S.stories.tsx#1/2"]);
        const two = sliceBins(plans, order, 2);
        assert.deepEqual(two.flatMap((b) => b.files).sort(), [
            "graphty/src/S.stories.tsx#1/2",
            "graphty/src/S.stories.tsx#2/2",
        ]);
        // with room, the older unreached units follow
        assert.equal(sliceBins(plans, order, 4).flatMap((b) => b.files).length, 5);
        for (const b of [...bins, ...two]) assert.ok(b.ms <= STORY_BIN_LIMIT_MS, `${b.name} ${b.ms}`);
    });

    it("names each bin's Storybook artifact as ci.yml's build uploads it", () => {
        const [m] = matrixOf(sliceBins(plans, orderUnits(plans, new Map(), new Set()), 1));
        assert.equal(m.artifact, "build-storybook-app");
        assert.throws(() => matrixOf([{ name: "x-1", storybook: "x/storybook-static", files: [] }]), /no build/);
    });
});

describe("a replay of the rotation over master's recorded story units", () => {
    // Each slice renders what the planner picks; its bins post their units, which become the next plan's ages.
    function replay({ bins, slices, reachAt = () => new Set() }) {
        const ages = new Map();
        const log = [];
        for (let t = 1; t <= slices; t++) {
            const reached = reachAt(t);
            const order = orderUnits(PLANS, ages, reached);
            const picked = sliceBins(PLANS, order, bins);
            const keys = picked.flatMap((b) => b.files.map((f) => `${b.project}:${f}`));
            for (const k of keys) ages.set(k, t);
            log.push({ t, picked, keys, order });
        }
        return { ages, log };
    }

    it("renders every unit within one pass of the set, each slice at most its bins of 3 minutes", () => {
        const total = PLANS.reduce((n, p) => n + [...p.unitMs.values()].reduce((a, b) => a + b, 0), 0);
        // a full set at 6 bins a slice (an idle slice) takes ceil(total / 18 min) slices, plus packing slack
        const slices = Math.ceil(total / (6 * STORY_BIN_LIMIT_MS)) + 2;
        const { ages, log } = replay({ bins: 6, slices });
        assert.deepEqual(
            ALL.filter((k) => !ages.has(k)),
            [],
            "every unit was rendered",
        );
        for (const { picked } of log) {
            assert.ok(picked.length <= 6);
            for (const b of picked) assert.ok(b.ms <= STORY_BIN_LIMIT_MS, `${b.name} ${b.ms}`);
        }
        // and the rotation keeps going: in the next as many slices, every unit is rendered again
        const twice = replay({ bins: 6, slices: 2 * slices });
        assert.deepEqual(
            ALL.filter((k) => twice.ages.get(k) <= slices),
            [],
            "every unit was rendered again",
        );
    });

    it("a base slice of 2 bins takes a merge's reached units first, and still advances the rotation", () => {
        const reach = new Set(["graphty:*"]);
        const { log } = replay({ bins: 2, slices: 40, reachAt: (t) => (t === 20 ? reach : new Set()) });
        const at20 = log[19];
        const graphty = PLANS.find((p) => p.project === "graphty");
        // the reached project fills the slice before anything older
        assert.ok(
            at20.keys.every((k) => k.startsWith("graphty:")),
            at20.keys.join(" "),
        );
        assert.ok(at20.keys.length > 0 && at20.keys.length <= graphty.unitMs.size);
        // outside that slice the rotation carried on: 40 base slices of at most 6 capture-minutes covered the set
        const seen = new Set(log.flatMap((l) => l.keys));
        assert.ok(seen.size >= ALL.length * 0.9, `${seen.size} of ${ALL.length}`);
    });

    it("re-renders a unit whose slice failed before anything rendered since", () => {
        const order1 = orderUnits(PLANS, new Map(), new Set());
        const first = sliceBins(PLANS, order1, 2).flatMap((b) => b.files);
        // the slice failed: it posted no units, so the same units lead the next plan
        const again = sliceBins(PLANS, orderUnits(PLANS, new Map(), new Set()), 2).flatMap((b) => b.files);
        assert.deepEqual(again, first);
    });
});

describe("the rows a merge and a bin post (4c)", () => {
    it("records a merge's reach as files, or the whole project", () => {
        const plan = {
            stories: [
                { project: "graphty", mode: "all", files: [], baselines: [] },
                { project: "layout", mode: "files", files: ["layout/stories/A.stories.ts"], baselines: ["x--y"] },
                { project: "algorithms", mode: "none", files: [], baselines: [] },
            ],
        };
        assert.deepEqual(reachKeys(plan), ["graphty:*", "layout:layout/stories/A.stories.ts"]);
    });

    it("posts each render with its hashes, and the bin's units only when the capture finished", () => {
        const results = {
            complete: true,
            items: [
                { id: "a--one", mode: null, status: "unchanged", capture: "h1", baseline: "h1" },
                { id: "a--two", mode: "dark", status: "changed", capture: "h2", baseline: "h3" },
                { id: "a--three", mode: null, status: "moved", capture: "h4", baseline: "h4" },
                { id: "a--four", mode: null, status: "new", capture: "h5", baseline: null },
                { id: "a--five", mode: null, status: "failed", capture: null, baseline: "h6" },
                { id: "a--six", mode: null, status: "excluded" },
            ],
        };
        const files = ["graphty/src/A.stories.tsx#1/2"];
        const rows = captureRows("graphty", results, files);
        assert.deepEqual(rows.captures, [
            { project: "graphty", story: "a--one", status: "unchanged", hash: "h1", baselineHash: "h1" },
            { project: "graphty", story: "a--two", mode: "dark", status: "changed", hash: "h2", baselineHash: "h3" },
            { project: "graphty", story: "a--three", status: "changed", hash: "h4", baselineHash: "h4" },
            { project: "graphty", story: "a--four", status: "new", hash: "h5" },
            { project: "graphty", story: "a--five", status: "failed", baselineHash: "h6" },
        ]);
        assert.deepEqual(rows.units, [{ project: "graphty", unit: files[0] }]);
        assert.deepEqual(captureRows("graphty", { ...results, complete: false }, files).units, []);
    });
});

describe("story-slices.yml", () => {
    const text = readFileSync(new URL("../../.github/workflows/story-slices.yml", import.meta.url), "utf8");
    const wf = parse(text);
    const steps = (job) => wf.jobs[job].steps;
    const runs = (job) =>
        steps(job)
            .map((s) => String(s.run ?? ""))
            .join("\n");

    it("is started only by dispatch, one slice at a time, never cancelling one", () => {
        assert.deepEqual(Object.keys(wf.on), ["workflow_dispatch"]);
        assert.deepEqual(Object.keys(wf.on.workflow_dispatch.inputs).sort(), ["bins", "mode", "post", "sha"]);
        assert.equal(wf.concurrency.group, "story-slices");
        assert.notEqual(wf.concurrency["cancel-in-progress"], true);
    });

    it("reads only: contents and actions read, and the store's OIDC token", () => {
        assert.deepEqual(wf.permissions, { contents: "read", actions: "read", "id-token": "write" });
        for (const job of Object.values(wf.jobs)) assert.equal(job.permissions, undefined);
    });

    it("plans in a job that installs nothing, from the green ci.yml push build of exactly the commit", () => {
        const plan = runs("plan");
        assert.ok(!/pnpm install|npm (ci|install)/.test(plan));
        assert.ok(!steps("plan").some((s) => /pnpm\/action-setup/.test(String(s.uses ?? ""))));
        assert.match(plan, /actions\/workflows\/ci\.yml\/runs\?/);
        assert.match(plan, /event=push/);
        assert.match(plan, /branch=master/);
        assert.match(plan, /status=success/);
        assert.match(plan, /head_sha=/);
        assert.match(plan, /story-slices\.mjs plan/);
    });

    it("restores the LFS baselines from the cache and never saves an entry", () => {
        const uses = Object.values(wf.jobs).flatMap((j) => j.steps.map((s) => String(s.uses ?? "")));
        assert.ok(uses.some((u) => u.startsWith("actions/cache/restore@")));
        assert.ok(!uses.some((u) => /^actions\/cache(\/save)?@/.test(u)), "no step that saves a cache entry");
    });

    it("downloads the Storybook of exactly the commit's build and fails when it is gone", () => {
        const dl = steps("capture").find((s) => String(s.uses ?? "").startsWith("actions/download-artifact@"));
        assert.equal(dl.with["run-id"], "${{ needs.plan.outputs.run }}");
        assert.equal(dl.with.name, "${{ matrix.artifact }}");
        assert.notEqual(dl["continue-on-error"], true);
        assert.equal(
            steps("capture").find((s) => s.uses === "actions/checkout@v7").with.ref,
            "${{ needs.plan.outputs.sha }}",
        );
    });

    it("tells the owner's phone from the step that posts the rows, with the repository's Pushover secrets", () => {
        const post = steps("capture").find((s) => /story-slices\.mjs post/.test(String(s.run ?? "")));
        assert.equal(post.env.PUSHOVER_APP_TOKEN, "${{ secrets.PUSHOVER_APP_TOKEN }}");
        assert.equal(post.env.PUSHOVER_USER_KEY, "${{ secrets.PUSHOVER_USER_KEY }}");
        assert.match(post.env.REVIEW_URL, /vars\.VISUAL_REVIEW_URL/);
    });

    it("posts rows only when post is true, and never touches visual-baselines/ beyond reading it", () => {
        const post = steps("capture").find((s) => /story-slices\.mjs post/.test(String(s.run ?? "")));
        assert.match(post.if, /inputs\.post/);
        assert.ok(!/git (add|commit|push)|rm -rf visual-baselines|> *visual-baselines/.test(text));
    });

    it("records a bin whose units have no story in the built Storybook, so they do not stay oldest forever", () => {
        const post = steps("capture").find((s) => /story-slices\.mjs post/.test(String(s.run ?? "")));
        assert.match(post.if, /steps\.pick\.outputs\.stories == ''/);
        assert.match(post.run, /\{"complete":true,"items":\[\]\}/);
    });
});

describe("ci.yml's reach rows (4a)", () => {
    const ci = parse(readFileSync(new URL("../../.github/workflows/ci.yml", import.meta.url), "utf8"));
    const job = ci.jobs["select-graphs"];

    it("posts them from master's push build only, never able to make master red", () => {
        assert.match(job.if, /github\.event_name == 'push' && github\.ref == 'refs\/heads\/master'/);
        assert.equal(job["continue-on-error"], true);
        assert.equal(job.permissions["id-token"], "write");
        const step = job.steps.find((s) => /story-slices\.mjs reach/.test(String(s.run ?? "")));
        assert.equal(step["continue-on-error"], true);
        assert.match(step.run, /test-select\.mjs --base HEAD\^1 --head HEAD --plan/);
        // the graphs are restored, not only looked up, so the selection does not walk them again
        const restore = job.steps.find((s) => s.id === "graphs");
        assert.notEqual(restore.with["lookup-only"], true);
        assert.ok(job.steps.indexOf(step) > job.steps.findIndex((s) => /cache\/save/.test(String(s.uses ?? ""))));
    });
});

describe("the owner's notices (4d)", () => {
    const at = (iso) => Date.parse(iso);
    const none = { queue: null, slot: null };

    it("counts only renders against the posted baselines tree: an approved picture's stale row is not waiting", () => {
        const T = "a".repeat(40);
        const old = "b".repeat(40);
        const captures = [
            { status: "changed", baselinesTree: T },
            { status: "new", baselinesTree: T },
            { status: "unchanged", baselinesTree: T },
            { status: "unstable", baselinesTree: T },
            // rendered before an approval moved master's baselines: the review page holds it back, so no notice
            { status: "changed", baselinesTree: old },
        ];
        assert.equal(queueSize({ captures }, T), 2);
        assert.equal(queueSize({ captures }, old), 1);
    });

    it("finds the next full-run slot", () => {
        assert.equal(nextSlot(at("2026-10-29T05:59:00Z")), at("2026-10-29T06:00:00Z"));
        assert.equal(nextSlot(at("2026-10-29T18:00:00Z")), at("2026-10-30T00:00:00Z"));
    });

    it("tells once when the queue goes from empty to non-empty, at most every 2 hours", () => {
        const now = at("2026-10-29T02:00:00Z");
        assert.deepEqual(
            notices({ before: 0, after: 3, notified: none, now }).map((n) => [n.kind, n.what]),
            [["queue", "3 pictures changed on master"]],
        );
        assert.deepEqual(notices({ before: 2, after: 3, notified: none, now }), []);
        assert.deepEqual(notices({ before: 0, after: 1, notified: { ...none, queue: now - 3_600_000 }, now }), []);
        assert.equal(
            notices({ before: 0, after: 1, notified: { ...none, queue: now - 3 * 3_600_000 }, now }).length,
            1,
        );
    });

    it("reminds once before each slot while the queue is not empty", () => {
        const now = at("2026-10-29T05:00:00Z"); // 60 minutes before the 06:00 slot
        const [n] = notices({ before: 1, after: 1, notified: none, now });
        assert.deepEqual([n.kind, n.what], ["slot", "The 06:00 UTC slot holds nightly for 1 picture"]);
        assert.deepEqual(notices({ before: 1, after: 1, notified: { ...none, slot: now - 600_000 }, now }), []);
        assert.deepEqual(notices({ before: 1, after: 0, notified: none, now }), []);
        // too early, and too late, for this slot
        assert.deepEqual(notices({ before: 1, after: 1, notified: none, now: at("2026-10-29T04:00:00Z") }), []);
        assert.deepEqual(notices({ before: 1, after: 1, notified: none, now: at("2026-10-29T05:45:00Z") }), []);
        // the reminder sent for the slot before does not count for this one
        const before = { ...none, slot: at("2026-10-28T23:00:00Z") };
        assert.equal(notices({ before: 1, after: 1, notified: before, now }).length, 1);
    });
});
