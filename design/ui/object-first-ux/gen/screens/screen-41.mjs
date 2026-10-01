// Screen 41: merge two nodes that are one person (round-3/data-editing.md,
// "Merge nodes"). The Email network with the objects of screen 10. Two nodes
// at the left edge are the same person under two addresses (the invented
// labels "Alice Smith" and "A. Smith" share the email attribute
// asmith@corp.example). The reader selected both and chose "Merge into one
// node..." in the several-elements inspector (the verb drawn on screen 40).
// The dialog says which id survives, resolves each attribute that differs,
// says what happens to the edges (counted from email.mjs: shared neighbours
// become repeated edges, which follow the dataset's repeat rule), and offers
// the same merge for every pair that shares the attribute, with a dry-run
// count.
import { EDGES, COMMUNITIES } from "../email.mjs";
import S10 from "./screen-10.mjs";

const A = 80, B = 347;
const nb = (id) => new Set(EDGES.filter(([a, b]) => a === id || b === id).map(([a, b]) => (a === id ? b : a)));
const na = nb(A), nbB = nb(B);
const moved = [...nbB].filter((x) => x !== A).length;
const shared = [...nbB].filter((x) => na.has(x)).length;
const between = na.has(B) ? 1 : 0;
const groupOf = (id) => Number(Object.entries(COMMUNITIES).find(([, ids]) => ids.includes(id))[0]);
const groupsText = groupOf(A) === groupOf(B) ? `Group ${groupOf(A)}` : "Mixed";

const byId = { ...S10.canvas.nodes.byId };
byId[A] = { ...byId[A], halo: true, label: "Alice Smith" };
byId[B] = { ...byId[B], halo: true, label: "A. Smith" };

export default {
  id: 41,
  title: "Merge two nodes into one",
  theme: "light",
  file: "Email network",
  left: S10.left,
  canvas: {
    graph: "email",
    nodes: { ...S10.canvas.nodes, byId },
    edges: S10.canvas.edges,
    overlays: {
      dock: { open: false },
      dialog: {
        title: "Merge 2 nodes into one",
        rows: [
          { type: "segmented", label: "Keep id", options: ["p0080 Alice Smith", "p0347 A. Smith"], value: "p0080 Alice Smith" },
          { type: "section", title: "Values that differ", count: "2" },
          { type: "select", label: "name", value: "Alice Smith", note: "or A. Smith" },
          { type: "select", label: "dept", value: "Finance", note: "or Accounts" },
          { type: "keyValue", pairs: [{ label: "Same in both", value: "email, joined", wide: true }] },
          { type: "text", text: `Edges: ${moved} of A. Smith's re-attach to Alice Smith; ${shared} duplicate an edge she has.` },
          { type: "text", text: "Duplicates follow the repeat rule (Keep each); Import options... changes it." },
          { type: "switch", label: "All pairs", note: "that share email", on: false, caption: "Dry run: 37 pairs, 74 nodes into 37. Each keeps the lower id." },
          { type: "text", text: "Communities and Active senders re-run; Connections is instant. One undo step." },
        ],
        footer: [{ label: "Cancel" }, { label: "Merge", primary: true }],
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Selection", name: "2 nodes",
    actions: [{ icon: "locate", title: "Locate" }, { icon: "more" }],
    summary: `2 nodes  ${between} edges between them`,
    reading: null,
    tabs: [], tab: null,
    rows: [
      { type: "button", buttons: [{ label: "Make a set  Ctrl+G" }] },
      { type: "select", label: "Add to", value: "Choose a set" },
      { type: "keyValue", pairs: [{ label: "Communities", value: groupsText, wide: true }] },
      { type: "section", title: "Data" },
      { type: "link", text: "Remove from data...  Delete", chevron: false },
      { type: "link", text: "Merge into one node...", chevron: false },
      { type: "link", text: "Hide these", chevron: false },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, layout: "Spread out: settled", selection: "2 selected", zoom: "100%" },
  caption: {
    title: "Screen 41: merge two nodes into one.",
    text: `Email network; two nodes near the left edge are one person under two addresses (labelled Alice Smith and A. Smith, haloed). The reader selected both and chose Merge into one node... (the several-elements inspector). Look at: which id survives, as a two-way choice; each attribute that differs as a select of the two values, and the attributes that agree; what happens to the edges (${moved} re-attach, ${shared} duplicate an existing edge and follow the repeat rule); the switch that applies the same merge to every pair sharing the email attribute, with its dry-run count; what re-runs; Merge as the one filled button.`,
  },
};
