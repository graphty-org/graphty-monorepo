import { importGraph } from "@graphty/graph-io";
import { resolveStyles } from "@graphty/graph-io/styles";

// The file states one style; Graphviz draws everything else with its own defaults
const dot = "digraph { a -> b; b [shape=box] }";

for (const toolDefaults of [true, false]) {
    const { snapshot, styles } = await importGraph(dot, { styles: { toolDefaults } });
    if (styles) {
        const label = resolveStyles(styles, "node", "label", snapshot);
        const shape = resolveStyles(styles, "node", "shape", snapshot);
        const arrow = resolveStyles(styles, "edge", "targetArrow", snapshot);
        console.log(`toolDefaults ${String(toolDefaults)}: tool ${String(styles.styles.source.tool)}`);
        console.log(
            `  labels ${JSON.stringify(label)}, shapes ${JSON.stringify(shape)}, arrow ${JSON.stringify(arrow)}`,
        );
    }
}
