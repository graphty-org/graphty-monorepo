/**
 * @file What a tool call did, as `{ code, params, target }`: the facts an application words a change
 * line from. A target is a rule or a reference the selection reads again later, so an effect stays
 * exact at any graph size and small to save.
 */

import type { AiEffect, AiTarget } from "../../catalog/ai";
import type { NodeId } from "../../catalog/types";
import type { TransactionScope } from "../../session/types";
import type { SavedMessage } from "../engine/types";
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
 * The selection as an effect.
 * @param tx - The session.
 * @param target - What the call named.
 * @returns The effect.
 */
export function selectionEffects(tx: Pick<TransactionScope, "selection">, target?: AiTarget): AiEffect[] {
    return [
        {
            code: "AI_EFFECT_SELECTION",
            params: { nodes: tx.selection.nodes.length, edges: tx.selection.edges.length },
            ...(target === undefined ? {} : { target }),
        },
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
 * A read of the whole graph (its overview, its statistics) as what it found: the graph's counts.
 * @param nodes - The graph's nodes.
 * @param edges - The graph's edges.
 * @returns The effect.
 */
export function wholeGraphRead(nodes: number, edges: number): AiEffect[] {
    return [{ code: "AI_EFFECT_FOUND", params: { nodes, edges }, target: { scope: "graph" } }];
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

/**
 * Whether a reply names an id or a label: as a whole word, so "34" is not found in "340" or "3.4".
 * @param reply - The reply.
 * @param name - The id or label.
 * @returns True when it is named.
 */
function names(reply: string, name: string): boolean {
    const escaped = name.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    return new RegExp(String.raw`(?<![\w.])${escaped}(?![\w]|\.\d)`).test(reply);
}

/**
 * Widen a run's leader to the nodes a reply named from the run's ranking. A run's summary hands the
 * model its top nodes, and a model answers "which three" from them without reading again, so the
 * leader alone (one node) would leave the reader no chip for the other two. The reply names the
 * first k of that list when it answers about the top k; the leader becomes those k, by id. Only the
 * message's last found effect is widened, and only when it is a run's leader: a later read stands.
 * @param messages - The conversation's messages; the message's own are those after the last
 *     reader message.
 * @param reply - The model's reply.
 */
export function widenLeader(messages: SavedMessage[], reply: string): void {
    for (let at = messages.length - 1; at >= 0 && messages[at].role !== "user"; at--) {
        const { parts } = messages[at];
        for (let index = parts.length - 1; index >= 0; index--) {
            const part = parts[index];
            const found =
                part.type === "tool-result"
                    ? [...(part.effects ?? [])].reverse().find((each) => each.code === "AI_EFFECT_FOUND")
                    : undefined;
            if (part.type !== "tool-result" || found === undefined) {
                continue;
            }

            const top = found.target !== undefined && "top" in found.target ? found.target.top : undefined;
            if (top?.n === 1 && top.field === undefined) {
                const ids = namedPrefix(part.content, reply);
                if (ids.length > 1) {
                    // By id: a top of k cuts between ties, and the reply named these k.
                    const widened: AiEffect = {
                        code: "AI_EFFECT_FOUND",
                        params: { nodes: ids.length },
                        target: { ids },
                    };
                    const effects = part.effects?.map((each) => (each === found ? widened : each));
                    messages[at] = {
                        ...messages[at],
                        parts: parts.map((each) => (each === part ? { ...part, ...(effects && { effects }) } : each)),
                    };
                }
            }

            return;
        }
    }
}

/**
 * The run summary's top nodes, from the first, that a reply names by id or label.
 * @param content - The run's tool result as the model read it.
 * @param reply - The reply.
 * @returns Their ids; none when the content holds no ranking.
 */
function namedPrefix(content: string, reply: string): NodeId[] {
    let top: unknown;
    try {
        top = (JSON.parse(content) as { data?: { summary?: { top?: unknown } } }).data?.summary?.top;
    } catch {
        return [];
    }

    if (!Array.isArray(top)) {
        return [];
    }

    const ids: NodeId[] = [];
    for (const entry of top as { id?: unknown; label?: unknown }[]) {
        const { id } = entry;
        if (typeof id !== "string" && typeof id !== "number") {
            break;
        }

        if (!names(reply, String(id)) && !(typeof entry.label === "string" && names(reply, entry.label))) {
            break;
        }

        ids.push(id);
    }

    return ids;
}
