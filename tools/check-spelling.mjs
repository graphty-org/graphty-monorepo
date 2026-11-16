#!/usr/bin/env node
// American spelling in prose and comments (issue #671): the project is written in American English.
//
//   node tools/check-spelling.mjs [file...]        fail on a British spelling in these files (default: every tracked file)
//   node tools/check-spelling.mjs --fix [file...]  rewrite them in American spelling instead
//
// It reads Markdown and text whole, and only the comments of code (TypeScript and JavaScript), CSS, WGSL,
// YAML, shell and HTML; other files (JSON, data, fixtures) are not read. Left alone, as names and data that
// are not ours to respell: code and quotes (`...`, "...", fenced blocks, {@link ...}, JSDoc @param names), camelCase,
// snake_case and CONSTANT names (public names keep their spelling until they are renamed with an alias),
// URLs, link targets and file names, GitHub Actions' cancelled(), the Graph Modelling Language (GML's name), event names ending -cancelled, aria-labelledby, and
// the paths in SKIP (lockfiles, changelogs, transcripts, screenshots, fixtures and test corpora, and the
// files that guard the owner).
// Runs in CI's lint job and in .husky/pre-push on the files a branch changes.
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const OUR = [
    "colour",
    "behaviour",
    "neighbour",
    "honour",
    "favour",
    "flavour",
    "harbour",
    "labour",
    "humour",
    "rumour",
    "vapour",
    "armour",
    "odour",
    "endeavour",
    "vigour",
    "rigour",
    "tumour",
    "savour",
    "parlour",
    "clamour",
    "splendour",
];

// -ise / -isation words, by stem: normalise, normalised, normalisation, normaliser, ...
const ISE_STEMS = [
    "normal",
    "denormal",
    "serial",
    "deserial",
    "recogn",
    "organ",
    "initial",
    "optim",
    "visual",
    "summar",
    "priorit",
    "minim",
    "maxim",
    "custom",
    "final",
    "material",
    "random",
    "synchron",
    "standard",
    "categor",
    "emphas",
    "real",
    "util",
    "author",
    "capital",
    "character",
    "special",
    "general",
    "central",
    "stabil",
    "equal",
    "apolog",
    "critic",
    "memor",
    "memo",
    "symbol",
    "harmon",
    "modern",
    "neutral",
    "parallel",
    "personal",
    "polar",
    "quant",
    "regular",
    "token",
    "sanit",
    "local",
    "global",
    "linear",
    "discret",
    "vector",
    "raster",
    "binar",
    "canonical",
    "virtual",
    "contextual",
    "conceptual",
    "item",
    "scrutin",
    "theor",
    "hypothes",
    "legal",
    "mobil",
    "penal",
    "rational",
    "trivial",
    "parameter",
    "modular",
    "anonym",
    "digit",
    "magnet",
    "privat",
    "pressur",
    "subsid",
    "sympath",
    "synthes",
    "systemat",
    "familiar",
    "fertil",
    "steril",
    "vandal",
    "vocal",
    "monet",
    "industrial",
    "commercial",
    "internal",
    "external",
    "formal",
    "individual",
    "marginal",
    "metabol",
    "miniatur",
    "monopol",
    "oxid",
    "patron",
    "plagiar",
    "popular",
    "radical",
    "secular",
    "sensit",
    "social",
    "spiritual",
    "stigmat",
    "tranquil",
    "urban",
    "western",
    "jeopard",
    "colon",
    "crystal",
    "democrat",
    "econom",
    "energ",
    "epitom",
    "fantas",
    "homogen",
    "ideal",
    "idol",
    "immun",
    "journal",
    "legitim",
    "liberal",
    "mechan",
    "moral",
    "national",
    "natural",
    "nominal",
    "revolution",
    "satir",
    "scandal",
    "terror",
    "lemmat",
    "relativ",
    "templat",
    "container",
    "component",
    "amort",
    "agon",
    "trivial",
    "dramat",
    "symmetr",
    "rhapsod",
    "verbal",
    "victim",
    "tyrann",
    "unrecogn",
    "uninitial",
    "unoptim",
    "unnormal",
    "unauthor",
    "reorgan",
    "reinitial",
    "decentral",
    "desynchron",
    "desensit",
    "color",
];

const DOUBLE_L = [
    "cancel",
    "label",
    "model",
    "travel",
    "signal",
    "level",
    "channel",
    "tunnel",
    "fuel",
    "total",
    "marshal",
    "funnel",
    "panel",
    "counsel",
    "dial",
    "swivel",
    "unravel",
    "rival",
    "shovel",
    "grovel",
    "revel",
    "bevel",
    "pencil",
    "stencil",
    "equal",
];

/** @type {Array<[RegExp, string]>} */
export const RULES = [
    ...OUR.map((w) => [new RegExp(w, "gi"), w.replace(/our$/, "or")]),
    ...ISE_STEMS.map((s) => [new RegExp(`(?<=${s})is(?=e[sdr]?s?\\b|ing|ation|able|ability)`, "gi"), "iz"]),
    ...DOUBLE_L.map((w) => [new RegExp(`(?<=${w})l(?=ed|ing|ers?\\b)`, "gi"), ""]),
    [/(?<=analy|paraly|cataly)s(?=e[dr]?s?\b|e\b|ing)(?!es\b)/gi, "z"],
    [/catalogu(?=ed|ing)/gi, "catalog"],
    [/catalogue/gi, "catalog"],
    [/analogue/gi, "analog"],
    [/centred/gi, "centered"],
    [/centring/gi, "centering"],
    [/centre/gi, "center"],
    [/metre/gi, "meter"],
    [/litre/gi, "liter"],
    [/fibre/gi, "fiber"],
    [/theatre/gi, "theater"],
    [/calibre/gi, "caliber"],
    [/meagre/gi, "meager"],
    [/sombre/gi, "somber"],
    [/grey/gi, "gray"],
    [/licenc(?=e|es|ed|ing)/gi, "licens"],
    [/defence/gi, "defense"],
    [/offence/gi, "offense"],
    [/pretence/gi, "pretense"],
    [/practis(?=e|ed|es|ing)/gi, "practic"],
    [/programme(?![dr])/gi, "program"],
    [/judgement/gi, "judgment"],
    [/acknowledgement/gi, "acknowledgment"],
    [/artefact/gi, "artifact"],
    [/sceptic/gi, "skeptic"],
    [/manoeuvred/gi, "maneuvered"],
    [/manoeuvring/gi, "maneuvering"],
    [/manoeuvre/gi, "maneuver"],
    [/fulfil(?!l)/gi, "fulfill"],
    [/instalment/gi, "installment"],
    [/skilful/gi, "skillful"],
    [/wilful/gi, "willful"],
    [/aluminium/gi, "aluminum"],
    [/ageing/gi, "aging"],
    [/focuss(?=ed|ing)/gi, "focus"],
    [/benefitt(?=ed|ing)/gi, "benefit"],
    [/targett(?=ed|ing)/gi, "target"],
    [/encyclopaedia/gi, "encyclopedia"],
    [/jewellery/gi, "jewelry"],
];

/** The same text with the case of `like` (all capitals, a leading capital or as given). */
function keepCase(to, like) {
    if (to === "") return to;
    if (like.length > 1 && like === like.toUpperCase()) return to.toUpperCase();
    if (like[0] === like[0].toUpperCase() && like[0] !== like[0].toLowerCase())
        return to[0].toUpperCase() + to.slice(1);
    return to;
}

/** `text` with every British spelling replaced by its American form. */
export function fix(text) {
    let out = text;
    for (const [re, to] of RULES) out = out.replace(re, (m) => keepCase(to, m));
    return out;
}

/** Every British spelling in `text`, as { index, word } with the whole word it sits in. */
export function find(text) {
    const hits = [];
    for (const [re, to] of RULES) {
        for (const m of text.matchAll(re)) {
            let s = m.index;
            let e = m.index + m[0].length;
            while (s > 0 && /\w/.test(text[s - 1])) s--;
            while (e < text.length && /\w/.test(text[e])) e++;
            hits.push({ index: s, word: text.slice(s, e) });
        }
    }
    return hits;
}

export const SKIP = new RegExp(
    [
        "(^|/)pnpm-lock\\.yaml$",
        "package-lock\\.json$",
        "(^|/)CHANGELOG[^/]*$",
        "^\\.claudehistory/",
        "^visual-baselines/",
        "^visual-review-approvals/",
        "^visual-review/",
        "^visual-fonts/",
        "^graphty-element/test/saved-format/",
        "\\.storybook/vitest\\.setup\\.",
        "^\\.claude/settings\\.json$",
        "^patches/",
        "(^|/)fixtures?/",
        "__fixtures__/",
        "/corpus/",
        "/specimens/",
        "^githerd/test/replay/data/",
        "^tmp/",
        "^graphty-element/api/",
        "^\\.github/workflows/(release|pr-title)\\.yml$",
        "^tools/(check-test-integrity|test-quarantine)\\.mjs$",
        "^compact-mantine/(design/figma-spec\\.md|tests/figma/|tests/harness/(figma|measure)\\.ts|src/theme/(tokens|colors|styles/size-scale)\\.ts)",
        "^tools/check-spelling",
        "^graphty-element/jsx\\.ts$", // generated from graphty-element.ts by scripts/generate-jsx-types.ts
    ].join("|"),
);
const KEEP =
    /```[\s\S]*?```|@(?:param|arg|argument|property|prop|template|typeParam)\s+(?:\{[^}]*\}\s*)?\[?[\w.$]+|`[^`\n]*`|"[^"\n]*"|\{@link[^}]*\}|https?:\/\/[^\s)>\]"'`]+|\]\([^)\s]+\)|\b[\w./-]+\.(?:md|tsx?|mjs|js|json|png|html|ya?ml)\b|\b\w*(?:[a-z][A-Z]|_)\w*\b|\b[A-Z0-9]{2,}[A-Za-z0-9]*\b|\b[\w-]+-cancelled\b|\bcancelled\(\)|Graph Modelling Language|[Ll]abelled[Bb]y/g;

/** Like fix, but leaves code, quotes, names and links alone. */
export function fixProse(text) {
    const kept = [];
    const masked = text.replace(KEEP, (m) => {
        kept.push(m);
        return `\u0000${kept.length - 1}\u0000`;
    });
    return fix(masked).replace(/\u0000(\d+)\u0000/g, (_, i) => kept[Number(i)]);
}

let ts;
function codeComments(file, text) {
    ts ??= createRequire(import.meta.url)("typescript");
    const kind = /\.[tj]sx$/.test(file)
        ? ts.ScriptKind.TSX
        : /\.[mc]?js$/.test(file)
          ? ts.ScriptKind.JS
          : ts.ScriptKind.TS;
    const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, false, kind);
    const seen = new Map();
    const add = (rs) => rs?.forEach((r) => seen.set(r.pos, r.end));
    const visit = (n) => {
        add(ts.getLeadingCommentRanges(text, n.pos));
        add(ts.getTrailingCommentRanges(text, n.end));
        n.getChildren(sf).forEach(visit);
    };
    visit(sf);
    return [...seen].sort((a, b) => a[0] - b[0]);
}
const spans = (text, re) => [...text.matchAll(re)].map((m) => [m.index, m.index + m[0].length]);

/** The [start, end) ranges of `text` that are prose or comments, or null for a file this check does not read. */
export function proseRanges(file, text) {
    if (/\.(md|mdx|txt|rst)$/i.test(file)) return [[0, text.length]];
    if (/\.(ts|tsx|js|jsx|mjs|cjs|mts|cts)$/.test(file)) return codeComments(file, text);
    if (/\.(css|scss)$/.test(file)) return spans(text, /\/\*[\s\S]*?\*\//g);
    if (/\.wgsl$/.test(file)) return spans(text, /\/\*[\s\S]*?\*\/|\/\/[^\n]*/g);
    if (
        /\.(ya?ml|sh|py|toml|bash)$|(^|\/)(\.\w*ignore|Dockerfile|Makefile|\.gitattributes)$|(^|\/)\.husky\//.test(file)
    ) {
        return spans(text, /(?<=^|\s)#[^\n]*/gm);
    }
    if (/\.html?$/.test(file)) return spans(text, /<!--[\s\S]*?-->/g);
    return null;
}

/** `text` with its prose and comments in American spelling. */
export function fixFile(file, text) {
    let out = "";
    let at = 0;
    for (const [s, e] of proseRanges(file, text) ?? []) {
        if (s < at) continue;
        out += text.slice(at, s) + fixProse(text.slice(s, e));
        at = e;
    }
    return out + text.slice(at);
}

/** Each line of `text` whose prose or comments hold a British spelling, as { line, words }. */
export function problems(file, text) {
    const fixed = fixFile(file, text);
    if (fixed === text) return [];
    const a = text.split("\n");
    const b = fixed.split("\n");
    return a.flatMap((l, i) => (l === b[i] ? [] : [{ line: i + 1, words: [...new Set(find(l).map((h) => h.word))] }]));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const write = args[0] === "--fix";
    const named = write ? args.slice(1) : args;
    const files = (
        named.length
            ? named
            : execFileSync("git", ["ls-files"], { maxBuffer: 1 << 28 })
                  .toString()
                  .split("\n")
    ).filter((f) => f && !SKIP.test(f));
    let bad = 0;
    for (const f of files) {
        let text;
        try {
            text = readFileSync(f, "utf8");
        } catch {
            continue; // deleted, a directory or a submodule
        }
        if (text.includes("\u0000")) continue; // binary
        if (write) {
            const out = fixFile(f, text);
            if (out !== text) writeFileSync(f, out);
            continue;
        }
        for (const p of problems(f, text)) {
            bad++;
            console.error(
                `${f}:${p.line}: British spelling ${p.words.join(", ")} (American English: node tools/check-spelling.mjs --fix ${f})`,
            );
        }
    }
    if (bad) process.exit(1);
}
