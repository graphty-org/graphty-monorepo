// The slot grammar of the chip sentence (design section 9.8): a verb, then the slots its template
// names, each filled from a vocabulary built from the data (node names, result names). A sentence
// is a list of chips; each chip keeps its top alternatives, so poking it can fix one word. Words
// that fit nowhere become unparsed chips ("?"), slots nothing filled become missing chips. The same
// functions build a sentence by poking alone, verb first. Pure: no Babylon, no DOM.

import type { CommandCode, CommandParams } from "../../core/commands";
import { rank, type VocabEntry } from "./matcher";

/** What a slot holds. */
export type SlotKind = "verb" | "word" | "target" | "node" | "result" | "number" | "op" | "extra";

/** The words the grammar knows about the loaded graph. */
export interface Lexicon {
    /** Node names, by index. */
    nodes: readonly string[];
    /** Result ids and their names ("pagerank", "PageRank"). */
    results: readonly { id: string; label: string }[];
}

/** One chip of the sentence. */
export interface SentenceChip {
    kind: SlotKind;
    /** The value the command gets (a result id, a node index, a verb), or null when unparsed or missing. */
    value: string | null;
    /** What the chip shows. */
    text: string;
    state: "ok" | "unparsed" | "missing";
    /** What was heard, for an unparsed chip. */
    heard?: string;
    /** The best other values, at most three, best first. */
    alternatives: string[];
    /** Token range it came from; from === to for a chip nobody said. */
    from: number;
    to: number;
}

/** A slot of a template. */
interface Slot {
    kind: Exclude<SlotKind, "verb" | "extra">;
    /** The word, for a "word" slot ("by", "hops"). */
    word?: string;
    /** The value used when the slot is not said. */
    fallback?: string;
}

/** The verbs, their spoken forms and their templates. */
const VERBS: Record<string, { spoken: string[]; slots: Slot[] }> = {
    color: {
        spoken: ["color", "colour", "paint", "shade"],
        slots: [{ kind: "target", fallback: "all" }, { kind: "word", word: "by" }, { kind: "result" }],
    },
    size: {
        spoken: ["size", "scale"],
        slots: [{ kind: "target", fallback: "all" }, { kind: "word", word: "by" }, { kind: "result" }],
    },
    run: { spoken: ["run", "compute", "calculate"], slots: [{ kind: "result" }] },
    select: { spoken: ["select", "pick", "choose"], slots: [{ kind: "target" }] },
    grow: {
        spoken: ["grow", "expand"],
        slots: [{ kind: "node" }, { kind: "number" }, { kind: "word", word: "hops" }],
    },
    keep: {
        spoken: ["keep", "filter"],
        slots: [{ kind: "result" }, { kind: "op" }, { kind: "number" }],
    },
    hide: { spoken: ["hide"], slots: [{ kind: "target" }] },
    show: { spoken: ["show", "unhide"], slots: [{ kind: "target" }] },
    undo: { spoken: ["undo"], slots: [] },
    save: { spoken: ["save"], slots: [] },
};

/** Words said between slots that carry nothing. */
const FILLER = new Set(["please", "now", "the", "a", "an", "then", "ok", "okay", "um", "uh", "and", "of"]);

const WORD_FORMS: Record<string, string[]> = { by: ["by", "buy", "bye"], hops: ["hops", "hop", "steps", "step"] };
const NUMBER_WORDS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten"];
const NUMBER_SOUNDS: Record<string, number> = { to: 2, too: 2, for: 4, won: 1, ate: 8 };

/** How alike a heard span must be to take a slot. */
const ACCEPT = 0.6;
/** The longest span of words one chip may take ("at least", "page rank"). */
const MAX_SPAN = 3;

/**
 * Split heard text into lowercase words.
 * @param text - the transcript
 * @returns its words
 */
export function tokenize(text: string): string[] {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9.\s]/g, " ")
        .split(/\s+/)
        .filter((w) => w && w !== ".");
}

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * The vocabulary of a slot kind.
 * @param kind - the slot kind
 * @param lex - the graph's words
 * @param word - the word, for a "word" slot
 * @returns its entries
 */
export function vocabulary(kind: SlotKind, lex: Lexicon, word?: string): VocabEntry[] {
    const nodes = (): VocabEntry[] => lex.nodes.map((n, i) => ({ id: String(i), label: n, spoken: [n.toLowerCase()] }));
    switch (kind) {
        case "verb":
            return Object.entries(VERBS).map(([id, v]) => ({ id, label: id, spoken: v.spoken }));
        case "word":
            return [{ id: word ?? "", label: word ?? "", spoken: WORD_FORMS[word ?? ""] ?? [word ?? ""] }];
        case "target":
            return [
                {
                    id: "these",
                    label: "these",
                    spoken: ["these", "this", "that", "those", "them", "it", "selection", "selected", "this one"],
                },
                { id: "all", label: "all", spoken: ["all", "everything", "every node", "all nodes", "every family"] },
                ...nodes(),
            ];
        case "node":
            return [{ id: "this", label: "this", spoken: ["this", "that", "it", "this one"] }, ...nodes()];
        case "result":
            return lex.results.map((r) => ({
                id: r.id,
                label: cap(r.label),
                // "PageRank" is also said "page rank"; squash makes both the same text.
                spoken: [r.label.toLowerCase(), r.id],
            }));
        case "op":
            return [
                { id: ">=", label: "at least", spoken: ["at least", "above", "over", "more than", "greater than"] },
                { id: "<=", label: "at most", spoken: ["at most", "below", "under", "less than", "fewer than"] },
            ];
        case "number":
            return ["1", "2", "3", "4", "0.05", "0.1", "0.2", "0.5"].map((n) => ({ id: n, label: n, spoken: [n] }));
        default:
            return [];
    }
}

/**
 * Read a number from one or a few words: digits, "two", "to", "point one".
 * @param words - the words
 * @returns the number as text, or null
 */
function readNumber(words: string[]): string | null {
    const one = (w: string): number | null => {
        if (/^\d+(\.\d+)?$/.test(w) || /^\.\d+$/.test(w)) {
            return Number(w);
        }
        const i = NUMBER_WORDS.indexOf(w);
        return i >= 0 ? i : (NUMBER_SOUNDS[w] ?? null);
    };
    if (words.length === 1) {
        const n = one(words[0]);
        return n === null ? null : String(n);
    }
    // "point one", "zero point five"
    const at = words.indexOf("point");
    if (words.length <= 3 && at >= 0 && at === words.length - 2) {
        const whole = at === 0 ? 0 : one(words[0]);
        const frac = one(words[at + 1]);
        if (whole !== null && frac !== null && Number.isInteger(frac)) {
            return String(Number(`${whole}.${frac}`));
        }
    }
    return null;
}

/**
 * The best chip a slot can make from the words at `i`, or null.
 * @param tokens - the words
 * @param i - where to start
 * @param slot - the slot
 * @param lex - the graph's words
 * @returns the chip and how many words it took
 */
function fill(tokens: string[], i: number, slot: Slot | { kind: "verb" }, lex: Lexicon): SentenceChip | null {
    let best: SentenceChip | null = null;
    let bestScore = -1;
    const max = slot.kind === "verb" || slot.kind === "word" ? 1 : MAX_SPAN;
    for (let len = 1; len <= max && i + len <= tokens.length; len++) {
        const words = tokens.slice(i, i + len);
        if (slot.kind === "number") {
            const n = readNumber(words);
            if (n !== null) {
                return chipFor("number", n, lex, i, i + len);
            }
            continue;
        }
        const ranked = rank(words.join(" "), vocabulary(slot.kind, lex, "word" in slot ? slot.word : undefined));
        // A longer span must earn its extra words.
        const score = (ranked[0]?.score ?? 0) - 0.02 * (len - 1);
        if (ranked.length && ranked[0].score >= ACCEPT && score > bestScore) {
            bestScore = score;
            best = {
                kind: slot.kind,
                value: ranked[0].entry.id,
                text: ranked[0].entry.label,
                state: "ok",
                alternatives: ranked.slice(1, 4).map((c) => c.entry.id),
                from: i,
                to: i + len,
            };
        }
    }
    return best;
}

/**
 * A chip for a value chosen by poking (or a number read from speech).
 * @param kind - the slot kind
 * @param value - the value
 * @param lex - the graph's words
 * @param from - token start
 * @param to - token end
 * @param word - the word, for a "word" slot
 * @returns the chip, its alternatives ranked by how its text sounds
 */
export function chipFor(kind: SlotKind, value: string, lex: Lexicon, from = 0, to = from, word?: string): SentenceChip {
    const vocab = vocabulary(kind, lex, word);
    const entry = vocab.find((e) => e.id === value);
    const text = entry?.label ?? value;
    return {
        kind,
        value,
        text,
        state: "ok",
        alternatives: rank(text, vocab)
            .filter((c) => c.entry.id !== value)
            .slice(0, 3)
            .map((c) => c.entry.id),
        from,
        to,
    };
}

const missing = (kind: SlotKind, at: number): SentenceChip => ({
    kind,
    value: null,
    text: "?",
    state: "missing",
    alternatives: [],
    from: at,
    to: at,
});

const unparsed = (kind: SlotKind, heard: string, at: number): SentenceChip => ({
    kind,
    value: null,
    text: `${heard}?`,
    state: "unparsed",
    heard,
    alternatives: [],
    from: at,
    to: at + 1,
});

/**
 * The chips a verb's slots make when nothing was said for them.
 * @param verb - the verb id
 * @param lex - the graph's words
 * @param at - token position for the chips
 * @returns one chip per slot
 */
function emptySlots(verb: string, lex: Lexicon, at: number): SentenceChip[] {
    return VERBS[verb].slots.map((s) => {
        if (s.kind === "word") {
            return chipFor("word", s.word ?? "", lex, at, at, s.word);
        }
        return s.fallback ? chipFor(s.kind, s.fallback, lex, at, at) : missing(s.kind, at);
    });
}

/**
 * Parse heard text into chips.
 * @param text - the transcript
 * @param lex - the graph's words
 * @returns the chips, verb first
 */
export function parse(text: string, lex: Lexicon): SentenceChip[] {
    const tokens = tokenize(text);
    const out: SentenceChip[] = [];
    let i = 0;
    const skipFiller = (): void => {
        while (i < tokens.length && FILLER.has(tokens[i])) {
            i++;
        }
    };
    skipFiller();
    if (i >= tokens.length) {
        return [missing("verb", 0)];
    }
    // The verb: the first word that is one; words before it are unparsed.
    let verb: SentenceChip | null = null;
    while (i < tokens.length && !verb) {
        verb = fill(tokens, i, { kind: "verb" }, lex);
        if (!verb) {
            out.push(unparsed("verb", tokens[i], i));
            i++;
            skipFiller();
        }
    }
    if (!verb?.value) {
        return out;
    }
    out.push(verb);
    i = verb.to;
    const { slots } = VERBS[verb.value];
    for (let s = 0; s < slots.length; s++) {
        const slot = slots[s];
        skipFiller();
        const got = i < tokens.length ? fill(tokens, i, slot, lex) : null;
        if (got) {
            out.push(got);
            i = got.to;
            continue;
        }
        if (slot.kind === "word") {
            // A word nobody said ("color these pagerank") is shown anyway.
            out.push(chipFor("word", slot.word ?? "", lex, i, i, slot.word));
            continue;
        }
        // Not said here if the word fits the next slot; else it is a misheard word for this slot.
        const next = slots[s + 1];
        const fitsNext = next && i < tokens.length && fill(tokens, i, next, lex);
        if (i >= tokens.length || fitsNext) {
            out.push(slot.fallback ? chipFor(slot.kind, slot.fallback, lex, i, i) : missing(slot.kind, i));
            continue;
        }
        out.push(unparsed(slot.kind, tokens[i], i));
        i++;
    }
    skipFiller();
    while (i < tokens.length) {
        out.push(unparsed("extra", tokens[i], i));
        i++;
        skipFiller();
    }
    return out;
}

/**
 * What poking a chip offers: its top three alternatives, then the rest of its slot's vocabulary.
 * @param chips - the sentence
 * @param index - the poked chip
 * @param lex - the graph's words
 * @returns value ids: top first, then the vocabulary; an extra chip offers only "remove"
 */
export function choices(chips: readonly SentenceChip[], index: number, lex: Lexicon): { top: string[]; all: string[] } {
    const c = chips[index];
    if (c.kind === "extra") {
        return { top: ["remove"], all: ["remove"] };
    }
    const vocab = vocabulary(c.kind, lex, c.kind === "word" ? (c.value ?? undefined) : undefined);
    const ranked = c.heard ? rank(c.heard, vocab).map((r) => r.entry.id) : [];
    const top = (c.state === "ok" ? c.alternatives : ranked).filter((v) => v !== c.value).slice(0, 3);
    const all = vocab.map((e) => e.id).filter((v) => !top.includes(v) && v !== c.value);
    return { top, all };
}

/**
 * The label a value has in a chip's slot.
 * @param kind - the slot kind
 * @param value - the value id
 * @param lex - the graph's words
 * @returns the label
 */
export function labelOf(kind: SlotKind, value: string, lex: Lexicon): string {
    if (value === "remove") {
        return "remove";
    }
    return vocabulary(kind, lex).find((e) => e.id === value)?.label ?? value;
}

/**
 * Put a value into a chip. Choosing a verb rebuilds the sentence on that verb's template, keeping
 * the values of slots both templates have.
 * @param chips - the sentence
 * @param index - the chip
 * @param value - the chosen value ("remove" deletes an extra chip)
 * @param lex - the graph's words
 * @returns the new sentence
 */
export function choose(chips: readonly SentenceChip[], index: number, value: string, lex: Lexicon): SentenceChip[] {
    const c = chips[index];
    if (value === "remove") {
        return chips.filter((_, i) => i !== index);
    }
    if (c.kind !== "verb") {
        const next = chips.slice();
        next[index] = chipFor(c.kind, value, lex, c.from, c.to, c.kind === "word" ? (c.value ?? undefined) : undefined);
        return next;
    }
    const fresh = emptySlots(value, lex, c.to);
    const old = chips.slice(index + 1);
    for (const slot of fresh) {
        const keep = old.find((o) => o.kind === slot.kind && o.state === "ok" && slot.kind !== "word");
        if (keep) {
            Object.assign(slot, keep);
            old.splice(old.indexOf(keep), 1);
        }
    }
    return [chipFor("verb", value, lex, c.from, c.to), ...fresh];
}

/**
 * Whether the sentence can run: a verb, and every chip filled.
 * @param chips - the sentence
 * @returns true when Run may be poked
 */
export const complete = (chips: readonly SentenceChip[]): boolean =>
    chips.length > 0 && chips[0].kind === "verb" && chips.every((c) => c.state === "ok");

/** A command the sentence means, or why it cannot run. */
export type Intent =
    { [C in CommandCode]: { code: C; params: CommandParams[C] } }[CommandCode] | { code: "undo" } | { error: string };

/** What "these" and "this" point at. */
export interface Deixis {
    selection: readonly number[];
    /** The node the dominant hand pointed at when the speech began, or -1. */
    hovered: number;
}

/**
 * Turn a complete sentence into a command.
 * @param chips - the sentence
 * @param lex - the graph's words
 * @param here - the selection and the hovered node
 * @returns the command, or an error naming what is missing
 */
export function intent(chips: readonly SentenceChip[], lex: Lexicon, here: Deixis): Intent {
    if (!complete(chips)) {
        return { error: "incomplete" };
    }
    const of = (kind: SlotKind): string => chips.find((c) => c.kind === kind)?.value ?? "";
    const ids = (): number[] => {
        const t = of("target") || of("node");
        if (t === "all") {
            return lex.nodes.map((_, i) => i);
        }
        if (t === "these" || t === "this") {
            if (here.selection.length) {
                return [...here.selection];
            }
            return here.hovered >= 0 ? [here.hovered] : [];
        }
        return [Number(t)];
    };
    switch (of("verb")) {
        case "color":
            return { code: "colorBy", params: { result: of("result") } };
        case "size":
            return { code: "sizeBy", params: { result: of("result") } };
        case "run":
            return { code: "run", params: { result: of("result") } };
        case "select":
        case "hide":
        case "show": {
            const list = ids();
            if (!list.length) {
                return { error: "nothing selected or pointed at" };
            }
            const verb = of("verb") as "select" | "hide" | "show";
            return verb === "select"
                ? { code: "select", params: { ids: list } }
                : { code: verb, params: { ids: list } };
        }
        case "grow": {
            const [id] = ids();
            if (id === undefined) {
                return { error: "nothing selected or pointed at" };
            }
            return { code: "neighbors", params: { id, hops: Math.max(0, Math.round(Number(of("number")))) } };
        }
        case "keep":
            return {
                code: "filter",
                params: { result: of("result"), op: of("op") === "<=" ? "<=" : ">=", value: Number(of("number")) },
            };
        case "undo":
            return { code: "undo" };
        case "save":
            return { code: "save", params: {} };
        default:
            return { error: "no verb" };
    }
}

/**
 * The sentence as plain text, for the log.
 * @param chips - the sentence
 * @returns the chip texts joined by spaces
 */
export const sentenceText = (chips: readonly SentenceChip[]): string => chips.map((c) => c.text).join(" ");
