// What screens 4, 5, 7 and 9 share about College football: the "Conference"
// Grouping (by the `value` attribute, 12 groups named by the raw value,
// painted with the twelve-colour palette), its legend block, the node fills,
// and the Dataset inspector's Overview rows. Sizes are the real ones from
// football.mjs.
import { COMMUNITIES } from "./football.mjs";
import { TWELVE } from "./palettes.mjs";

export const CONF_IDS = Object.keys(COMMUNITIES).map(Number).sort((a, b) => a - b);
export const CONF_COLOR = {};
CONF_IDS.forEach((v, i) => { CONF_COLOR[v] = TWELVE[i]; });
export const CONF_SIZE = {};
for (const v of CONF_IDS) CONF_SIZE[v] = COMMUNITIES[v].length;
export const CONF_OF = {};
for (const [v, ids] of Object.entries(COMMUNITIES)) for (const id of ids) CONF_OF[id] = Number(v);

// Every node filled with its conference colour.
export function conferenceFills() {
  const byId = {};
  for (const [id, v] of Object.entries(CONF_OF)) byId[id] = { fill: CONF_COLOR[v] };
  return byId;
}

export const CONF_STRIP = { type: "strip", colors: CONF_IDS.map((v) => CONF_COLOR[v]) };

export function conferenceTreeRow(extra = {}) {
  return { kind: "grouping", name: "Conference", groups: 12, chip: CONF_STRIP, expanded: false, ...extra };
}

export function conferenceLegendBlock() {
  return { title: "Conference", rows: CONF_IDS.map((v) => ({ chip: { type: "swatch", color: CONF_COLOR[v] }, label: String(v), count: CONF_SIZE[v] })) };
}

export const DATASET_ROW = { kind: "dataset", name: "College football", nodes: 115, edges: 613, locked: true, chip: { type: "locked" }, expanded: true };

export function datasetInspector(tab = "Overview") {
  return {
    kind: "Dataset", name: "College football",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "football.gml, GML",
    reading: "115 teams joined by 613 games in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab,
    framing: "Fit",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "115" }, { label: "Edges", value: "613" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.094" }, { label: "Mean links", value: "10.7" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "read 613, kept 613" },
      { type: "emptyPlus", title: "Findings" },
      { type: "emptyPlus", title: "Notes" },
    ],
  };
}
