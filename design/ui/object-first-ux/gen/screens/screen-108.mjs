// Screen 108: the AI rail panel (round-4/revision-round-4.md section 2.7).
// Karate Club. The assistant left the dock and is the fifth rail item (Alt+5
// or backtick). Two turns: the first ran Rank > Bridges, the second kept the
// top five as a Set, both while the tree was hidden, so the Objects rail
// button carries its notification dot. The reader hovers the second "Made"
// link: its five members are outlined on the canvas (hovering never changes
// the selection, so the inspector still shows Bridges). The inset is the
// composer while the reader speaks (voice input).

import { BETWEENNESS, COMMUNITIES } from "../karate.mjs";
import { OKABE_4 } from "../palettes.mjs";

const top5 = Object.keys(BETWEENNESS).map(Number).sort((a, b) => BETWEENNESS[b] - BETWEENNESS[a]).slice(0, 5);
const byId = {};
for (const [g, members] of Object.entries(COMMUNITIES)) for (const id of members) byId[id] = { fill: OKABE_4[g - 1] };
for (const id of top5) byId[id] = { ...byId[id], outline: { color: "ink", width: 2 } };

export default {
  id: 108,
  title: "The AI panel: transcript, made objects, voice",
  theme: "light",
  file: "Karate Club",
  rail: { dots: ["objects"] },
  left: {
    panel: "ai",
    ai: {
      scope: "What is showing, 34 nodes",
      turns: [
        { who: "You", text: "Which people hold the club together?" },
        { who: "Assistant", text: `Nodes ${top5[0]} and ${top5[1]} sit on the most routes between the two sides.`, tool: "Ran Rank > Bridges, 3 ms", made: { name: "Bridges (Betweenness)" } },
        { who: "You", text: "Keep the top five as a set." },
        { who: "Assistant", text: `Top 5 by Bridges holds nodes ${top5.join(", ")}.`, tool: "Ran Filter > By range, 1 ms", made: { name: "Top 5 by Bridges" } },
      ],
      composer: "Ask about this graph, or say it",
      privacy: "Questions send a sample of up to 50 nodes and their attributes to Anthropic.",
    },
  },
  canvas: {
    nodes: { default: {}, byId, sizeBy: { values: BETWEENNESS, from: 0.8, to: 2.4 } },
    edges: { default: { width: 1 } },
    labels: top5,
    overlays: { dock: { open: false } },
  },
  insets: [{
    tag: "Also: while speaking", left: 256, top: 560, width: 256,
    title: "Listening",
    rows: [
      { type: "field", value: "which of them are in group", caret: true, icon: "mic", focus: true },
      { type: "text", text: "Enter sends; Esc stops listening" },
      { type: "button", buttons: [{ label: "Stop" }, { label: "Send", primary: true }] },
    ],
  }],
  toolbar: { active: "select", mode: "2D" },
  inspector: {
    kind: "Measure", name: "Bridges (Betweenness)",
    chip: { type: "size" }, summary: "34 values",
    reading: `Node ${top5[0]} sits on the most shortest routes.`,
    tabs: ["Values", "Define", "Style", "Record"], tab: "Record",
    rows: [
      { type: "section", title: "Made by" },
      { type: "keyValue", pairs: [{ label: "Method", value: "Bridges (Betweenness)", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Scope", value: "What was showing, 34 nodes", wide: true }] },
      { type: "keyValue", pairs: [{ label: "Time", value: "3 ms", wide: true }] },
      { type: "note", text: "Assistant: \"Which people hold the club together?\"" },
      { type: "button", buttons: [{ label: "Copy methods" }, { label: "Copy command" }] },
      { type: "section", title: "Notes", plus: true },
    ],
  },
  status: { counts: { nodes: 34, edges: 78 }, layout: "Spread out: settled", zoom: "100%" },
  caption: {
    title: "Screen 108: the AI panel.",
    text: "The way in: the AI button at the rail (Alt+5 or backtick). Look at: the scope select (what the assistant runs on); the transcript, each reply with its command as a collapsed row (Copy command) and a \"Made\" link to the object it created; the reader is hovering \"Made: Top 5 by Bridges\", so its five members are outlined on the canvas and the inspector still shows the selection (Bridges); the Objects rail button's blue dot, because objects were added while the tree was hidden; the line about what is sent, and the composer with its microphone. Inset: voice input, the words appearing in the field as they are heard.",
  },
};
