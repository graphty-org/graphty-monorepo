// node tools/check-spelling.test.mjs
import assert from "node:assert/strict";
import { addedLines, fixFile, problems, SKIP } from "./check-spelling.mjs";

assert.equal(
    fixFile("a.md", "The colour of the centred neighbours was normalised.\n"),
    "The color of the centered neighbors was normalized.\n",
);
assert.equal(
    fixFile("a.md", "Colour, Grey, Cancelled, labelled, catalogued, analysed, analyses.\n"),
    "Color, Gray, Canceled, labeled, cataloged, analyzed, analyses.\n",
);
// code, quotes, names, links and third-party names keep their spelling
assert.equal(
    fixFile(
        "a.md",
        'See `colour` and "colour" in honoursWeights, AI_CANCELLED, aria-labelledby, cancelled() and [x](a/colour.md).\n',
    ),
    'See `colour` and "colour" in honoursWeights, AI_CANCELLED, aria-labelledby, cancelled() and [x](a/colour.md).\n',
);
// in code only the comments change
assert.equal(
    fixFile("a.ts", 'const colour = "grey"; // colour\n/** behaviour */\n'),
    'const colour = "grey"; // color\n/** behavior */\n',
);
assert.equal(fixFile("a.yml", "name: cancelled # cancelled run\n"), "name: cancelled # canceled run\n");
assert.equal(fixFile("a.json", '{"colour": 1}'), '{"colour": 1}');
assert.equal(fixFile("a.ts", "/** @param centre - the centre */\n"), "/** @param centre - the center */\n");
assert.equal(fixFile("a.md", "The Graph Modelling Language, modelled.\n"), "The Graph Modelling Language, modeled.\n");
assert.equal(
    fixFile("a.mjs", "/** @param {{a: string}[]} cancelled the cancelled jobs */\n"),
    "/** @param {{a: string}[]} cancelled the canceled jobs */\n",
);
assert.equal(
    fixFile("a.mjs", "/** @typedef {{cancelled: {a: string}[]}} R the cancelled ones */\n"),
    "/** @typedef {{cancelled: {a: string}[]}} R the canceled ones */\n",
);
assert.equal(fixFile("a.txt", "cancelled\n"), "cancelled\n");
// common words that only look British
const fine =
    "Promise otherwise exercise advertise surprise analysis cancellation controlled precise noise raise emphasis programmer\n";
assert.deepEqual(problems("a.md", fine), []);
assert.deepEqual(problems("a.md", "ok\nthe colour\n"), [{ line: 2, words: ["colour"] }]);
assert.ok(SKIP.test("pnpm-lock.yaml") && SKIP.test("graph-io/test/corpus/dot/root.gv") && !SKIP.test("design/x.md"));
// --diff: only the lines a branch adds count, so a British word already on an untouched line passes
const diff = [
    "diff --git a/a.md b/a.md",
    "--- a/a.md",
    "+++ b/a.md",
    "@@ -1,0 +2,2 @@",
    "+the color",
    "+the colour",
    "@@ -5 +7 @@",
    "-old",
    "+new",
    "diff --git a/gone.md b/gone.md",
    "--- a/gone.md",
    "+++ /dev/null",
    "@@ -1 +0,0 @@",
    "-x",
    "",
].join("\n");
assert.deepEqual(addedLines(diff), new Map([["a.md", new Set([2, 3, 7])]]));
const changed = "the colour\nthe color\nthe colour\n";
const onAdded = (file, text) => problems(file, text).filter((p) => addedLines(diff).get(file).has(p.line));
assert.deepEqual(onAdded("a.md", changed), [{ line: 3, words: ["colour"] }], "line 1 is untouched, line 3 is added");
assert.deepEqual(onAdded("a.md", "the colour\nthe color\nthe color\n"), [], "untouched British spelling passes");
console.log("check-spelling: ok");
