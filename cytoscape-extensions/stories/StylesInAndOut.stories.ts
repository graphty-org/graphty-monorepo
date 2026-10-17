/**
 * A file's styles in and out of a core: cy.graphtyImport and cy.graphtyExport with `styles: true`.
 *
 * The picture is deterministic: the file is written here, every node has its own position, and nothing is laid out.
 */

import type { Meta, StoryObj } from "@storybook/html-vite";

import type { ExportFormat } from "../src/index.js";
import { networkArgs, renderDemo, type RunArgs } from "./demo.js";
import { counts } from "./run.js";

/** Hides the network controls the frame defines but this story does not use. */
const HIDDEN = Object.fromEntries(
    ["network", "size", "backend", "acceptSoftware", "options", "seed"].map((k) => [k, { table: { disable: true } }]),
);

interface ExportArgs extends RunArgs {
    format: ExportFormat;
}

const meta: Meta<RunArgs> = {
    title: "Gallery/Styles in and out",
    argTypes: HIDDEN,
};
export default meta;

/** A Gephi file: six nodes in two groups, each node with its own viz:color, size and position. */
const STYLED_GEXF = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://gexf.net/1.3" xmlns:viz="http://gexf.net/1.3/viz" version="1.3">
<meta><creator>Gephi 0.10.1</creator></meta>
<graph defaultedgetype="undirected"><nodes>
${[0, 1, 2, 3, 4, 5]
    .map((i) => {
        const [r, g, b] = i < 3 ? [228, 26, 28] : [55, 126, 184];
        const x = Math.round(120 * Math.cos((i * Math.PI) / 3));
        const y = Math.round(120 * Math.sin((i * Math.PI) / 3));
        return `<node id="n${String(i)}" label="n${String(i)}"><viz:size value="${String(10 + 4 * i)}"/><viz:color r="${String(r)}" g="${String(g)}" b="${String(b)}"/><viz:position x="${String(x)}" y="${String(y)}" z="0"/></node>`;
    })
    .join("\n")}
</nodes><edges>${[0, 1, 2, 3, 4, 5].map((i) => `<edge id="e${String(i)}" source="n${String(i)}" target="n${String((i + 1) % 6)}"/>`).join("")}</edges></graph></gexf>`;

/** The formats that write styles. */
const STYLED_FORMATS: readonly ExportFormat[] = ["graphml", "gexf", "gml", "dot", "pajek", "json", "xgmml", "cx2"];

/**
 * cy.graphtyImport and cy.graphtyExport with `styles: true`: draws a Gephi file in Gephi's colors and sizes, writes
 * the core's look in the chosen format (the text is shown under the graph), clears the core and reads the file back
 * with its styles, so the same picture comes back. The status line counts the stylesheet's rules and names what the
 * export reported it could not keep.
 */
export const StylesInAndOut: StoryObj<ExportArgs> = {
    args: { ...networkArgs, format: "graphml" },
    argTypes: { format: { control: "select", options: STYLED_FORMATS } },
    render: (args) => {
        const pre = document.createElement("pre");
        pre.dataset.testid = "file";
        pre.style.cssText =
            "flex:none;height:180px;margin:0;padding:8px 12px;overflow:hidden;border-top:1px solid #ddd;font:11px ui-monospace,monospace;background:#fafafa;";
        const root = renderDemo(
            args,
            `cy.graphtyExport(${JSON.stringify(args.format)}, { styles: true }) then cy.graphtyImport with styles`,
            async ({ cy, setStatus }) => {
                setStatus(`writing ${args.format} with styles...`);
                const lost = new Set<string>();
                const text = await cy.graphtyExport(args.format, {
                    styles: true,
                    onLoss: (notes) => {
                        for (const n of notes.filter((x) => x.code.startsWith("W_STYLE"))) {
                            lost.add(n.code);
                        }
                    },
                });
                pre.textContent = text.split("\n").slice(0, 14).join("\n");
                cy.elements().remove();
                const back = await cy.graphtyImport(text, args.format, { styles: true, applyStyles: true });
                cy.fit(undefined, 30);
                const notes = lost.size === 0 ? "nothing" : [...lost].sort().join(", ");
                return {
                    ran: "cpu",
                    detail: "nothing is laid out: every node keeps the position the file gives it",
                    note: `read back with ${String(back.stylesheet?.length ?? 0)} stylesheet rules; the export reported ${notes}`,
                };
            },
            async (cy) => {
                const r = await cy.graphtyImport(STYLED_GEXF, "gexf", { styles: true, applyStyles: true });
                cy.fit(undefined, 30);
                return `a Gephi GEXF drawn with ${String(r.stylesheet?.length ?? 0)} stylesheet rules, ${counts(cy)}`;
            },
        );
        root.append(pre);
        return root;
    },
};
