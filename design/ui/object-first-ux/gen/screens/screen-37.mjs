// Screen 37: join a table of node attributes, with identifier mapping
// (round-3/data-editing.md, "Join a table" and "Map identifiers"). An
// invented protein network ("Protein interactions", 1,204 proteins keyed by
// UniProt accession, drawn with the Email network's positions). The reader
// pressed the Data tab's ATTRIBUTES "+" > Join a table... and chose
// genes.csv, whose rows are keyed by gene symbol. Matching symbol to node id
// found 0 rows, so the dialog opened its "Map identifiers" section; with the
// mapping file chosen, 318 of 340 rows match. The live counts are a dry run
// of the join; nothing changes until Join.
export default {
  id: 37,
  title: "Join a table, with identifier mapping",
  theme: "light",
  file: "Protein interactions",
  left: {
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Protein interactions", nodes: 1204, edges: 5830, locked: true, chip: { type: "locked" }, expanded: true, children: [] },
    ] },
  },
  canvas: {
    graph: "email",
    nodes: { default: {} },
    edges: { default: { width: 1 } },
    overlays: {
      dock: { open: false },
      dialog: {
        title: "Join a table: genes.csv",
        rows: [
          { type: "text", text: "genes.csv: 340 rows, 4 columns", secondary: false },
          { type: "table", columns: ["1fr", "1fr", "1fr", "1.4fr"], head: ["symbol", "log2fc", "padj", "pathway"], rows: [
            ["TP53", "2.10", "0.0004", "apoptosis"],
            ["MDM2", "1.42", "0.012", "apoptosis"],
            ["CDKN1A", "-0.87", "0.031", "cell cycle"],
          ] },
          { type: "select", label: "Match", value: "symbol" },
          { type: "select", label: "To node", value: "id" },
          { type: "disclosure", title: "Map identifiers", summary: "symbol to UniProt, 0 matched without it", open: true },
          { type: "select", label: "Species", value: "Human" },
          { type: "select", label: "From", value: "Gene symbol" },
          { type: "select", label: "To", value: "UniProt accession" },
          { type: "select", label: "Using", value: "hgnc_uniprot.tsv" },
          { type: "text", text: "Matched 318 of 340 rows after mapping (0 before).", tone: "success" },
          { type: "select", label: "Unmatched", value: "Skip 22 rows" },
          { type: "text", text: "Columns to add:" },
          { type: "checkbox", items: [{ label: "log2fc", checked: true }, { label: "padj", checked: true }, { label: "pathway", checked: true }] },
          { type: "text", text: "Adds 3 node columns, empty on 886 nodes. One undo step." },
        ],
        footer: [{ label: "Cancel" }, { label: "Join", primary: true }],
      },
    },
  },
  menus: [{
    tag: "Before: Data > ATTRIBUTES +",
    anchor: { inspectorRow: 0, side: "left", align: "start", dx: -8, dy: -24 },
    width: 220,
    rows: [
      { label: "Join a table...", highlighted: true },
      { label: "New from formula..." },
      { label: "New empty column..." },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Dataset", name: "Protein interactions",
    actions: [{ icon: "plus", title: "Add data" }, { icon: "more" }],
    chip: { type: "locked" }, summary: "string_interactions.tsv, TSV",
    reading: "1,204 proteins joined by 5,830 interactions, in 3 parts.",
    tabs: ["Overview", "Layout", "Canvas", "Data"], tab: "Data",
    rows: [
      { type: "section", title: "Attributes", plus: true },
      { type: "text", text: "On nodes" },
      { type: "attribute", dtype: "text", name: "id", filled: "100%" },
      { type: "attribute", dtype: "text", name: "name", filled: "100%" },
      { type: "text", text: "On edges" },
      { type: "attribute", dtype: "number", name: "score", filled: "100%" },
      { type: "disclosure", title: "Made by", summary: "string_interactions.tsv" },
    ],
  },
  status: { counts: { nodes: 1204, edges: 5830 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 37: join a table, with identifier mapping.",
    text: "An invented protein network keyed by UniProt accession; Data > ATTRIBUTES \"+\" > Join a table... with genes.csv, keyed by gene symbol. Look at: the table's size and a three-row preview; Match [symbol] To node [id] as selects of real columns; Map identifiers, which opened on its own because the plain match found 0 rows (species, from, to, and the mapping file used); the live dry-run line, 318 of 340 matched after mapping and 0 before; what happens to the 22 unmatched rows; which columns to add; the one-line consequence; Join as the one filled button. The ATTRIBUTES \"+\" menu that opened it (Join a table..., New from formula..., New empty column...) is drawn at the left of the inspector. Joined columns appear in ATTRIBUTES with the other node columns, and the join is one undo step.",
  },
};
