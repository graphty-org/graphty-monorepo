// Screen 14: the Import dialog (round-2/screens.md; round-3/import.md). Nothing
// is loaded yet: the reader dropped email.csv on the Welcome sheet, and the one
// dialog of the whole session opens over the empty stage. Its mapping rows are
// selects fed by the element's header peek (the file's column names and a few
// sample rows, read before the load), never typed text. The "From" row picks
// where the bytes come from (File, URL, Paste, A source; screens 22, 23, 31);
// Options holds the format's parsing options (screen 25); "Add a nodes file..."
// adds the second file of a nodes-plus-edges pair (screen 24). The Into
// choice (Replace, Add, ...) appears only when a graph is open (screens 23,
// 26). The four sources are the dialog's tabs.
export const EMPTY_LEFT = {
  views: { disabled: true, rows: [] },
  objects: { disabled: true, rows: [
    { kind: "verb", name: "Open a file..." },
    { kind: "verb", name: "Paste data..." },
    { kind: "verb", name: "From a URL..." },
    { kind: "verb", name: "From a database or service..." },
  ] },
};

export default {
  id: 14,
  title: "The Import dialog: where from, a preview, and column roles as selects",
  theme: "light",
  file: null,
  left: EMPTY_LEFT,
  canvas: {
    graph: false,
    overlays: {
      dialog: {
        title: "Import email.csv",
        tabs: ["File", "URL", "Paste", "A source"], tab: "File",
        rows: [
          { type: "select", label: "Format", value: "CSV, detected", note: "5,831 rows, 5 columns" },
          { type: "disclosure", title: "Options", summary: "comma, header row, UTF-8" },
          { type: "table", columns: ["1fr", "1fr", "1fr", "1.4fr", "0.6fr"], head: ["from", "to", "sent", "subject", "size"], rows: [
            ["p0412", "p0077", "2019-01-03", "Re: budget", "4"],
            ["p0077", "p0412", "2019-01-03", "Re: budget", "6"],
            ["p1160", "p0003", "2019-01-04", "Kickoff", "12"],
          ] },
          { type: "section", title: "Columns" },
          { type: "select", label: "Node id", value: "from and to", note: "no nodes file" },
          { type: "select", label: "Label", value: "the id", note: "names need a nodes file" },
          { type: "select", label: "Source", value: "from" },
          { type: "select", label: "Target", value: "to" },
          { type: "select", label: "Weight", value: "none" },
          { type: "select", label: "Time", value: "sent", note: "2019-01 to 2019-12" },
          { type: "select", label: "Direction", value: "Directed" },
          { type: "button", label: "Nodes: none, only the ids in from and to", buttons: [{ label: "Add a nodes file..." }] },
          { type: "text", text: "Will load 1,204 nodes and 5,830 edges." },
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
    title: "Screen 14: the Import dialog.",
    text: "email.csv was dropped on the Welcome sheet. Look at: the four tabs File, URL, Paste and A source, the one dialog for every way in; Format detected with the counts from the peek; Options collapsed to its one-line summary (screen 25 opens it); a three-row preview; Node id and Label above the edge roles, every role a select of the file's columns; \"Add a nodes file...\" for names and node attributes (screen 24); what will load; Load as the one filled button. With a graph open, an Into choice joins the top (screens 23, 26).",
  },
};
