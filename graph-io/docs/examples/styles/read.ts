import { importGraph } from "@graphty/graph-io";
import { resolveStyles } from "@graphty/graph-io/styles";

// Two teams, each drawn in its own color, in Graphviz's DOT format
const dot = `graph {
  node [style=filled, shape=box];
  ann [team=red, fillcolor=tomato]; bob [team=red, fillcolor=tomato];
  cy [team=red, fillcolor=tomato]; dee [team=red, fillcolor=tomato];
  eve [team=blue, fillcolor=skyblue]; flo [team=blue, fillcolor=skyblue];
  gus [team=blue, fillcolor=skyblue]; hal [team=blue, fillcolor=skyblue];
  ann -- bob -- cy -- dee -- eve -- flo -- gus -- hal;
}`;

const { snapshot, styles } = await importGraph(dot, { styles: true });
if (styles) {
    console.log(styles.styles.source);
    // the rules, bottom to top: what each one is, where it came from and what it sets
    for (const rule of styles.styles.rules) {
        const what = [...Object.keys(rule.set ?? {}), ...Object.keys(rule.map ?? {})].join(", ");
        console.log(`${rule.id} (${rule.role}, ${rule.origin}): ${what}`);
    }
    // the mapping the file's colors follow
    console.log(JSON.stringify(styles.styles.rules.find((r) => r.role === "mapping")?.map));
    // each node's value of a property, as the program that wrote the file draws it
    const fill = resolveStyles(styles, "node", "fill", snapshot);
    const shape = resolveStyles(styles, "node", "shape", snapshot);
    for (const i of [0, 4]) {
        console.log(`${String(snapshot.ids.idOf(i))}: ${String(fill[i])} ${String(shape[i])}`);
    }
}
