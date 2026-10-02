import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { splitCommands } from "../lib/shellwords.mjs";

const GUARD = fileURLToPath(new URL("../bin/githerd-guard.mjs", import.meta.url));
const PROTECTED = [
    "visual-baselines/",
    ".github/",
    "githerd/",
    "githerd.config.json",
    ".mcp.json",
    ".claude/",
    "CLAUDE.md",
];

let base;
/** A run directory and working tree with no merge in progress. */
let plain;
/** A pr-conflict run whose working tree is mid-merge (a worktree-style `.git` file). */
let merging;

/**
 * Makes a run directory and its working tree.
 * @param {string} name a directory name
 * @param {string} kind the run kind
 * @param {boolean} merge whether a merge is in progress
 * @returns {{runDir: string, root: string}} the paths
 */
function makeRun(name, kind, merge) {
    const runDir = join(base, name, "run");
    const root = join(base, name, "work");
    mkdirSync(runDir, { recursive: true });
    mkdirSync(root, { recursive: true });
    if (merge) {
        const gitdir = join(base, name, "gitdir");
        mkdirSync(gitdir);
        writeFileSync(join(gitdir, "MERGE_HEAD"), "0123456789abcdef0123456789abcdef01234567\n");
        writeFileSync(join(root, ".git"), `gitdir: ${gitdir}\n`);
    } else {
        mkdirSync(join(root, ".git"));
    }
    writeFileSync(join(runDir, "guard.json"), JSON.stringify({ kind, root, protectedPaths: PROTECTED }));
    return { runDir, root };
}

/**
 * Runs the guard on one hook input.
 * @param {{runDir: string, root: string} | null} run the run, or null for no GITHERD_RUN_DIR
 * @param {string | object} input the hook input, or raw stdin text
 * @returns {{status: number | null, stderr: string}} the result
 */
function guard(run, input) {
    const env = { PATH: process.env.PATH };
    if (run) env.GITHERD_RUN_DIR = run.runDir;
    const stdin =
        typeof input === "string" ? input : JSON.stringify({ cwd: run?.root, hook_event_name: "PreToolUse", ...input });
    const r = spawnSync(process.execPath, [GUARD], { input: stdin, env, encoding: "utf8", timeout: 20000 });
    return { status: r.status, stderr: r.stderr };
}

/**
 * Runs the guard on one Bash command.
 * @param {{runDir: string, root: string}} run the run
 * @param {string} command a Bash command
 * @returns {{status: number | null, stderr: string}} the result
 */
const bash = (run, command) => guard(run, { tool_name: "Bash", tool_input: { command } });

beforeAll(() => {
    base = mkdtempSync(join(tmpdir(), "githerd-guard-"));
    plain = makeRun("plain", "pr-fix", false);
    merging = makeRun("merging", "pr-conflict", true);
    writeFileSync(join(plain.root, "msg-attributed.txt"), "fix: x\n\nCo-Authored-By: Someone <a@b.c>\n");
    writeFileSync(join(plain.root, "msg-clean.txt"), "fix: x\n");
});

afterAll(() => {
    rmSync(base, { recursive: true, force: true });
});

const SIGNED_ATTRIBUTION = `git commit -S -m "$(cat <<'EOF'
fix: x

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"`;

/** Bash commands denied in a pr-fix run with no merge in progress. */
const DENIED = [
    // every git push spelling
    "git push",
    "git push origin HEAD",
    "git push --force-with-lease origin githerd/x-1",
    "/usr/bin/git push",
    '"git" push',
    "g\\it pu\\sh",
    "git -C /tmp push",
    "git -c user.name=x push",
    "git --no-pager push",
    "git --git-dir .git push",
    "FOO=1 git push",
    "env GIT_TRACE=1 git push",
    "env -i PATH=/usr/bin git push",
    "command git push",
    "exec git push",
    "nice -n 5 git push",
    "time git push",
    "timeout 30 git push",
    "echo hi; git push",
    "true && git push",
    "false || git push",
    "echo hi | git push",
    "echo hi\ngit push",
    "echo $(git push)",
    "echo `git push`",
    'echo "$(git push)"',
    "(git push)",
    "{ git push; }",
    "if true; then git push; fi",
    "bash -c 'git push'",
    'sh -lc "git push origin"',
    "eval git push",
    "env -S 'git push'",
    "echo origin | xargs git push",
    "find . -maxdepth 0 -exec git push \\;",
    "git -c alias.p=push p",
    "git config alias.p push",
    // GitHub, remote access and credentials
    "gh pr list",
    "/usr/local/bin/gh api repos/x/y",
    "npx gh pr create",
    "curl https://api.github.com/repos/x/y",
    "curl -s https://github.com/x/y",
    "wget https://api.github.com/user",
    "ssh git@github.com",
    "scp a host:b",
    "git credential fill",
    "echo url=https://github.com | git credential fill",
    "git credential-store get",
    "git -c credential.helper=store fetch",
    // history-rewriting and working-tree-discarding git
    "git stash",
    "git stash push -m x",
    "git reset --hard HEAD~1",
    "git reset HEAD file",
    "git switch main",
    "git restore file.ts",
    "git clean -fdx",
    "git rebase master",
    "git checkout master",
    "git checkout -- file.ts",
    "git checkout -b new",
    "git checkout MERGE_HEAD -- visual-baselines/x.png",
    // unsigned commits and attribution
    'git commit --no-gpg-sign -m "fix: x"',
    'git -c commit.gpgsign=false commit -m "fix: x"',
    'GIT_CONFIG_COUNT=1 GIT_CONFIG_KEY_0=commit.gpgsign GIT_CONFIG_VALUE_0=false git commit -m "fix: x"',
    'git commit -S -m "fix: x" -m "Co-Authored-By: Claude <noreply@anthropic.com>"',
    'git commit -S -m "fix: x" -m "Claude-Session: abc"',
    'git commit -S -m "fix: x\n\nGenerated with Claude Code"',
    SIGNED_ATTRIBUTION,
    "git commit -S -F - <<EOF\nfix: x\n\nco-authored-by: a <b@c>\nEOF",
    "git commit -S -F msg-attributed.txt",
    "git commit -S --file=msg-attributed.txt",
    "git commit -S -F missing-message.txt",
    'git merge -m "Merge\n\nCo-Authored-By: x" abc123',
    // long-lived processes
    "servherd start --name x",
    "npx -y servherd start",
    "npx servherd@latest list",
    "pm2 start x",
    "pnpm exec pm2 list",
    "nohup node server.js",
    "setsid node server.js",
    "node server.js & disown",
    "node server.js &",
    "sleep 100 &",
    "(sleep 100) &",
    "node server.js > log 2>&1 &",
    "pnpm run dev",
    "pnpm run dev:graphty",
    "npm run dev",
    "pnpm dev",
    "pnpm --filter graphty-element run dev",
    "npm run storybook",
    "pnpm run storybook:graphty-element",
    "storybook dev -p 9001",
    "npx storybook dev",
    "pnpm exec nx run graphty-element:storybook",
    "npx vite",
    // privilege and publishing
    "sudo ls",
    "npm publish",
    "pnpm publish --access public",
    "pnpm -r publish",
    "nx release",
    "pnpm exec nx release --dry-run",
    "npx nx release",
];

/** Bash commands allowed in a pr-fix run. */
const ALLOWED = [
    'git commit -S -m "fix: x"',
    "git commit -S -m \"$(cat <<'EOF'\nfix(githerd): x\n\nBody text.\nEOF\n)\"",
    "git commit -S -F msg-clean.txt",
    "git -c commit.gpgsign=true commit -m 'fix: x'",
    "pnpm exec nx run x:test",
    "pnpm exec nx run githerd:coverage",
    "pnpm exec nx run-many -t build",
    "git merge 0123456789abcdef0123456789abcdef01234567",
    "git merge --no-edit abc123",
    "git status --short",
    "git diff HEAD~1 -- src/a.ts",
    "git log --oneline -5",
    "git add -A",
    "git fetch origin",
    "git config user.name",
    "pnpm install --frozen-lockfile",
    "npm test",
    "pnpm run build",
    "npx vite build",
    "npm run test:run -- --project=browser",
    "curl https://registry.npmjs.org/vitest",
    "ls -la && cat README.md | grep push",
    "echo 'git push' > notes.txt",
    "grep -rn 'git push' lib/",
    "echo done # git push",
    "node tools/check.mjs 2>&1",
    "cat <<EOF > notes.txt\ngit push\nnpm publish\nEOF",
    "find . -name '*.ts' -exec grep -l push {} +",
    "timeout 30 git commit -S -m 'fix: y'",
];

describe("guard: Bash commands", () => {
    it.each(DENIED)("denies %j", (command) => {
        const r = bash(plain, command);
        expect(r.status, r.stderr).toBe(2);
        expect(r.stderr.length).toBeGreaterThan(0);
    });

    it.each(ALLOWED)("allows %j", (command) => {
        const r = bash(plain, command);
        expect(r.stderr).toBe("");
        expect(r.status).toBe(0);
    });

    it("covers at least 60 commands", () => {
        expect(DENIED.length + ALLOWED.length).toBeGreaterThanOrEqual(60);
    });
});

describe("guard: git checkout MERGE_HEAD", () => {
    it("allows protected paths during a merge in a pr-conflict run", () => {
        expect(bash(merging, "git checkout MERGE_HEAD -- visual-baselines/x.png").status).toBe(0);
        expect(bash(merging, "git checkout MERGE_HEAD -- visual-baselines/a.png .github/workflows/ci.yml").status).toBe(
            0,
        );
    });

    it("denies it outside a merge, in another kind, for other paths and in other forms", () => {
        expect(bash(plain, "git checkout MERGE_HEAD -- visual-baselines/x.png").stderr).toMatch(/checkout/);
        const outside = makeRun("conflict-no-merge", "pr-conflict", false);
        expect(bash(outside, "git checkout MERGE_HEAD -- visual-baselines/x.png").stderr).toMatch(/outside a merge/);
        expect(bash(merging, "git checkout MERGE_HEAD -- src/a.ts").stderr).toMatch(/not protected/);
        expect(bash(merging, "git checkout MERGE_HEAD -- visual-baselines/x.png src/a.ts").status).toBe(2);
        expect(bash(merging, "git checkout MERGE_HEAD visual-baselines/x.png").status).toBe(2);
        expect(bash(merging, "git checkout MERGE_HEAD --").status).toBe(2);
        expect(bash(merging, "git checkout HEAD -- visual-baselines/x.png").status).toBe(2);
        expect(bash(merging, "git checkout MERGE_HEAD -- ../escape/visual-baselines/x.png").status).toBe(2);
    });
});

describe("guard: Edit and Write", () => {
    const PROTECTED_FILES = [
        "visual-baselines/graphty-element/a.png",
        ".github/workflows/ci.yml",
        "githerd/lib/runner.mjs",
        "githerd.config.json",
        ".mcp.json",
        ".claude/settings.json",
        "CLAUDE.md",
        "./.claude/../.claude/rules.md",
    ];

    it.each(
        PROTECTED_FILES.flatMap((f) => [
            ["Edit", f],
            ["Write", f],
        ]),
    )("denies %s to %s", (tool, file) => {
        const r = guard(plain, { tool_name: tool, tool_input: { file_path: join(plain.root, file), content: "x" } });
        expect(r.status, r.stderr).toBe(2);
        expect(r.stderr).toMatch(/protected/);
    });

    it("resolves a relative path against the current directory", () => {
        const r = guard(plain, { tool_name: "Write", tool_input: { file_path: "CLAUDE.md", content: "x" } });
        expect(r.status).toBe(2);
    });

    it("allows other paths, including a nested CLAUDE.md and a file named like a protected directory", () => {
        for (const file of ["src/a.ts", "graphty-element/CLAUDE.md", "githerd.md", "docs/.github-notes.md"]) {
            const r = guard(plain, { tool_name: "Edit", tool_input: { file_path: join(plain.root, file) } });
            expect(r.status, file).toBe(0);
        }
    });

    it.each([
        ["a relative path out of the tree", "../../.githerd/runs/x/guard.json"],
        ["the main checkout's git config", "/abs/root/.git/config"],
        ["the owner's settings", "/home/x/.claude/settings.json"],
    ])("denies Edit and Write to %s", (_, file) => {
        for (const tool of ["Edit", "Write"]) {
            const r = guard(plain, { tool_name: tool, tool_input: { file_path: file, content: "x" } });
            expect(r.status, `${tool} ${file}`).toBe(2);
            expect(r.stderr).toMatch(/inside their working tree/);
        }
    });

    it("denies Edit and Write to the tree's .git and .husky/", () => {
        for (const file of [".git", ".git/config", ".husky/_/reference-transaction", ".husky/pre-push"]) {
            const r = guard(plain, { tool_name: "Write", tool_input: { file_path: join(plain.root, file), content: "x" } });
            expect(r.status, file).toBe(2);
            expect(r.stderr).toMatch(/git or hook files/);
        }
        const ok = guard(plain, { tool_name: "Write", tool_input: { file_path: join(plain.root, ".gitignore") } });
        expect(ok.status).toBe(0);
    });

    it("allows tools it does not guard", () => {
        expect(
            guard(plain, { tool_name: "Read", tool_input: { file_path: join(plain.root, "CLAUDE.md") } }).status,
        ).toBe(0);
    });
});

describe("guard: failures deny", () => {
    it("denies malformed JSON input and records it", () => {
        const r = guard(plain, "{not json");
        expect(r.status).toBe(2);
        expect(r.stderr).toMatch(/guard error/);
        expect(readFileSync(join(plain.runDir, "denials.jsonl"), "utf8")).toMatch(/guard error/);
    });

    it("denies input with no tool or no command", () => {
        expect(guard(plain, { tool_input: { command: "ls" } }).status).toBe(2);
        expect(guard(plain, { tool_name: "Bash", tool_input: {} }).status).toBe(2);
        expect(guard(plain, { tool_name: "Write", tool_input: {} }).status).toBe(2);
    });

    it("denies an unterminated quote or substitution", () => {
        expect(bash(plain, "echo 'abc").status).toBe(2);
        expect(bash(plain, "echo $(ls").status).toBe(2);
    });

    it("denies when GITHERD_RUN_DIR is unset", () => {
        expect(guard(null, { tool_name: "Bash", tool_input: { command: "ls" } }).stderr).toMatch(/GITHERD_RUN_DIR/);
    });

    it("denies when the run directory cannot be read", () => {
        const run = makeRun("unreadable", "pr-fix", false);
        chmodSync(run.runDir, 0o000);
        try {
            const r = bash(run, "ls");
            // root can read anything; the check only means something for an ordinary user
            if (process.getuid?.() !== 0) expect(r.status).toBe(2);
        } finally {
            chmodSync(run.runDir, 0o755);
        }
        expect(bash({ runDir: join(base, "missing"), root: plain.root }, "ls").status).toBe(2);
    });

    it("denies a malformed guard.json", () => {
        const run = makeRun("malformed", "pr-fix", false);
        writeFileSync(join(run.runDir, "guard.json"), JSON.stringify({ kind: "pr-fix" }));
        expect(bash(run, "ls").stderr).toMatch(/malformed/);
    });

    it("records each denial with the tool, the input and the reason", () => {
        const run = makeRun("record", "pr-fix", false);
        bash(run, "git push");
        const lines = readFileSync(join(run.runDir, "denials.jsonl"), "utf8")
            .trim()
            .split("\n")
            .map((l) => JSON.parse(l));
        expect(lines).toHaveLength(1);
        expect(lines[0]).toMatchObject({ tool: "Bash", input: "git push" });
        expect(lines[0].reason).toMatch(/git push/);
    });
});

describe("splitCommands", () => {
    const argvs = (text) => splitCommands(text).map((c) => c.argv);

    it("splits on separators and honors quotes and escapes", () => {
        expect(argvs("a 'b c' \"d e\" f\\ g; h && i || j | k\nl")).toEqual([
            ["a", "b c", "d e", "f g"],
            ["h"],
            ["i"],
            ["j"],
            ["k"],
            ["l"],
        ]);
        expect(argvs('echo "a \\" \\$b"')).toEqual([["echo", 'a " $b']]);
        expect(argvs("a \\\n b")).toEqual([["a", "b"]]);
        expect(argvs("a;; b |& c")).toEqual([["a"], ["b"], ["c"]]);
    });

    it("finds commands inside substitutions and keeps their source as the word", () => {
        expect(argvs('echo $(git push) `ls -l` "$(pwd)" <(cat x) >(tee y)')).toEqual([
            ["git", "push"],
            ["ls", "-l"],
            ["pwd"],
            ["cat", "x"],
            ["tee", "y"],
            ["echo", "$(git push)", "`ls -l`", "$(pwd)"],
        ]);
        expect(argvs('echo "`date`"')).toEqual([["date"], ["echo", "`date`"]]);
        expect(argvs("echo `a\\ b`")).toEqual([
            ["a", "b"],
            ["echo", "`a\\ b`"],
        ]);
    });

    it("drops redirection targets and file descriptors", () => {
        expect(argvs("cmd > out 2>&1 < in >> log &> all &>> all2 >| x 3<&0")).toEqual([["cmd"]]);
    });

    it("marks background commands", () => {
        const cmds = splitCommands("a & b; (c; d) & e");
        expect(cmds.map((c) => [c.argv[0], c.background])).toEqual([
            ["a", true],
            ["b", false],
            ["c", true],
            ["d", true],
            ["e", false],
        ]);
    });

    it("collects here-documents and here-strings as input, not commands", () => {
        const cmds = splitCommands("cat <<-'END' | grep x <<< \"hi\"\n\tgit push\n\tEND\nls");
        expect(cmds.map((c) => c.argv)).toEqual([["cat"], ["grep", "x"], ["ls"]]);
        expect(cmds[0].input).toEqual(["\tgit push"]);
        expect(cmds[1].input).toEqual(["hi"]);
        expect(splitCommands('cat <<"E"\\F\nbody\n')[0].input).toEqual(["body"]);
    });

    it("removes assignments, reserved words and wrappers", () => {
        expect(splitCommands("A=1 B=2 git push")[0]).toMatchObject({ argv: ["git", "push"], assign: ["A=1", "B=2"] });
        expect(splitCommands("env -u X -C /tmp C=3 -- git push")[0]).toMatchObject({
            argv: ["git", "push"],
            assign: ["C=3"],
        });
        expect(argvs("env --split-string='git push' x")).toEqual([["git", "push", "x"]]);
        expect(argvs("timeout -s KILL 5 nice -n 3 stdbuf -o L xargs -I {} command exec -a n time -p git push")).toEqual(
            [["git", "push"]],
        );
        expect(argvs("timeout -- 5 ls")).toEqual([["ls"]]);
        expect(argvs("while true; do ls; done")).toEqual([["true"], ["ls"]]);
        expect(argvs("bash -c")).toEqual([]);
        expect(argvs("bash script.sh")).toEqual([["bash", "script.sh"]]);
        expect(argvs("env")).toEqual([]);
        expect(argvs("# only a comment\n")).toEqual([]);
    });

    it("keeps the background flag and assignments through sh -c", () => {
        expect(splitCommands("X=1 bash -c 'git push' &")[0]).toMatchObject({
            argv: ["git", "push"],
            background: true,
            assign: ["X=1"],
        });
    });

    it("throws on input it cannot parse", () => {
        for (const text of ["echo 'a", 'echo "a', "echo `a", "echo $(a", "(a", "a)", "cat << ", "cat <<'E"]) {
            expect(() => splitCommands(text), text).toThrow();
        }
        expect(() => splitCommands("eval ".repeat(12) + "ls")).toThrow(/nested/);
    });
});
