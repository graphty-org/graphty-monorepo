// Screen 82: the assistant (round-3/analysis-results.md, "Assistant tab"),
// drawn since round 4 in the AI rail panel (round-4 section 2.7), which
// replaced the dock's Assistant tab. Karate Club. Backtick opened the AI panel. Two turns:
// the first made "Bridges (Betweenness)" (now in the tree and selected, its
// Record tab naming the request); the second asked for something slow, so
// its row landed waiting. The panel draws the transcript, the tool-call rows,
// the "Made" links, the privacy line and the composer; its scope select
// reads what the assistant runs on. Rows the assistant made carry its
// sparkle in the tree. The inset is the tab before a provider is set.

import { BETWEENNESS, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };
const top2 = Object.keys(BETWEENNESS).map(Number).sort((a, b) => BETWEENNESS[b] - BETWEENNESS[a]).slice(0, 2);

export default {
  id: 82,
  title: "The assistant in the AI panel",
  theme: "light",
  file: "Karate Club",
  rail: { dots: ["objects"] },
  left: {
    panel: "ai",
    views: { rows: [{ name: "Overview", current: true }] },
    objects: { rows: [
      { kind: "dataset", name: "Karate Club", nodes: 34, edges: 78, locked: true, chip: { type: "locked" }, expanded: true, children: [
        { kind: "measure", name: "How far from everything", state: "waiting", runLabel: "Run (4 min)", glyph: "sparkle", glyphTitle: "Made by the assistant" },
        { kind: "measure", name: "Bridges (Betweenness)", values: 34, chip: { type: "size" }, selected: true, glyph: "sparkle", glyphTitle: "Made by the assistant" },
        { kind: "grouping", name: "Communities (Louvain)", groups: 4, expanded: false, chip: { type: "strip", colors: OKABE_4 } },
      ] },
    ] },
    ai: {
      scope: "What is showing, 34 nodes",
      turns: [
        { who: "You", text: "Which people hold the club together?" },
        { who: "Assistant", text: `On what is showing (34 nodes): nodes ${top2[0]} and ${top2[1]} sit on the most routes between the two sides.`, tool: "Ran Rank > Bridges (Betweenness), 3 ms", made: { name: "Bridges (Betweenness)" } },
        { who: "You", text: "How far is everyone from everything?" },
        { who: "Assistant", text: "I set up How far from everything. It needs about 4 minutes, so it is waiting: press Run on its row.", made: { name: "How far from everything", state: "waiting", action: "Run (4 min)" } },
      ],
      composer: "Ask about this graph, or say it",
      privacy: "Questions send a sample of up to 50 nodes and their attributes to Anthropic.",
    },
  },
  canvas: {
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 } },
    labels: top2,
    overlays: {
      dock: { open: false },
    },
  },
  insets: [{
    tag: "Before a provider is set", left: 256, top: 16, width: 256,
    title: "AI",
    rows: [
      { type: "note", text: "The assistant needs a provider: Anthropic with your key, or a model that runs in this browser." },
      { type: "button", buttons: [{ label: "Choose a provider...", primary: true }] },
      { type: "text", text: "Opens Settings > Assistant" },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Bridges (Betweenness)",
    chip: { type: "size" }, summary: "34 values",
    reading: `Node ${top2[0]} sits on the most shortest routes.`,
    tabs: ["Values", "Define", "Style", "Record"], tab: "Record",
    rows: [
      { type: "section", title: "Made by" },
      { type: "keyValue", pairs: [{ label: "Method", value: "Bridges (Betweenness)", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Scope", value: "What was showing, 34 nodes", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Time", value: "3 ms", wide: true }] },
      { type: "note", text: "Assistant: \"Which people hold the club together?\"" },
      { type: "button", buttons: [{ label: "Copy methods" }, { label: "Copy command" }] },
      { type: "select", label: "Export", value: "Ranked list, CSV" },
      { type: "section", title: "Notes", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 82: the assistant in the AI panel.",
    text: "Backtick (or the AI rail button) opened the AI panel; the Objects rail button carries its dot because the assistant added objects while the tree was hidden. Look at: the panel's scope, \"What is showing, 34 nodes\", which is what the assistant runs on and what its replies name; two turns; under the first a collapsed tool-call row (\"> Ran Rank > Bridges\", expandable to its JSON, Copy command) and \"Made: Bridges (Betweenness)\" linked to the tree row it made (selected, its Record tab reading \"Assistant: Which people hold the club together?\"); the second asked for a four-minute run, so its row landed waiting in the tree with its Run button, and the reply says so; the composer with its microphone and Send; and, always visible above the composer in the design, the line saying what data leaves the browser, with a link to Settings. The inset is the tab before a provider is set: one line and \"Choose a provider...\", opening Settings > Assistant. The tree rows the assistant made carry its sparkle.",
  },
};
