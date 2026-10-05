import { describe, expect, it } from "vitest";

import {
    PATTERNS,
    SHARED_WINDOW_MS,
    cannotAffect,
    classify,
    failureLines,
    isNoLog,
    othersWithKey,
    setupDrift,
} from "../lib/classify.mjs";

/**
 * A failed CI job on a hosted runner, with some fields replaced.
 * @param {Partial<import("../lib/classify.mjs").Failure>} f the fields that differ
 * @returns {import("../lib/classify.mjs").Failure} a failed CI job on a hosted runner
 */
const job = (f) => ({ workflow: "CI", job: "Build", steps: ["Run tests"], labels: ["ubuntu-latest"], ...f });
const RENTED = ["machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand"];
/** The annotation messages of GPU job 111514123789, as GitHub answered them. */
const GPU_CLOCK_REFUSED = [
    "Node.js 20 is deprecated. The following actions target Node.js 20 but are being forced to run on Node.js 24: actions/cache@v4, actions/checkout@v4, actions/setup-node@v4, actions/upload-artifact@v4, pnpm/action-setup@v4. For more information see: https://github.blog/changelog/2025-09-19-deprecation-of-node-20-on-github-actions-runners/",
    "Process completed with exit code 1.",
    "nvidia-smi -lgc 1590,1590 was refused: the benchmarks run at the power governor's clock (issue #703)",
    "core_pattern is read-only inside the job container; issue #273's guard does not hold on this lane",
];

/**
 * One failure per pattern, each text as it was recorded. Where the month recorded no instance,
 * the text is the tool's own message, cited.
 * @type {Record<string, import("../lib/classify.mjs").Failure>}
 */
const FIXTURES = {
    // gh's answer to a revoked token.
    "401 or bad credentials": job({ log: "HTTP 401: Bad credentials (https://api.github.com/user)" }),
    // Release job 109798072600, 2026-09-30: the first publish of a new package.
    "403 naming auth or permission": job({
        workflow: "Release",
        job: "Release",
        steps: ["Publish"],
        log: "pnpm publish error:\n403 Forbidden - PUT https://registry.npmjs.org/@graphty%2fvisual-review - OIDC permission denied for this action",
    }),
    // git's answer to a refused deploy key.
    "ssh key refused": job({
        log: "git@github.com: Permission denied (publickey).\nfatal: Could not read from remote repository.",
    }),
    // npm's answer to a missing or expired token.
    "npm E401": job({ log: "npm error code E401\nnpm error Unable to authenticate" }),
    // The signing spike of 2026-10-03 (platform facts, S28).
    "commit signing failed": job({
        workflow: "local",
        job: "push",
        steps: ["commit"],
        log: "error: gpg failed to sign the data:\ngpg: signing failed: Inappropriate ioctl for device",
    }),
    // The StopFailure spike of 2026-10-03 (platform facts, S15).
    "Claude authentication failed": job({
        workflow: "local",
        job: "worker",
        steps: [],
        log: "StopFailure error=authentication_failed",
    }),
    // GPU job 110700310760, 2026-10-02 04:04: the text is a step NAME; no annotation, no log.
    "rented runner balance": job({
        workflow: "GPU",
        job: "Test (NVIDIA T4)",
        steps: ["Machine: Insufficient balance to run job. Current balance: $-2.0800. Minimum required: $0.05."],
        labels: RENTED,
        log: null,
    }),
    // GPU job 106552660871, 2026-09-21.
    "rented runner time limit": job({
        workflow: "GPU",
        job: "Test (NVIDIA T4)",
        steps: [
            "Machine: Runner terminated: free plan runners are limited to 30 minutes. Upgrade to a paid plan for unlimited runtime.",
        ],
        labels: RENTED,
    }),
    // The split GPU lane, 2026-09-21 (incidents, provider).
    "rented runner concurrency limit": job({
        workflow: "GPU",
        job: "Test (NVIDIA T4)",
        steps: ["Machine: Concurrent runner limit reached"],
        labels: RENTED,
    }),
    // The StopFailure spike of 2026-10-03 (platform facts, S15).
    "Claude billing error": job({
        workflow: "local",
        job: "worker",
        steps: [],
        log: "StopFailure error=billing_error",
    }),
    // GPU job 106785288715, 2026-09-22: no steps, no log, the text only in an annotation.
    "runner lost on a rented label": job({
        workflow: "GPU",
        job: "Test (NVIDIA T4)",
        steps: [],
        labels: RENTED,
        annotations: [
            "The self-hosted runner lost communication with the server. Verify the machine is running and has a healthy network connection.",
        ],
    }),
    // GitHub's answer when a hosted runner went away mid-job.
    "runner lost mid-job": job({
        steps: ["Run tests"],
        annotations: [
            "The hosted runner: GitHub Actions 12 lost communication with the server. Anything in your workflow that terminates the runner process, starves it for CPU/Memory, or blocks its network access can cause this error.",
        ],
    }),
    // curl's answer when the resolver does not answer.
    "DNS lookup failed": job({ steps: ["Install"], log: "curl: (6) Could not resolve host: registry.npmjs.org" }),
    // CI run 37244710257, job Test (graphty-element-browser-4), 2026-10-04: packages.microsoft.com
    // refused the apt index while Playwright installed its system dependencies.
    "package server or mirror failed an install": job({
        job: "Test (graphty-element-browser-4)",
        steps: ["Install Playwright deps"],
        log: [
            "E: Failed to fetch https://packages.microsoft.com/ubuntu/24.04/prod/dists/noble/InRelease  403  Forbidden [IP: 13.107.246.40 443]",
            "E: The repository 'https://packages.microsoft.com/ubuntu/24.04/prod noble InRelease' is no longer signed.",
            "Failed to install browser dependencies",
            "Error: Installation process exited with code: 100",
        ].join("\n"),
    }),
    // corepack's answer when it cannot fetch pnpm.
    "package registry fetch failed": job({
        steps: ["Setup pnpm"],
        log: "Internal Error: Error when performing the request to https://registry.npmjs.org/pnpm/latest; for troubleshooting help, see https://github.com/nodejs/corepack#troubleshooting",
    }),
};

describe("the pattern table", () => {
    it("reads only the lines before the failure, not a passing test that prints a 401", () => {
        // CI run 37277723231, 2026-10-05: a slow runner timed the small-browser shard out; 2,000
        // lines earlier a visual-review test logged "refresh failed: HTTP 401: Bad credentials".
        const passing = "visual-review: refresh failed: HTTP 401: Bad credentials";
        const filler = Array.from({ length: 2000 }, (_, i) => `test ${i} ok`);
        const log = [
            passing,
            ...filler,
            "##[error]failed: graphty visual-review",
            "##[error]Process completed with exit code 1.",
        ];
        const slow = job({ job: "Test (small-browser)", log: log.join("\n") });
        expect(classify(slow, { where: "master" })).toMatchObject({ class: "unclassified" });
        // The same line right before the marker is the failure.
        const real = job({ log: [...filler, passing, "##[error]Process completed with exit code 1."].join("\n") });
        expect(classify(real, { where: "master" })).toMatchObject({ class: "credential" });
        // With no marker, the end of the log.
        expect(failureLines([passing, ...filler].join("\n"))).not.toContain(passing);
        expect(failureLines([...filler, passing].join("\n"))).toContain(passing);
    });

    it("leaves the environment failures that are not unambiguous to Claude on master", () => {
        // GPU job 111465235370, 2026-10-04: the job container had no glib. Environment or code is
        // Claude's verdict now, not a pattern's.
        const glib = job({
            workflow: "GPU",
            job: "Test (NVIDIA T4)",
            steps: ["Browser smoke on NVIDIA"],
            labels: RENTED,
            log: "chrome-headless-shell: error while loading shared libraries: libglib-2.0.so.0: cannot open shared object file",
        });
        expect(classify(glib, { where: "master" })).toMatchObject({ class: "unclassified" });
        // GPU job 111514123789: a benchmark at a refused clock lock.
        const bench = job({
            workflow: "GPU",
            job: "Test (NVIDIA T4)",
            steps: ["Run node scripts/bench-compare.js"],
            labels: RENTED,
            annotations: GPU_CLOCK_REFUSED,
        });
        expect(classify(bench, { where: "master" }).class).toBe("unclassified");
        // A third party's 500 and a connection error are not known outages either.
        for (const log of [
            "Error: Internal Server Error (500)\nInternal server error. Please contact Coveralls team.",
            "npm error request to https://registry.npmjs.org/braces failed, reason: connect ETIMEDOUT 104.16.1.35:443",
            "No space left on device",
            // CI job 103414194732, 2026-09-11: remote-logger's tests resolving a made-up host.
            "Error: getaddrinfo EAI_AGAIN test-server",
        ]) {
            expect(classify(job({ log }), { where: "master" }).class, log).toBe("unclassified");
        }
        // On a pull request the same text is its own.
        expect(classify(bench).class).toBe("own");
    });

    it("has one fixture per pattern, and each fixture is matched by its own pattern", () => {
        const byName = (/** @type {string} */ a, /** @type {string} */ b) => a.localeCompare(b);
        expect(Object.keys(FIXTURES).sort(byName)).toEqual(PATTERNS.map((p) => p.name).sort(byName));
        for (const p of PATTERNS) {
            const v = classify(FIXTURES[p.name]);
            expect({ class: v.class, reason: v.reason }, p.name).toEqual({ class: p.class, reason: p.name });
        }
    });

    it("lists the patterns in class order", () => {
        const order = ["credential", "paid-capacity", "outside"];
        const ranks = PATTERNS.map((p) => order.indexOf(p.class));
        expect(ranks.every((r) => r >= 0)).toBe(true);
        expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    });

    it("finds runner loss in the log too, and only on a rented label", () => {
        // GPU job 106816696681, 2026-09-22: the shutdown is in the log only.
        const shutdown = job({
            workflow: "GPU",
            job: "Test (NVIDIA T4)",
            steps: ["Run node tests"],
            labels: RENTED,
            annotations: ["The operation was canceled."],
            log: "##[error]The runner has received a shutdown signal. This can happen when the runner service is stopped, or a manually started runner is canceled.",
        });
        expect(classify(shutdown).class).toBe("paid-capacity");
        // The same loss on a runner nobody pays for is an outage: re-run it.
        expect(classify({ ...shutdown, labels: ["gpu-linux-t4"] })).toMatchObject({
            class: "outside",
            reason: "runner lost mid-job",
        });
        // A hosted job with no steps is not runner loss on a paid label.
        expect(classify(job({ steps: [], labels: ["gpu-linux-t4"] })).class).toBe("own");
    });

    it("does not take a local connection reset or a non-auth 403 for an outside or credential failure", () => {
        // CI job 103414194732, 2026-09-11: remote-logger's own test server.
        expect(
            classify(job({ job: "Test (remote-logger)", log: "Serialized Error: { code: 'ECONNRESET' }" })).class,
        ).toBe("own");
        // Release job 103766297574, 2026-09-13: a version already on npm.
        const republish =
            "403 Forbidden - PUT https://registry.npmjs.org/@graphty%2fcompact-mantine - You cannot publish over the previously published versions: 0.7.0.";
        expect(classify(job({ log: republish })).class).toBe("own");
        // A test count is not an HTTP status.
        expect(classify(job({ log: "Tests  1 failed | 401 passed (402)" })).class).toBe("own");
    });

    it("tries credential before capacity, whatever the order of the texts", () => {
        const both = job({
            steps: ["Machine: Insufficient balance to run job."],
            labels: RENTED,
            log: "npm error code E401",
        });
        expect(classify(both).class).toBe("credential");
    });
});

describe("classes from facts", () => {
    const own = job({ job: "Test (graphty)", steps: ["Run tests"], files: ["graphty/src/App.tsx"] });

    it("orders inherited, shared, intermittent and own", () => {
        expect(classify(own).class).toBe("own");
        expect(classify(own, { intermittent: [classify(own).key] }).class).toBe("intermittent");
        expect(classify(own, { intermittent: ["other"], failsOnGreen: true }).class).toBe("shared");
        expect(classify(own, { others: 1, intermittent: [classify(own).key] }).class).toBe("shared");
        expect(classify(own, { masterRed: [classify(own).key], others: 3 }).class).toBe("inherited");
    });

    it("stops at class 3 on master: everything else waits for Claude's verdict", () => {
        const v = classify(own, {
            where: "master",
            masterRed: [classify(own).key],
            others: 5,
            intermittent: [classify(own).key],
        });
        expect(v.class).toBe("unclassified");
        // A package server's outage during an install is no incident against the code.
        expect(classify(FIXTURES["package server or mirror failed an install"], { where: "master" }).class).toBe(
            "outside",
        );
        for (const text of [
            "Err:5 http://archive.ubuntu.com/ubuntu noble InRelease Temporary failure resolving 'archive.ubuntu.com'",
            "curl: (6) Could not resolve host: registry.npmjs.org",
            "E: Failed to fetch http://azure.archive.ubuntu.com/ubuntu/dists/noble/InRelease 503 Service Unavailable",
        ]) {
            expect(classify(job({ steps: ["Install"], log: text }), { where: "master" }).class, text).toBe("outside");
        }
        // A failed fetch with no server error says nothing about the server.
        expect(classify(job({ log: "Failed to fetch https://example.test/x 200 OK" }), { where: "master" }).class).toBe(
            "unclassified",
        );
    });

    it("explains a shared verdict", () => {
        expect(classify(own, { others: 2 }).reason).toBe("the same key on 2 other open pull request(s)");
    });
});

describe("cannotAffect", () => {
    const audit = (/** @type {string[] | null | undefined} */ files) => job({ steps: ["Security audit"], files });
    const build = (/** @type {string[]} */ files) => job({ steps: ["Build docs"], files });

    it("puts an audit failure on master when no dependency file changed", () => {
        expect(cannotAffect(audit(["graphty/src/App.tsx", "README.md"]))).toBe(true);
        expect(classify(audit(["graphty/src/App.tsx"])).class).toBe("shared");
        for (const dep of ["pnpm-lock.yaml", "graphty/package.json", "pnpm-workspace.yaml", ".npmrc"]) {
            expect(cannotAffect(audit(["graphty/src/App.tsx", dep])), dep).toBe(false);
        }
    });

    it("puts a Build step failure on master when only design or agent files changed", () => {
        expect(cannotAffect(build(["design/githerd/githerd-design.md", ".claude/settings.json"]))).toBe(true);
        expect(cannotAffect(build(["design/x.md", "docs/index.md"]))).toBe(false);
        expect(cannotAffect(job({ job: "Build", steps: ["Lint affected (PR)"], files: [] }))).toBe(false);
        expect(cannotAffect(job({ job: "Test (graphty)", steps: ["Build docs"], files: [] }))).toBe(false);
    });

    it("decides nothing without a file list", () => {
        expect(cannotAffect(audit(null))).toBe(false);
        expect(cannotAffect(audit(undefined))).toBe(false);
        expect(cannotAffect(job({ steps: [], files: [] }))).toBe(false);
    });
});

describe("othersWithKey", () => {
    const at = Date.parse("2026-10-02T00:30:00Z");
    it("counts distinct other pull requests on the key inside the window", () => {
        const seen = [
            { key: "k", pr: 1, at: at - 60_000 },
            { key: "k", pr: 1, at: at - 120_000 },
            { key: "k", pr: 2, at: at - SHARED_WINDOW_MS },
            { key: "k", pr: 3, at: at - SHARED_WINDOW_MS - 1 },
            { key: "k", pr: 4, at: at + 1 },
            { key: "j", pr: 5, at },
            { key: "k", pr: 9, at },
        ];
        expect(othersWithKey(seen, { key: "k", pr: 9, at })).toBe(2);
        expect(othersWithKey([], { key: "k", pr: 9, at })).toBe(0);
    });
});

/** The `Set up job` section of a hosted runner's log, timestamps included. */
const SETUP = [
    "\uFEFF2026-10-02T02:32:20.5069320Z Current runner version: '2.337.0'",
    "2026-10-02T02:32:20.5077571Z Runner name: 'GitHub Actions 1000001'",
    "2026-10-02T02:32:20.5080459Z Machine name: 'runnervm1'",
    "2026-10-02T02:32:20.5081000Z ##[group]Operating System",
    "2026-10-02T02:32:20.5082000Z Ubuntu",
    "2026-10-02T02:32:20.5083000Z 24.04.3",
    "2026-10-02T02:32:20.5084000Z ##[group]Runner Image",
    "2026-10-02T02:32:20.5085000Z Image: ubuntu-24.04",
    "2026-10-02T02:32:20.5086000Z Version: 20250922.53.1",
    "2026-10-02T02:32:20.8440184Z Download action repository 'actions/checkout@v4' (SHA:11d5960a326750d5838078e36cf38b85af677262)",
    "2026-10-02T02:32:28.3170898Z Complete job name: Build",
    "2026-10-02T02:32:36.2063817Z git version 2.55.0",
].join("\n");

describe("setupDrift", () => {
    it("is empty between two runs on the same environment", () => {
        const other = SETUP.replace("GitHub Actions 1000001", "GitHub Actions 1000777").replaceAll("02:32", "09:10");
        expect(setupDrift(SETUP, other)).toEqual([]);
    });

    it("names the lines that changed in the Set up job section only", () => {
        const red = SETUP.replace("Version: 20250922.53.1", "Version: 20251001.12.2").replace(
            "git version 2.55.0",
            "git version 2.56.0",
        );
        expect(setupDrift(SETUP, red)).toEqual(["- Version: 20250922.53.1", "+ Version: 20251001.12.2"]);
    });

    it("is empty when either run has no log", () => {
        const blob =
            '\uFEFF<?xml version="1.0" encoding="utf-8"?><Error><Code>BlobNotFound</Code><Message>The specified blob does not exist.</Message></Error>';
        expect(setupDrift(SETUP, blob)).toEqual([]);
        expect(setupDrift(null, SETUP)).toEqual([]);
        expect(setupDrift(SETUP, undefined)).toEqual([]);
    });
});

describe("isNoLog", () => {
    it("recognizes the storage service's BlobNotFound document and nothing else", () => {
        // The log endpoint's answer for GPU job 110700310760 [PF 9.5].
        const body =
            '\uFEFF<?xml version="1.0" encoding="utf-8"?><Error><Code>BlobNotFound</Code><Message>The specified blob does not exist.\nRequestId:7ee33565-c01e-003b-1174-5374dc000000\nTime:2026-10-03T20:16:41.1944052Z</Message></Error>';
        expect(isNoLog(body)).toBe(true);
        expect(isNoLog(SETUP)).toBe(false);
    });
});
