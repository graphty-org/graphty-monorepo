#!/usr/bin/env node
// The wording check: lists every word a task's prompt (or follow-up) shares with what the app shows
// on the screens its success path reaches -- visible words and controls' accessible names, as
// bars.mjs --tier 3 records them in vocabulary.json -- so no prompt names the control it needs.
// A shared word passes only when tasks.md keeps it on purpose: in the task's own
// "- **Kept on purpose:**" line or the "**Kept in every task:**" line, each word in backticks with
// its reason. Common English words (the list below) are never counted. A word's forms count as one
// word: plurals, -ed and -ing, and the irregular forms in IRREGULAR (draw, draws, drawn, drawing;
// pick, picked; keep, kept). Beside vocabulary.json it reads spoken.json, which bars.mjs writes from
// the same walk: what each screen says out loud (its controls' accessible names, what took focus,
// live regions and notices), so a word only a screen reader hears is caught too. A phrase of two or
// more words (common words included, but at least two that are not common) that a prompt shares with one
// screen's words, one control's name or one spoken line is reported as a phrase, even when each of
// its words is kept: a kept word passes, an echoed phrase does not. A phrase kept on purpose is
// listed in backticks like a word ("`color the dots`").
// A kept word the screens show is listed too ("kept, on screen"), never failed: a later build can put
// a kept word on screen (a fix that borrows a reader's word), and the round reads that list against
// the last round's to re-justify the word or report the task as primed.
//
//   node wording.mjs <tasks.md> <vocabulary.json>   prints each shared word and phrase by task; exit
//                                                   1 on any, or when spoken.json is not beside it
//   node wording.mjs --self-test                    plants each kind of echo and checks it is caught
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

// ponytail: a fixed list of common words; a word missing here shows up as a shared word to keep
const COMMON = new Set(
    `a about after again all also an and any are as at be been before but by can could do does done
    each else every for from get give go has have he her his how i if in into is it its just
    know last let like make many may me most much must my no not now of off on one only or
    other our out over own same say see she so some still than that the their them then there these
    they this those through to too two up us use want was way we were what when where which while
    who whom why will with without would you your yours already tell how many people person time
    never once again`
        .split(/\s+/)
        .filter(Boolean),
);
// irregular forms, each to the word it is a form of (a regular -s, -ed or -ing needs no line)
const IRREGULAR = Object.fromEntries(
    `drawn:draw drew:draw kept:keep shown:show chose:choose chosen:choose found:find ran:run wrote:write
    written:write built:build held:hold seen:see saw:see took:take taken:take gave:give given:give
    hid:hide hidden:hide brought:bring bought:buy thought:think told:tell sent:send spent:spend
    met:meet led:lead lost:lose won:win chosen:choose fell:fall fallen:fall grew:grow grown:grow
    knew:know known:know begun:begin began:begin broke:break broken:break stood:stand understood:understand`
        .split(/\s+/)
        .filter(Boolean)
        .map((p) => p.split(":")),
);
const plural = (w) =>
    w
        .replace(/['\u2019]s$/, "")
        .replace(/ies$/, "y")
        .replace(/(?<=[^s])s$/, "");
// every word a form could be of: itself and, for -ed and -ing, the word with the ending taken off
// (picked: pick; named: name; stopped: stop; coloring: color; making: make), each of 3 letters or
// more, so "red" and "used" stay themselves and "used" still meets "use"
function stems(w) {
    const l = w.toLowerCase();
    if (IRREGULAR[l]) return [IRREGULAR[l]];
    const p = plural(l);
    const out = new Set([p]);
    const add = (b) => b.length >= 3 && out.add(b);
    const ending = p.match(/^(.+?)(ed|ing)$/);
    if (ending && p.length >= 5) {
        const base = ending[1];
        add(base);
        add(base + "e");
        if (/([b-df-hj-np-tv-z])\1$/.test(base)) add(base.slice(0, -1));
        if (ending[2] === "ed" && base.endsWith("i")) add(base.slice(0, -1) + "y");
    }
    return [...out];
}
const stem = (w) => stems(w)[0];
const tokens = (text) =>
    String(text)
        .split(/[^\p{L}\p{N}'-]+/u)
        .map((w) => w.replace(/^['-]+|['-]+$/g, ""))
        .filter((w) => w.length > 1 && !/^\d/.test(w));

// the quoted words of a spoken line ('focus: button "Main menu"', 'live: status (polite): "..."'):
// the role words around them are the tool's, not the app's
const quoted = (line) => [...String(line).matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((m) => m[1]);
// Every run of words a screen shows or says, each a list of words in order: one screen's words, one
// control's name, one spoken line
function runsOf(vocab, spoken) {
    const runs = [];
    for (const [where, v] of Object.entries(vocab)) {
        runs.push({ where, words: (v.words ?? []).flatMap(tokens) });
        for (const n of v.names ?? []) runs.push({ where, words: tokens(n) });
    }
    for (const [where, v] of Object.entries(spoken ?? {})) {
        for (const n of v.names ?? []) runs.push({ where: `${where}, spoken`, words: tokens(n) });
        for (const l of v.said ?? [])
            for (const q of quoted(l)) runs.push({ where: `${where}, spoken`, words: tokens(q) });
    }
    return runs;
}
const meets = (a, b) => stems(a).some((x) => stems(b).includes(x));
const common = (t) => stems(t).some((s) => COMMON.has(s)) || COMMON.has(t.toLowerCase());

export function check(tasksText, vocab, spoken = {}) {
    const screen = new Map(); // stem -> where it was seen
    const runs = runsOf(vocab, spoken);
    for (const r of runs)
        for (const t of r.words) for (const s of stems(t)) if (!screen.has(s)) screen.set(s, `${r.where}: "${t}"`);
    // the longest run of two or more prompt words, two of them not common, that one screen run holds
    // in order, within one sentence of the prompt ("Open the" is one word and "the": the word check's)
    const phrasesOf = (prompt) => prompt.split(/[.!?;:]+/).flatMap(phrasesIn);
    const phrasesIn = (sentence) => {
        const p = tokens(sentence);
        const out = [];
        for (let i = 0; i < p.length; i++) {
            let best = null;
            for (const r of runs)
                for (let j = 0; j < r.words.length; j++) {
                    let n = 0;
                    while (i + n < p.length && j + n < r.words.length && meets(p[i + n], r.words[j + n])) n++;
                    if (n >= 2 && (!best || n > best.n) && p.slice(i, i + n).filter((t) => !common(t)).length >= 2)
                        best = { n, where: `${r.where}: "${r.words.slice(j, j + n).join(" ")}"` };
                }
            if (best) {
                out.push({ phrase: p.slice(i, i + best.n).join(" "), seen: best.where });
                i += best.n - 1;
            }
        }
        return out;
    };
    const keptItems = (line) => [...(line ?? "").matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    const kept = (line) => new Set(keptItems(line).flatMap(stems));
    const keptPhrases = (line) =>
        keptItems(line)
            .filter((k) => k.includes(" "))
            .map((k) => tokens(k).map(stem).join(" "));
    // a kept list runs from its label to the next bullet, heading or blank line
    const everyLine = tasksText.match(/^\*\*Kept in every task:\*\*([\s\S]*?)(?=\n\s*\n|\n- |\n#)/m)?.[1];
    const everywhere = kept(everyLine);
    const found = [];
    const phrases = [];
    const keptSeen = [];
    let prompts = 0;
    for (const sec of tasksText.split(/^(?=### T\d+)/m).filter((x) => x.startsWith("### T"))) {
        const task = sec.match(/^### (T\d+)/)[1];
        // to the next bullet, blank line or heading, or the section's end ($ under /m is a line end)
        const ownLine = sec.match(/^- \*\*Kept on purpose:\*\*([\s\S]*?)(?=\n- |\n\s*\n|\n#|(?![\s\S]))/m)?.[1];
        const ownKept = kept(ownLine);
        const keptPhrase = new Set([...keptPhrases(everyLine), ...keptPhrases(ownLine)]);
        const said = [...sec.matchAll(/^\s*- (?:\*\*)?(?:Prompt [AB][^*]*|[AB])(?:\*\*)?:? "([^"]+)"/gm)].map(
            (m) => m[1],
        );
        prompts += said.length;
        for (const p of said) {
            for (const t of tokens(p)) {
                if (common(t)) continue;
                const s = stems(t).find((x) => screen.has(x));
                if (!s) continue;
                const isKept = stems(t).some((x) => everywhere.has(x) || ownKept.has(x));
                (isKept ? keptSeen : found).push({ task, word: t, seen: screen.get(s) });
            }
            for (const ph of phrasesOf(p))
                if (!keptPhrase.has(tokens(ph.phrase).map(stem).join(" "))) phrases.push({ task, ...ph });
        }
    }
    const unique = (xs) => [...new Map(xs.map((f) => [`${f.task} ${stem(f.word)}`, f])).values()];
    return {
        prompts,
        screens: Object.keys(vocab).length,
        spoken: Object.keys(spoken).length,
        shared: unique(found),
        phrases: [...new Map(phrases.map((f) => [`${f.task} ${f.phrase.toLowerCase()}`, f])).values()],
        keptOnScreen: unique(keptSeen),
    };
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
    assert.equal(keptOnPurpose.keptOnScreen.length, 2, "a kept word on screen was not listed as kept, on screen");
    const keptOnTwoLines = check(
        `### T93. D\n\n- **Prompt A (z):** "Add a condition."\n- **Kept on purpose:** \`condition\` -- reason\n  \`add\` -- reason\n`,
        vocab,
    );
    assert.deepEqual(keptOnTwoLines.shared, [], "a kept word on the kept line's second line was still reported");
    // an irregular form: the prompt says "drawn", the screen "Draw"; and "kept" against "Keep"
    const forms = { "a menu": { words: ["Draw", "Keep", "Pick"], names: [] } };
    for (const [what, prompt, word] of [
        ["an irregular form", "Have the dots drawn bigger.", "drawn"],
        ["another irregular form", "The dots are kept apart.", "kept"],
        ["a regular -ed form", "The dots I picked.", "picked"],
    ]) {
        const r = check(
            `### T94. E

- **Prompt A (z):** "${prompt}"
`,
            forms,
        );
        assert.ok(
            r.shared.some((x) => x.word === word),
            `missed ${what}: "${word}" against ${JSON.stringify(forms)} (${JSON.stringify(r.shared)})`,
        );
        console.log(`caught ${what}: ${r.shared.map((x) => `${x.word} (${x.seen})`).join(", ")}`);
    }
    assert.deepEqual(
        check(
            `### T94. E

- **Prompt A (z):** "Make them red, as named before."
`,
            {
                s: { words: ["Redo", "Name"], names: [] },
            },
        ).shared.map((x) => x.word),
        ["named"],
        "a short word was taken for a form of a longer one, or named missed name",
    );
    // a word only spoken.json holds: an accessible name and a live region's words, never on screen
    const spoken = {
        "a color just added": {
            names: ["Node color, Not set yet"],
            said: ['focus: combobox "Pick a tint"', 'live: status (polite): "Brightened the dots"'],
        },
    };
    for (const [what, prompt, word] of [
        ["an echo only an accessible name holds", "Leave the rest not set.", "set"],
        ["an echo only focus speaks", "Give them a tint.", "tint"],
        ["an echo only a live region speaks", "Brighten them.", "Brighten"],
    ]) {
        const r = check(
            `### T95. F

- **Prompt A (z):** "${prompt}"
`,
            vocab,
            spoken,
        );
        assert.ok(
            r.shared.some((x) => x.word === word),
            `missed ${what}: ${JSON.stringify(r.shared)}`,
        );
        console.log(`caught ${what}: ${r.shared.map((x) => `${x.word} (${x.seen})`).join(", ")}`);
    }
    // a phrase: each of its words kept on purpose (or common), the phrase itself still an echo
    const phrase = check(
        `**Kept in every task:** \`color\`, \`dots\` -- reason

### T96. G

- **Prompt A (z):** "Please color the dots green."
`,
        { "a menu": { words: [], names: ["Color the dots"] } },
    );
    assert.deepEqual(phrase.shared, [], "a kept word was reported as a word");
    assert.deepEqual(
        phrase.phrases.map((x) => x.phrase),
        ["color the dots"],
        `missed a phrase of kept and common words: ${JSON.stringify(phrase.phrases)}`,
    );
    console.log(`caught a shared phrase: ${phrase.phrases.map((x) => `"${x.phrase}" (${x.seen})`).join(", ")}`);
    const spokenPhrase = check(
        `### T97. H

- **Prompt A (z):** "Brighten the dots there."
`,
        vocab,
        spoken,
    );
    assert.ok(
        spokenPhrase.phrases.some((x) => x.phrase === "Brighten the dots"),
        `missed a phrase only spoken.json holds: ${JSON.stringify(spokenPhrase.phrases)}`,
    );
    console.log(`caught a spoken phrase: ${spokenPhrase.phrases.map((x) => `"${x.phrase}" (${x.seen})`).join(", ")}`);
    const keptPhrase = check(
        `### T98. I

- **Prompt A (z):** "Please color the dots green."
- **Kept on purpose:** \`color\`, \`dots\`, \`color the dots\` -- reason
`,
        { "a menu": { words: [], names: ["Color the dots"] } },
    );
    assert.deepEqual(keptPhrase.phrases, [], "a phrase kept on purpose was still reported");
    assert.deepEqual(
        check(
            `### T99. J

- **Prompt A (z):** "All of the dots."
`,
            { m: { words: ["all", "of", "the"], names: [] } },
        ).phrases,
        [],
        "a phrase of common words only was reported",
    );
    assert.deepEqual(
        check(`### T99. K\n\n- **Prompt A (z):** "Leave it opened. The dots stay."\n`, {
            m: { words: [], names: ["Open the dots"] },
        }).phrases,
        [],
        "a phrase across two sentences, or of one word and a common one, was reported",
    );
    console.log("wording.mjs self-test: every planted echo caught, kept words pass");
}

const args = process.argv.slice(2);
if (args[0] === "--self-test") selfTest();
else if (args.length === 2) {
    // what the screens say out loud, written by the same walk beside vocabulary.json
    const spokenFile = join(dirname(resolve(args[1])), "spoken.json");
    const spoken = existsSync(spokenFile) ? JSON.parse(readFileSync(spokenFile, "utf8")) : null;
    const r = check(readFileSync(args[0], "utf8"), JSON.parse(readFileSync(args[1], "utf8")), spoken ?? {});
    if (!r.prompts || !r.screens || !r.spoken) {
        console.log(
            `FAIL: read ${r.prompts} prompts, ${r.screens} screens and ${r.spoken} screens' spoken text${spoken ? "" : ` (no ${spokenFile})`}; a check over nothing checks nothing`,
        );
        process.exitCode = 1;
    } else {
        for (const s of r.keptOnScreen) console.log(`${s.task}: "${s.word}" kept, on screen (${s.seen})`);
        for (const s of r.shared) console.log(`${s.task}: "${s.word}" is on screen (${s.seen})`);
        for (const s of r.phrases) console.log(`${s.task}: the phrase "${s.phrase}" is on screen (${s.seen})`);
        console.log(
            `${r.prompts} prompts against ${r.screens} screens and their spoken text: ${r.shared.length} shared word${r.shared.length === 1 ? "" : "s"} and ${r.phrases.length} shared phrase${r.phrases.length === 1 ? "" : "s"} not kept on purpose`,
        );
        process.exitCode = r.shared.length || r.phrases.length ? 1 : 0;
    }
} else {
    console.error("usage: wording.mjs <tasks.md> <vocabulary.json> | --self-test");
    process.exitCode = 2;
}
