// Screen 36: change a column's type (round-3/data-editing.md, "Column
// operations"). The Email network, Dataset > Data as screen 35. The node
// column "joined" was read as text because the file mixes two date
// spellings. The reader chose "Change type..." from its menu (screen 35's
// Edit group); the popover opens beside the row. Its first row is the type
// itself as a select (so no submenu is needed); the format, a five-row
// before-and-after preview, and what the change will cost follow: 886 values
// read, 318 would become empty, and 301 of those look like another spelling
// the reader can add with one button.
import S10 from "./screen-10.mjs";
import S35 from "./screen-35.mjs";

export default {
  id: 36,
  title: "Change a column's type",
  theme: "light",
  file: "Email network",
  left: S10.left,
  canvas: {
    graph: "email",
    nodes: S10.canvas.nodes,
    edges: S10.canvas.edges,
    overlays: {
      dock: { open: false },
      popover: {
        title: "Change type: joined (now Text)",
        anchor: { sel: '[data-attr="joined"]', side: "left", align: "center", dx: -8 }, caret: "right",
        rows: [
          { type: "select", label: "To", value: "Date and time" },
          { type: "select", label: "Format", value: "YYYY-MM-DD" },
          { type: "table", columns: ["1fr", "1fr"], head: ["joined", "becomes"], rows: [
            ["2019-03-04", "2019-03-04"],
            ["2018-11-20", "2018-11-20"],
            ["04/03/2019", "(empty)"],
            ["2019-07-15", "2019-07-15"],
            ["17/01/2019", "(empty)"],
          ] },
          { type: "keyValue", pairs: [{ label: "Read", value: "886 of 1,204", wide: true }] },
          { type: "note", text: "318 could not be read and become empty. 301 of them look like DD/MM/YYYY." },
          { type: "button", buttons: [{ label: "Also read DD/MM/YYYY" }] },
          { type: "note", text: "No object reads joined. After the change, Set as time lists it." },
        ],
        footer: [{ label: "Cancel" }, { label: "Change type", primary: true }],
      },
    },
  },
  toolbar: { active: "select", mode: "2D" },
  inspector: { ...S35.inspector, rows: S35.inspector.rows.map((r) => (r.type === "attribute" ? { ...r, pressed: r.name === "joined" } : r)) },
  status: { counts: { nodes: 1204, edges: 5830 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 36: change a column's type.",
    text: "Email network, Dataset > Data; the node column joined was read as text because the file mixes two date spellings, and the reader chose Change type... from its menu (screen 35, Edit group). Look at: the type as the popover's first row (a select, so no submenu), the format the element detected, a five-row before-and-after preview in which unreadable values show as (empty), the count read, the count that would become empty and the one-button repair for the second spelling, what reads the column now, and Change type as the one filled button. The table's column header opens the same menu and the same popover.",
  },
};
