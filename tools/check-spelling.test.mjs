// node tools/check-spelling.test.mjs
import assert from "node:assert/strict";
import { fixFile, problems, SKIP } from "./check-spelling.mjs";

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
// common words that only look British
const fine =
    "Promise otherwise exercise advertise surprise analysis cancellation controlled precise noise raise emphasis programmer\n";
assert.deepEqual(problems("a.md", fine), []);
assert.deepEqual(problems("a.md", "ok\nthe colour\n"), [{ line: 2, words: ["colour"] }]);
assert.ok(SKIP.test("pnpm-lock.yaml") && SKIP.test("graph-io/test/corpus/dot/root.gv") && !SKIP.test("design/x.md"));
console.log("check-spelling: ok");
