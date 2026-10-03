// Blind-author example: let the reader check the element's column guess for a CSV, then load it.
import "@graphty/graphty-element";
import type { ColumnMapping } from "@graphty/graphty-element/session";

const element = document.querySelector("graphty-element")!;
const input = document.querySelector<HTMLInputElement>("#file")!;

input.addEventListener("change", async () => {
    const file = input.files?.[0];
    if (!file) return;
    const source = { config: { file } };
    const preview = await element.session.data.preview(source);
    const edges = preview.tables.find((t) => t.role === "edges");
    console.table(edges?.sample); // show the reader what was found
    const numeric = edges?.columns.find((c) => c.type === "number" && c.name !== preview.mapping.source && c.name !== preview.mapping.target);
    const mapping: ColumnMapping = { ...preview.mapping, weight: preview.mapping.weight ?? numeric?.name ?? null };
    await element.session.data.import(source, { mapping, mode: "replace" });
});
