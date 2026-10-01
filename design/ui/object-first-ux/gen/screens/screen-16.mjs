// Screen 16: the file menu drawn open on a loaded, edited graph
// (round-3/file-project.md, "The file menu"). Karate Club with the tree of
// screen 3, nothing selected, unsaved work: the header carries the unsaved
// dot after the name and its chevron is pressed; the file menu is Figma's
// dark menu hanging under the header, with the Open recent submenu open
// beside it. EDITED is shared with screens 17 to 19.
import { STATE } from "./screen-3.mjs";

const deselect = (r) => ({ ...r, selected: false, childSelected: false, children: r.children?.map(deselect) });

// Karate Club after an hour of work, never saved: screen 3's tree and paint,
// nothing selected, no halos.
export const EDITED = {
  file: "Karate Club",
  fileState: { unsaved: true },
  left: { views: { rows: [{ name: "Overview", current: true }, { name: "Group 2 close-up" }] }, objects: { rows: STATE.left.objects.rows.map(deselect) } },
  canvas: {
    ...STATE.canvas,
    nodes: { ...STATE.canvas.nodes, byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([id, v]) => [id, { ...v, halo: false }])) },
  },
  toolbar: STATE.toolbar,
  inspector: (project) => ({
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more", title: "Close dataset, Reload, Re-run all stale, Import options..." }],
    chip: { type: "locked" }, summary: "karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Project", value: project.value, action: project.action, wide: true }] },
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "keyValue", pairs: [{ label: "Density", value: "0.139" }, { label: "Mean links", value: "4.6" }] },
      { type: "keyValue", pairs: [{ label: "Parts", value: "1" }, { label: "Weighted", value: "No" }] },
      { type: "disclosure", title: "Import report", summary: "read 80, kept 78" },
      { type: "emptyPlus", title: "Findings" },
      { type: "section", title: "Notes", count: "3", plus: true },
    ],
  }),
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
};

export default {
  id: 16,
  title: "The file menu open on a loaded, edited graph",
  theme: "light",
  file: EDITED.file,
  fileState: { unsaved: true, menuOpen: true },
  left: EDITED.left,
  canvas: {
    ...EDITED.canvas,
    overlays: {
      ...EDITED.canvas.overlays,
    },
  },
  menus: [{
    anchor: { el: "file", side: "below", align: "start", dx: 8, dy: -8 },
    width: 244,
    rows: [
      { label: "Open...", key: "Ctrl+O" },
      { label: "Open recent", sub: true, highlighted: true },
      { label: "Open sample", sub: true },
      { divider: true },
      { label: "Add data..." },
      { label: "Open as a second graph..." },
      { divider: true },
      { label: "Save project", key: "Ctrl+S" },
      { label: "Save project as...", key: "Ctrl+Shift+S" },
      { label: "Close dataset" },
      { divider: true },
      { label: "Run a recipe..." },
      { label: "Import styles..." },
      { label: "Present", key: "Shift+\\" },
      { divider: true },
      { label: "Settings...", key: "Ctrl+," },
      { label: "Keyboard shortcuts", key: "Ctrl+/" },
      { label: "Help" },
    ],
    submenu: { of: "Open recent", width: 280, rows: [
      { heading: "Replaces Karate Club; asks to save first" },
      { label: "karate-club.graphty", note: "project", key: "Mon 16:10", highlighted: true },
      { label: "Email network", note: "autosave", key: "yesterday" },
      { label: "contacts-week-38.csv", key: "Sep 18" },
      { label: "College football", note: "autosave", key: "Sep 15" },
      { divider: true },
      { label: "Clear recent" },
    ] },
  }],
  toolbar: EDITED.toolbar,
  inspector: EDITED.inspector({ value: "Not saved", action: "Save..." }),
  status: EDITED.status,
  caption: {
    title: "Screen 16: the file menu open on a loaded, edited graph.",
    text: "Karate Club with three objects, a second View and three notes, never saved. Look at: the unsaved dot after the name in the header and its pressed chevron; the dark file menu under the header: Open... Ctrl+O, Open recent (open beside it on four entries with their kind and time, headed \"Replaces Karate Club; asks to save first\", screen 17), Open sample, Add data..., Open as a second graph..., Save project Ctrl+S, Close dataset, Run a recipe..., Import styles..., Present, Settings... Ctrl+comma, Keyboard shortcuts, Help. The Dataset's Overview now starts with \"Project  Not saved  Save...\".",
  },
};
