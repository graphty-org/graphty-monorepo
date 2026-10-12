// Physical tools (design section 9.7, plan section 3.9): a sieve, a filter you preview by holding
// it and commit or put back, and a probe that reads a node or the current result. Both wait on a
// rack beside the graph; grab one (ray or near) and let go to hold it. Both are also offered to
// the other techniques through `ctx.tools` ("sieve", "probe"). What it reuses and what we would fix
// or replace later: README.md beside this file.
//
// Input: the holding hand's select and squeeze (context "tool"). Sieve: select commits, squeeze
// puts it back (a cancel). Probe: either puts it back. Everything else is UI (Babylon GUI and
// SixDofDragBehavior), reached by ray or poke from either hand.

import { Vector3 } from "@babylonjs/core";

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import { createCard } from "./card";
import { createProbe, type Probe } from "./probe";
import { createRack, type Rack } from "./rack";
import { createSieve, type Sieve } from "./sieve";

let ctx: TechniqueContext;
let rack: Rack;
let sieve: Sieve;
let probe: Probe;

/** Read-only state and arrangement for the dry run, installed only with `?emulate=`. */
const installHooks = (): void => {
    const held = (h: Hand): string | null => rack.held(h)?.id ?? null;
    const api = {
        rackVisible: () => rack.node.isEnabled(),
        held: () => ({ left: held("left"), right: held("right") }),
        sieve: () => ({ value: sieve.value, readout: sieve.readout, previewing: sieve.previewing }),
        /**
         * A hidden mesh on the slider where a press sets `value`, to aim at by name.
         * @param value - the threshold wanted
         * @returns the mesh name
         */
        sliderMark: (value: number) => sieve.markFor(value),
        probeTip: () => probe.tip().asArray(),
        node: (name: string) => ctx.graph.nodeWorld(ctx.graph.data.names.indexOf(name), new Vector3()).asArray(),
        reading: () => probe.reading,
        card: () => ({ text: card.text, visible: card.visible }),
        reason: (id: string) => ctx.tools.reason(id),
        /**
         * Per node: color and scale as drawn; and every graph material's alpha.
         * @returns the look
         */
        look: () => {
            const nodes = ctx.graph.meshes[0];
            const colors = (
                nodes as unknown as { _userThinInstanceBuffersStorage?: { data: Record<string, Float32Array> } }
            )._userThinInstanceBuffersStorage?.data.instanceColor;
            // The live buffer: thinInstanceGetWorldMatrices() caches its first answer.
            const matrices = (nodes as unknown as { _thinInstanceDataStorage: { matrixData: Float32Array } })
                ._thinInstanceDataStorage.matrixData;
            const scales = Array.from(
                { length: ctx.graph.data.nodeCount },
                (_, i) =>
                    Math.round(Math.hypot(matrices[i * 16], matrices[i * 16 + 1], matrices[i * 16 + 2]) * 1e5) / 1e5,
            );
            return {
                scales,
                colors: Array.from({ length: scales.length }, (_, i) =>
                    colors ? [colors[i * 4], colors[i * 4 + 1], colors[i * 4 + 2], colors[i * 4 + 3]] : [],
                ),
                alpha: ctx.graph.meshes.slice(0, 2).map((m) => m.material?.alpha ?? null),
                blending: ctx.graph.meshes.slice(0, 2).map((m) => Boolean(m.material?.needAlphaBlendingForMesh(m))),
            };
        },
    };
    (globalThis as unknown as { __physicalTools: typeof api }).__physicalTools = api;
};

let card: ReturnType<typeof createCard>;

export const technique: Technique = {
    id: "physical-tools",
    name: "Physical tools",
    color: "#ff5370",
    settings: [
        {
            key: "result",
            label: "Sieve filters by",
            kind: "choice",
            choices: ["pagerank", "degree", "betweenness"],
            default: "pagerank",
        },
        { key: "roll", label: "Roll the wrist to set the sieve", kind: "bool", default: false },
        { key: "probeFar", label: "Probe reads what it points at", kind: "bool", default: true },
    ],
    claims: [
        {
            channel: "select",
            detail: "physical-tools",
            contexts: ["tool"],
            priority: 90,
            note: "holding the sieve: commit; the probe: put back",
        },
        { channel: "squeeze", detail: "physical-tools", contexts: ["tool"], priority: 90, note: "put the tool back" },
    ],
    prepare(c) {
        ctx = c;
        card = createCard(c);
        sieve = createSieve(c, () => {
            rack.put(sieve.tool);
        });
        probe = createProbe(c, card, () => c.settings.str("result"));
        rack = createRack(
            c,
            [
                { tool: sieve.tool, slot: new Vector3(-0.07, 0, 0) },
                { tool: probe.tool, slot: new Vector3(0.07, -0.03, 0) },
            ],
            (m, d) => {
                c.log(m, d);
            },
        );
        for (const tool of [sieve.tool, probe.tool]) {
            c.tools.offer({
                id: tool.id,
                take: (hand) => {
                    rack.take(tool, hand);
                },
            });
        }
        c.settings.onChange((key) => {
            if (key === "result") {
                sieve.retarget();
            }
        });
        c.onFrame(() => {
            rack.follow();
            sieve.frame();
            probe.frame();
        });
        if (/[?&]emulate=/.test(location.search)) {
            installHooks();
        }
    },
    activate() {
        rack.show();
    },
    deactivate() {
        // Puts every held tool back: the sieve's preview is cancelled with it.
        rack.hide();
    },
    onPress(p, hand) {
        const tool = rack.held(hand);
        if (!tool) {
            return undefined;
        }
        if (tool === sieve.tool && p.press.channel === "select") {
            sieve.commit(hand);
        } else {
            rack.put(tool);
        }
        return undefined;
    },
};
