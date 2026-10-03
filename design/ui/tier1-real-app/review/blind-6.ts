import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { catalog } = element.session;

// An algorithm picker: typing "brokers" finds Betweenness, listed under its category heading,
// with only the options a reader usually changes.
const typed = "brokers";
const matches = catalog.algorithms().filter((a) =>
    [a.plainName, ...a.aliases].some((w) => w.toLowerCase().includes(typed.toLowerCase())));
for (const a of matches) {
    console.log(a.categoryLabel, a.plainName, a.options.filter((o) => o.essential).map((o) => o.plainName));
}

// After the run is painted, one plain sentence under its legend block.
const run = element.run("betweenness");
await run;
await element.session.styles.encode({ run, channel: "node.color" });
const entry = catalog.algorithms().find((a) => a.key === run.record.algorithm);
document.querySelector("#legend-caption")!.textContent = entry?.fields.find((f) => f.name === "value")?.sentence ?? "";
