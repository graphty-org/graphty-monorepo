// Counts Cytoscape.js style properties and enumerated values from its own property table.
import cytoscape from "cytoscape";
const cy = cytoscape({ headless: true, styleEnabled: true });
const st = cy.style();
const props = st.properties;
const types = st.types;
const rows = [];
for (const p of props) {
  if (p.alias) continue;
  const t = p.type;
  const en = t && t.enums ? t.enums : null;
  rows.push({ name: p.name, groupKey: p.groupKey, enums: en, number: !!t?.number, color: !!t?.color, units: t?.units ?? null, multiple: !!t?.multiple });
}
const byGroup = {};
for (const r of rows) (byGroup[r.groupKey ?? "?"] ??= []).push(r);
let enumVals = 0;
for (const r of rows) if (r.enums) enumVals += r.enums.length;
console.log("properties (non-alias):", rows.length, " enum values total:", enumVals);
for (const [g, rs] of Object.entries(byGroup)) console.log(g, rs.length);
for (const r of rows) if (r.enums) console.log(`  ${r.name}: [${r.enums.length}] ${r.enums.join(",")}`);
