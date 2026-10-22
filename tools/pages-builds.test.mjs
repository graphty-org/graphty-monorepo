// Tests of tools/pages-builds.sh, which copies builds deployed to beta.graphty.app into graphty-site (graphty.app),
// against a fake `gh` that keeps deploy-pages.yml's runs and their "github-pages" artifacts in a directory, and a
// local bare repository standing in for graphty-site. Also checks that the workflows call it the way it expects.
//
//   node tools/pages-builds.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./pages-builds.sh", import.meta.url));
const TMP = mkdtempSync(join(tmpdir(), "pages-builds-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

// The fake gh. runs.json lists deploy-pages.yml's runs newest first ({ id, sha, conclusion, expired }); a run that
// deployed has runs/<id>/artifact.tar. `compare` answers from compare.json ({ "<base>...<head>": status }).
const FAKE_GH = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const root = process.env.FAKE_GH_ROOT;
const args = process.argv.slice(2);
const opt = (name) => args[args.indexOf(name) + 1];
const runs = JSON.parse(fs.readFileSync(path.join(root, "runs.json"), "utf8"));
const jq = (value) => process.stdout.write(execFileSync("jq", ["-r", opt("--jq")], { input: JSON.stringify(value) }));
if (args[0] === "run" && args[1] === "list") {
    jq(runs.map((r) => ({ databaseId: r.id, conclusion: r.conclusion, displayTitle: "Deploy " + r.sha + " to beta.graphty.app" })));
} else if (args[0] === "run" && args[1] === "download") {
    fs.copyFileSync(path.join(root, "runs", args[2], "artifact.tar"), path.join(opt("-D"), "artifact.tar"));
} else if (args[0] === "api" && /\\/actions\\/runs\\/\\d+\\/artifacts$/.test(args[1])) {
    const run = runs.find((r) => String(r.id) === args[1].split("/")[5]);
    const has = fs.existsSync(path.join(root, "runs", String(run.id), "artifact.tar"));
    jq({ artifacts: has ? [{ id: 1, name: "github-pages", expired: Boolean(run.expired) }] : [] });
} else if (args[0] === "api" && args[1].includes("/compare/")) {
    const statuses = JSON.parse(fs.readFileSync(path.join(root, "compare.json"), "utf8"));
    jq({ status: statuses[args[1].split("/compare/")[1]] ?? "diverged" });
} else {
    console.error("fake gh: unexpected " + args.join(" "));
    process.exit(9);
}
`;

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);

const world = () => {
    const root = mkdtempSync(join(TMP, "world-"));
    mkdirSync(join(root, "bin"));
    writeFileSync(join(root, "bin/gh"), FAKE_GH, { mode: 0o755 });
    writeFileSync(join(root, "compare.json"), "{}");
    const runs = [];
    const save = () => writeFileSync(join(root, "runs.json"), JSON.stringify(runs));
    save();
    // graphty-site as it is before the first promotion: a README and a workflow, no site/
    const remote = join(root, "graphty-site.git");
    const git = (cwd, ...a) => execFileSync("git", a, { cwd, encoding: "utf8" });
    git(root, "init", "-q", "--bare", "-b", "main", remote);
    const seed = join(root, "seed");
    git(root, "clone", "-q", remote, seed);
    writeFileSync(join(seed, "README.md"), "graphty-site");
    git(seed, "add", "README.md");
    git(seed, "-c", "user.name=t", "-c", "user.email=t@t", "commit", "-q", "-m", "init");
    git(seed, "push", "-q", "origin", "HEAD:main");
    // A deploy run of <sha>: the site as tools/assemble-pages-site.sh lays it out, with one dataset of its own
    // (and every older run's: the datasets are append-only), packed as actions/upload-pages-artifact packs it.
    const deploy = (sha, { conclusion = "success", artifact = true, expired = false } = {}) => {
        const id = 1000 + runs.length;
        const site = join(root, `site-${id}`);
        mkdirSync(join(site, "data/graph-samples/v1"), { recursive: true });
        mkdirSync(join(site, "docs"), { recursive: true });
        writeFileSync(join(site, "index.html"), `<meta name="graphty-build" content="commit=${sha} release=x" />`);
        writeFileSync(join(site, "docs/index.html"), `docs ${sha}`);
        writeFileSync(join(site, `docs/only-${sha.slice(0, 4)}.html`), sha);
        writeFileSync(join(site, "data/graph-samples/v1/index.json"), `["${sha}"]`);
        writeFileSync(join(site, `data/graph-samples/v1/${sha.slice(0, 4)}.gsnp.gz`), sha);
        if (artifact) {
            mkdirSync(join(root, "runs", String(id)), { recursive: true });
            execFileSync("tar", ["-cf", join(root, "runs", String(id), "artifact.tar"), "-C", site, "."]);
        }
        runs.unshift({ id, sha, conclusion, expired });
        save();
        return id;
    };
    const run = (...a) =>
        spawnSync("bash", [SCRIPT, ...a], {
            cwd: root,
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${join(root, "bin")}:${process.env.PATH}`,
                FAKE_GH_ROOT: root,
                SITE_REMOTE: remote,
            },
        });
    // graphty-site's main as it is now
    const site = () => {
        const dir = mkdtempSync(join(root, "check-"));
        git(root, "clone", "-q", remote, dir);
        return {
            dir,
            read: (p) => readFileSync(join(dir, "site", p), "utf8"),
            has: (p) => existsSync(join(dir, "site", p)),
            log: () => git(dir, "log", "--format=%s").trim().split("\n"),
        };
    };
    return { root, run, deploy, site, compare: (s) => writeFileSync(join(root, "compare.json"), JSON.stringify(s)) };
};

describe("tools/pages-builds.sh", () => {
    it("finds a deployed build by newest or a commit prefix, and refuses anything else", () => {
        const w = world();
        const a = w.deploy(A);
        w.deploy(B, { artifact: false }); // a re-run that found B live already: nothing uploaded
        const b = w.deploy(B);
        w.deploy(C, { conclusion: "failure" });
        w.deploy("d".repeat(40), { expired: true });
        assert.equal(w.run("find", "newest").stdout.trim(), `${b} ${B}`);
        assert.equal(w.run("find", "aaaaaaa").stdout.trim(), `${a} ${A}`);
        assert.match(w.run("find", "ccccccc").stderr, /no deployed beta build 'ccccccc'/, "a failed deploy");
        assert.match(w.run("find", "ddddddd").stderr, /no deployed beta build/, "an expired artifact");
        const bad = w.run("find", "main");
        assert.equal(bad.status, 1);
        assert.match(bad.stderr, /not a build: 'main'/);
    });

    it("promotes a build as one commit, keeping the datasets graphty.app already has", () => {
        const w = world();
        w.deploy(A);
        w.deploy(B);
        let out = w.run("promote", "bbbbbbb");
        assert.equal(out.status, 0, out.stderr);
        let s = w.site();
        assert.match(s.read("index.html"), new RegExp(`commit=${B}`));
        out = w.run("promote", "aaaaaaa"); // a rollback
        assert.equal(out.status, 0, out.stderr);
        s = w.site();
        assert.match(s.read("index.html"), new RegExp(`commit=${A}`));
        assert.ok(!s.has("docs/only-bbbb.html"), "the rolled-back build's pages are gone");
        assert.ok(s.has("docs/only-aaaa.html"));
        assert.ok(s.has("data/graph-samples/v1/bbbb.gsnp.gz"), "a dataset graphty.app had stays");
        assert.ok(s.has("data/graph-samples/v1/aaaa.gsnp.gz"));
        assert.ok(existsSync(join(s.dir, "README.md")), "only site/ is replaced");
        assert.deepEqual(s.log(), [
            `Promote aaaaaaaaaaaa to graphty.app`,
            `Promote bbbbbbbbbbbb to graphty.app`,
            "init",
        ]);
        assert.match(w.run("promote", "aaaaaaa").stdout, /nothing to commit/, "promoting the same build again");
        assert.equal(w.site().log().length, 3);
    });

    it("makes the commit but does not push it on a dry run", () => {
        const w = world();
        w.deploy(A);
        const out = w.run("promote", "newest", "--dry-run");
        assert.equal(out.status, 0, out.stderr);
        assert.match(out.stdout, /dry run: not pushed/);
        assert.deepEqual(w.site().log(), ["init"]);
    });

    it("brings only the hosted datasets for a release, and nothing before the first promotion", () => {
        const w = world();
        w.deploy(A);
        let out = w.run("data", A);
        assert.equal(out.status, 0, out.stderr);
        assert.match(out.stdout, /nothing is promoted to graphty-site yet/);
        assert.deepEqual(w.site().log(), ["init"]);
        assert.equal(w.run("promote", "newest").status, 0);
        w.deploy(B);
        out = w.run("data", B);
        assert.equal(out.status, 0, out.stderr);
        const s = w.site();
        assert.match(s.read("index.html"), new RegExp(`commit=${A}`), "the promoted build stays");
        assert.ok(!s.has("docs/only-bbbb.html"));
        assert.ok(s.has("data/graph-samples/v1/bbbb.gsnp.gz"), "the release's new dataset");
        assert.ok(s.has("data/graph-samples/v1/aaaa.gsnp.gz"));
        assert.equal(s.read("data/graph-samples/v1/index.json"), `["${B}"]`);
        assert.equal(s.log()[0], "Hosted data of bbbbbbbbbbbb for a release");
        assert.match(w.run("data", B).stdout, /nothing to commit/);
    });

    it("takes a newer build's datasets when the release's commit has no build of its own, never an older one's", () => {
        const w = world();
        w.deploy(A);
        assert.equal(w.run("promote", "newest").status, 0);
        w.deploy(C);
        w.compare({ [`${B}...${C}`]: "ahead" });
        let out = w.run("data", B);
        assert.equal(out.status, 0, out.stderr);
        assert.ok(w.site().has("data/graph-samples/v1/cccc.gsnp.gz"));
        w.compare({ [`${B}...${C}`]: "behind" });
        out = w.run("data", B);
        assert.equal(out.status, 1);
        assert.match(out.stderr, /no deployed beta build holds b{40} yet/);
    });
});

describe("the workflows call it", () => {
    const wf = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");

    it("deploy-pages.yml deploys every green master build to this repository's Pages and writes nowhere else", () => {
        const deploy = wf("deploy-pages.yml");
        assert.match(
            deploy,
            /github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push'/,
        );
        assert.match(deploy, /^run-name: Deploy \$\{\{ github.event.workflow_run.head_sha \}\} to beta.graphty.app$/m);
        assert.match(
            deploy,
            /uses: actions\/upload-pages-artifact@v3\n\s+with:\n\s+path: \.\/public\n(\s+#.*\n)?\s+retention-days: 90/,
        );
        assert.match(deploy, /uses: actions\/deploy-pages@v4/);
        assert.doesNotMatch(
            deploy,
            /GRAPHTY_PAGES_APP|create-github-app-token|SITE_TOKEN/,
            "no cross-repository token",
        );
    });

    it("promote-pages.yml is run by hand, or by the release for the hosted data, and writes only through pages-builds.sh", () => {
        const promote = wf("promote-pages.yml");
        assert.match(promote, /workflow_dispatch:/);
        assert.match(promote, /workflow_call:/);
        assert.match(promote, /repositories: graphty-site\n/);
        assert.match(promote, /run: tools\/pages-builds.sh "\$MODE" "\$BUILD" \$\{DRY:\+--dry-run\}/);
        assert.doesNotMatch(promote, /deploy-pages@|pages: write/, "graphty-site deploys itself");
        const release = wf("release.yml");
        assert.match(
            release,
            /uses: \.\/\.github\/workflows\/promote-pages.yml\n\s+with:\n\s+build: \$\{\{ needs.pick.outputs.sha \}\}\n\s+data_only: true/,
        );
    });
});
