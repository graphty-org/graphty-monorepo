// Writes graph-io/test/corpus/styles/cyjs/rules/*.cyjs: stylesheets for the less common parts of
// Cytoscape.js's grammar and mappers. Seeded; a rerun writes the same files.
import { mkdirSync, writeFileSync } from "node:fs";
const dir = new URL("../test/corpus/styles/cyjs/rules/", import.meta.url).pathname;
mkdirSync(dir, { recursive: true });
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296;
const pick = (a) => a[Math.floor(rnd() * a.length)];

// a compound graph with numeric and string ids, nested data, arrays of classes, flags and bypasses
const nodes = [];
for (let i = 0; i < 60; i++) {
    const d = {
        id: i % 7 === 0 ? i : `n${i}`,
        w: pick([0, 1, 2.5, 5, 10, 12, -3, "4", null, true, "x"]),
        name: pick(["alpha", "Beta", "gamma", "ALPHA", "", 'a"b']),
        nest: { v: pick([1, 2, 3]), s: { t: pick(["p", "q"]) } },
        col: pick([
            "red",
            "#0f0",
            "rgb(10,20,30)",
            "hsl(200, 50%, 40%)",
            "rgba(1,2,3,0.5)",
            "transparent",
            "#12g",
            "nope",
            7,
            "  blue ",
        ]),
        size: pick([5, "7", "9px", "2em", "50%", "label", -1, 0]),
    };
    if (i > 0 && i % 5 === 0) d.parent = `n${i - 1}`;
    if (i === 3) d.parent = 3; // to a numeric id that does not exist as a number
    if (i === 14) d.parent = "missing";
    const n = { data: d, classes: pick(["a", "a b", ["b", "c"], "", "  c  a ", ["", "d", 5]]) };
    if (i % 11 === 0) n.selected = true;
    if (i % 13 === 0) n.locked = true;
    if (i % 17 === 0) n.grabbable = false;
    if (i % 19 === 0) n.style = { "background-color": "purple", width: "data(w)", "border-width": 4 };
    if (i % 23 === 0) n.css = { backgroundColor: "orange" };
    nodes.push(n);
}

const edges = [];
for (let i = 0; i < 90; i++) {
    const a = Math.floor(rnd() * 60),
        b = rnd() < 0.1 ? a : Math.floor(rnd() * 60);
    const id = (k) => (k % 7 === 0 ? k : `n${k}`);
    edges.push({
        data: {
            id: `e${i}`,
            source: id(a),
            target: id(b),
            w: pick([0, 3, 7, 10, "5", null]),
            kind: pick(["x", "y", "z"]),
        },
        classes: pick(["", "hot", "cold hot"]),
    });
}

edges.push({ data: { source: "n2", target: "n4" } }); // no id
const elements = [...nodes, ...edges];

const style = [
    { selector: "*", style: { "text-halign": "right" } },
    { selector: "nodes", style: { shape: "barrel" } },
    { selector: "node:nonexistent", style: { shape: "tag" } },
    { selector: "node,", style: { "font-weight": "bold" } },
    { selector: "", style: { shape: "octagon" } },
    { selector: "node[w = 5px]", style: { color: "yellow" } },
    { selector: "node>node", style: { opacity: 0.1 } },
    {
        selector: "node",
        style: {
            label: "data(name)",
            "background-color": "data(col)",
            width: "data(size)",
            height: "mapData(w, 0, 10, 10, 40)",
        },
    },
    { selector: "node[[degree > 3]]", style: { shape: "diamond" } },
    { selector: "node[[indegree = 0]][[outdegree >= 1]]", style: { "border-width": 2, "border-color": "#123456" } },
    { selector: "node[[degree != 2]][[indegree !< 1]]", style: { "font-weight": 700 } },
    { selector: "node[nest.v = 2]", style: { "font-style": "italic" } },
    { selector: "node[nest.s.t = 'q']", style: { "text-valign": "bottom" } },
    { selector: "node[name @= 'alpha']", style: { color: "#ff00ff" } },
    { selector: "node[name *= 'a']", style: { "text-halign": "left-inside" } },
    { selector: "node[name $= 'a']", style: { "font-family": 'Arial, "Times New Roman" ,serif' } },
    { selector: "node[name ^= 'g']", style: { "font-size": 22 } },
    { selector: 'node[name = "a\\"b"]', style: { opacity: 0.3 } },
    { selector: "node[w > 2]", style: { "background-opacity": 0.5 } },
    { selector: "node[w !> 2]", style: { "border-style": "dotted" } },
    { selector: "node[?w]", style: { visibility: "visible" } },
    { selector: "node[!w]", style: { display: "element" } },
    { selector: "node[^w]", style: { shape: "hexagon" } },
    { selector: "node[w]", style: { "text-valign": "center" } },
    { selector: "node[id = 7]", style: { shape: "star" } },
    { selector: "node[id = '7']", style: { shape: "vee" } },
    { selector: "#n12, #\\31 4, #14", style: { "background-color": "black" } },
    { selector: ".a.b", style: { width: 33 } },
    { selector: ".c", style: { height: "mapData(w, 10, 0, 5, 50)" } },
    { selector: ".d", style: { height: "mapData(w, 5, 5, 6, 60)" } },
    { selector: "node.a", style: { "background-color": "mapData(w, 0, 10, red, blue)" } },
    { selector: "node.b", style: { "background-color": "mapData(w, 0, 10, red, red)" } },
    { selector: "node.c", style: { "border-color": "mapData(w, 0, 10, #f00, rgba(255,0,0,0.5))" } },
    { selector: "node.d", style: { width: "mapData(w, 0, 10, 50%, 80%)" } },
    { selector: "node.c", style: { width: "mapData( w, 0, 10, 5, 8)" } },
    { selector: "node.a", style: { "border-width": "mapData(w,0,10,1,3 )" } },
    { selector: ":parent", style: { "background-color": "#eeeeff" } },
    { selector: ":parent > node", style: { "border-color": "green" } },
    { selector: ":parent node", style: { "border-width": 6 } },
    { selector: "$node > node", style: { shape: "triangle" } },
    { selector: "node > $node.a", style: { shape: "pentagon" } },
    { selector: ":child", style: { opacity: 0.9 } },
    { selector: ":orphan:childless", style: { "font-size": "12px" } },
    { selector: "node:selected", style: { "background-color": "gold" } },
    { selector: ":locked", style: { "border-color": "silver" } },
    { selector: ":ungrabbable", style: { "border-style": "double" } },
    { selector: "node:unselectable", style: { color: "teal" } },
    {
        selector: "edge",
        style: {
            width: "mapData(w, 0, 10, 1, 9)",
            "line-color": "mapData(w, 10, 0, #000, #fff)",
            "curve-style": "bezier",
            "target-arrow-shape": "triangle-tee",
        },
    },
    {
        selector: "edge[kind = 'x']",
        style: { "line-style": "dashed", "source-arrow-shape": "chevron", "arrow-scale": 2 },
    },
    { selector: "edge.hot", style: { "line-color": "data(kind)", width: "data(w)" } },
    { selector: "edge.cold", style: { "curve-style": "straight" } },
    { selector: "edge.hot.cold", style: { "curve-style": "taxi" } },
    { selector: "edge:loop", style: { "curve-style": "haystack", "target-arrow-color": "blue" } },
    { selector: "edge:loop.hot", style: { "curve-style": "segments" } },
    {
        selector: "edge:simple.cold",
        style: { "source-arrow-color": "red", label: "data(kind)", "source-label": "s", "target-label": "data(w)" },
    },
    { selector: "node.a -> node.b", style: { opacity: 0.4 } },
    { selector: "node.b <-> #n2", style: { "line-style": "dotted" } },
    { selector: "$node -> node.a", style: { "font-size": 9 } },
    { selector: "$node <-> node.c", style: { "border-width": 1.5 } },
    { selector: "edge[w >= 5][kind != 'z']", style: { visibility: "hidden" } },
    { selector: "edge[[degree > 1]]", style: { display: "none" } },
    { selector: "edge#e4, edge#e5", style: { display: "none", visibility: "visible" } },
    { selector: "edge:compound", style: { "arrow-scale": 0.5 } },
    { selector: "node", style: { content: "data(id)", label: "data(nest.v)" } },
];
writeFileSync(`${dir}cyjs-semantics.cyjs`, JSON.stringify({ elements, style }));

// the same kind of sheet as text, with comments, odd spacing and properties Cytoscape.js skips
const text = `/* a comment */ node { background-color: #abc; width: 20 }
node[w > 2]{ background-color : red ; height:45px;}
/** two */ .a { shape: star; label: data(name) }
.b:selected { shape: square }
node.c  {  border-width : 3 ; backgroundColor: blue; content: x }
node:not(.a) { color: green }
edge { width: 4; line-color: rgb(0,0,255) }
edge.hot { line-color: #f80 }
node[name = "a;b"] { font-size: 30 }
.d { opacity: 0.2; }
#n2 { }
node[w = 10] { width: 70 }
`;
writeFileSync(`${dir}cyjs-text.cyjs`, JSON.stringify({ elements, style: text }));
// a text sheet that stops at a property with no shape
writeFileSync(
    `${dir}cyjs-text-stops.cyjs`,
    JSON.stringify({ elements, style: "node { background-color: red }\n.a { width 30 }\n.b { width: 40 }" }),
);
