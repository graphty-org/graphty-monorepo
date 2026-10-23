/**
 * @file What the Graphviz Worker is asked and what it answers. Plain data, so it crosses
 * `postMessage` unchanged.
 */

import type { GraphvizEngine } from "./engines";

/**
 * Why a Graphviz layout failed, as the `details.reason` of the `GraphtyError` it fails with.
 *
 * | Reason | Error code | `details` |
 * | --- | --- | --- |
 * | `graphviz.unavailable` | `E_MISSING_PACKAGE` | `package`, `feature` |
 * | `graphviz.syntax` | `E_PARSE_FAILED` | `engine`, `line`, `near` |
 * | `graphviz.error` | `E_UNSUPPORTED` | `engine`, `messages` |
 * | `graphviz.crashed` | `E_EXTENSION_FAILED` | `engine`, `message` |
 * | `graphviz.timeout` | `E_CAP_EXCEEDED` | `engine`, `ms` |
 * | `graphviz.too-large` | `E_CAP_EXCEEDED` | `engine`, `nodes`, `limit` |
 *
 * New reasons may be added in a minor release.
 */
export type GraphvizFailureCode =
    | "graphviz.unavailable"
    | "graphviz.syntax"
    | "graphviz.error"
    | "graphviz.crashed"
    | "graphviz.timeout"
    | "graphviz.too-large";

/** A request to the Worker: check the package loads, or lay one graph out. */
export type GraphvizRequest =
    { readonly kind: "probe" } | { readonly kind: "layout"; readonly dot: string; readonly engine: GraphvizEngine };

/** The Worker's answer. */
export type GraphvizReply =
    | { readonly ok: true; readonly json: string }
    | { readonly ok: false; readonly code: GraphvizFailureCode; readonly params: Readonly<Record<string, unknown>> };
