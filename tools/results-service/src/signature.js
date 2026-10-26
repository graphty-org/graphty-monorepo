// A failure's key and signature, which the results Worker computes from each failure message. A copy of
// failureHashes() in tools/test-ledger.mjs, kept identical by test/index.test.mjs.
// ponytail: a copy, not a move, because the gate copies tools/*.mjs alone into its scratch repositories; the
// ledger is deleted in the results rollout's last step, and its clients then import this file.
// The Worker runs it with the nodejs_compat flag (wrangler.toml), which provides both imports.
import { createHash } from "node:crypto";
import { stripVTControlCharacters } from "node:util";

const h16 = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

// Lines that say nothing about the failure: a bare error name ("AssertionError:"), Storybook's debug link, a DOM dump.
const UNINFORMATIVE = /^\w*Error:?$|Click to debug|^Ignored nodes:|^</;
// A wait that expired: Vitest's and Playwright's timeouts, Testing Library's findBy / waitFor, expect.poll.
const WAIT_EXPIRED = /timed out|TimeoutError|Timeout -?\d+ms exceeded|Unable to find|expect\.poll/i;

/**
 * A failure's first informative line, its key (the first two informative lines, cleaned, numbers kept) and its
 * signature (numbers masked, plus two stack frames outside node_modules; an expired wait is `timeout` plus its file).
 * @param text the failure message and stack
 * @param file the test file
 * @param main the main checkout, whose path and worktree paths are removed
 * @returns `{ line, key, signature, status }`; status is `timeout` for an expired wait, else `fail`
 */
export function failureHashes(text, file, main = "/nonexistent") {
    const esc = main.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const clean = (s) =>
        s
            .replaceAll(new RegExp(String.raw`${esc}(?:/\.worktrees/[^/\s]+)?/`, "g"), "")
            .replaceAll(/\/tmp\/\S*/g, "<tmp>")
            .replaceAll(/\b[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}\b/gi, "<uuid>")
            .replaceAll(/\b[\da-f]{7,}\b/gi, "<hex>");
    const mask = (s) => s.replaceAll(/:\d+(?::\d+)?/g, "").replaceAll(/\d+/g, "<n>");
    const lines = stripVTControlCharacters(text)
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
    const frame = (l) => /^(\u276F|at )/.test(l); // \u276F: the marker Vitest puts before a stack frame
    const said = lines
        .filter((l) => !frame(l) && !UNINFORMATIVE.test(l))
        .slice(0, 2)
        .map(clean);
    const first = said[0] ?? clean(lines[0] ?? "");
    const timeout = said.some((l) => WAIT_EXPIRED.test(l));
    const frames = lines
        .filter((l) => frame(l) && !l.includes("node_modules"))
        .slice(0, 2)
        .map((l) => mask(clean(l)));
    const signature = timeout ? h16(`timeout\0${file}`) : h16([mask(first), ...frames].join("\n"));
    return { line: first.slice(0, 300), key: h16(said.join("\n")), signature, status: timeout ? "timeout" : "fail" };
}

/**
 * The key a flaky test's issue is filed and tracked under: its failure signature, except for a timeout, whose
 * signature names only its file, so two timeouts in one file would share one issue; that key adds the test name.
 * @param signature the failure signature
 * @param status the failure's status, `timeout` or `fail`
 * @param name the test name
 * @returns the issue key
 */
export const issueKey = (signature, status, name) => (status === "timeout" ? h16(`${signature}\0${name}`) : signature);
