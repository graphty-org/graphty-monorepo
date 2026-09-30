#!/usr/bin/env node
// The transfer export with blank amounts that flows/run-and-read.html uses for its weighted state
// line ("412 of 9,380 transfers have no amount. They are left out of weighted paths."). Modeled,
// not computed: none of the kit's generated transfer months (March, April, August) has a blank
// amount, so this entry holds the counts of a bank export that came with some left empty. The
// script fails if a generated month ever gains blanks, since that month should be used instead.
// Output: kit/fixtures.json scenarios.blankAmounts.
// Run from design/ui/prototype/: node screens/blank-amounts-numbers.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const kit = join(dirname(fileURLToPath(import.meta.url)), "../kit");
const fix = JSON.parse(readFileSync(join(kit, "fixtures.json"), "utf8"));

const marchBlanks = fix.scenarios?.runAndReadMoney?.transfersWithNoAmount;
if (marchBlanks !== 0) throw new Error("March transfers now have blank amounts: use scenarios.runAndReadMoney instead");

const transfers = 9380;
const noAmount = 412;
if (!(noAmount > 0 && noAmount < transfers)) throw new Error("blank count out of range");
// The same export repeats account pairs (a pair that transferred more than once), so its edge count
// and its pair count differ: screens/filter-chip.html shows "9,380 transfers (8,102 distinct pairs)".
const distinctPairs = 8102;
if (!(distinctPairs > 0 && distinctPairs < transfers)) throw new Error("pair count out of range");

fix.scenarios.blankAmounts = {
    generatedBy: "screens/blank-amounts-numbers.mjs -- regenerate instead of editing by hand",
    note: "Modeled: a transfer export where some rows came with the amount left empty. The kit's generated months have none, so a weighted run on them states no blank count.",
    modeled: true,
    column: "amount",
    meaning: "capacity",
    transfers,
    noAmount,
    withAmount: transfers - noAmount,
    distinctPairs,
};
writeFileSync(join(kit, "fixtures.json"), JSON.stringify(fix, null, 1));
console.log(JSON.stringify(fix.scenarios.blankAmounts, null, 1));
