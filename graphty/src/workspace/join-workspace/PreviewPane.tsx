import type { GraphSession, JoinPreview, JoinsDraft, NodeId, RuleTree } from "@graphty/graphty-element/session";
import { Badge } from "@mantine/core";
import React, { useEffect, useMemo, useRef, useState } from "react";

import { shownStep, useJoinWorkspace } from "./context";
import { keepRule } from "./keeps";
import { CARD_COLORS } from "./words";

/** How the preview marks an element a card touched: in the card's color, hollow or dashed when new. */
interface Mark {
    readonly color: string;
    readonly added: boolean;
}

/**
 * The elements the shown cards touched, each marked by the last card touching it.
 * @param draft - the recipe.
 * @param upTo - how many cards, from the first, the preview shows.
 * @returns the marks, by `n:<id>` and `e:<id>`.
 */
function marksOf(draft: JoinsDraft, upTo: number): ReadonlyMap<string, Mark> {
    const marks = new Map<string, Mark>();
    draft.steps.slice(0, upTo).forEach((each, index) => {
        const color = CARD_COLORS[index % CARD_COLORS.length];
        const shown = draft.preview({ step: each.id });
        for (const node of shown.nodes) {
            if (node.fate !== undefined) {
                marks.set(`n:${String(node.id)}`, { color, added: node.fate === "added" });
            }
        }
        for (const edge of shown.edges) {
            if (edge.fate !== undefined) {
                marks.set(`e:${edge.id}`, { color, added: edge.fate === "added" });
            }
        }
    });
    return marks;
}

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
    const { draft, version, side, keeps } = api;
    const step = shownStep(api);
    // The regions the compare steps drawn keep: the preview's own element hides the rest.
    const { keep, marks } = useMemo(() => {
        const at = draft.steps.findIndex((each) => each.id === step);
        const upTo = side === "before" ? at : at + 1;
        return { version, keep: keepRule(draft.steps.slice(0, upTo), keeps), marks: marksOf(draft, upTo) };
    }, [draft, version, step, side, keeps]);
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
            void draw(session, preview, keep, marks);
        }
    }, [session, preview, keep, marks]);
    return (
        <div
            className="jw-preview"
            data-side={side}
            data-nodes={preview.nodes.length}
            data-edges={preview.edges.length}
        >
            <Badge size="sm" variant="light" color="yellow" className="jw-preview-tag">
                Draft
            </Badge>
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
 * Draws a preview in the preview's own element: its graph replaced, then style layers marking
 * what the cards did: every element faint, then each card's elements in its color, new nodes
 * hollow and new edges dashed, so the drawing reads as a draft, not the graph.
 * @param session - the preview element's session.
 * @param preview - the graph to draw.
 * @param keep - the filter keeping a compare step's chosen regions, or null.
 * @param marks - the elements the shown cards touched.
 */
async function draw(
    session: GraphSession,
    preview: JoinPreview,
    keep: RuleTree | null,
    marks: ReadonlyMap<string, Mark>,
): Promise<void> {
    const nodeGroups = new Map<string, { mark: Mark; ids: NodeId[] }>();
    const edgeGroups = new Map<string, { mark: Mark; ids: string[] }>();
    for (const node of preview.nodes) {
        const mark = marks.get(`n:${String(node.id)}`);
        if (mark !== undefined) {
            const group = `${mark.color}|${String(mark.added)}`;
            nodeGroups.set(group, { mark, ids: [...(nodeGroups.get(group)?.ids ?? []), node.id] });
        }
    }
    const edges = preview.edges.map((edge, at) => {
        const id = `p${String(at)}`;
        const mark = marks.get(`e:${edge.id}`);
        if (mark !== undefined) {
            const group = `${mark.color}|${String(mark.added)}`;
            edgeGroups.set(group, { mark, ids: [...(edgeGroups.get(group)?.ids ?? []), id] });
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
        if (marks.size > 0) {
            for (const target of ["node", "edge"] as const) {
                const rest = await tx.styles.add({
                    name: "untouched",
                    target,
                    selector: { match: "everything" },
                    set: target === "node" ? { "node.opacity": 0.25 } : { "edge.opacity": 0.25 },
                });
                layers.push(rest.id);
            }
        }
        for (const { mark, ids } of nodeGroups.values()) {
            const layer = await tx.styles.add({
                name: mark.added ? "new" : "touched",
                target: "node",
                selector: { match: "ids", nodes: ids },
                set: { "node.color": mark.color, "node.opacity": 1, ...(mark.added ? { "node.wireframe": true } : {}) },
            });
            layers.push(layer.id);
        }
        for (const { mark, ids } of edgeGroups.values()) {
            const layer = await tx.styles.add({
                name: mark.added ? "new" : "touched",
                target: "edge",
                selector: { match: "ids", edges: ids },
                set: { "edge.color": mark.color, "edge.opacity": 1, ...(mark.added ? { "edge.style": "dash" } : {}) },
            });
            layers.push(layer.id);
        }
        drawnLayers.set(session, layers);
    });
    await session.visibility.set(keep);
}
