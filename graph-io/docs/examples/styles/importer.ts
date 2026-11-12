import { createRegistry, type GraphImporter } from "@graphty/graph-io";
import { csvImporter } from "@graphty/graph-io/csv";
import { resolveStyles } from "@graphty/graph-io/styles";

// Team rosters: a CSV node table whose color column holds CSS colors, spelled any way CSS allows
const rosterImporter: GraphImporter = {
    ...csvImporter,
    format: "roster",
    extensions: [".roster"],
    // the whole style support: which column holds which style, and how its values are spelled
    styles: () => ({ dialect: "css", node: { fill: { data: "color" } } }),
};
const rosters = createRegistry().registerImporter(rosterImporter);

const roster =
    "id,team,color\na,red,red\nb,red,#f00\nc,red,#FF0000\nd,red,rgb(255 0 0)\n" +
    "e,blue,blue\nf,blue,#00f\ng,blue,#0000FF\nh,blue,hsl(240 100% 50%)\n";
const { snapshot, styles } = await rosters.importGraph(roster, { format: "roster", styles: true });
if (styles) {
    console.log(styles.styles.rules.map((r) => `${r.id} (${r.role})`));
    console.log(resolveStyles(styles, "node", "fill", snapshot).join(" "));
}
