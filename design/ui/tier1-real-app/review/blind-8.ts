// Blind-author example: run Louvain and tell the reader whether its colors are showing.
import "@graphty/graphty-element";

const element = document.querySelector("graphty-element")!;
const { session } = element;

const run = session.runs.start("louvain");
const { applied, withheld, tookOver } = await run.landing;

for (const { channel } of applied) console.log(`Louvain now paints ${channel}`);
for (const { channel, byLayer, reason } of withheld) {
    console.log(`Louvain's ${channel} is held back by "${session.styles.get(byLayer)?.name}": ${reason}`);
}
for (const { channel, fromRun } of tookOver) {
    console.log(`Louvain took ${channel} from ${fromRun ? session.runs.get(fromRun)?.label : "a layer"}`);
}
