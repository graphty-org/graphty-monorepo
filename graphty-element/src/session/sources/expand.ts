/**
 * @file Click-to-expand and collapse through `session.data`. Not built yet: each call rejects with
 * `E_SOURCE_UNSUPPORTED` and changes nothing.
 */

import type { NodeId } from "../../catalog/types";
import { notBuiltYet } from "./errors";
import type { SourceHost } from "./host";
import type { CollapseResult, ExpandOptions } from "./types";

/**
 * Fetch the neighborhood of nodes from the source that loaded them, as one undoable step.
 * @param _host - the session pieces
 * @param _ids - the seeds
 * @param _options - depth, direction, limit and the credential
 * @returns rejects with E_SOURCE_UNSUPPORTED
 */
export function expandNodes(_host: SourceHost, _ids: readonly NodeId[], _options: ExpandOptions): Promise<void> {
    return Promise.reject(notBuiltYet("expanding"));
}

/**
 * Remove what a node's expansions alone brought, as one undoable step.
 * @param _host - the session pieces
 * @param _id - the node
 * @returns rejects with E_SOURCE_UNSUPPORTED
 */
export function collapseNode(_host: SourceHost, _id: NodeId): Promise<CollapseResult> {
    return Promise.reject(notBuiltYet("collapsing"));
}
