// Tests of tools/pages-builds.sh, the beta builds behind beta.graphty.app and graphty.app's promotion,
// against a fake `gh` that keeps graphty-beta's releases in a directory, and a graphty.app page read
// from a file. Also checks that the workflows call it the way it expects.
//
//   node tools/pages-builds.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const SCRIPT = fileURLToPath(new URL("./pages-builds.sh", import.meta.url));
const TMP = mkdtempSync(join(tmpdir(), "pages-builds-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

// The fake gh: a release is a directory under releases/, numbered in the order it was made, so the
// listing is newest first like the real one; every dispatch is appended to dispatches.
const FAKE_GH = `#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");
const root = process.env.FAKE_GH_ROOT;
const rels = path.join(root, "releases");
fs.mkdirSync(rels, { recursive: true });
const args = process.argv.slice(2);
const dirOf = (tag) => fs.readdirSync(rels).find((d) => d.replace(/^\\d+-/, "") === tag);
if (args[0] === "api") {
    fs.appendFileSync(path.join(root, "dispatches"), args.slice(1).join(" ") + "\\n");
    process.exit(0);
}
const [, verb, tag] = args;
const opt = (name) => args[args.indexOf(name) + 1];
const positional = () => {
    const out = [];
    for (let i = 3; i < args.length; i++) {
        if (args[i] === "--clobber" || args[i] === "--latest" || args[i] === "--yes" || args[i] === "--cleanup-tag") continue;
        if (args[i].startsWith("-")) { i++; continue; }
        out.push(args[i]);
    }
    return out;
};
switch (verb) {
    case "list":
        for (const d of fs.readdirSync(rels).sort().reverse()) console.log(d.replace(/^\\d+-/, ""));
        break;
    case "view":
        process.exit(dirOf(tag) ? 0 : 1);
    case "create": {
        const counter = path.join(root, "counter");
        const n = fs.existsSync(counter) ? Number(fs.readFileSync(counter, "utf8")) + 1 : 1;
        fs.writeFileSync(counter, String(n));
        const dir = path.join(rels, String(n).padStart(6, "0") + "-" + tag);
        fs.mkdirSync(dir);
        for (const f of positional()) fs.copyFileSync(f, path.join(dir, path.basename(f)));
        fs.appendFileSync(path.join(root, "log"), "create " + tag + "\\n");
        break;
    }
    case "upload":
        for (const f of positional()) fs.copyFileSync(f, path.join(rels, dirOf(tag), path.basename(f)));
        fs.appendFileSync(path.join(root, "log"), "upload " + tag + "\\n");
        break;
    case "delete":
        fs.rmSync(path.join(rels, dirOf(tag)), { recursive: true });
        break;
    case "download": {
        const pattern = new RegExp("^" + opt("-p").replace(/\\./g, "\\\\.").replace(/\\*/g, ".*") + "$");
        fs.mkdirSync(opt("-D"), { recursive: true });
        for (const f of fs.readdirSync(path.join(rels, dirOf(tag)))) {
            if (pattern.test(f)) fs.copyFileSync(path.join(rels, dirOf(tag), f), path.join(opt("-D"), f));
        }
        break;
    }
    default:
        console.error("fake gh: unexpected " + args.join(" "));
        process.exit(9);
}
`;

const A = "a".repeat(40);
const B = "b".repeat(40);
const C = "c".repeat(40);

const world = (keep = 1) => {
    const root = mkdtempSync(join(TMP, "world-"));
    mkdirSync(join(root, "bin"));
    writeFileSync(join(root, "bin/gh"), FAKE_GH, { mode: 0o755 });
    const live = join(root, "live.html");
    const setLive = (sha) =>
        writeFileSync(
            live,
            `<head>\n    <meta name="graphty-build" content="commit=${sha} release=graphty@1.0.0" />\n</head>`,
        );
    const run = (...args) =>
        spawnSync("bash", [SCRIPT, ...args], {
            cwd: root,
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${join(root, "bin")}:${process.env.PATH}`,
                FAKE_GH_ROOT: root,
                LIVE_URL: `file://${live}`,
                KEEP: String(keep),
            },
        });
    // A site as tools/assemble-pages-site.sh lays it out, with one dataset of its own.
    const build = (sha) => {
        const site = join(root, `site-${sha}`);
        mkdirSync(join(site, "data/graph-samples/v1"), { recursive: true });
        mkdirSync(join(site, "docs"), { recursive: true });
        writeFileSync(join(site, "index.html"), `app ${sha}`);
        writeFileSync(join(site, "docs/index.html"), `docs ${sha}`);
        writeFileSync(join(site, "data/graph-samples/v1/index.json"), `["${sha}"]`);
        writeFileSync(join(site, `data/graph-samples/v1/${sha.slice(0, 4)}.gsnp.gz`), sha);
        assert.equal(run("pack", site, join(root, `out-${sha}`)).status, 0);
        writeFileSync(join(root, "notes.md"), "notes");
        return run("publish", sha, join(root, `out-${sha}`), join(root, "notes.md"));
    };
    return { root, run, build, setLive };
};

describe("tools/pages-builds.sh", () => {
    it("keeps the newest builds and the one graphty.app serves, and deploys each new one to beta", () => {
        const w = world();
        w.setLive(A);
        for (const sha of [A, B, C]) assert.equal(w.build(sha).status, 0);
        const left = readdirSync(join(w.root, "releases")).map((d) => d.replace(/^\d+-/, ""));
        assert.deepEqual(
            left.sort(),
            [`build-${A}`, `build-${C}`],
            "B is pruned; A stays because graphty.app serves it",
        );
        const dispatches = readFileSync(join(w.root, "dispatches"), "utf8").trim().split("\n");
        assert.deepEqual(
            dispatches.map((d) => d.match(/client_payload\[tag\]=(\S+)/)[1]),
            [`build-${A}`, `build-${B}`, `build-${C}`],
        );
        assert.match(dispatches[0], /^repos\/graphty-org\/graphty-beta\/dispatches -f event_type=deploy /);
    });

    it("refreshes a build that already has a release instead of making a second", () => {
        const w = world();
        w.setLive(A);
        assert.equal(w.build(A).status, 0);
        assert.equal(w.build(A).status, 0);
        assert.equal(readFileSync(join(w.root, "log"), "utf8"), `create build-${A}\nupload build-${A}\n`);
    });

    it("names a build by newest, live, a commit prefix or its tag, and refuses anything else", () => {
        const w = world(10);
        w.setLive(A);
        for (const sha of [A, B, C]) assert.equal(w.build(sha).status, 0);
        assert.equal(w.run("resolve", "newest").stdout.trim(), `build-${C}`);
        assert.equal(w.run("resolve", "live").stdout.trim(), `build-${A}`);
        assert.equal(w.run("resolve", "bbbbbbb").stdout.trim(), `build-${B}`);
        assert.equal(w.run("resolve", `build-${B}`).stdout.trim(), `build-${B}`);
        const missing = w.run("resolve", "1234567");
        assert.equal(missing.status, 1);
        assert.match(missing.stderr, /no beta build '1234567'/);
        assert.match(w.run("resolve", "main").stderr, /not a build: 'main'/);
        w.setLive("d".repeat(40));
        assert.match(w.run("resolve", "live").stderr, /which is not a beta build; promote a beta build first/);
    });

    it("composes a promoted build with the datasets of every newer build", () => {
        const w = world(10);
        w.setLive(A);
        for (const sha of [A, B, C]) assert.equal(w.build(sha).status, 0);
        const out = join(w.root, "public");
        const composed = w.run("compose", "aaaaaaa", out);
        assert.equal(composed.status, 0, composed.stderr);
        assert.equal(composed.stdout.trim(), `build-${A}`);
        assert.equal(readFileSync(join(out, "index.html"), "utf8"), `app ${A}`);
        assert.equal(readFileSync(join(out, "docs/index.html"), "utf8"), `docs ${A}`);
        const data = join(out, "data/graph-samples/v1");
        assert.ok(existsSync(join(data, "aaaa.gsnp.gz")), "the promoted build's own dataset");
        assert.ok(existsSync(join(data, "cccc.gsnp.gz")), "the newest build's dataset");
        assert.equal(readFileSync(join(data, "index.json"), "utf8"), `["${C}"]`, "the newest index");
    });
});

describe("the workflows call it", () => {
    const wf = (name) => readFileSync(new URL(`../.github/workflows/${name}`, import.meta.url), "utf8");

    it("deploy-pages.yml publishes every green master build to graphty-beta and refreshes graphty.app's datasets", () => {
        const deploy = wf("deploy-pages.yml");
        assert.match(
            deploy,
            /github.event.workflow_run.conclusion == 'success' && github.event.workflow_run.event == 'push'/,
        );
        assert.match(deploy, /GH_TOKEN: \$\{\{ secrets.GRAPHTY_BETA_TOKEN \}\}/);
        assert.match(deploy, /tools\/pages-builds.sh publish "\$SHA"/);
        assert.match(deploy, /uses: \.\/\.github\/workflows\/promote-pages.yml\n\s+with:\n\s+build: live/);
        assert.doesNotMatch(deploy, /actions\/deploy-pages/, "graphty.app is deployed only through promote-pages.yml");
    });

    it("promote-pages.yml is run by hand and deploys only what pages-builds.sh composed", () => {
        const promote = wf("promote-pages.yml");
        assert.match(promote, /workflow_dispatch:/);
        assert.match(promote, /workflow_call:/);
        assert.match(promote, /tools\/pages-builds.sh compose "\$BUILD" \.\/public/);
        assert.match(promote, /if: \$\{\{ !inputs.dry_run \}\}/);
    });
});
