#!/usr/bin/env node
// Claude Code PreToolUse hook, registered in .claude/settings.json: refuses a tool call that reads or uses
// the owner's credentials. Agent sessions act as the graphty-agent account (.claude/settings.json `env`:
// GIT_CONFIG_GLOBAL and GH_CONFIG_DIR name the agent's git config and gh login), and this keeps them from
// reaching past it, by accident or by habit, to the owner's:
//
// - his gh login (~/.config/gh/, never ~/.config/gh-agent/), his git configs (~/.gitconfig,
//   ~/.config/git/config) with their credential helpers, ~/.git-credentials, ~/.npmrc, ~/.gnupg/, and
//   every key in ~/.ssh/ but the agent's (graphty-agent*), public keys and known_hosts; also a wildcard under
//   ~/.config/ or ~/.ssh/, and the names hosts.yml (but the agent's), id_rsa, id_ed25519, id_ecdsa and
//   git_signing_claude however the path is spelled (relative after a cd, in find -name);
// - commands that hand out or switch credentials: `git credential fill|approve|reject`,
//   `git credential-cache|credential-store`, a `credential.helper` override, `gh auth token|switch|login`,
//   `gh auth status --show-token`, `ssh-add`, and `env -i` (it drops GIT_CONFIG_GLOBAL, so git falls back to
//   ~/.gitconfig and its credential helper);
// - setting or unsetting GIT_CONFIG_GLOBAL, GH_CONFIG_DIR, NPM_CONFIG_USERCONFIG, GNUPGHOME or SSH_AUTH_SOCK,
//   except to /dev/null or an agent path (`*-agent*`).
//
// Bash commands, the paths of Read, Edit, Write, MultiEdit and NotebookEdit, the path and glob of Grep
// and Glob, and the command of servherd_start (which runs in servherd's environment, the owner's: there it
// also refuses `gh` and git's network commands) are checked. It stops accidents and casual reads, not a determined agent
// (design/ci/channels-pipeline-plan.md, section 1, change 2). Any failure of the hook itself allows the call.
//
//   echo '{"tool_name":"Read","tool_input":{"file_path":"~/.npmrc"}}' | node tools/claude-owner-credential-guard.mjs
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const escape = (s) => s.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/**
 * The patterns of the owner's credential paths, each with the home directory spelled any of the ways a
 * tool call can spell it (`~`, `$HOME`, `${HOME}`, the absolute path).
 * @param home - The home directory.
 * @returns [name, RegExp] pairs.
 */
function pathRules(home) {
    const h = String.raw`(?:~|\$HOME|\$\{HOME\}|${escape(home)})`;
    const end = String.raw`(?=$|[\s"'${"`"};|&)<>/])`;
    const name = String.raw`[^\s"'${"`"};|&)<>/]`;
    const under = (path) => new RegExp(String.raw`${h}/${path}${end}`);
    return [
        ["the owner's gh login (~/.config/gh/)", under(String.raw`\.config/gh`)],
        ["the owner's git config (~/.gitconfig)", under(String.raw`\.gitconfig`)],
        ["the owner's git config (~/.config/git/)", under(String.raw`\.config/git`)],
        ["the owner's git credentials (~/.git-credentials)", under(String.raw`\.git-credentials`)],
        ["the owner's npm login (~/.npmrc)", under(String.raw`\.npmrc`)],
        ["the owner's GnuPG keys (~/.gnupg/)", under(String.raw`\.gnupg`)],
        // A file in ~/.ssh/ other than the agent's keys, a public key or known_hosts.
        [
            "an SSH key that is not the agent's (~/.ssh/)",
            new RegExp(String.raw`${h}/\.ssh/(?!graphty-agent|known_hosts)(?!${name}*\.pub${end})${name}+`),
        ],
        ["a wildcard under ~/.config/ or ~/.ssh/", new RegExp(String.raw`${h}/\.(?:config|ssh)/${name}*[*?[]`)],
        ["a gh login file (hosts.yml)", /(?<!gh-agent\/)\bhosts\.yml\b/],
        [
            "the owner's SSH or signing key, by name",
            new RegExp(
                String.raw`\b(?:id_rsa|id_ed25519|id_ecdsa|git_signing_claude)(?!${name}*\.pub${end})${name}*${end}`,
            ),
        ],
    ];
}

const COMMAND_RULES = [
    ["git credential fill/approve/reject", /\bgit\b[^;|&\n]*\bcredential\s+(?:fill|approve|reject)\b/],
    ["git's credential cache or store", /\bgit\b[^;|&\n]*\bcredential-(?:cache|store)\b/],
    ["a credential.helper override", /credential\.helper\b/],
    ["gh auth token/switch/login", /\bgh\s+auth\s+(?:token|switch|login|refresh)\b/],
    ["gh auth status --show-token", /\bgh\s+auth\s+status\b[^;|&\n]*(?:--show-token|-t\b)/],
    ["ssh-add", /\bssh-add\b/],
    // Only among env's own options and assignments, before the command it runs.
    [
        "env -i (it drops the agent identity)",
        /\benv(?:\s+(?:-u\s+\S+|-[^\s]+|\w+=\S*))*?\s+(?:-i|--ignore-environment|-)(?=\s|$)/,
    ],
];
const NETWORK = /\bgh\s|\bgit\b[^;|&\n]*\b(?:push|fetch|pull|clone|ls-remote)\b/;

const IDENTITY_VARS = ["GIT_CONFIG_GLOBAL", "GH_CONFIG_DIR", "NPM_CONFIG_USERCONFIG", "GNUPGHOME", "SSH_AUTH_SOCK"];
const VARS = IDENTITY_VARS.join("|");
// An assignment (`X=v`, `export X=v`, `env X=v`) whose value is not /dev/null or an agent path, or an unset.
const ASSIGN = new RegExp(String.raw`(?:^|[\s;|&(])(${VARS})=("[^"]*"|'[^']*'|[^\s;|&)]*)`, "g");
const UNSET = new RegExp(String.raw`(?:\bunset\b[^;|&\n]*\b|\benv\b[^;|&\n]*-u\s*)(${VARS})\b`);

/**
 * Why a Bash command is refused, or null.
 * @param command - The command text.
 * @param home - The home directory.
 * @returns The reason, or null.
 */
function commandReason(command, home) {
    for (const [name, re] of [...pathRules(home), ...COMMAND_RULES]) if (re.test(command)) return name;
    for (const m of command.matchAll(ASSIGN)) {
        const value = m[2].replaceAll(/(?:^["'])|(?:["']$)/g, "");
        if (value !== "/dev/null" && !/-agent\b/.test(value)) return `setting ${m[1]} away from the agent identity`;
    }
    const unset = UNSET.exec(command);
    return unset ? `unsetting ${unset[1]}` : null;
}

/**
 * Why a tool call is refused, or null when it is allowed.
 * @param input - The hook's input: tool_name and tool_input.
 * @param [home] - The home directory.
 * @returns The reason, or null.
 */
export function refusal(input, home = process.env.HOME || homedir()) {
    const tool = input?.tool_name;
    const args = input?.tool_input ?? {};
    if (tool === "Bash") return typeof args.command === "string" ? commandReason(args.command, home) : null;
    if (tool === "mcp__servherd__servherd_start") {
        const command = typeof args.command === "string" ? args.command : "";
        const env = Object.entries(args.env ?? {}).map(([k, v]) => `${k}=${JSON.stringify(String(v))}`);
        if (NETWORK.test(command)) return "GitHub through servherd, which runs as the owner";
        return commandReason([...env, command].join(" "), home);
    }
    // Grep's pattern is a search regex, not a path; Glob's pattern is one.
    const fields = { Grep: ["path", "glob"], Glob: ["path", "pattern"] }[tool] ?? [
        "file_path",
        "notebook_path",
        "path",
    ];
    const paths = fields.map((f) => args[f]).filter((p) => typeof p === "string");
    for (const p of paths) {
        for (const [name, re] of pathRules(home)) if (re.test(p)) return name;
    }
    return null;
}

/**
 * The hook's answer: a deny decision, or nothing (allow).
 * @param input - The hook's input.
 * @param [home] - The home directory.
 * @returns The JSON to print, or "".
 */
export function respond(input, home) {
    const why = refusal(input, home);
    if (!why) return "";
    return JSON.stringify({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason:
                `Refused: this touches ${why}. Agent sessions act as graphty-agent only (GIT_CONFIG_GLOBAL and ` +
                "GH_CONFIG_DIR in .claude/settings.json); never read or use the owner's credentials. If the agent " +
                "identity cannot do what you need, stop and tell the owner.",
        },
    });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        process.stdout.write(respond(JSON.parse(readFileSync(0, "utf8"))));
    } catch {
        // Never block a call because the hook itself failed.
    }
    process.exit(0);
}
