// Screen 32: a URL-backed dataset whose reload failed (round-3/import.md,
// "Reload a URL-backed dataset"). Karate Club was loaded from a URL at 10:42
// and carries the tree of screen 3. At 10:57 the reader pressed Reload on the
// Overview's Source row (also in the Dataset "..." menu, and Ctrl+Shift+R); the
// server answered 404. The dataset stays as loaded, the objects stay current
// (nothing changed under them), and the Source row says what happened with
// Retry, Change source... and the details.
import { STATE } from "./screen-3.mjs";

const deselect = (r) => ({ ...r, selected: false, childSelected: false, children: r.children?.map(deselect) });

export default {
  id: 32,
  title: "Reloading from a URL failed: the last good copy stays",
  theme: "light",
  file: STATE.file,
  left: { ...STATE.left, objects: { rows: STATE.left.objects.rows.map(deselect) } },
  canvas: {
    ...STATE.canvas,
    nodes: { ...STATE.canvas.nodes, byId: Object.fromEntries(Object.entries(STATE.canvas.nodes.byId).map(([id, v]) => [id, { ...v, halo: false }])) },
  },
  toolbar: STATE.toolbar,
  inspector: {
    kind: "Dataset", name: "Karate Club",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more", title: "Reload, Import options..., Close dataset" }],
    chip: { type: "locked" }, summary: "example.org/karate.gml, GML",
    reading: "34 nodes joined by 78 edges in one connected part",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Overview",
    rows: [
      { type: "keyValue", pairs: [{ label: "Nodes", value: "34" }, { label: "Edges", value: "78" }] },
      { type: "keyValue", pairs: [{ label: "Source", value: "example.org", action: "Reload" }] },
      { type: "note", tone: "error", text: "Could not reach example.org/karate.gml (404 Not Found). Showing the copy loaded at 10:42." },
      { type: "button", buttons: [{ label: "Retry" }, { label: "Change source..." }] },
      { type: "disclosure", title: "Details", summary: "HTTP 404 at 10:57" },
      { type: "keyValue", pairs: [{ label: "Direction", value: "Undirected (file)", action: "Change..." }] },
      { type: "disclosure", title: "Import report", summary: "read 80, kept 78" },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, error: { text: "Reload failed", links: ["Details"] }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 32: a URL reload that failed.",
    text: "Karate Club came from example.org at 10:42; Reload (the Source row, the Dataset \"...\" menu, Ctrl+Shift+R) failed at 10:57. Look at: the Source row with Reload; the failure under it in red, saying which copy is shown; Retry and Change source...; Details with the HTTP status and time; the status bar's red chip \"Reload failed [Details]\"; the tree unchanged and nothing stale, because nothing under it changed.",
  },
};
