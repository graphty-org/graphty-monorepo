import type { GraphSession, JoinElementFate, JoinPreview, NodeId } from "@graphty/graphty-element/session";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { shownStep, useJoinWorkspace } from "./context";
import { FATE_COLORS } from "./words";

/** The preview's layout: the graph drawn flat, the same drawing on every opening. */
const PREVIEW_LAYOUT_CONFIG = { dim: 2, seed: 7 } as const;

/**
 * The graph the recipe leaves (After), or the graph before the shown step (Before), drawn by a
 * graphty-element of its own, each element in its fate's color. The element draws and colors it
 * through ordinary session verbs and style layers; the project's graph is not touched.
 * @returns the pane.
 */
export function PreviewPane(): React.JSX.Element {
    const api = useJoinWorkspace();
    const { draft, version, side } = api;
    const step = shownStep(api);
    // Read again on every edit to the draft.
    const { preview } = useMemo(
        () => ({ version, preview: draft.preview(step === undefined ? {} : { step, before: side === "before" }) }),
        [draft, version, step, side],
    );
    const ref = useRef<HTMLElementTagNameMap["graphty-element"]>(null);
    const [session, setSession] = useState<GraphSession | null>(null);
    useEffect(() => {
        let live = true;
        const element = ref.current;
        void customElements.whenDefined("graphty-element").then(() => {
            if (live && element !== null) {
                setSession(element.session);
            }
        });
        return () => {
            live = false;
        };
    }, []);
    useEffect(() => {
        if (session !== null) {
            void draw(session, preview);
        }
    }, [session, preview]);
    return (
        <div
            className="jw-preview"
            data-side={side}
            data-nodes={preview.nodes.length}
            data-edges={preview.edges.length}
        >
            <graphty-element
                ref={ref}
                aria-label="Join preview"
                layoutConfig={PREVIEW_LAYOUT_CONFIG}
                historyKeys={false}
                style={{ display: "block", width: "100%", height: "100%" }}
            />
        </div>
    );
}

/** The layers the preview drew last, by session. */
const drawnLayers = new WeakMap<GraphSession, string[]>();

/**
 * Draws a preview in the preview's own element: its graph replaced, one layer per fate.
 * @param session - the preview element's session.
 * @param preview - the graph to draw.
 */
async function draw(session: GraphSession, preview: JoinPreview): Promise<void> {
    const byFate = new Map<JoinElementFate, NodeId[]>();
    const edgeFates = new Map<JoinElementFate, string[]>();
    for (const node of preview.nodes) {
        if (node.fate !== undefined) {
            byFate.set(node.fate, [...(byFate.get(node.fate) ?? []), node.id]);
        }
    }
    const edges = preview.edges.map((edge, at) => {
        const id = `p${String(at)}`;
        if (edge.fate !== undefined) {
            edgeFates.set(edge.fate, [...(edgeFates.get(edge.fate) ?? []), id]);
        }
        return { ...edge.data, id, source: edge.source, target: edge.target };
    });
    await session.transaction("Preview", async (tx) => {
        for (const id of drawnLayers.get(session) ?? []) {
            await tx.styles.remove(id);
        }
        await tx.data.clear();
        await tx.data.addNodes(preview.nodes.map((node) => ({ ...node.data, id: node.id })));
        await tx.data.addEdges(edges);
        const layers: string[] = [];
        for (const [fate, nodes] of byFate) {
            const layer = await tx.styles.add({
                name: fate,
                target: "node",
                selector: { match: "ids", nodes },
                set: { "node.color": FATE_COLORS[fate] },
            });
            layers.push(layer.id);
        }
        for (const [fate, ids] of edgeFates) {
            const layer = await tx.styles.add({
                name: fate,
                target: "edge",
                selector: { match: "ids", edges: ids },
                set: { "edge.color": FATE_COLORS[fate] },
            });
            layers.push(layer.id);
        }
        drawnLayers.set(session, layers);
    });
}
