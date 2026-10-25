// Tests of tools/check-owned-closure.mjs, the owned-closure rule of .github/CODEOWNERS: the pattern
// matching, the walk from owned files over a throwaway repository, and the replay of its commits.
//
//   node --test tools/check-owned-closure.test.mjs
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { isOwned, parseCodeowners, replay, unownedClosure, withoutComments } from "./check-owned-closure.mjs";
import { isolatedGitEnv } from "./isolated-git-env.mjs";

// the code under test runs git itself, so the whole process gets the isolated environment
const env = isolatedGitEnv();
for (const k of Object.keys(process.env).filter((k) => !(k in env))) {
    delete process.env[k];
}
Object.assign(process.env, env);

const scratch = mkdtempSync(join(tmpdir(), "owned-closure-test-"));
after(() => rmSync(scratch, { recursive: true, force: true }));

describe("parseCodeowners", () => {
    const rules = parseCodeowners(
        [
            "# a comment line",
            "/tools/results/ @o",
            "/nx.json @o # trailing comment",
            "**/.storybook/vitest.setup.* @o",
            "/.github/workflows/ @o",
        ].join("\n"),
    );
    it("owns a directory's files at any depth, and nothing that only shares its prefix", () => {
        assert.equal(isOwned(rules, "tools/results/run-group.mjs"), true);
        assert.equal(isOwned(rules, "tools/results/deep/x.mjs"), true);
        assert.equal(isOwned(rules, "tools/results-service/x.mjs"), false);
    });
    it("anchors a leading slash at the root", () => {
        assert.equal(isOwned(rules, "nx.json"), true);
        assert.equal(isOwned(rules, "graphty/nx.json"), false);
    });
    it("matches ** at any depth and * within one name", () => {
        assert.equal(isOwned(rules, "graphty/.storybook/vitest.setup.ts"), true);
        assert.equal(isOwned(rules, "graphty-element/.storybook/vitest.setup.mjs"), true);
        assert.equal(isOwned(rules, "graphty/.storybook/preview.ts"), false);
    });
});

// A repository: path -> contents, committed.
function repo(name, files) {
    const root = join(scratch, name);
    for (const [path, text] of Object.entries(files)) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), text);
    }
    const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8" }).trim();
    git("init", "-q", "-b", "master");
    git("add", ".");
    git("commit", "-q", "-m", "init");
    return { root, git };
}

const FILES = {
    ".github/workflows/ci.yml":
        "jobs:\n  a:\n    steps:\n      - run: node tools/a.mjs\n      # - run: node tools/commented.mjs\n",
    ".claude/settings.json": '{ "command": "node \\"$CLAUDE_PROJECT_DIR/tools/hook.mjs\\"" }\n',
    ".claude/workflows/w.js": 'const prompt = "run tools/prompted.mjs";\n',
    "tools/a.mjs": 'import { b } from "./b.mjs";\n// tools/in-comment.mjs\nconst rules = "tools/data.json";\n',
    "tools/b.mjs": 'export const b = 1;\nconst tests = "tools/b.test.mjs";\nconst pkg = "pkg/package.json";\n',
    "tools/data.json": '{ "why": "see tools/from-data.mjs" }\n',
    "tools/hook.mjs": "",
    "tools/commented.mjs": "",
    "tools/in-comment.mjs": "",
    "tools/prompted.mjs": "",
    "tools/from-data.mjs": "",
    "tools/b.test.mjs": "",
    "pkg/package.json": "{}\n",
};

describe("unownedClosure", () => {
    it("names what owned files import or run, and nothing in comments, prompts, data, tests or package.json", () => {
        const { root } = repo("walk", FILES);
        const rules = parseCodeowners("/.github/workflows/ @o\n/.claude/ @o\n");
        const unowned = unownedClosure(root, rules);
        assert.deepEqual([...unowned.keys()].sort(), [
            "tools/a.mjs",
            "tools/b.mjs",
            "tools/data.json",
            "tools/hook.mjs",
        ]);
        assert.deepEqual(unowned.get("tools/b.mjs"), { from: ".github/workflows/ci.yml", via: "tools/a.mjs" });
    });
    it("passes once the list owns what it named, and an owned JSON file starts a walk of its own", () => {
        const { root } = repo("owned", FILES);
        const list =
            "/.github/workflows/ @o\n/.claude/ @o\n/tools/a.mjs @o\n/tools/b.mjs @o\n/tools/data.json @o\n/tools/hook.mjs @o\n";
        assert.deepEqual([...unownedClosure(root, parseCodeowners(list)).keys()], ["tools/from-data.mjs"]);
        const rules = parseCodeowners(`${list}/tools/from-data.mjs @o\n`);
        assert.equal(unownedClosure(root, rules).size, 0);
    });
});

describe("unownedClosure, root paths", () => {
    it("reads nx's {workspaceRoot}/ and a trailing full stop as the checkout's root", () => {
        const { root } = repo("root-paths", {
            "nx.json": '{ "inputs": ["{workspaceRoot}/root.config.js"] }\n',
            "root.config.js": "",
            ".github/workflows/w.yml": "run: node tools/x.sh.\n",
            "tools/x.sh": "",
        });
        const unowned = unownedClosure(root, parseCodeowners("/nx.json @o\n/.github/workflows/ @o\n"));
        assert.deepEqual([...unowned.keys()].sort(), ["root.config.js", "tools/x.sh"]);
    });
});

describe("unownedClosure, working-directory", () => {
    it("resolves a workflow's paths from its working-directory, in flow and block style", () => {
        const { root } = repo("working-dir", {
            ".github/workflows/w.yml":
                "jobs:\n  a:\n    defaults: { run: { working-directory: pkg, shell: bash } }\n" +
                "    steps:\n      - run: node scripts/shard.js\n" +
                "      - working-directory: './other//'\n        run: bash scripts/b.sh\n",
            "pkg/scripts/shard.js": "",
            "other/scripts/b.sh": "",
        });
        const unowned = unownedClosure(root, parseCodeowners("/.github/workflows/ @o\n"));
        assert.deepEqual([...unowned.keys()].sort(), ["other/scripts/b.sh", "pkg/scripts/shard.js"]);
    });
});

describe("withoutComments", () => {
    it("keeps a JS string that holds a glob or a URL, and removes real comments", () => {
        const text =
            'const g = ["src/*.ts", "x/**"];\nconst u = "https://a"; // gone\n/* gone */ run("tools/kept.mjs");\n';
        assert.equal(
            withoutComments("a.mjs", text),
            'const g = ["src/*.ts", "x/**"];\nconst u = "https://a"; \n run("tools/kept.mjs");\n',
        );
    });
});

describe("replay", () => {
    it("counts the first-parent commits whose change touches an owned path", () => {
        const { root, git } = repo("replay", { "nx.json": "{}\n", "src/x.ts": "" });
        writeFileSync(join(root, "src/x.ts"), "export {};\n");
        git("commit", "-q", "-am", "unowned change");
        writeFileSync(join(root, "nx.json"), '{ "a": 1 }\n');
        git("commit", "-q", "-am", "owned change");
        const { total, owned } = replay(root, parseCodeowners("/nx.json @o\n"), {
            ref: "HEAD",
            since: "1970-01-01",
            until: "2038-01-01",
        });
        assert.equal(total, 3);
        assert.deepEqual(
            owned.map((o) => [o.subject, o.files]),
            [["owned change", ["nx.json"]]],
        );
    });
});
