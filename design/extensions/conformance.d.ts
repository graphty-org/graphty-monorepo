/**
 * PROPOSED -- the simple-tier helpers of the conformance kit, @graphty/graphty-element/conformance
 * (README section 11.2, open decision 9). Every check* function of the kit also takes the id of a
 * registered extension, so a simple extension is checked by the same checks as an advanced one.
 */
import type { GraphView, LoadContext, NodeId, PlainRecord } from "./simple";

/** A graph view built from plain records, for a unit test of place, node, edge, nodes or groups. */
export declare function graphView(graph: {
    readonly nodes?: readonly PlainRecord[];
    readonly edges: readonly PlainRecord[];
    readonly directed?: boolean;
}): GraphView;

/**
 * A load context for a unit test of a data source's load(): `responses` maps a URL to the body the
 * stub fetch returns (an object is sent as JSON); a URL not listed fails as E_FETCH_FAILED does.
 */
export declare function loadContext<V>(init: {
    readonly options: V;
    readonly responses: Readonly<Record<string, unknown>>;
}): LoadContext<V> & { readonly warnings: readonly string[] };

/**
 * Graduation check: runs the registered extension `id` and an advanced class meant to replace it
 * over the kit's graphs (or the ones given) and lists every element whose value differs.
 */
export declare function checkSameResults(
    id: string,
    replacement: abstract new (...args: never[]) => unknown,
    graphs?: readonly { readonly nodes?: readonly PlainRecord[]; readonly edges: readonly PlainRecord[] }[],
): Promise<{
    readonly passed: boolean;
    readonly differences: readonly { readonly id: NodeId; readonly before: unknown; readonly after: unknown }[];
}>;
