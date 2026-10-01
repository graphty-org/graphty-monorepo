// Screen 67: All routes, with the end node typed by name (round-3/filters-sets.md, "All
// routes between two nodes, and pick endpoints by typing a name").
// College football. The reader selected Navy, pressed P and chose All routes in the bar's
// select: the selection pre-filled From. The end node is being typed: "Mi" matches nine teams
// by label; the match list opens above the bar's name field (the Ctrl+F node lookup), and the
// canvas outlines and labels the nine matches so the reader can also click one; a dashed
// line runs from Navy to the pointer. Names and degrees are the real ones from football.mjs.
import { NODES, DEGREE } from "../football.mjs";
import { nodeAt } from "../render.mjs";
import { DATASET_ROW, conferenceFills, conferenceTreeRow, CONF_OF } from "../football-state.mjs";

const byLabel = Object.fromEntries(NODES.map((n) => [n.label, n.id]));
const FROM = byLabel.Navy;
const hits = NODES.filter((n) => n.label.startsWith("Mi")).sort((a, b) => a.label.localeCompare(b.label));
const byId = conferenceFills();
for (const nd of NODES) if (nd.id !== FROM && !hits.includes(nd)) byId[nd.id].opacity = 0.35;
for (const h of hits) { byId[h.id].outline = { color: "ink", width: 2 }; byId[h.id].label = true; }
byId[FROM].halo = true;
byId[FROM].label = true;

const spec = {
  id: 67,
  title: "All routes, with the end node typed by name",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [{ ...DATASET_ROW, children: [conferenceTreeRow({ childSelected: true })] }] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId },
    edges: { default: { width: 1, opacity: 0.35 } },
    overlays: {
      popover: {
        title: "End node: \"Mi\"",
        left: 250, bottom: 124, caret: "bottom", caretAt: 116,
        rows: [
          { type: "text", text: `${hits.length} nodes match by label or id` },
          { type: "table", columns: ["1fr", "64px"], head: ["Node", "Links"], rows: hits.slice(0, 7).map((h) => [h.label, String(DEGREE[h.id])]), selected: 0 },
          { type: "text", text: `and ${hits.length - 7} more` },
          { type: "note", text: "Up and Down move, Enter picks, Escape clears. A click on an outlined node picks it too." },
        ],
      },
      dock: { open: false },
    },
  },
  toolbar: {
    active: "select", armed: "path", mode: "2D", faces: { path: "All routes" },
    secondary: { parts: [{ select: "All routes" }, "from", { chip: "Navy", removable: true }, "to", { field: "Mi", caret: true, width: 96 }, "within", { select: "6" }, "steps, at most", { select: "20" }, "routes", { ghost: "Options" }, { cancel: true }] },
  },
  insets: [{
    tag: "After Enter: one Set for all the routes", left: 256, top: 16, width: 248,
    title: "Set  Routes: Navy -> Michigan",
    rows: [
      { type: "keyValue", pairs: [{ label: "Found", value: "14 routes", note: "20 allowed", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Members", value: "the union: 23 nodes", wide: true }] },
      { type: "text", text: "Tab steps through the routes, as on screen 63" },
    ],
  }],
  inspector: {
    kind: "Node", sub: `id ${FROM}`, name: "Navy",
    actions: [{ icon: "locate", title: "Locate" }, { icon: "pin", on: false, title: "Pin" }, { icon: "more" }],
    summary: `${DEGREE[FROM]} neighbours`,
    reading: null,
    tabs: ["About", "Attributes", "Links"], tab: "About",
    framing: "100%",
    rows: [
      { type: "keyValue", pairs: [{ label: "label", value: "Navy", wide: true }] },
      { type: "keyValue", pairs: [{ label: "value", value: String(CONF_OF[FROM]) }, { label: "id", value: String(FROM) }] },
      { type: "link", text: "All 3 attributes" },
      { type: "link", text: `Connected to ${DEGREE[FROM]} nodes` },
      { type: "section", title: "Values" },
      { type: "keyValue", pairs: [{ label: "Conference", value: String(CONF_OF[FROM]), chevron: true }] },
      { type: "chips", title: "Member of", chips: [] },
      { type: "emptyPlus", title: "Notes" },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", tool: "Path: All routes", selection: "1 selected", zoom: "100%" },
  caption: {
    title: "Screen 67: All routes, the start taken from the selection and the end typed by name.",
    text: `Look at: Path armed on All routes; the bar reads "All routes from [Navy x] to [Mi|]": the selected node pre-filled From as a removable chip, and the To field takes typing as well as a canvas click, with a dashed line from Navy to the pointer; the step and route caps are in the sentence ("within 6 steps, at most 20 routes"), so the cost is bounded before anything runs; the match list above the field with each team's link count, the first row highlighted for Enter; the canvas outlining and labelling the ${hits.length} matches and haloing Navy. The inset is the moment after Enter: the tool snaps back and one Set "Routes: Navy -> Michigan" appears, whose Members tab lists the routes found (screen 63's Tab stepping) and "14 found, 20 allowed".`,
  },
};

const from = nodeAt(spec, FROM), to = nodeAt(spec, hits[3].id);
spec.canvas.overlays.rubberBand = { from, to: { x: to.x + 26, y: to.y + 18 } };
spec.canvas.overlays.cursor = { x: to.x + 26, y: to.y + 18, icon: "cursor" };
export default spec;
