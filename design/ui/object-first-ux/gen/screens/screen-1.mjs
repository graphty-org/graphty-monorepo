// Screen 1: first run, nothing loaded (round-2/screens.md).
export default {
  id: 1,
  title: "First run, nothing loaded",
  theme: "light",
  file: null,
  left: {
    views: { disabled: true, rows: [] },
    objects: { disabled: true, rows: [
      { kind: "verb", name: "Open a file..." },
      { kind: "verb", name: "Paste data..." },
      { kind: "verb", name: "From a URL..." },
      { kind: "verb", name: "From a database or service..." },
    ] },
  },
  canvas: {
    graph: false,
    overlays: {
      welcome: {
        samples: [
          { name: "Karate Club", nodes: 34, edges: 78 },
          { name: "Cat social network", nodes: 20, edges: 29 },
          { name: "College football", nodes: 115, edges: 613 },
          { name: "Email network", nodes: 1204, edges: 5830, note: "over time" },
        ],
        recent: [
          { name: "Karate Club", note: "autosave 14:32" },
          { name: "karate-club.graphty", note: "project, Mon" },
          { name: "College football", note: "autosave, Sep 15" },
        ],
      },
      dock: { open: false, disabled: true },
    },
  },
  toolbar: { active: "select", disabled: true, mode: "2D" },
  inspector: { empty: "Nothing loaded" },
  status: { zoom: "100%" },
  caption: {
    title: "Screen 1 of 15: first run, nothing loaded.",
    text: "Look at: the file header reads \"graphty\" with its chevron; Choose a file is the one filled button; the four ways in are the left panel's four rows (a file, pasted text, a URL, a database or service such as Neo4j or STRING), each opening the one Import dialog on its own tab (screens 14, 23, 22, 31); Ctrl+O and Ctrl+V reach the same dialog; every tool but Select and Hand is at 30 percent; the dock handle is disabled; Recent lists autosaved sessions and saved projects with their times (screen 19); the \"?\" is visible before the reader is stuck.",
  },
};
