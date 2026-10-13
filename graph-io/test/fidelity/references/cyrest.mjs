// Reference scene from Cytoscape desktop (route cytoscape-desktop, or cytoscape-gml for a GML file):
// loads a file into a running Cytoscape 3.10.5 through CyREST and reads every node's and edge's
// resolved visual properties from the network view (after mappings, defaults, dependencies and
// bypasses), plus the session's annotations. Optionally also writes the view as a Cytoscape.js
// document (desktop's own element and style exports), the input of the cyjs-hop route.
//
//   node cyrest.mjs <rest port> <file to load> <sample as stored> <route> <out.json> [<cydoc out.json>]
//
// A session (.cys) is opened with `session open`; anything else with `network load file`, never
// `network import`, which drops the file's style. A .gz sample is loaded decompressed (regenerate.sh)
// and hashed as stored. Ids are the node `name` column (the file's own names); edge ids are
// "<source name>-><target name>", with "#k" for the k-th parallel edge.
// Cytoscape's canvas is y down and node locations are centers.
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

import { clipPath, finishScene, parseColor, sha256File } from "./common.mjs";

const POSITION = { "C,C": "inside", "S,N": "below", "N,S": "above", "E,W": "right", "W,E": "left" };

/**
 * The scene ids of a Cytoscape view's elements: each node's `name` (with "#k" for the k-th repeat of
 * a name), and "<source>-><target>" for each edge (with "#k" for the k-th parallel edge), keyed by SUID.
 * @param topology - the view's Cytoscape.js JSON
 * @returns the node and edge ids by SUID, and whether a name repeats
 */
export function cyrestIds(topology) {
    const seen = new Map();
    const nodes = new Map();
    for (const n of topology.elements.nodes) {
        const name = String(n.data.name ?? n.data.id);
        const k = seen.get(name) ?? 0;
        seen.set(name, k + 1);
        nodes.set(String(n.data.SUID), k ? `${name}#${k}` : name);
    }
    const ordinal = new Map();
    const edges = new Map();
    for (const e of topology.elements.edges) {
        const key = `${nodes.get(String(e.data.source))}->${nodes.get(String(e.data.target))}`;
        const k = ordinal.get(key) ?? 0;
        ordinal.set(key, k + 1);
        edges.set(String(e.data.SUID), k ? `${key}#${k}` : key);
    }
    return { nodes, edges, repeated: [...seen.values()].some((k) => k > 1) };
}

/**
 * The scene of one Cytoscape network view as CyREST reports it.
 * @param v - { nodes, edges } (visual property rows by SUID), topology (the view's Cytoscape.js JSON), background, annotations, locked
 * @returns nodes, edges, groups, annotations, background and gaps
 */
export function sceneFromCyrest(v) {
    const { nodes: nodeRows, edges: edgeRows, topology, background, annotations, locked } = v;
    const gaps = [];
    const ids = cyrestIds(topology);
    const idOf = ids.nodes;
    if (ids.repeated) {
        gaps.push({
            property: "position",
            reason: "node names repeat, so some ids carry a #k suffix and may not match the other side",
        });
    }
    const geo = new Map();
    const nodes = nodeRows.map((r) => {
        const id = idOf.get(String(r.SUID));
        const w = locked ? r.NODE_SIZE : r.NODE_WIDTH;
        const h = locked ? r.NODE_SIZE : r.NODE_HEIGHT;
        geo.set(String(r.SUID), [
            r.NODE_X_LOCATION,
            r.NODE_Y_LOCATION,
            w,
            h,
            r.NODE_SHAPE === "ELLIPSE" ? "ellipse" : "rect",
        ]);
        const fill = parseColor(r.NODE_FILL_COLOR);
        const border = parseColor(r.NODE_BORDER_PAINT);
        const text = String(r.NODE_LABEL ?? "");
        const anchor = String(r.NODE_LABEL_POSITION ?? "C,C")
            .split(",")
            .slice(0, 2)
            .join(",");
        return {
            id,
            x: r.NODE_X_LOCATION,
            y: r.NODE_Y_LOCATION,
            w,
            h,
            shape: r.NODE_SHAPE,
            fill: fill?.hex ?? null,
            fillOpacity: fill ? (r.NODE_TRANSPARENCY ?? 255) / 255 : 0,
            border: {
                color: border && r.NODE_BORDER_WIDTH > 0 && (r.NODE_BORDER_TRANSPARENCY ?? 255) > 0 ? border.hex : null,
                width: r.NODE_BORDER_WIDTH ?? 0,
                style: r.NODE_BORDER_STROKE ?? "SOLID",
            },
            label: text
                ? {
                      text,
                      fontSize: r.NODE_LABEL_FONT_SIZE ?? 12,
                      color: parseColor(r.NODE_LABEL_COLOR)?.hex ?? "#000000",
                      position: POSITION[anchor] ?? "other",
                      visible: (r.NODE_LABEL_TRANSPARENCY ?? 255) > 0,
                  }
                : null,
            visible: r.NODE_VISIBLE !== false,
            z: r.NODE_Z_LOCATION ?? 0,
        };
    });
    const ends = new Map(
        topology.elements.edges.map((e) => [String(e.data.SUID), [String(e.data.source), String(e.data.target)]]),
    );
    let bent = 0;
    const edges = edgeRows.map((r) => {
        const [s, t] = ends.get(String(r.SUID));
        if (r.EDGE_BEND) {
            bent++;
        }
        const color = parseColor(r.EDGE_STROKE_UNSELECTED_PAINT ?? r.EDGE_UNSELECTED_PAINT) ?? {
            hex: "#000000",
            alpha: 1,
        };
        return {
            id: ids.edges.get(String(r.SUID)),
            source: idOf.get(s),
            target: idOf.get(t),
            points: clipPath([geo.get(s).slice(0, 2), geo.get(t).slice(0, 2)], geo.get(s), geo.get(t)),
            curved: Boolean(r.EDGE_BEND) && r.EDGE_CURVED !== false,
            color: color.hex,
            opacity: (r.EDGE_TRANSPARENCY ?? 255) / 255,
            width: r.EDGE_WIDTH ?? 1,
            style: r.EDGE_LINE_TYPE ?? "SOLID",
            arrow: { source: r.EDGE_SOURCE_ARROW_SHAPE ?? "NONE", target: r.EDGE_TARGET_ARROW_SHAPE ?? "NONE" },
            label: r.EDGE_LABEL ? String(r.EDGE_LABEL) : null,
        };
    });
    if (bent > 0) {
        gaps.push({
            property: "edgePath",
            reason: `${bent} edges have bend handles, which CyREST reports as an opaque string; their paths are drawn straight here`,
        });
    }
    const kinds = {
        ShapeAnnotation: "shape",
        TextAnnotation: "text",
        ArrowAnnotation: "arrow",
        BoundedTextAnnotation: "shape",
    };
    const annots = annotations.map((a) => {
        const kind = kinds[a.type.split(".").pop()] ?? "shape";
        const x = +a.x;
        const y = +a.y;
        let bbox = { x, y, w: +(a.width ?? 0), h: +(a.height ?? (a.fontSize ? +a.fontSize : 0)) };
        if (kind === "arrow" && a.targetPoint) {
            const [tx, ty] = a.targetPoint.split(",").map(Number);
            bbox = { x: Math.min(x, tx), y: Math.min(y, ty), w: Math.abs(tx - x), h: Math.abs(ty - y) };
        }
        return { kind, bbox, ...(a.text ? { text: a.text } : {}) };
    });
    const bg = parseColor(background);
    return {
        nodes,
        edges,
        groups: [],
        ...(annots.length ? { annotations: annots } : {}),
        ...(bg ? { background: bg.hex } : {}),
        gaps,
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const [port, input, sample, route, out, cydocOut] = process.argv.slice(2);
    const base = `http://localhost:${port}/v1`;
    const call = async (method, path, body) => {
        const res = await globalThis.fetch(base + path, {
            method,
            headers: body ? { "content-type": "application/json" } : {},
            body: body ? JSON.stringify(body) : undefined,
        });
        const text = await res.text();
        if (!res.ok) {
            throw new Error(`${method} ${path}: ${res.status} ${text.slice(0, 300)}`);
        }
        return text ? JSON.parse(text) : null;
    };
    const cmd = (ns, c, args) => call("POST", `/commands/${ns}/${encodeURIComponent(c)}`, args);
    const file = resolve(input);
    await cmd("session", "new", { destroyCurrentSession: true });
    if (file.endsWith(".cys")) {
        await cmd("session", "open", { file });
    } else {
        await cmd("network", "load file", { file });
    }
    const viewed = [];
    for (const net of await call("GET", "/networks")) {
        for (const view of await call("GET", `/networks/${net}/views`)) {
            viewed.push({ net, view, n: (await call("GET", `/networks/${net}/nodes`)).length });
        }
    }
    if (viewed.length === 0) {
        throw new Error(`Cytoscape made no network view of ${file}`);
    }
    // a session can hold several networks: the reference is the largest view
    const { net, view } = viewed.sort((a, b) => b.n - a.n)[0];
    const keep = (rows) =>
        rows.map((r) => ({ SUID: r.SUID, ...Object.fromEntries(r.view.map((v) => [v.visualProperty, v.value])) }));
    const nodes = keep(await call("GET", `/networks/${net}/views/${view}/nodes`));
    const edges = keep(await call("GET", `/networks/${net}/views/${view}/edges`));
    const netProps = Object.fromEntries(
        (await call("GET", `/networks/${net}/views/${view}/network`)).map((v) => [v.visualProperty, v.value]),
    );
    const topology = await call("GET", `/networks/${net}/views/${view}`);
    const style = await call("GET", `/networks/${net}/views/${view}/currentStyle`);
    const deps = await call("GET", `/styles/${encodeURIComponent(style.title)}/dependencies`);
    const locked = deps.some((d) => d.visualPropertyDependency === "nodeSizeLocked" && d.enabled);
    const annotations = (await cmd("annotation", "list", { network: `SUID:${net}` })).data ?? [];
    const version = (await call("GET", "/version")).cytoscapeVersion;
    const extra =
        viewed.length > 1
            ? [
                  {
                      property: "position",
                      reason: `the file holds ${viewed.length} network views; this scene is the largest`,
                  },
              ]
            : [];
    const scene = sceneFromCyrest({
        nodes,
        edges,
        topology,
        background: netProps.NETWORK_BACKGROUND_PAINT,
        annotations,
        locked,
    });
    finishScene(
        {
            provenance: {
                side: "reference",
                route,
                tool: "Cytoscape desktop over CyREST, Temurin JDK 17",
                version,
                command: `${file.endsWith(".cys") ? "session open" : "network load file"} <file>; GET /v1/networks/{n}/views/{v}/nodes|edges|network; annotation list`,
                sourceSha256: sha256File(sample),
                generatedAt: new Date().toISOString(),
            },
            canCarry: {},
            ...scene,
            gaps: [...scene.gaps, ...extra],
        },
        out,
    );
    if (cydocOut) {
        const cystyle = (await call("GET", `/styles/${encodeURIComponent(style.title)}.json`))[0];
        // desktop's style selects elements by id (= SUID), so the ids stay; sceneIds renames them in the cyjs-hop scene
        const ids = cyrestIds(topology);
        const sceneIds = { nodes: Object.fromEntries(ids.nodes), edges: Object.fromEntries(ids.edges) };
        const doc = {
            elements: topology.elements,
            style: cystyle.style,
            background: netProps.NETWORK_BACKGROUND_PAINT,
            sceneIds,
        };
        writeFileSync(cydocOut, JSON.stringify(doc));
    }
}
