/**
 * A judgment run's prompt (design section 18): the package's preamble, the kind's playbook, and the
 * repository's rules file read from the verified green SHA, so a pull request branch cannot change
 * the instructions a run follows.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

/** Every run kind, each with a playbook in `prompts/playbooks/<kind>.md`. */
export const RUN_KINDS = Object.freeze([
    "master-red",
    "pr-fix",
    "pr-conflict",
    "release",
    "triage",
    "refresh",
    "retriage-candidates",
    "retriage-filter",
    "backlog",
]);

const PROMPTS = new URL("../prompts/", import.meta.url);

/**
 * Builds the text the runner writes to `prompt.md`.
 * @param {{ root: string, sha: string, kind: string, rulesFile: string | null }} opts the
 *     repository, the green SHA to read the rules file from, the run kind, and the config's
 *     `runRulesFile` (null for none)
 * @returns {string} the prompt
 */
export function buildPrompt({ root, sha, kind, rulesFile }) {
    if (!RUN_KINDS.includes(kind)) throw new Error(`unknown run kind: ${kind}`);
    const parts = [
        readFileSync(new URL("preamble.md", PROMPTS), "utf8"),
        readFileSync(new URL(`playbooks/${kind}.md`, PROMPTS), "utf8"),
    ];
    if (rulesFile) {
        // A ref such as HEAD or a branch name would let the working tree's history choose the rules.
        if (!/^[0-9a-f]{7,64}$/.test(sha)) throw new Error(`not a commit sha: ${sha}`);
        let rules;
        try {
            rules = execFileSync("git", ["show", `${sha}:${rulesFile}`], {
                cwd: root,
                encoding: "utf8",
                stdio: ["ignore", "pipe", "pipe"],
            });
        } catch {
            throw new Error(`cannot read ${rulesFile} at ${sha}: the run does not start without its rules`);
        }
        parts.push(rules);
    }
    return parts.map((p) => p.trimEnd()).join("\n\n") + "\n";
}
