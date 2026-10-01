// Screen 19: the session restored after a reload or a crash
// (round-3/file-project.md, "Autosave and recovery"). The tab closed at 14:32
// while Bridges was computing; reopening graphty restored everything the
// autosave held, at once and without a question, and says so in the status
// bar. The run that was in flight comes back waiting (its Run button in the
// row) and the Set made from it stale. The status bar's notice says so with
// its two ways out. The inset is screen 1's Recent list as it reads after
// autosave, including an entry whose data file was too large to keep.
import { STATE } from "./screen-3.mjs";
import { EDITED } from "./screen-16.mjs";

const deselect = (r) => ({ ...r, selected: false, childSelected: false, children: r.children?.map(deselect) });
const [root] = STATE.left.objects.rows.map(deselect);

export default {
  id: 19,
  title: "Session restored after a reload",
  theme: "light",
  file: EDITED.file,
  fileState: { unsaved: true },
  left: {
    views: EDITED.left.views,
    objects: { rows: [{ ...root, children: [
      ...root.children,
      { kind: "measure", name: "Bridges (Betweenness)", state: "waiting", runLabel: "Run (2 s)" },
      { kind: "set", name: "Top 5 Bridges", nodes: 5, state: "stale", chip: { type: "ring", color: "#7b3294" } },
    ] }] },
  },
  canvas: {
    ...EDITED.canvas,
    overlays: {
      ...EDITED.canvas.overlays,
    },
  },
  insets: [{
    tag: "Also: screen 1's Recent list after autosave", left: 256, top: 56, width: 264,
    title: "Recent",
    rows: [
      { type: "table", columns: ["1fr", "auto"], rows: [["Karate Club", "autosave 14:32"], ["karate-club.graphty", "project, Mon"], ["Email network", "autosave, Sep 22"]], selected: 0 },
      { type: "text", text: "Email network: data not kept (48 MB)", tone: "warning" },
      { type: "button", buttons: [{ label: "Locate file..." }] },
      { type: "note", text: "Autosave keeps the session 2 s after every change and when the tab is hidden; a closed or replaced session stays here for 7 days; data files up to 50 MB are kept with it." },
    ],
  }],
  menus: [{
    left: 528, top: 88, width: 180,
    rows: [{ heading: "Karate Club \"...\"" }, { label: "Open", highlighted: true }, { label: "Save as project..." }, { divider: true }, { label: "Remove from Recent", danger: true }],
  }],
  toolbar: EDITED.toolbar,
  inspector: EDITED.inspector({ value: "Autosave 14:32", action: "Save..." }),
  status: {
    counts: { nodes: 34, edges: 78 },
    notice: { text: "Restored your session from 14:32: 5 objects, 2 need re-running", links: ["Start empty", "Undo restore"], tone: "info" },
    stale: "2 stale",
    layout: "Spread out: settled",
    zoom: "100%",
  },
  caption: {
    title: "Screen 19: the session restored after a reload.",
    text: "The tab closed at 14:32 with Bridges computing. On reopening, graphty restored the session without asking: the status bar's notice says so with its two ways out, Start empty and Undo restore; Bridges, in flight at the crash, is waiting with its Run button; Top 5 Bridges, made from it, is stale; \"2 stale [Re-run all]\" re-runs both. Inset: screen 1's Recent list after autosave: the restored session with its time and its \"...\" menu (open beside it), a saved project, and an older session whose 48 MB data file was not kept, with Locate file....",
  },
};
