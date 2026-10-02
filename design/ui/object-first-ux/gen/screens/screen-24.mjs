// Screen 24: the Import dialog with an edges file and a nodes file (round-3/
// import.md, "Load a nodes file and an edges file together"). Nothing is
// loaded. The reader dropped email.csv, then pressed "Add a nodes file..." (or
// dropped both files at once) and chose people.csv. Two stacked sections, each
// with its preview and its roles; one match line with a choice for each kind of
// mismatch; one sentence that says what will load.
import { EMPTY_LEFT } from "./screen-14.mjs";

export default {
  id: 24,
  title: "Import an edges file and a nodes file together",
  theme: "light",
  file: null,
  left: EMPTY_LEFT,
  canvas: {
    graph: false,
    overlays: {
      dialog: {
        title: "Import email.csv and people.csv",
        rows: [
          { type: "section", title: "Edges: email.csv", count: "5,830 rows", actions: ["minus"] },
          { type: "table", columns: ["1fr", "1fr", "1fr", "1.4fr"], head: ["from", "to", "sent", "subject"], rows: [
            ["p0412", "p0077", "2019-01-03", "Re: budget"],
            ["p0077", "p0412", "2019-01-03", "Re: budget"],
          ] },
          { type: "select", label: "Source", value: "from", note: "Target  to,  Time  sent" },
          { type: "section", title: "Nodes: people.csv", count: "1,204 rows", actions: ["minus"] },
          { type: "table", columns: ["1fr", "1.6fr", "1.2fr", "0.8fr"], head: ["person_id", "name", "department", "joined"], rows: [
            ["p0412", "Dana Ruiz", "Finance", "2014"],
            ["p0077", "Sam Okafor", "Legal", "2017"],
          ] },
          { type: "select", label: "Node id", value: "person_id", note: "matches from and to" },
          { type: "select", label: "Label", value: "name" },
          { type: "select", label: "Type", value: "department", note: "7 values" },
          { type: "section", title: "How they match" },
          { type: "text", text: "1,190 node ids appear in both files." },
          { type: "select", label: "14 alone", value: "Keep them", note: "in people.csv, no edges", wideLabel: true },
          { type: "select", label: "3 missing", value: "Create them", note: "in edges, not in people.csv", wideLabel: true },
          { type: "text", text: "Will load 1,207 nodes and 5,830 edges." },
        ],
        footer: [{ label: "Cancel" }, { label: "Load", primary: true }],
      },
      dock: { open: false, disabled: true },
    },
  },
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: { empty: "Nothing loaded" },
  status: { zoom: "100%" },
  caption: {
    title: "Screen 24: an edges file and a nodes file.",
    text: "\"Add a nodes file...\" on screen 14 added people.csv (dropping both files at once lands here too). Look at: two stacked sections, each with its file name, row count, a remove button, a preview and its roles; Node id, Label and Type on the nodes file; the match line; a choice for each kind of mismatch (keep or drop the 14 people with no edges; create or drop the 3 endpoints missing from people.csv, which would drop their 9 edges); the sentence with the totals.",
  },
};
