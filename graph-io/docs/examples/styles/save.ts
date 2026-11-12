import { readFile } from "node:fs/promises";

import { checkExport, exportGraphToString, importGraph } from "@graphty/graph-io";

const { snapshot, styles } = await importGraph(await readFile("teams.gv"), { styles: true });
if (styles) {
    // before saving: what each format would lose of the styles, counted by code (one note per property)
    for (const format of ["csv", "gexf", "graphml"]) {
        const codes = new Map<string, number>();
        for (const note of checkExport(snapshot, format, { styles })) {
            if (note.code.startsWith("W_STYLE")) {
                codes.set(note.code, (codes.get(note.code) ?? 0) + 1);
            }
        }
        console.log(format, Object.fromEntries(codes));
    }

    // GraphML keeps the rules for graphty: reading the file back gives the same rules
    const graphml = await exportGraphToString(snapshot, "graphml", { styles });
    const back = await importGraph(graphml, { format: "graphml", styles: true });
    console.log(back.styles?.styles.source);
    console.log(
        back.styles?.styles.rules.map((r) => r.id).join(" ") === styles.styles.rules.map((r) => r.id).join(" "),
    );

    // styles belong to the graph they were read from: saving them with another graph is refused
    const other = await importGraph("graph { a -- b }");
    console.log(checkExport(other.snapshot, "graphml", { styles }).map((n) => n.code));
}
