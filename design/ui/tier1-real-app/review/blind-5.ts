// Blind-author canonical example: "a node table with a PageRank column, highest first".
// Written from section 5 of element-api-decisions.md and graphty-element/docs/guide/ only.
// Compiles against the section 5 stub with strict + noUncheckedIndexedAccess (second attempt;
// see blind-5.md for the first, which followed the guide's `(await element.run(..)).id`).
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const run = element.run("pagerank");
await run;
const path = `results.${run.id}.value`; // guessed field name "value"; guessed id is the run's id

const page = element.session.data.nodePage({ columns: [path], sort: { key: path, descending: true }, limit: 10 });
const ranks = page.columns[path] ?? []; // section 5 never says whether an asked path can be absent

page.records.forEach((node, i) => console.log(node.id, ranks[i]));
