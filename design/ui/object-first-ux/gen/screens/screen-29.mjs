// Screen 29: a file above the render ceiling, before the load (round-3/
// import.md, "A file above the render ceiling"). Nothing is loaded. The peek
// of flows.csv counted 350,000 hosts, more than this machine draws at once
// (200,000). The Import dialog does not offer a plain Load: it says so, with
// the numbers, and offers a choice of subset, each with its own estimate.
import { EMPTY_LEFT } from "./screen-14.mjs";

export default {
  id: 29,
  title: "A file above the render ceiling: choose a subset before loading",
  theme: "light",
  file: null,
  left: EMPTY_LEFT,
  canvas: {
    graph: false,
    overlays: {
      dialog: {
        title: "Import flows.csv",
        rows: [
          { type: "select", label: "Format", value: "CSV, detected", note: "4,100,000 rows, 6 columns" },
          { type: "disclosure", title: "Columns", summary: "src_ip, dst_ip, bytes as weight, ts as time" },
          { type: "section", title: "Larger than the app draws at once" },
          { type: "text", text: "The file has 350,000 nodes; this machine draws 200,000 at once.", tone: "warning" },
          { type: "text", text: "All of it needs about 3.1 GB of memory; this tab has about 4 GB." },
          { type: "radio", label: "Load", items: [
            { label: "The busiest 200,000 by connections", note: "about 1.8 GB", checked: true },
            { label: "The largest connected part", note: "312,000: still over" },
            { label: "Around one node, within N hops", note: "about 41,000" },
          ] },
          { type: "number", label: "", fields: [{ caption: "Node id", value: "10.0.4.17" }, { caption: "Hops", value: "2" }] },
          { type: "radio", items: [
            { label: "A time window of ts, 2024-03 to 2024-04", note: "about 90,000" },
            { label: "Everything, drawn 200,000 at a time", note: "screen 30" },
          ] },
          { type: "note", text: "Estimates come from the peek and are rough. Dataset > Overview says which subset is loaded, with Change... to come back here." },
        ],
        footer: [{ label: "Cancel" }, { label: "Load subset", primary: true }],
      },
      dock: { open: false, disabled: true },
    },
  },
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: { empty: "Nothing loaded" },
  status: { zoom: "100%" },
  caption: {
    title: "Screen 29: a file above the render ceiling.",
    text: "The peek counted 350,000 nodes; this machine draws 200,000 (Settings > Performance > Render ceiling). Look at: both numbers and the memory estimate; one choice of what to load (the busiest N, the largest connected part, an id's neighbourhood within N hops, a time window, everything), each with its estimate; the busiest chosen by default; Load subset as the one filled button.",
  },
};
