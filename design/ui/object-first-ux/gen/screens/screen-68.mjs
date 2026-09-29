// Screen 68: editing a hand-made Set's members (round-3/filters-sets.md, "Remove members
// from a hand-made Set, or add more").
// College football. "Shortlist" is a fixed Set the reader made with Ctrl+G from 14 selected
// teams. Its Members tab is in edit mode (entered from Define's "Edit members" or the
// Members tab's "Edit"): every member row carries a remove button, two teams have just been
// removed (the count says so), and three more teams are selected on the canvas, so the tab
// offers "Add selection (3)". Done leaves edit mode. The shortlist is the 14 teams with the
// highest betweenness in football.mjs; the two removed and three selected are arbitrary.
import { NODES, BETWEENNESS } from "../football.mjs";
import { DATASET_ROW, conferenceFills, conferenceTreeRow } from "../football-state.mjs";

const ranked = NODES.map((n) => n.id).sort((a, b) => BETWEENNESS[b] - BETWEENNESS[a]);
const ORIGINAL = ranked.slice(0, 14);
const REMOVED = ORIGINAL.slice(12);
const MEMBERS = ORIGINAL.slice(0, 12);
const TO_ADD = ranked.slice(20, 23);
const label = (id) => NODES[id].label;

const byId = conferenceFills();
for (const id of MEMBERS) byId[id].outline = { color: "ink", width: 2 };
for (const id of REMOVED) { byId[id].opacity = 0.5; byId[id].label = true; }
for (const id of TO_ADD) { byId[id].halo = true; byId[id].label = true; }

export default {
  id: 68,
  title: "Editing a hand-made Set's members",
  theme: "light",
  file: "College football",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [{ ...DATASET_ROW, children: [
      { kind: "set", name: "Shortlist", nodes: MEMBERS.length, chip: { type: "ring", color: "ink" }, selected: true },
      conferenceTreeRow(),
    ] }] },
  },
  canvas: {
    graph: "football",
    nodes: { default: {}, byId },
    edges: { default: { width: 1 } },
    overlays: { dock: { open: false } },
  },
  insets: [{
    tag: "The same removal from a node's About tab", left: 256, top: 16, width: 248,
    title: `Node  ${label(MEMBERS[0])}`,
    rows: [
      { type: "chips", title: "Member of", chips: [{ chip: { type: "ring", color: "ink" }, label: "Shortlist", removable: true }] },
      { type: "text", text: "The x shows only for a hand-made Set" },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Set", name: "Shortlist", sub: "fixed",
    chip: { type: "ring", color: "ink" }, summary: { nodes: MEMBERS.length, text: "(was 14)" },
    reading: "Made by hand from a selection; its members change only when you edit them.",
    tabs: ["Define", "Members", "Style", "Record"], tab: "Members",
    framing: "100%",
    rows: [
      { type: "button", label: "Editing", buttons: [{ label: `Add selection (${TO_ADD.length})` }, { label: "Done", primary: true }] },
      { type: "keyValue", pairs: [{ label: "Nodes", value: String(MEMBERS.length), note: "2 removed" }] },
      { type: "text", text: `Removed: ${label(REMOVED[0])}, ${label(REMOVED[1])}` },
      { type: "table", columns: ["1fr", "24px"], head: ["Member", ""], rows: MEMBERS.slice(0, 8).map((id) => [label(id), { icon: "close" }]), selected: 0 },
      { type: "link", text: `and ${MEMBERS.length - 8} more (scroll)`, chevron: false },
      { type: "note", text: "Each removal and each Add is one undo step (Ctrl+Z). Delete or Backspace removes the highlighted row." },
    ],
  },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", selection: `${TO_ADD.length} selected`, zoom: "100%" },
  caption: {
    title: "Screen 68: editing a hand-made (fixed) Set's members.",
    text: `Look at: the fixed Set "Shortlist" selected, its Members tab in edit mode: "Editing" with "Add selection (${TO_ADD.length})" (the three haloed, labelled teams on the canvas) and Done; the count "${MEMBERS.length}" with the two removed teams named; each member row with a remove button; the undo note. On the canvas the members keep their ink outline and the two just removed are faded and labelled until Done. The inset is the same removal on a node's About tab: its "Member of" chip for a fixed Set carries an x (never for a rule, path or group Set, whose members come from their definition).`,
  },
};
