// Screen 25: the Import dialog with its Options open and unreadable rows
// (round-3/import.md, "Parsing options" and "Unreadable rows"). Nothing is
// loaded. eu-mail.csv is separated by semicolons; the first peek read every row
// as one column (the first inset shows that state and its warning). The
// reader opened Options and chose Semicolon; the preview is right now, and 12
// rows still do not read. The second inset is the rows the same Options
// section shows for a JSON file.
import { EMPTY_LEFT } from "./screen-14.mjs";

export default {
  id: 25,
  title: "Import options open, a wrong separator fixed, 12 unreadable rows",
  theme: "light",
  file: null,
  left: EMPTY_LEFT,
  canvas: {
    graph: false,
    overlays: {
      dialog: {
        title: "Import eu-mail.csv",
        rows: [
          { type: "select", label: "Format", value: "CSV", note: "5,843 rows, 4 columns" },
          { type: "disclosure", title: "Options", summary: "semicolon, header row, UTF-8", open: true },
          { type: "select", label: "Separator", value: "Semicolon ;", note: "was Comma" },
          { type: "select", label: "Quote", value: "Double \"" },
          { type: "switch", label: "Header row", on: true, note: "first line names the columns" },
          { type: "field", label: "Skip lines", value: "0" },
          { type: "select", label: "Encoding", value: "UTF-8" },
          { type: "field", label: "Missing values", value: "empty, NA" },
          { type: "table", columns: ["1fr", "1fr", "1fr", "1.4fr"], head: ["from", "to", "sent", "subject"], rows: [
            ["p0412", "p0077", "2019-01-03", "Re: budget"],
            ["p0077", "p0412", "2019-01-03", "Re: budget"],
          ] },
          { type: "text", text: "12 rows do not read", tone: "warning" },
          { type: "table", columns: ["40px", "1.6fr", "1fr"], head: ["Line", "Text", "Why"], rows: [
            ["88", "p0412;p0077;2019-02-30;Re", "no such date"],
            ["412", "p1160;;2019-03-04;Kickoff", "no target"],
            ["977", "p0003;p0980;\"Fwd: Kick", "quote not closed"],
          ] },
          { type: "link", text: "All 12 rows, and copy them" },
        ],
        footer: [{ label: "Cancel" }, { label: "Load and skip 12 rows", primary: true }],
      },
      dock: { open: false, disabled: true },
    },
  },
  insets: [
    {
      tag: "Before: the first peek", left: 256, top: 40, width: 256,
      title: "Import eu-mail.csv",
      rows: [
        { type: "note", tone: "warning", text: "Every row read as 1 column. Check the separator." },
        { type: "table", columns: ["1fr"], head: ["from;to;sent;subject"], rows: [["p0412;p0077;2019-01-03;Re: bu..."], ["p0077;p0412;2019-01-03;Re: bu..."]] },
        { type: "link", text: "Check the separator (opens Options)" },
      ],
      footer: [{ label: "Cancel" }, { label: "Load", primary: true, disabled: true }],
    },
    {
      tag: "The same Options for a JSON file", left: 256, top: 330, width: 256,
      title: "Options: JSON",
      rows: [
        { type: "select", label: "Variant", value: "Cytoscape", note: "detected" },
        { type: "field", label: "Nodes at", value: "elements.nodes", mono: true },
        { type: "field", label: "Edges at", value: "elements.edges", mono: true },
        { type: "field", label: "Id at", value: "data.id", mono: true },
      ],
    },
  ],
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: { empty: "Nothing loaded" },
  status: { zoom: "100%" },
  caption: {
    title: "Screen 25: options open, unreadable rows.",
    text: "First inset: the first peek of a semicolon file read every row as one column, and the dialog said so in amber, with Load disabled. Look at: Options open with the format's own rows (Separator, Quote, Header row, Skip lines, Encoding, Missing values), each change re-running the peek; the preview now in four columns; the 12 rows that still do not read, each with its line number, its raw text and the reason; Load that says it will skip them. The second inset is the rows a JSON file gets in the same place (variant and the paths into the file).",
  },
};
