import { importGraph } from "@graphty/graph-io";

// "source,target\nZoe,Chloe" with accented e's (U+00EB, U+00E9), saved by a spreadsheet as windows-1252
const bytes = new Uint8Array([
    ...new TextEncoder().encode("source,target\nZo"),
    0xeb,
    0x2c,
    0x43,
    0x68,
    0x6c,
    0x6f,
    0xe9,
]);

// Without the encoding option, graph-io reads bytes that are not UTF-8 as windows-1252 and says so
const guessed = await importGraph(bytes, { format: "csv" });
console.log(guessed.report.issues.map((i) => i.code));

// Name the encoding to read the file without a warning
const named = await importGraph(bytes, { format: "csv", encoding: "windows-1252" });
console.log(named.report.issues.length, named.snapshot.ids.has("Zo\u00eb"), named.snapshot.ids.has("Chlo\u00e9"));
