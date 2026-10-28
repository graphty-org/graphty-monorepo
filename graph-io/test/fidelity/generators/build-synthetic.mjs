// Builds two synthetic coverage networks INSIDE Cytoscape desktop (so every file is written by the
// format's own tool) and saves each as XGMML, CX, CX2 and a session:
//   syn-mappings: every style feature reached through the style itself (defaults, discrete,
//                 continuous and passthrough mappings, dependencies).
//   syn-bypass:   every feature reached per element (bypasses), plus custom graphics (charts,
//                 gradients, images), hidden elements, edge bends, groups and annotations.
//   node build-synthetic.mjs <rest port> <corpus root>
import console from "node:console";
import { mkdirSync } from "node:fs";
import process from "node:process";

const [port, root] = process.argv.slice(2);
const base = `http://localhost:${port}/v1`;
const call = async (method, path, body) => {
    const res = await globalThis.fetch(base + path, {
        method,
        headers: body ? { "content-type": "application/json" } : {},
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 400)}`);
    const out = text ? JSON.parse(text) : null;
    if (out?.errors?.length) throw new Error(`${method} ${path}: ${JSON.stringify(out.errors).slice(0, 400)}`);
    return out;
};
const command = (ns, c, args) => call("POST", `/commands/${ns}/${encodeURIComponent(c)}`, args);

let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;

const SHAPES = [
    "ELLIPSE",
    "RECTANGLE",
    "ROUND_RECTANGLE",
    "TRIANGLE",
    "DIAMOND",
    "HEXAGON",
    "OCTAGON",
    "PARALLELOGRAM",
    "VEE",
];
const STROKES = ["SOLID", "DOT", "EQUAL_DASH", "DASH_DOT", "LONG_DASH", "ZIGZAG", "SINEWAVE", "PARALLEL_LINES"];
const LINES = [
    "SOLID",
    "LONG_DASH",
    "EQUAL_DASH",
    "DASH_DOT",
    "DOT",
    "ZIGZAG",
    "SINEWAVE",
    "VERTICAL_SLASH",
    "FORWARD_SLASH",
    "BACKWARD_SLASH",
    "PARALLEL_LINES",
    "CONTIGUOUS_ARROW",
    "SEPARATE_ARROW",
    "MARQUEE_DASH",
    "MARQUEE_EQUAL",
    "MARQUEE_DASH_DOT",
];
const ARROWS = [
    "NONE",
    "ARROW",
    "DELTA",
    "T",
    "CIRCLE",
    "DIAMOND",
    "SQUARE",
    "HALF_TOP",
    "HALF_BOTTOM",
    "ARROW_SHORT",
    "DELTA_SHORT_1",
    "DELTA_SHORT_2",
    "DIAMOND_SHORT_1",
    "DIAMOND_SHORT_2",
    "OPEN_CIRCLE",
    "OPEN_DELTA",
    "OPEN_DIAMOND",
    "OPEN_SQUARE",
    "OPEN_HALF_CIRCLE",
    "HALF_CIRCLE",
    "CROSS_DELTA",
    "CROSS_OPEN_DELTA",
];
const POSITIONS = [
    "C,C,c,0.00,0.00",
    "N,S,c,0.00,0.00",
    "S,N,c,0.00,0.00",
    "E,W,l,5.00,0.00",
    "W,E,r,-5.00,0.00",
    "NE,SW,l,0.00,0.00",
    "SW,NE,r,0.00,0.00",
];
const FONTS = [
    "SansSerif.plain,plain,12",
    "SansSerif.bold,bold,12",
    "Serif.italic,italic,12",
    "Monospaced.plain,plain,12",
    "Dialog.bolditalic,bold,12",
];
const PALETTE = ["#E41A1C", "#377EB8", "#4DAF4A", "#984EA3", "#FF7F00", "#FFFF33", "#A65628", "#F781BF", "#999999"];

async function makeNetwork(name, nNodes, nEdges, nodeCols, edgeCols) {
    const nodes = [];
    const cols = Math.ceil(Math.sqrt(nNodes * 1.4));
    for (let i = 0; i < nNodes; i++) {
        nodes.push({
            data: {
                id: `n${i}`,
                name: `${name.slice(4, 5).toUpperCase()}${String(i).padStart(2, "0")}`,
                ...nodeCols(i),
            },
            position: { x: (i % cols) * 140 + rnd() * 50, y: Math.floor(i / cols) * 120 + rnd() * 40 },
        });
    }
    const edges = [];
    const seen = new Set();
    while (edges.length < nEdges) {
        const s = Math.floor(rnd() * nNodes);
        const t = (s + 1 + Math.floor(rnd() * 8)) % nNodes;
        if (seen.has(`${s}-${t}`)) continue;
        seen.add(`${s}-${t}`);
        const i = edges.length;
        edges.push({ data: { id: `e${i}`, source: `n${s}`, target: `n${t}`, ...edgeCols(i) } });
    }
    const created = await call("POST", `/networks?format=cyjs&collection=${encodeURIComponent(name)}`, {
        data: { name },
        elements: { nodes, edges },
    });
    const net = created.networkSUID ?? created[0]?.networkSUID ?? created.data?.networkSUID ?? created;
    let views = await call("GET", `/networks/${net}/views`);
    if (views.length === 0) {
        await call("POST", `/networks/${net}/views`);
        views = await call("GET", `/networks/${net}/views`);
    }
    const view = views[0];
    // place nodes where the cyjs said (CyREST's cyjs import keeps data, not positions)
    const table = await call("GET", `/networks/${net}/tables/defaultnode/rows`);
    const suidOf = new Map(table.map((r) => [r.id ?? r.shared_name, r.SUID]));
    const nodeSuid = (id) => suidOf.get(id);
    await call(
        "PUT",
        `/networks/${net}/views/${view}/nodes`,
        nodes.map((n) => ({
            SUID: nodeSuid(n.data.id),
            view: [
                { visualProperty: "NODE_X_LOCATION", value: n.position.x },
                { visualProperty: "NODE_Y_LOCATION", value: n.position.y },
            ],
        })),
    );
    const etable = await call("GET", `/networks/${net}/tables/defaultedge/rows`);
    const esuid = new Map(etable.map((r) => [r.id ?? r.shared_name, r.SUID]));
    return { net, view, nodeSuid, edgeSuid: (id) => esuid.get(id), nodes, edges };
}

const discrete = (vp, column, type, pairs) => ({
    mappingType: "discrete",
    mappingColumn: column,
    mappingColumnType: type,
    visualProperty: vp,
    map: pairs.map(([key, value]) => ({ key: String(key), value: String(value) })),
});
const continuous = (vp, column, points) => ({
    mappingType: "continuous",
    mappingColumn: column,
    mappingColumnType: "Double",
    visualProperty: vp,
    points: points.map(([value, lesser, equal, greater]) => ({
        value,
        lesser: String(lesser),
        equal: String(equal ?? lesser),
        greater: String(greater ?? equal ?? lesser),
    })),
});
const passthrough = (vp, column, type = "String") => ({
    mappingType: "passthrough",
    mappingColumn: column,
    mappingColumnType: type,
    visualProperty: vp,
});

async function save(name, ctx) {
    for (const [fmt, opt, ext] of [
        ["xgmml", "XGMML", "xgmml"],
        ["cx", "CX", "cx"],
        ["cx2", "CX2", "cx2"],
    ]) {
        const dir = `${root}/${fmt}/${name}`;
        mkdirSync(dir, { recursive: true });
        const options = fmt === "xgmml" ? "XGMML" : opt;
        try {
            if (fmt === "xgmml") {
                // `network export` writes no <graphics>; the view route writes network and view, as
                // Cytoscape's "Export Network and View" does (scripts/export-view-xgmml.mjs).
                await call(
                    "GET",
                    `/networks/${ctx.net}/views/${ctx.view}?file=${encodeURIComponent(`${dir}/source.xgmml`)}`,
                );
                continue;
            }
            await command("network", "export", {
                network: `SUID:${ctx.net}`,
                options,
                outputFile: `${dir}/source.${ext}`,
            });
        } catch (e) {
            console.error(`${fmt} export: ${e.message}`);
        }
    }
}

// ---------------------------------------------------------------- syn-mappings
await command("session", "new", { destroyCurrentSession: true });
const A = await makeNetwork(
    "syn-mappings",
    96,
    140,
    (i) => ({
        kind: SHAPES[i % SHAPES.length],
        score: Math.round(((i * 37) % 97) / 0.97) / 100,
        tier: i % STROKES.length,
        pos: i % POSITIONS.length,
        grp: ["alpha", "beta", "gamma", "delta", "epsilon"][i % 5],
        rank: (i * 13) % 50,
        note: `node ${i}: tooltip text`,
    }),
    (i) => ({
        interaction: LINES[i % LINES.length],
        etype: ARROWS[i % ARROWS.length],
        stype: ARROWS[(i * 5 + 3) % ARROWS.length],
        weight: ((i * 29) % 101) / 100,
        elabel: i % 4 === 0 ? `e${i}` : "",
    }),
);
const STYLE_A = "syn-mappings style";
await call("POST", "/styles", {
    title: STYLE_A,
    defaults: [
        { visualProperty: "NETWORK_BACKGROUND_PAINT", value: "#F4F1E8" },
        { visualProperty: "NODE_LABEL_WIDTH", value: 90 },
        { visualProperty: "NODE_BORDER_TRANSPARENCY", value: 200 },
        { visualProperty: "NODE_LABEL_BACKGROUND_COLOR", value: "#FFFFCC" },
        { visualProperty: "NODE_LABEL_BACKGROUND_SHAPE", value: "ROUND_RECTANGLE" },
        { visualProperty: "NODE_LABEL_BACKGROUND_TRANSPARENCY", value: 160 },
        { visualProperty: "EDGE_LABEL_COLOR", value: "#2F4F4F" },
        { visualProperty: "EDGE_LABEL_FONT_SIZE", value: 9 },
        { visualProperty: "EDGE_LABEL_FONT_FACE", value: "Serif.italic,italic,9" },
        { visualProperty: "EDGE_SOURCE_ARROW_SIZE", value: 12 },
        { visualProperty: "EDGE_TARGET_ARROW_SIZE", value: 9 },
        { visualProperty: "EDGE_TRANSPARENCY", value: 210 },
        { visualProperty: "EDGE_CURVED", value: false },
    ],
    mappings: [
        discrete(
            "NODE_SHAPE",
            "kind",
            "String",
            SHAPES.map((s) => [s, s]),
        ),
        continuous("NODE_FILL_COLOR", "score", [
            [0, "#2166AC"],
            [0.5, "#F7F7F7"],
            [1, "#B2182B"],
        ]),
        continuous("NODE_WIDTH", "score", [
            [0, 25],
            [1, 75],
        ]),
        continuous("NODE_HEIGHT", "rank", [
            [0, 20],
            [49, 60],
        ]),
        discrete(
            "NODE_BORDER_STROKE",
            "tier",
            "Integer",
            STROKES.map((s, i) => [i, s]),
        ),
        continuous("NODE_BORDER_WIDTH", "rank", [
            [0, 1],
            [49, 7],
        ]),
        discrete("NODE_BORDER_PAINT", "grp", "String", [
            ["alpha", "#000000"],
            ["beta", "#1B9E77"],
            ["gamma", "#D95F02"],
            ["delta", "#7570B3"],
            ["epsilon", "#E7298A"],
        ]),
        continuous("NODE_TRANSPARENCY", "rank", [
            [0, 255],
            [49, 90],
        ]),
        passthrough("NODE_LABEL", "name"),
        passthrough("NODE_TOOLTIP", "note"),
        discrete("NODE_LABEL_COLOR", "grp", "String", [
            ["alpha", "#000000"],
            ["beta", "#00441B"],
            ["gamma", "#7F2704"],
            ["delta", "#3F007D"],
            ["epsilon", "#67001F"],
        ]),
        discrete(
            "NODE_LABEL_FONT_FACE",
            "grp",
            "String",
            ["alpha", "beta", "gamma", "delta", "epsilon"].map((g, i) => [g, FONTS[i]]),
        ),
        continuous("NODE_LABEL_FONT_SIZE", "rank", [
            [0, 8],
            [49, 20],
        ]),
        discrete(
            "NODE_LABEL_POSITION",
            "pos",
            "Integer",
            POSITIONS.map((p, i) => [i, p]),
        ),
        continuous("NODE_LABEL_ROTATION", "rank", [
            [0, 0],
            [10, 0],
            [49, 45],
        ]),
        continuous("NODE_LABEL_TRANSPARENCY", "score", [
            [0, 120],
            [1, 255],
        ]),
        continuous("NODE_Z_LOCATION", "rank", [
            [0, 0],
            [49, 49],
        ]),
        discrete(
            "EDGE_LINE_TYPE",
            "interaction",
            "String",
            LINES.map((l) => [l, l]),
        ),
        discrete(
            "EDGE_TARGET_ARROW_SHAPE",
            "etype",
            "String",
            ARROWS.map((a) => [a, a]),
        ),
        discrete(
            "EDGE_SOURCE_ARROW_SHAPE",
            "stype",
            "String",
            ARROWS.map((a) => [a, a]),
        ),
        continuous("EDGE_WIDTH", "weight", [
            [0, 0.5],
            [1, 8],
        ]),
        continuous("EDGE_STROKE_UNSELECTED_PAINT", "weight", [
            [0, "#BDBDBD"],
            [1, "#08306B"],
        ]),
        continuous("EDGE_TARGET_ARROW_UNSELECTED_PAINT", "weight", [
            [0, "#FC9272"],
            [1, "#67000D"],
        ]),
        discrete(
            "EDGE_SOURCE_ARROW_UNSELECTED_PAINT",
            "interaction",
            "String",
            LINES.map((l, i) => [l, PALETTE[i % PALETTE.length]]),
        ),
        passthrough("EDGE_LABEL", "elabel"),
        passthrough("EDGE_TOOLTIP", "interaction"),
    ],
});
await call("PUT", `/styles/${encodeURIComponent(STYLE_A)}/dependencies`, [
    { visualPropertyDependency: "nodeSizeLocked", enabled: false },
    { visualPropertyDependency: "arrowColorMatchesEdge", enabled: false },
]);
await call("GET", `/apply/styles/${encodeURIComponent(STYLE_A)}/${A.net}`);
await save("syn-mappings", A);
mkdirSync(`${root}/cys/syn-mappings`, { recursive: true });
await command("session", "save as", { file: `${root}/cys/syn-mappings/source.cys` });
console.log("syn-mappings saved");

// ---------------------------------------------------------------- syn-bypass
await command("session", "new", { destroyCurrentSession: true });
const IMG = "https://raw.githubusercontent.com/cytoscape/cytoscape.js/master/documentation/img/cytoscape-logo.png";
const B = await makeNetwork(
    "syn-bypass",
    64,
    90,
    (i) => ({ a: (i * 7) % 10, b: (i * 3) % 10, c: (i * 5) % 10, img: i % 16 === 3 ? IMG : "" }),
    () => ({ interaction: "pp" }),
);
const STYLE_B = "syn-bypass style";
await call("POST", "/styles", {
    title: STYLE_B,
    defaults: [
        { visualProperty: "NETWORK_BACKGROUND_PAINT", value: "#FFFFFF" },
        { visualProperty: "NODE_FILL_COLOR", value: "#C6DBEF" },
        { visualProperty: "NODE_SIZE", value: 40 },
        { visualProperty: "EDGE_STROKE_UNSELECTED_PAINT", value: "#636363" },
        { visualProperty: "EDGE_TARGET_ARROW_SHAPE", value: "DELTA" },
    ],
    mappings: [passthrough("NODE_LABEL", "name"), passthrough("NODE_CUSTOMGRAPHICS_1", "img")],
});
await call("PUT", `/styles/${encodeURIComponent(STYLE_B)}/dependencies`, [
    { visualPropertyDependency: "nodeSizeLocked", enabled: true },
    { visualPropertyDependency: "arrowColorMatchesEdge", enabled: true },
]);
await call("GET", `/apply/styles/${encodeURIComponent(STYLE_B)}/${B.net}`);
const PIE =
    'org.cytoscape.PieChart:{"cy_range":[0.0,10.0],"cy_colors":["#E41A1C","#377EB8","#4DAF4A"],"cy_dataColumns":["a","b","c"],"cy_startAngle":0.0}';
const BAR =
    'org.cytoscape.BarChart:{"cy_range":[0.0,10.0],"cy_colors":["#E41A1C","#377EB8","#4DAF4A"],"cy_dataColumns":["a","b","c"],"cy_type":"GROUPED"}';
const RING =
    'org.cytoscape.RingChart:{"cy_colors":["#984EA3","#FF7F00","#FFFF33"],"cy_dataColumns":["a","b","c"],"cy_hole":0.4}';
const LIN =
    'org.cytoscape.LinearGradient:{"cy_angle":0.0,"cy_gradientColors":["#FFFFFF","#08519C"],"cy_gradientFractions":[0.0,1.0]}';
const RAD =
    'org.cytoscape.RadialGradient:{"cy_gradientColors":["#FFFFFF","#A50F15"],"cy_gradientFractions":[0.0,1.0],"cy_center":{"x":0.5,"y":0.5},"cy_radius":0.7}';
const nb = [];
for (let i = 0; i < 64; i++) {
    const v = [];
    const add = (visualProperty, value) => v.push({ visualProperty, value });
    if (i % 3 === 0) add("NODE_FILL_COLOR", PALETTE[i % PALETTE.length]);
    if (i % 5 === 1) add("NODE_SHAPE", SHAPES[i % SHAPES.length]);
    if (i % 7 === 2) {
        add("NODE_WIDTH", 30 + (i % 4) * 20);
        add("NODE_HEIGHT", 20 + (i % 3) * 15);
        add("NODE_SIZE", 30 + (i % 4) * 15);
    }
    if (i % 4 === 1) {
        add("NODE_BORDER_PAINT", "#252525");
        add("NODE_BORDER_WIDTH", 1 + (i % 6));
        add("NODE_BORDER_STROKE", STROKES[i % STROKES.length]);
    }
    if (i % 6 === 5) add("NODE_TRANSPARENCY", 100);
    if (i % 9 === 4) add("NODE_LABEL", `custom label ${i}`);
    if (i % 8 === 3) add("NODE_LABEL_POSITION", POSITIONS[1 + (i % 6)]);
    if (i % 10 === 7) add("NODE_LABEL_ROTATION", 30);
    if (i % 11 === 0) {
        add("NODE_LABEL_FONT_SIZE", 18);
        add("NODE_LABEL_COLOR", "#A50026");
        add("NODE_LABEL_FONT_FACE", "Serif.bold,bold,18");
    }
    if (i % 13 === 6) add("NODE_Z_LOCATION", 100);
    if ([10, 20, 30].includes(i)) add("NODE_VISIBLE", false);
    if ([5, 25, 45, 61].includes(i)) add("NODE_CUSTOMGRAPHICS_1", PIE);
    if ([15, 35].includes(i)) add("NODE_CUSTOMGRAPHICS_1", BAR);
    if ([55, 63].includes(i)) add("NODE_CUSTOMGRAPHICS_1", RING);
    if ([8, 28, 48, 58].includes(i)) add("NODE_CUSTOMGRAPHICS_1", LIN);
    if ([12, 32, 52, 62].includes(i)) add("NODE_CUSTOMGRAPHICS_1", RAD);
    if (v.length) nb.push({ SUID: B.nodeSuid(`n${i}`), view: v });
}
await call("PUT", `/networks/${B.net}/views/${B.view}/nodes?bypass=true`, nb);
const eb = [];
for (let i = 0; i < 90; i++) {
    const v = [];
    const add = (visualProperty, value) => v.push({ visualProperty, value });
    if (i % 3 === 0) add("EDGE_STROKE_UNSELECTED_PAINT", PALETTE[i % PALETTE.length]);
    if (i % 4 === 1) add("EDGE_WIDTH", 1 + (i % 7));
    if (i % 5 === 2) add("EDGE_LINE_TYPE", LINES[i % LINES.length]);
    if (i % 6 === 3) {
        add("EDGE_TARGET_ARROW_SHAPE", ARROWS[i % ARROWS.length]);
        add("EDGE_SOURCE_ARROW_SHAPE", ARROWS[(i + 7) % ARROWS.length]);
    }
    if (i % 7 === 4) add("EDGE_TRANSPARENCY", 90);
    if (i % 9 === 5) {
        add("EDGE_LABEL", `edge ${i}`);
        add("EDGE_LABEL_FONT_SIZE", 11);
        add("EDGE_LABEL_COLOR", "#08519C");
    }
    if (i % 11 === 6) {
        add("EDGE_BEND", "0.0,1.0,0.5");
    }
    if (i % 11 === 7) {
        add("EDGE_BEND", "0.7071,-0.7071,0.3|0.7071,0.7071,0.7");
        add("EDGE_CURVED", false);
    }
    if ([40, 60, 80].includes(i)) add("EDGE_VISIBLE", false);
    if (i % 8 === 0) add("EDGE_Z_ORDER", 10);
    if (v.length) eb.push({ SUID: B.edgeSuid(`e${i}`), view: v });
}
await call("PUT", `/networks/${B.net}/views/${B.view}/edges?bypass=true`, eb);
await call("PUT", `/networks/${B.net}/views/${B.view}/network?bypass=true`, [
    { visualProperty: "NETWORK_BACKGROUND_PAINT", value: "#FAFAF0" },
]);
// groups: two expanded, one collapsed
const list = (ids) => ids.map((i) => `SUID:${B.nodeSuid(`n${i}`)}`).join(",");
await command("group", "create", { groupName: "group-expanded-1", nodeList: list([0, 1, 2, 3]) });
await command("group", "create", { groupName: "group-expanded-2", nodeList: list([40, 41, 42]) });
await command("group", "create", { groupName: "group-collapsed", nodeList: list([50, 51, 52, 53]) });
await command("group", "collapse", { groupList: "group-collapsed" });
// annotations of every kind
const net = `SUID:${B.net}`;
await command("annotation", "add text", {
    view: `SUID:${B.view}`,
    text: "Synthetic coverage network",
    x: "-50",
    y: "-80",
    fontSize: "24",
    color: "#08306B",
    fontFamily: "SansSerif",
    fontStyle: "bold",
});
await command("annotation", "add bounded text", {
    view: `SUID:${B.view}`,
    text: "bounded note",
    x: "600",
    y: "-80",
    width: "160",
    height: "50",
    type: "ROUNDEDRECTANGLE",
    fillColor: "#FFF7BC",
    borderColor: "#993404",
    borderThickness: "2",
    fontSize: "14",
});
await command("annotation", "add shape", {
    view: `SUID:${B.view}`,
    type: "ELLIPSE",
    x: "200",
    y: "200",
    width: "300",
    height: "200",
    fillColor: "#C7E9C0",
    opacity: "40",
    borderColor: "#006D2C",
    borderThickness: "3",
    canvas: "background",
});
await command("annotation", "add shape", {
    view: `SUID:${B.view}`,
    type: "RECTANGLE",
    x: "700",
    y: "400",
    width: "250",
    height: "160",
    fillColor: "#FDD0A2",
    opacity: "50",
    borderColor: "#A63603",
    borderThickness: "2",
    canvas: "background",
});
await command("annotation", "add image", {
    view: `SUID:${B.view}`,
    url: IMG,
    x: "900",
    y: "-120",
    width: "120",
    height: "60",
});
await command("annotation", "add text", {
    view: `SUID:${B.view}`,
    text: "grouped A",
    x: "100",
    y: "900",
    fontSize: "14",
    name: "ga",
});
await command("annotation", "add text", {
    view: `SUID:${B.view}`,
    text: "grouped B",
    x: "100",
    y: "930",
    fontSize: "14",
    name: "gb",
});
try {
    await command("annotation", "group", { view: `SUID:${B.view}`, annotationlist: "ga,gb", name: "annotation-group" });
} catch (e) {
    console.error("annotation group:", e.message);
}
console.log("annotations", JSON.stringify((await command("annotation", "list", { network: net })).data?.length));
await save("syn-bypass", B);
mkdirSync(`${root}/cys/syn-bypass`, { recursive: true });
await command("session", "save as", { file: `${root}/cys/syn-bypass/source.cys` });
console.log("syn-bypass saved");
