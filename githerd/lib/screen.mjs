/**
 * Reading a worker's pane (design section 7.5). Before any key is sent to a worker, its pane is
 * captured and matched against the screens githerd knows. Only the empty prompt box with no dialog
 * marker allows typing; every dialog and every screen githerd does not recognize blocks it.
 *
 * The markers come from real captures (platform facts 7.3, 10.6 and 10.9): the permission dialog
 * ("Do you want to proceed?", headed "from the <type> agent" when a subagent raised it), the plan
 * approval dialog ("Ready to code?", "Would you like to proceed?") and the picker ("Enter to
 * select"). The usage-limit screen was never captured (platform facts 7.6); its markers are the
 * Claude Code binary's own strings, and its menu offers paid options, so it is never typed into.
 *
 * The empty prompt box is three lines: a rule ending in the session's name, a line that is exactly
 * the prompt character (followed by a no-break space, which a capture keeps), and a rule. The
 * session registry alone cannot tell this from the owner's half-typed message: it says `idle` for
 * both.
 */

/** The prompt character, U+276F. */
const PROMPT = "\u276F";
/** The rule character of the prompt box and the dialogs, U+2500. */
const RULE = "\u2500";
/** The dashed rule around a permission dialog's command, U+254C. */
const DASHED = "\u254C";

/** Lines that mean the usage-limit screen (Claude Code 2.1.289 strings; platform facts 7.6). */
const USAGE = /You've hit your|Stop and wait for limit to reset|continue automatically when the limit resets/;
/** A line that says paid extra usage is in use. */
const EXTRA_USAGE = /You're now using extra usage|Now using extra usage/;

/**
 * @typedef {object} Screen what a pane shows
 * @property {"empty-box" | "owner-text" | "permission" | "plan" | "picker" | "usage-limit" | "unknown"} kind
 *   `empty-box` is the only kind that allows typing
 * @property {string} [text] the text in the prompt box (`owner-text`)
 * @property {string | null} [agent] the subagent type that raised a permission prompt, or null
 * @property {string | null} [rule] the exact allow rule a permission prompt asks for, when it is
 *   one Bash command on one line
 * @property {string | null} [resets] when the usage limit resets, as the screen says it
 * @property {boolean} [extraUsage] the screen says paid extra usage is in use
 */

/**
 * Reads a plain pane capture (`tmux capture-pane -p`).
 * @param {string} capture the captured text
 * @param {string} name the session's name (`githerd-<job>`), which the prompt box's top rule ends in
 * @returns {Screen} what the pane shows
 */
export function readScreen(capture, name) {
    const lines = capture.split("\n").map((l) => l.trimEnd());
    const trimmed = lines.map((l) => l.trim());
    if (lines.some((l) => USAGE.test(l))) {
        const reset = lines.map((l) => /resets ([^\u00B7]+)/.exec(l)).find(Boolean);
        return {
            kind: "usage-limit",
            resets: reset ? reset[1].trim() : null,
            extraUsage: lines.some((l) => EXTRA_USAGE.test(l)),
        };
    }
    if (trimmed.includes("Do you want to proceed?")) return permission(lines);
    if (trimmed.includes("Ready to code?") || trimmed.some((l) => l.endsWith("Would you like to proceed?"))) {
        return { kind: "plan" };
    }
    if (trimmed.some((l) => l.startsWith("Enter to select"))) return { kind: "picker" };
    return promptBox(lines, name);
}

/**
 * The permission dialog: which agent raised it and, for one Bash command on one line, the exact
 * allow rule that would let it run.
 * @param {string[]} lines the capture's lines
 * @returns {Screen} the screen
 */
function permission(lines) {
    const head = lines.findLastIndex((l) => /^ ?\S.* command( \u00B7 from the .+ agent)?$/.test(l));
    const agent = head >= 0 ? (/ \u00B7 from the (.+) agent$/.exec(lines[head])?.[1] ?? null) : null;
    let rule = null;
    if (head >= 0 && lines[head].trim().startsWith("Bash command")) {
        const open = lines.findIndex((l, i) => i > head && l.startsWith(DASHED));
        const close = lines.findIndex((l, i) => i > open && l.startsWith(DASHED));
        const body = open >= 0 && close > open ? lines.slice(open + 1, close).map((l) => l.trim()) : [];
        if (body.length === 1 && /^[^()\n]+$/.test(body[0])) rule = `Bash(${body[0]})`;
    }
    return { kind: "permission", agent, rule };
}

/**
 * The prompt box at the bottom of the pane: empty, or holding text nobody but the owner typed
 * (workers have prompt suggestions turned off, design section 7.2).
 * @param {string[]} lines the capture's lines
 * @param {string} name the session's name
 * @returns {Screen} the screen
 */
function promptBox(lines, name) {
    const top = lines.findLastIndex((l) => l.startsWith(RULE) && l.endsWith(` ${name} ${RULE}`));
    const box = lines[top + 1];
    const bottom = lines[top + 2];
    if (top < 0 || !box?.startsWith(PROMPT) || !bottom || !/^\u2500+$/.test(bottom)) return { kind: "unknown" };
    const text = box
        .slice(PROMPT.length)
        .replace(/^[ \u00A0]/, "")
        .trimEnd();
    return text ? { kind: "owner-text", text } : { kind: "empty-box" };
}
