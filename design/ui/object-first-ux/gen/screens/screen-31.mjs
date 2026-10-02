// Screen 31: the Import dialog's "A source" tab, Neo4j (round-3/import.md,
// "Load from a source that needs a connection"). Nothing is loaded; the reader
// pressed "From a database or service..." on the left panel. The rows are
// drawn from the source's descriptor (connection fields, query, limit); Test
// connection answers inline. The first inset is the same tab when the test
// fails (the error under the field it is about); the second is STRING, the
// other registered source, whose rows are a gene list, not a connection.
import { EMPTY_LEFT } from "./screen-14.mjs";

export default {
  id: 31,
  title: "Import from a source: a Neo4j server and a query",
  theme: "light",
  file: null,
  left: EMPTY_LEFT,
  canvas: {
    graph: false,
    overlays: {
      dialog: {
        title: "Import from a source",
        tabs: ["File", "URL", "Paste", "A source"], tab: "A source",
        rows: [
          { type: "select", label: "Source", value: "Neo4j", note: "or STRING" },
          { type: "field", label: "Server", value: "https://graph.lab:7473" },
          { type: "field", label: "Database", value: "neo4j" },
          { type: "field", label: "User", value: "reader" },
          { type: "field", label: "Password", value: "**********", note: "this session only" },
          { type: "textarea", label: "Query (Cypher)", mono: true, lines: ["MATCH (a:Host)-[r:CONNECTS]->(b:Host)", "RETURN a, r, b"], rows: 2, focus: false },
          { type: "field", label: "Limit", value: "50,000", suffix: "rows" },
          { type: "button", label: "Connected: Neo4j 5.18, 2.1 M relationships", buttons: [{ label: "Test connection" }] },
          { type: "text", text: "Preview: 12,408 nodes and 50,000 edges; Host has 5 properties.", tone: "success" },
          { type: "note", text: "The password is kept for this session only, never in a project file." },
        ],
        footer: [{ label: "Cancel" }, { label: "Load", primary: true }],
      },
      dock: { open: false, disabled: true },
    },
  },
  insets: [
    {
      tag: "If the test fails", left: 256, top: 40, width: 256,
      title: "Import from a source",
      rows: [
        { type: "field", label: "User", value: "reader" },
        { type: "field", label: "Password", value: "**********", error: "Authentication refused for reader." },
      ],
      footer: [{ label: "Cancel" }, { label: "Load", primary: true, disabled: true }],
    },
    {
      tag: "The other source: STRING", left: 256, top: 262, width: 256,
      title: "Source: STRING",
      rows: [
        { type: "textarea", label: "Genes, one per line", mono: true, lines: ["TP53", "MDM2", "CDKN1A", "... 37 more"], rows: 4, focus: false },
        { type: "select", label: "Species", value: "Homo sapiens" },
        { type: "field", label: "Min. score", value: "0.7" },
        { type: "field", label: "Partners", value: "10" },
        { type: "text", text: "38 of 40 names matched; 2 listed", tone: "warning" },
      ],
    },
  ],
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: { empty: "Nothing loaded" },
  status: { zoom: "100%" },
  caption: {
    title: "Screen 31: import from a source.",
    text: "\"From a database or service...\" opened the dialog on A source. Look at: Source [Neo4j v]; the connection rows (Server, Database, User, masked Password) and the Cypher query with a row limit, all from the source's own descriptor; Test connection answering in place; the preview counts; the password kept for the session only. Insets: a failed test, said under the field it is about with Load disabled; and STRING, the other source, which asks for genes, a species and a score instead. With a graph open the Into rows of screen 26 are added.",
  },
};
