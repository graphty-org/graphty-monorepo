// Screen 28: a load in progress, with Cancel (round-3/import.md, "Load
// progress with Cancel"). Nothing was loaded before; the reader pressed Load
// on big.csv (a 610 MB edge list). The stage shows a loading card in place of
// the graph; the header, the tree and the inspector name the pending dataset;
// every tool and every tab waits. Cancel (the card, the inspector summary, the
// status chip, or Esc) returns exactly to the state before Load.
import { EMPTY_LEFT } from "./screen-14.mjs";

export default {
  id: 28,
  title: "Loading a large file, with Cancel everywhere it shows",
  theme: "light",
  file: "big.csv",
  fileState: { loading: true },
  left: {
    views: EMPTY_LEFT.views,
    objects: { disabled: true, rows: [
      { kind: "dataset", name: "big.csv", state: "computing", progress: 42 },
    ] },
  },
  canvas: {
    graph: false,
    overlays: {
      stageCard: {
        title: "Loading big.csv",
        rows: [
          { type: "progress", label: "42%", value: 42, cancel: true },
          { type: "keyValue", pairs: [{ label: "Read", value: "256 of 610 MB", wide: true }] },
          { type: "keyValue", pairs: [{ label: "Rows", value: "1,806,000 so far", wide: true }] },
          { type: "note", text: "Nothing is drawn until the load finishes. Cancel returns to the Welcome sheet and says \"Load cancelled\"." },
        ],
      },
      dock: { open: false, disabled: true },
    },
  },
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: {
    kind: "Dataset", name: "big.csv",
    actions: [{ icon: "more" }],
    summary: { text: "Loading 42%", cancel: true },
    reading: null,
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: null, tabsDisabled: true,
    rows: [
      { type: "text", text: "The tabs open when the load finishes." },
      { type: "keyValue", pairs: [{ label: "Format", value: "CSV" }, { label: "Size", value: "610 MB" }] },
    ],
  },
  status: { computing: { text: "Loading big.csv 42%", cancel: "Cancel" }, zoom: "100%" },
  caption: {
    title: "Screen 28: a load in progress.",
    text: "Look at: the loading card centred on the empty stage (percentage, bytes read, rows so far, Cancel); the pending name in secondary text in the file header (Export and the framing pill wait), in the tree with its progress ring, and in the inspector, whose tabs are greyed; every tool at 30 percent; the status chip \"Loading big.csv 42% [Cancel]\" (rows read when the size is unknown). Cancel or Esc restores exactly the state before Load (here the Welcome sheet; with a graph open, that graph and its tree) and the chip says \"Load cancelled\".",
  },
};
