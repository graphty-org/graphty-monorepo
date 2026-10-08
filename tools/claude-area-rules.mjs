#!/usr/bin/env node
// Claude Code PostToolUse hook (Edit|Write|MultiEdit), registered in .claude/settings.json: when a
// session edits a file in an area with its own rule, that rule's paragraph from .claude/rules/ is
// added to the session's context, once per rule per session. Each rule file's `paths:` frontmatter
// is the glob table (the same field Claude Code itself uses to scope a rule to the files it reads).
// Any failure exits 0 silently, so a broken hook never blocks an edit.
//
//   echo '{"session_id":"s","tool_input":{"file_path":"/repo/a/b.test.ts"}}' | node tools/claude-area-rules.mjs
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, matchesGlob, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Every rule in `<root>/.claude/rules/`.
 * @param root - The repository root.
 * @returns Each rule's file name, `paths:` globs and paragraph.
 */
export function loadRules(root = ROOT) {
    const dir = join(root, ".claude/rules");
    return readdirSync(dir)
        .filter((name) => name.endsWith(".md"))
        .map((name) => {
            const [, front = "", body] = /^(?:---\n([\s\S]*?)\n---\n)?([\s\S]*)$/.exec(
                readFileSync(join(dir, name), "utf8"),
            );
            const globs = [...front.matchAll(/^\s*-\s*"?([^"\n]+?)"?\s*$/gm)].map((m) => m[1]);
            return { name, globs, text: body.trim() };
        });
}

/**
 * The repository-relative path of a file, with a worktree prefix (.worktrees/<name>/, .claude/worktrees/<name>/) removed.
 * @param file - An absolute path.
 * @param root - The repository root.
 * @returns The path relative to the root, with "/" separators.
 */
function repoPath(file, root = ROOT) {
    return relative(root, file)
        .split(sep)
        .join("/")
        .replace(/^(?:\.claude\/)?\.?worktrees\/[^/]+\//, "");
}

/**
 * The rules whose globs match a file.
 * @param file - An absolute path.
 * @param root - The repository root.
 * @returns The matching rules.
 */
export function matchRules(file, root = ROOT) {
    const rel = repoPath(file, root);
    if (rel.startsWith("../")) return [];
    return loadRules(root).filter((rule) => rule.globs.some((glob) => matchesGlob(rel, glob)));
}

/**
 * The hook's answer to one tool call.
 * @param input - The hook input Claude Code sends on stdin.
 * @param root - The repository root.
 * @param markerDir - Where the per-session record of rules already shown is kept.
 * @returns The JSON to print, or "" when there is nothing new to say.
 */
export function respond(input, root = ROOT, markerDir = tmpdir()) {
    const file = input.tool_input?.file_path;
    if (typeof file !== "string") return "";
    const marker = join(markerDir, `claude-area-rules-${String(input.session_id).replace(/[^\w-]/g, "_")}.json`);
    const seen = existsSync(marker) ? JSON.parse(readFileSync(marker, "utf8")) : [];
    const fresh = matchRules(file, root).filter((rule) => !seen.includes(rule.name));
    if (fresh.length === 0) return "";
    writeFileSync(marker, JSON.stringify([...seen, ...fresh.map((rule) => rule.name)]));
    const additionalContext = fresh.map((rule) => rule.text).join("\n\n");
    return JSON.stringify({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext } });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    try {
        process.stdout.write(respond(JSON.parse(readFileSync(0, "utf8"))));
    } catch {
        // A broken hook must never block an edit.
    }
    process.exit(0);
}
