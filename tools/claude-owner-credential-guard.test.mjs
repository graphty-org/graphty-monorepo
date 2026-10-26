// Tests of tools/claude-owner-credential-guard.mjs: every pattern refused, the ordinary call of each tool
// allowed, and silence on bad input.
//
//   node --test tools/claude-owner-credential-guard.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { refusal, respond } from "./claude-owner-credential-guard.mjs";

const HOME = "/home/someone";
const HOOK = new URL("./claude-owner-credential-guard.mjs", import.meta.url).pathname;
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });
const read = (file_path) => ({ tool_name: "Read", tool_input: { file_path } });

const REFUSED_BASH = [
    "cat ~/.config/gh/hosts.yml",
    "cat $HOME/.config/gh/hosts.yml",
    "grep token ${HOME}/.config/gh/hosts.yml",
    "ls /home/someone/.config/gh",
    "cat ~/.gitconfig",
    "git config -f ~/.gitconfig --list",
    "cat ~/.config/git/config",
    "cat ~/.git-credentials",
    "cat ~/.npmrc",
    "ls ~/.gnupg/private-keys-v1.d",
    "cat ~/.ssh/id_rsa",
    "ssh -i ~/.ssh/id_rsa git@github.com",
    "cat ~/.ssh/git_signing_claude",
    "cat ~/.ssh/graphty-production-site-deploy_ed25519",
    "printf 'protocol=https\\nhost=github.com\\n' | git credential fill",
    "git credential approve < x",
    "git credential-cache exit",
    "git credential-store get",
    "git -c credential.helper=store push",
    "gh auth token",
    "gh auth switch -u apowers313",
    "gh auth login",
    "gh auth status --show-token",
    "ssh-add -l",
    "GH_CONFIG_DIR=~/.config/gh gh api user",
    "export GIT_CONFIG_GLOBAL=~/.gitconfig",
    "env GNUPGHOME=/tmp/g gpg -k",
    "SSH_AUTH_SOCK=/run/user/1000/keyring/ssh git push",
    "NPM_CONFIG_USERCONFIG=/x/.npmrc npm whoami",
    "unset GH_CONFIG_DIR; gh api user",
    "env -u GIT_CONFIG_GLOBAL git config user.name",
    "env -i git push origin HEAD",
    "env --ignore-environment PATH=/usr/bin git push",
    "env - git push",
    "cat ~/.config/g?/hosts.yml",
    "cat ~/.config/*/hosts.yml",
    "cat ~/.ssh/*",
    "cd ~/.config && cat gh/hosts.yml",
    "find ~ -name hosts.yml -exec cat {} \\;",
    "python3 -c \"open(os.path.expanduser('~/.config/gh/hosts.yml'))\"",
    "cd ~/.ssh && cat id_rsa",
    "cat git_signing_claude",
];

const ALLOWED_BASH = [
    "git status",
    "gh api user --jq .login",
    "git push -u origin HEAD",
    "cat ~/.config/gh-agent/config.yml",
    "cat ~/.config/git-agent/config",
    "cat ~/.ssh/graphty-agent_ed25519.pub",
    "ssh -i ~/.ssh/graphty-agent_ed25519 -o IdentitiesOnly=yes git@github.com",
    "cat ~/.ssh/known_hosts",
    "cat ~/.ssh/id_rsa.pub",
    "ls ~/.ssh/",
    "GIT_CONFIG_GLOBAL=/dev/null pnpm test",
    "GH_CONFIG_DIR=~/.config/gh-agent gh pr list",
    "cat .gitconfig.example",
    "grep -rn npmrc tools/",
    "node tools/test-ledger.mjs status",
    "cat ~/.config/gh-agent/hosts.yml",
    "env CI=1 node x.mjs -i",
    "env | grep -i path",
    "cat id_rsa.pub",
];

describe("claude-owner-credential-guard", () => {
    it("refuses every Bash pattern that reads or uses the owner's credentials", () => {
        for (const command of REFUSED_BASH) assert.ok(refusal(bash(command), HOME), command);
    });

    it("allows ordinary Bash calls and the agent's own identity", () => {
        for (const command of ALLOWED_BASH) assert.equal(refusal(bash(command), HOME), null, command);
    });

    it("refuses the owner's credential paths in Read, Edit, Write, Grep and Glob, and allows ordinary ones", () => {
        for (const p of [
            "/home/someone/.config/gh/hosts.yml",
            "~/.npmrc",
            "/home/someone/.ssh/id_rsa",
            "~/.gitconfig",
        ]) {
            assert.ok(refusal(read(p), HOME), p);
            assert.ok(refusal({ tool_name: "Edit", tool_input: { file_path: p } }, HOME), p);
            assert.ok(refusal({ tool_name: "Write", tool_input: { file_path: p } }, HOME), p);
        }
        assert.ok(
            refusal({ tool_name: "Grep", tool_input: { pattern: "oauth", path: "/home/someone/.config/gh" } }, HOME),
        );
        assert.ok(refusal({ tool_name: "Glob", tool_input: { pattern: "/home/someone/.gnupg/*" } }, HOME));
        assert.equal(refusal(read("/home/someone/Projects/graphty-monorepo/CLAUDE.md"), HOME), null);
        assert.equal(refusal(read("/home/someone/.config/gh-agent/hosts.yml"), HOME), null);
        assert.equal(
            refusal({ tool_name: "Edit", tool_input: { file_path: "/repo/CLAUDE.md", new_string: "~/.npmrc" } }, HOME),
            null,
        );
        assert.equal(refusal({ tool_name: "Grep", tool_input: { pattern: "~/.npmrc", path: "/repo" } }, HOME), null);
        assert.equal(refusal({ tool_name: "Glob", tool_input: { pattern: "tools/*.mjs" } }, HOME), null);
    });

    it("checks servherd_start, whose command runs with the owner's environment", () => {
        const start = (command, env) => ({ tool_name: "mcp__servherd__servherd_start", tool_input: { command, env } });
        assert.ok(refusal(start("git push origin HEAD"), HOME));
        assert.ok(refusal(start("gh pr list"), HOME));
        assert.ok(refusal(start("node x.mjs", { GH_CONFIG_DIR: "/home/someone/.config/gh" }), HOME));
        assert.ok(refusal(start("cat ~/.npmrc"), HOME));
        assert.equal(refusal(start("npm run storybook", { PORT: "{{port}}", HOST: "0.0.0.0" }), HOME), null);
        assert.equal(refusal(start("node tools/pr-status-broker.mjs"), HOME), null);
    });

    it("answers with a deny decision, and with nothing when allowed", () => {
        const out = JSON.parse(respond(bash("gh auth token"), HOME));
        assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
        assert.match(out.hookSpecificOutput.permissionDecisionReason, /graphty-agent/);
        assert.equal(respond(bash("git status"), HOME), "");
    });

    it("runs as a hook: denies through stdout, allows silently, and exits 0 on bad input", () => {
        const run = (input) => spawnSync("node", [HOOK], { input, encoding: "utf8", env: { ...process.env, HOME } });
        const denied = run(JSON.stringify(read("~/.npmrc")));
        assert.equal(denied.status, 0);
        assert.match(denied.stdout, /"permissionDecision":"deny"/);
        const allowed = run(JSON.stringify(bash("git status")));
        assert.equal(allowed.status, 0);
        assert.equal(allowed.stdout, "");
        const bad = run("not json");
        assert.equal(bad.status, 0);
        assert.equal(bad.stdout, "");
    });

    it("is registered in .claude/settings.json for Bash and the file tools, and the agent identity is set", () => {
        const settings = JSON.parse(readFileSync(new URL("../.claude/settings.json", import.meta.url), "utf8"));
        const entry = settings.hooks.PreToolUse.find((h) =>
            h.hooks.some((x) => x.command.includes("claude-owner-credential-guard.mjs")),
        );
        assert.ok(entry, "registered");
        for (const tool of ["Bash", "Read", "Edit", "Write", "Grep", "Glob", "mcp__servherd__servherd_start"])
            assert.ok(entry.matcher.split("|").includes(tool), tool);
        assert.match(settings.env.GIT_CONFIG_GLOBAL, /\.config\/git-agent\/config$/);
        assert.match(settings.env.GH_CONFIG_DIR, /\.config\/gh-agent$/);
        assert.equal(settings.env.SSH_AUTH_SOCK, "", "no ssh-agent: a plain ssh cannot use the owner's keys");
    });
});
