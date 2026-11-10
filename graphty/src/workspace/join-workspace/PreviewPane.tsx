import type { GraphSession, JoinElementFate, JoinPreview, NodeId } from "@graphty/graphty-element/session";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { shownStep, useJoinWorkspace } from "./context";
import { FATE_COLORS } from "./words";

/** What the preview picks out: one fate, or the elements the step left alone. */
export type PreviewFocus = JoinElementFate | "untouched";

/** The color of an element outside the focus. */
const DIM = "#c8c8c8";

/** The color of an element the step left alone, when the focus picks those out. */
const UNTOUCHED = "#495057";

/** The preview's layout: the graph drawn flat, the same drawing on every opening. */
const PREVIEW_LAYOUT_CONFIG = { dim: 2, seed: 7 } as const;

/**
 * The graph the recipe leaves (After), or the graph before the shown step (Before), drawn by a
 * graphty-element of its own, each element in its fate's color. The element draws and colors it
 * through ordinary session verbs and style layers; the project's graph is not touched. With a
 * focus, only the elements of that fate keep their color.
 * @param props - Component props
 * @param props.focus - the fate to pick out; every fate in its color when absent.
 * @returns the pane.
 */
export function PreviewPane({ focus }: Readonly<{ focus?: PreviewFocus }> = {}): React.JSX.Element {
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
            // One draw at a time: each removes the layers the last one added.
            const next = (drawing.get(session) ?? Promise.resolve()).then(() => draw(session, preview, focus));
            drawing.set(
                session,
                next.catch((error: unknown) => {
                    globalThis.reportError(error);
                }),
            );
        }
    }, [session, preview, focus]);
    return (
        <div
            className="jw-preview"
            data-side={side}
            data-nodes={preview.nodes.length}
            data-edges={preview.edges.length}
            data-focus={focus}
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

/** The draw in progress, by session. */
const drawing = new WeakMap<GraphSession, Promise<void>>();

/** The layers the preview drew last, by session. */
const drawnLayers = new WeakMap<GraphSession, string[]>();

/**
 * Draws a preview in the preview's own element: its graph replaced, one layer per fate.
 * @param session - the preview element's session.
 * @param preview - the graph to draw.
 * @param focus - the fate to pick out, if any.
 */
async function draw(session: GraphSession, preview: JoinPreview, focus?: PreviewFocus): Promise<void> {
    const byFate = new Map<PreviewFocus, NodeId[]>();
    const edgeFates = new Map<PreviewFocus, string[]>();
    // Untouched elements get a layer only when a focus dims them or picks them out.
    const untouched = focus === undefined ? undefined : "untouched";
    for (const node of preview.nodes) {
        const fate = node.fate ?? untouched;
        if (fate !== undefined) {
            byFate.set(fate, [...(byFate.get(fate) ?? []), node.id]);
        }
    }
    const edges = preview.edges.map((edge, at) => {
        const id = `p${String(at)}`;
        const fate = edge.fate ?? untouched;
        if (fate !== undefined) {
            edgeFates.set(fate, [...(edgeFates.get(fate) ?? []), id]);
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
                set: { "node.color": colorOf(fate, focus) },
            });
            layers.push(layer.id);
        }
        for (const [fate, ids] of edgeFates) {
            const layer = await tx.styles.add({
                name: fate,
                target: "edge",
                selector: { match: "ids", edges: ids },
                set: { "edge.color": colorOf(fate, focus) },
            });
            layers.push(layer.id);
        }
        drawnLayers.set(session, layers);
    });
}

/**
 * An element's color in the preview: its fate's, or dim outside the focus.
 * @param fate - its fate, or "untouched".
 * @param focus - the fate picked out, if any.
 * @returns the color.
 */
function colorOf(fate: PreviewFocus, focus?: PreviewFocus): string {
    if (focus !== undefined && fate !== focus) {
        return DIM;
    }
    return fate === "untouched" ? UNTOUCHED : FATE_COLORS[fate];
}
