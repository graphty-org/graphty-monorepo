#!/usr/bin/env node
// The wording check: lists every word a task's prompt (or follow-up) shares with what the app shows
// on the screens its success path reaches -- visible words and controls' accessible names, as
// bars.mjs --tier 3 records them in vocabulary.json -- so no prompt names the control it needs.
// A shared word passes only when tasks.md keeps it on purpose: in the task's own
// "- **Kept on purpose:**" line or the "**Kept in every task:**" line, each word in backticks with
// its reason. Common English words (the list below) are never counted. Plurals match their singular.
//
//   node wording.mjs <tasks.md> <vocabulary.json>   prints each shared word by task; exit 1 on any
//   node wording.mjs --self-test                    plants an echo and checks it is caught
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// ponytail: a fixed list of common words; a word missing here shows up as a shared word to keep
const COMMON = new Set(
    `a about after again all also an and any are as at be been before but by can could do does done
    each else every for from get give go has have he her his how i if in into is it its just keep
    know last let like make many may me more most much must my new no not now of off on one only or
    other our out over own same say see she so some still than that the their them then there these
    they this those through to too two up us use want was way we were what when where which while
    who whom why will with without would you your yours already open opened ready-made tell how
    many number numbers people person show shows looks look first time never once again`
        .split(/\s+/)
        .filter(Boolean),
);
const stem = (w) =>
    w
        .toLowerCase()
        .replace(/['\u2019]s$/, "")
        .replace(/ies$/, "y")
        .replace(/(?<=[^s])s$/, "");
const tokens = (text) =>
    String(text)
        .split(/[^\p{L}\p{N}'-]+/u)
        .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
        .filter((w) => w.length > 1 && !/^\d/.test(w));

export function check(tasksText, vocab) {
    const screen = new Map(); // stem -> where it was seen
    for (const [where, v] of Object.entries(vocab))
        for (const w of [...(v.words ?? []), ...(v.names ?? []).flatMap(tokens)])
            for (const t of tokens(w)) {
                const s = stem(t);
                if (!screen.has(s)) screen.set(s, `${where}: "${t}"`);
            }
    const kept = (line) => new Set([...(line ?? "").matchAll(/`([^`]+)`/g)].map((m) => stem(m[1])));
    // a kept list runs from its label to the next bullet, heading or blank line
    const everywhere = kept(tasksText.match(/^\*\*Kept in every task:\*\*([\s\S]*?)(?=\n\s*\n|\n- |\n#)/m)?.[1]);
    const found = [];
    let prompts = 0;
    for (const sec of tasksText.split(/^(?=### T\d+)/m).filter((x) => x.startsWith("### T"))) {
        const task = sec.match(/^### (T\d+)/)[1];
        const ownKept = kept(sec.match(/^- \*\*Kept on purpose:\*\*([\s\S]*?)(?=\n- |\n\s*\n|\n#|$)/m)?.[1]);
        const said = [...sec.matchAll(/^\s*- (?:\*\*)?(?:Prompt [AB][^*]*|[AB])(?:\*\*)?:? "([^"]+)"/gm)].map(
            (m) => m[1],
        );
        prompts += said.length;
        for (const p of said)
            for (const t of tokens(p)) {
                const s = stem(t);
                if (COMMON.has(t.toLowerCase()) || COMMON.has(s) || everywhere.has(s) || ownKept.has(s)) continue;
                if (screen.has(s)) found.push({ task, word: t, seen: screen.get(s) });
            }
    }
    const unique = [...new Map(found.map((f) => [`${f.task} ${stem(f.word)}`, f])).values()];
    return { prompts, screens: Object.keys(vocab).length, shared: unique };
}

function selfTest() {
    const vocab = { "a card": { words: ["Which", "nodes", "Mixed"], names: ["Add a condition", "Layer 1"] } };
    const clean = `**Kept in every task:** \`node\` -- the app's own word for a dot is not asked for\n\n### T90. A\n\n- **Prompt A (x):** "Color the dots."\n`;
    const r0 = check(clean, vocab);
    assert.equal(r0.prompts, 1, "the prompt was not read");
    assert.deepEqual(r0.shared, [], `a clean prompt shares ${JSON.stringify(r0.shared)}`);
    for (const [what, prompt] of [
        ["a control's name", "Add a condition on the dots."],
        ["a word the screen shows, plural", "Make the layers red."],
        ["a bulk word", "Leave the mixed values alone."],
    ]) {
        const r = check(`### T91. B\n\n- **Prompt B (y):** "${prompt}"\n`, vocab);
        assert.ok(r.shared.length > 0, `missed ${what}: "${prompt}"`);
        console.log(`caught ${what}: ${r.shared.map((s) => `${s.word} (${s.seen})`).join(", ")}`);
    }
    const keptOnPurpose = check(
        `### T92. C\n\n- **Prompt A (z):** "Add a condition."\n- **Kept on purpose:** \`condition\`, \`add\` -- reason\n`,
        vocab,
    );
    assert.deepEqual(keptOnPurpose.shared, [], "a word kept on purpose was still reported");
    console.log("wording.mjs self-test: every planted echo caught, kept words pass");
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") selfTest();
else if (args.length === 2) {
    const r = check(readFileSync(args[0], "utf8"), JSON.parse(readFileSync(args[1], "utf8")));
    if (!r.prompts || !r.screens) {
        console.log(`FAIL: read ${r.prompts} prompts and ${r.screens} screens; a check over nothing checks nothing`);
        process.exitCode = 1;
    } else {
        for (const s of r.shared) console.log(`${s.task}: "${s.word}" is on screen (${s.seen})`);
        console.log(
            `${r.prompts} prompts against ${r.screens} screens: ${r.shared.length} shared word${r.shared.length === 1 ? "" : "s"} not kept on purpose`,
        );
        process.exitCode = r.shared.length ? 1 : 0;
    }
} else {
    console.error("usage: wording.mjs <tasks.md> <vocabulary.json> | --self-test");
    process.exitCode = 2;
}
