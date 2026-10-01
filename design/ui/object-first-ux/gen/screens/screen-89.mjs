// Screen 89: hovering a node. College football as screen 88, nothing
// selected; the pointer rests on BrighamYoung (id 0). Its tooltip shows the
// label and three values; its 12 neighbours and the edges to them are
// highlighted, everything else dimmed, and the neighbours carry labels beyond
// the label budget. The tree rows of the objects the node belongs to take
// the hover fill; the selection is unchanged (nothing selected). The tooltip
// is the kit's dark tooltip.
import { NODES, EDGES, BETWEENNESS, GROUP_NAMES } from "../football.mjs";
import { CONF_OF } from "../football-state.mjs";
import { FOOTBALL, FOOTBALL_DATASET, CANVAS_ROWS } from "./screen-88.mjs";
import { nodeAt } from "../render.mjs";

const byLabel = Object.fromEntries(NODES.map((n) => [n.label, n]));
const HOVER = byLabel.BrighamYoung.id;
const near = new Set([HOVER]);
for (const [a, b] of EDGES) { if (a === HOVER) near.add(b); if (b === HOVER) near.add(a); }
const ranked = NODES.map((x) => x.id).sort((a, b) => BETWEENNESS[b] - BETWEENNESS[a]);

const byId = {};
for (const [id, v] of Object.entries(FOOTBALL.canvas.nodes.byId)) byId[id] = near.has(Number(id)) ? { ...v, label: true } : { ...v, opacity: 0.2, outline: undefined };
byId[HOVER] = { ...byId[HOVER], halo: true };
const byPair = {};
for (const [a, b] of EDGES) byPair[`${Math.min(a, b)}-${Math.max(a, b)}`] = a === HOVER || b === HOVER ? { stroke: "ink", width: 1.5 } : { opacity: 0.15 };

const at = nodeAt({ canvas: { graph: "football", overlays: { legend: true } } }, HOVER);
const tree = FOOTBALL.left.objects.rows.map((r) => ({ ...r, children: r.children.map((c) => (c.name === "Bridges (Betweenness)" ? c : { ...c, hover: true })) }));

export default {
  id: 89,
  title: "Hovering a node: tooltip and neighbours",
  theme: "light",
  ...FOOTBALL,
  left: { ...FOOTBALL.left, objects: { rows: tree } },
  canvas: {
    ...FOOTBALL.canvas,
    nodes: { ...FOOTBALL.canvas.nodes, byId },
    edges: { default: { width: 1 }, byPair },
    labels: [],
    overlays: {
      ...FOOTBALL.canvas.overlays,
      cursor: { x: at.x + 2, y: at.y + 2, icon: "cursor" },
      tooltip: {
        left: at.x + 18, top: at.y + 14,
        lines: ["BrighamYoung", ["Conference", GROUP_NAMES[CONF_OF[HOVER]]], ["Bridges", `${BETWEENNESS[HOVER].toFixed(3)}, rank ${ranked.indexOf(HOVER) + 1} of 115`], ["Neighbours", String(near.size - 1)]],
      },
    },
  },
  inspector: { ...FOOTBALL_DATASET, rows: CANVAS_ROWS },
  status: { counts: { nodes: 115, edges: 613 }, layout: "Spread out: settled", zoom: "Fit" },
  caption: {
    title: "Screen 89: hovering a node, its tooltip and its neighbours.",
    text: `The pointer rests on BrighamYoung; nothing is selected. Look at: the dark tooltip with the label and the three values the Tooltip row asks for (conference name, Bridges with its rank, neighbours); its ${near.size - 1} neighbours and the edges to them at full strength with labels beyond the budget, everything else dimmed; the tree rows of the objects it belongs to (Top 10 by Bridges, Conference) in the hover fill while the selection stays empty. The Canvas tab's Tooltip row [Label + 3 values] and its gear choose the values; Settings > Canvas holds "Highlight neighbours on hover [Off | Neighbours | 2 steps]" and the tooltip delay. Leaving the node restores the picture; nothing is written to the tree.`,
  },
};
