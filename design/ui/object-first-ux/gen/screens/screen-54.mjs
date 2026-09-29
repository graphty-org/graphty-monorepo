// Screen 54: following a node (round-3/navigate-select.md, "Follow"). Screen
// 9's state with the dock closed and the layout re-running: the reader chose
// Follow in BrighamYoung's "..." menu (drawn open under the header's "...",
// the row highlighted), and the camera now keeps the node centred at the
// current zoom while it moves (canvas.camera.center). The pill reads
// "Following BrighamYoung" with an x that stops it.
import s9 from "./screen-9.mjs";
import { NODES } from "../football.mjs";

const BY = NODES.find((x) => x.label === "BrighamYoung").id;

export default {
  ...s9,
  id: 54,
  title: "Following a node",
  canvas: {
    ...s9.canvas,
    camera: { center: BY, zoom: 1.6 },
    overlays: { dock: { open: false } },
  },
  menus: [{
    anchor: { el: "inspectorMore", side: "below", align: "end" },
    width: 236,
    rows: [
      { label: "Style this node..." },
      { label: "Add to Set", sub: true },
      { label: "Copy id", key: "Ctrl+C" },
      { label: "Copy as JSON" },
      { label: "Copy position" },
      { divider: true },
      { label: "Follow", highlighted: true, checked: true },
      { label: "What breaks if removed" },
      { divider: true },
      { label: "Hide", key: "Ctrl+Shift+H" },
      { label: "Remove from data...", key: "Del", danger: true },
    ],
  }],
  inspector: { ...s9.inspector, framing: { text: "Following BrighamYoung", close: true }, actions: [{ icon: "locate", title: "Locate" }, { icon: "pin", on: false, title: "Pin" }, { icon: "more", pressed: true }] },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settling 62%", selection: "1 selected", zoom: "Following BrighamYoung" },
  caption: {
    title: "Screen 54: following a node while the layout settles.",
    text: "Look at: the node's dark \"...\" menu open under the header with Follow ticked; the camera centred on BrighamYoung at 160%, re-centred every frame while the layout moves it; the pill reading \"Following BrighamYoung\" with an x to stop, mirrored in the status bar; the layout chip settling, which is when following matters. Orbit and zoom still work around the node; the x, Esc, a pan or picking a view stops it; if the node stops showing (a filter, a Focus, a time window), following stops and the status bar says why.",
  },
};
