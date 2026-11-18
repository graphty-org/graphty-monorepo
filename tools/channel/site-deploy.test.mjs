// Tests of the site repositories' deploy: the hash check (site-deploy.mjs), the workflow's order of
// steps (site-deploy.yml) and nightly's site configuration. Run: node tools/channel/site-deploy.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { parseDeployed } from "./site-deploy.mjs";

const script = fileURLToPath(new URL("site-deploy.mjs", import.meta.url));
const workflow = readFileSync(new URL("site-deploy.yml", import.meta.url), "utf8");
const dir = mkdtempSync(join(tmpdir(), "site-deploy-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const asset = join(dir, "site.tar.zst");
writeFileSync(asset, "the site tarball's bytes");
const assetSha = createHash("sha256").update("the site tarball's bytes").digest("hex");

const valid = {
    site: "nightly",
    tag: `site-${"a".repeat(40)}`,
    sha256: assetSha,
    configRef: "b".repeat(40),
    time: "2026-10-24T12:00:00Z",
    approver: "auto",
};

function check(deployed) {
    const path = join(dir, "deployed.json");
    writeFileSync(path, typeof deployed === "string" ? deployed : JSON.stringify(deployed));
    return spawnSync(process.execPath, [script, "check", path, asset], { encoding: "utf8" });
}

describe("site-deploy.mjs check", () => {
    it("passes an asset whose sha256 is deployed.json's", () => {
        const r = check(valid);
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.stdout, /matches deployed\.json/);
    });

    it("refuses an asset whose sha256 differs (a replaced release asset)", () => {
        const r = check({ ...valid, sha256: "c".repeat(64) });
        assert.equal(r.status, 1);
        assert.match(r.stderr, new RegExp(`refused: .* has sha256 ${assetSha}, deployed.json names c{64}`));
    });

    it("refuses a deployed.json that is not JSON or misses a field", () => {
        assert.equal(check("{not json").status, 1);
        const r = check({ ...valid, configRef: undefined, site: "canary" });
        assert.equal(r.status, 1);
        assert.match(r.stderr, /site must be one of nightly, production/);
        assert.match(r.stderr, /configRef undefined/);
    });

    it("refuses a tag that is not site-<commit> and an upper-case hash", () => {
        assert.throws(() => parseDeployed(JSON.stringify({ ...valid, tag: "graphty@1.0.0" })), /tag/);
        assert.throws(() => parseDeployed(JSON.stringify({ ...valid, sha256: assetSha.toUpperCase() })), /sha256/);
    });

    it("prints its usage and exits 2 without arguments", () => {
        assert.equal(spawnSync(process.execPath, [script], { encoding: "utf8" }).status, 2);
    });
});

describe("site-deploy.yml", () => {
    const at = (text) => {
        const i = workflow.indexOf(text);
        assert.notEqual(i, -1, `the workflow holds ${text}`);
        return i;
    };

    it("checks the hash after the download and before anything is unpacked or uploaded", () => {
        const download = at("gh release download");
        const hashCheck = at("site-deploy.mjs check deployed.json asset/site.tar.zst");
        assert.ok(download < hashCheck);
        assert.ok(hashCheck < at("tar --zstd -xf"));
        assert.ok(hashCheck < at("actions/upload-pages-artifact"));
    });

    it("deploys nothing on a dry run, which is a dispatch's default", () => {
        assert.match(workflow, /dry_run:\n(?:\s+\w+:.*\n)*?\s+default: true/);
        assert.match(workflow, /if: \$\{\{ env\.DRY_RUN != 'true' \}\}\n\s+uses: actions\/upload-pages-artifact/);
        assert.match(workflow, /deploy:\n(?:.*\n){0,3}\s+if: \$\{\{ inputs\.dry_run != true \}\}/);
        assert.match(workflow, /report:\n(?:.*\n){0,3}\s+if: \$\{\{ always\(\) && inputs\.dry_run != true \}\}/);
    });

    it("runs on a push of deployed.json and gives every job a hang guard", () => {
        assert.match(workflow, /push:\n\s+branches: \[main\]\n\s+paths: \[deployed\.json\]/);
        const jobs = workflow.slice(at("\njobs:"));
        assert.equal((jobs.match(/^ {4}\w+:$/gm) ?? []).length, 3);
        assert.equal((jobs.match(/timeout-minutes: \d+/g) ?? []).length, 3);
    });

    // The report step's shell, run with a curl that hands out an OIDC token and records the POST.
    const report = workflow.slice(at("    report:"));
    const reportScript = report.slice(report.indexOf("run: |\n") + "run: |\n".length).replace(/^ {18}/gm, "");
    function runReport(curlExit = 0, extra = {}) {
        const bin = mkdtempSync(join(dir, "bin-"));
        const posted = join(bin, "posted");
        writeFileSync(
            join(bin, "curl"),
            `#!/bin/bash\necho "$*" >> ${JSON.stringify(`${posted}.all`)}\n` +
                `case "$*" in *audience=graphty-results*) echo '{"value":"oidc-token"}';; ` +
                `*audience=graphty-health*) echo '{"value":"health-token"}';; *health.example*) exit ${curlExit};; ` +
                `*) printf '%s\\n' "$@" > ${JSON.stringify(posted)}; exit ${curlExit};; esac\n`,
            { mode: 0o755 },
        );
        const env = {
            PATH: `${bin}:${process.env.PATH}`,
            RESULTS_URL: "https://results.example",
            ACTIONS_ID_TOKEN_REQUEST_URL: "https://token.example/?x=1",
            ACTIONS_ID_TOKEN_REQUEST_TOKEN: "request-token",
            SITE: "nightly",
            TAG: valid.tag,
            STARTED: String(Date.now() - 1000),
            CHECK: "success",
            DEPLOY: "failure",
            GITHUB_RUN_ID: "4242",
            GITHUB_RUN_ATTEMPT: "2",
            ...extra,
        };
        const r = spawnSync("bash", ["-e", "-c", reportScript], { encoding: "utf8", env });
        let args = [];
        try {
            args = readFileSync(posted, "utf8").trim().split("\n");
        } catch {
            // nothing was posted
        }
        let all = "";
        try {
            all = readFileSync(`${posted}.all`, "utf8");
        } catch {
            // curl was never called
        }
        return { ...r, args, all };
    }

    it("reports each job's result to the store's durations, which a site repository may write", () => {
        const r = runReport();
        assert.equal(r.status, 0, r.stderr);
        assert.ok(r.args.includes("https://results.example/v1/durations"), r.args.join(" "));
        assert.ok(r.args.includes("Authorization: Bearer oidc-token"));
        const body = JSON.parse(r.args[r.args.indexOf("--data") + 1]);
        assert.deepEqual(
            body.rows.map((row) => [row.job, row.conclusion]),
            [
                ["check", "success"],
                ["deploy", "failure"],
            ],
        );
        for (const row of body.rows) {
            assert.equal(row.runId, 4242);
            assert.equal(row.attempt, 2);
            assert.equal(row.workflow, "deploy.yml");
            assert.equal(row.task, "nightly");
            assert.equal(row.sha, "a".repeat(40));
            assert.equal(typeof row.ms, "number");
            assert.ok(row.ms >= 1000);
        }
    });

    it("fails open when the store does not take the report", () => {
        const r = runReport(22);
        assert.equal(r.status, 0, r.stderr);
        assert.match(r.stdout, /::warning::the results store did not take the deploy report/);
    });

    it("sends the same report to the pipeline health API with its own token, failing open", () => {
        assert.doesNotMatch(runReport().all, /graphty-health/, "no health API configured: no call there");
        for (const exit of [0, 22]) {
            const r = runReport(exit, { HEALTH_API_URL: "https://health.example/" });
            assert.equal(r.status, 0, r.stderr);
            assert.match(r.all, /audience=graphty-health/);
            assert.match(r.all, /Authorization: Bearer health-token .*https:\/\/health.example\/v1\/durations/);
            assert.match(r.all, /https:\/\/results.example\/v1\/durations/, "the store still gets its report");
        }
    });
});

describe("graphty/sites/nightly.json", () => {
    const config = JSON.parse(readFileSync(new URL("../../graphty/sites/nightly.json", import.meta.url), "utf8"));

    it("names the nightly site, its own datasets and no experiment yet", () => {
        assert.deepEqual(config, {
            site: "nightly",
            features: [],
            datasets: "https://nightly.graphty.app/data/graph-samples/v1/",
            sentryEnvironment: "nightly",
        });
    });
});
