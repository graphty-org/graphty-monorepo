// The probe (design section 9.7): a pen. Its tip touching a node (near), or the holding hand
// pointing at one (far), shows a card with every result for that node: degree, PageRank and its
// rank, community. Pointed at nothing, the card reads the current result's summary: its range and
// top three. A new reading runs the `probe` command (logged, never in the history) and logs the
// facts it showed.

import { Color3, MeshBuilder, StandardMaterial, Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import { isVisible } from "../../core/state";
import type { TechniqueContext } from "../../framework/technique";
import type { Card } from "./card";
import type { Tool } from "./rack";

/** The probe. */
export interface Probe {
    tool: Tool;
    /** The last reading: a node name, or "summary". */
    readonly reading: { target: string; via: "touch" | "point" | "summary" } | null;
    /** The tip's world position. */
    tip(): Vector3;
    /** Per frame while held. */
    frame(): void;
}

/** How close the tip must be to a node's surface to touch it, in meters. */
const TOUCH_M = 0.015;

/**
 * Build the probe, hidden on the rack.
 * @param ctx - the technique context
 * @param card - the card it writes on
 * @param sieveResult - the result the sieve filters by, the summary's fallback
 * @returns the probe
 */
export function createProbe(ctx: TechniqueContext, card: Card, sieveResult: () => string): Probe {
    const { scene, graph } = ctx;
    const { data } = graph;
    const mat = new StandardMaterial("physical-tools-probe-mat", scene);
    mat.diffuseColor = new Color3(0.3, 0.75, 0.95);
    mat.emissiveColor = new Color3(0.05, 0.15, 0.2);
    // The root is the pen body (the grab target), lying along local +z; the tip is at its far end.
    const root = MeshBuilder.CreateBox("physical-tools-probe", { width: 0.022, height: 0.022, depth: 0.12 }, scene);
    root.material = mat;
    const tipMesh = MeshBuilder.CreateSphere("physical-tools-probe-tip", { diameter: 0.012, segments: 8 }, scene);
    const tipMat = new StandardMaterial("physical-tools-probe-tip-mat", scene);
    tipMat.emissiveColor = new Color3(1, 0.9, 0.4);
    tipMat.disableLighting = true;
    tipMesh.material = tipMat;
    tipMesh.parent = root;
    tipMesh.position.z = 0.066;
    tipMesh.isPickable = false;

    let hand: Hand | null = null;
    let reading: Probe["reading"] = null;
    let key = "";
    const tmp = new Vector3();
    const tip = new Vector3();

    const nodeText = (i: number): string => {
        const r = data.results;
        const lines = [
            data.names[i],
            `degree ${data.neighbors(i, 1).length - 1}`,
            `PageRank ${r.pagerank[i].toFixed(3)}, rank ${data.rank.pagerank[i]}`,
            `community ${r.community[i]}`,
        ];
        return lines.join("\n");
    };
    const summaryText = (): { text: string; result: string } => {
        const s = ctx.state;
        const result = s.colorBy ?? s.sizeBy ?? s.filter?.result ?? sieveResult();
        const name = data.resultNames[result] ?? result;
        const v = data.results[result];
        const o = data.order[result];
        if (data.categorical[result]) {
            return { text: `${name}: ${new Set(v).size} groups`, result };
        }
        const top = o.slice(0, 3).map((i) => data.names[i]);
        return {
            text: `${name} ${v[o.at(-1) ?? 0].toFixed(3)} to ${v[o[0]].toFixed(3)}\ntop: ${top.join(", ")}`,
            result,
        };
    };

    const touched = (): number => {
        const reach = graph.radiusWorld() + TOUCH_M;
        let best = -1;
        let bestD = reach;
        for (let i = 0; i < data.nodeCount; i++) {
            if (!isVisible(ctx.state, i)) {
                continue;
            }
            const d = Vector3.Distance(graph.nodeWorld(i, tmp), tip);
            if (d < bestD) {
                bestD = d;
                best = i;
            }
        }
        return best;
    };

    return {
        tool: {
            id: "probe",
            root,
            inHand: new Vector3(0, -0.01, 0.07),
            onTake(h) {
                hand = h;
                key = "";
                card.show();
            },
            onPut() {
                hand = null;
                reading = null;
                key = "";
                card.hide();
            },
        },
        get reading() {
            return reading;
        },
        tip: () => tipMesh.getAbsolutePosition().clone(),
        frame() {
            if (!hand) {
                return;
            }
            tip.copyFrom(tipMesh.getAbsolutePosition());
            let node = touched();
            let via: "touch" | "point" | "summary" = "touch";
            if (node < 0 && ctx.settings.bool("probeFar")) {
                const h = ctx.hover(hand);
                node = h.context === "node" ? h.node : -1;
                via = "point";
            }
            if (node < 0) {
                via = "summary";
            }
            const k = `${node}:${via}`;
            if (k !== key) {
                key = k;
                if (node >= 0) {
                    card.set(nodeText(node));
                    reading = { target: data.names[node], via };
                    ctx.commands.run("probe", { id: node }, hand);
                    ctx.log("reading", {
                        via,
                        node: data.names[node],
                        degree: data.neighbors(node, 1).length - 1,
                        pagerank: Number(data.results.pagerank[node].toFixed(4)),
                        rank: data.rank.pagerank[node],
                        community: data.results.community[node],
                    });
                } else {
                    const s = summaryText();
                    card.set(s.text);
                    reading = { target: "summary", via };
                    ctx.commands.run("probe", { id: null }, hand);
                    ctx.log("reading", { via, result: s.result, text: s.text });
                }
            }
            // Beside the node it reads, or above the tip for a summary.
            const at = node >= 0 ? graph.nodeWorld(node, tmp).clone() : tip.clone();
            at.y += node >= 0 ? graph.radiusWorld() + 0.02 : 0.03;
            card.place(at);
        },
    };
}
