/**
 * @file What a tool call did, as `{ code, params, target }`: the facts an application words a change
 * line from. A target is a rule or a reference the selection reads again later, so an effect stays
 * exact at any graph size and small to save.
 */

import type { AiEffect, AiTarget } from "../../catalog/ai";
import type { TransactionScope } from "../../session/types";
import type { Target } from "./fields";

/**
 * A settled target as a selection target.
 * @param target - The target.
 * @returns What the selection reads for it.
 */
export function effectTarget(target: Target): AiTarget {
    if (target.kind === "all") {
        return { scope: "graph" };
    }

    return target.kind === "where" ? { where: target.where } : { ids: target.ids };
}

/**
 * What a style layer does, one effect per channel it writes.
 * @param tx - The session.
 * @param id - The layer.
 * @returns The effects.
 */
export function styleEffects(tx: Pick<TransactionScope, "styles">, id: string): AiEffect[] {
    const layer = tx.styles.get(id);
    if (layer === undefined) {
        return [];
    }

    const { matched } = tx.styles.counts(id);
    const counted = { [layer.target === "edge" ? "edges" : "nodes"]: matched };
    const hidden = matched - tx.styles.drawnCount(id);
    const base = { layer: id, ...counted, hidden };
    const target: AiTarget = { layer: id };
    return [
        ...Object.keys(layer.set ?? {}).map((channel): AiEffect => ({
            code: "AI_EFFECT_STYLE",
            params: { channel, ...base },
            target,
        })),
        ...Object.entries(layer.encode ?? {}).map(([channel, binding]): AiEffect => {
            const params = { channel, ...base };
            return {
                code: "AI_EFFECT_STYLE",
                params: binding !== undefined && "by" in binding ? { ...params, source: binding.by } : params,
                target,
            };
        }),
    ];
}

/**
 * What a read found: the elements it named, or nothing and what it looked for.
 * @param tool - The tool.
 * @param counts - How many it found.
 * @param counts.nodes - Nodes.
 * @param counts.edges - Edges.
 * @param target - What it looked for.
 * @returns The effect.
 */
export function foundEffects(
    tool: string,
    counts: { readonly nodes?: number; readonly edges?: number },
    target: AiTarget,
): AiEffect[] {
    if ((counts.nodes ?? 0) + (counts.edges ?? 0) === 0) {
        return [{ code: "AI_EFFECT_EMPTY", params: { tool, searched: searchedIn(target) } }];
    }

    return [{ code: "AI_EFFECT_FOUND", params: counts, target }];
}

/**
 * What a target looked for, as a fact.
 * @param target - The target.
 * @returns Its rule or text, or empty for a target that states neither.
 */
function searchedIn(target: AiTarget): string {
    if ("where" in target) {
        return target.where;
    }

    return "text" in target ? target.text : "";
}

/**
 * What a move of the camera or a change of dimension does.
 * @returns The effect.
 */
export function viewEffects(): readonly AiEffect[] {
    return [{ code: "AI_EFFECT_VIEW", params: {} }];
}

/**
 * The filter as an effect: what is left of the graph. The target is what is visible now, since a
 * filter's rule may be a tree the selection cannot read.
 * @param tx - The session.
 * @returns The effect.
 */
export function filterEffects(tx: Pick<TransactionScope, "status" | "visibility">): AiEffect[] {
    const { visibleNodes, visibleEdges } = tx.visibility.summary;
    const { nodes, edges } = tx.status.counts;
    return [
        {
            code: "AI_EFFECT_FILTER",
            params: { kept: visibleNodes, total: nodes, keptEdges: visibleEdges, totalEdges: edges },
            target: { scope: "visible" },
        },
    ];
}

/**
 * A change to the data as an effect.
 * @param params - What changed: any of `addedNodes`, `addedEdges`, `removedNodes`, `removedEdges`,
 * `changedValues`.
 * @returns The effect, to ask for.
 */
export function dataEffects(params: Readonly<Record<string, number>>): () => readonly AiEffect[] {
    return () => [{ code: "AI_EFFECT_DATA", params }];
}
