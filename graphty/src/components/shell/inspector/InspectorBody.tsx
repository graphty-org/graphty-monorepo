/**
 * The routing step: one `SelectionKind` in, one surface out.
 *
 * The inspector's chrome (`Inspector`) owns the column, the header and the sticky
 * footer slot; this module owns the decision about WHICH surface fills it. The two are
 * separate because `InspectorProps` -- the shell's shared contract -- carries the
 * chrome's facts (open, width, presentation, kind, identity, pin) and takes the body as
 * children, so the body's own data travels in this discriminated union instead.
 *
 * Every kind is routed. Nothing selected is a real surface and not an empty state, so
 * it is the union's `none` arm rather than a fallback.
 */

import React from "react";

import { CleaningStepInspector, type CleaningStepInspectorProps } from "./CleaningStepInspector";
import { EdgeInspector, type EdgeInspectorProps } from "./EdgeInspector";
import { GraphSummary, type GraphSummaryProps } from "./GraphSummary";
import { MultiSelectionInspector, type MultiSelectionInspectorProps } from "./MultiSelectionInspector";
import { NodeInspector, type NodeInspectorProps } from "./NodeInspector";
import { PatternMatchInspector, type PatternMatchInspectorProps } from "./PatternMatchInspector";
import { ResultInspector, type ResultInspectorProps } from "./ResultInspector";
import { StyleLayerInspector, type StyleLayerInspectorProps } from "./StyleLayerInspector";

/**
 * What the inspector is showing, with the data that surface needs.
 */
export type InspectorSelection =
    | { readonly kind: "algorithm-result"; readonly result: ResultInspectorProps }
    | { readonly kind: "cleaning-step"; readonly step: CleaningStepInspectorProps }
    | { readonly kind: "edge"; readonly edge: EdgeInspectorProps }
    | { readonly kind: "multiple"; readonly selection: MultiSelectionInspectorProps }
    | { readonly kind: "node"; readonly node: NodeInspectorProps }
    | { readonly kind: "none"; readonly summary: GraphSummaryProps }
    | { readonly kind: "pattern-match"; readonly match: PatternMatchInspectorProps }
    | { readonly kind: "style-layer"; readonly layer: StyleLayerInspectorProps };

/**
 * Props of the routing step.
 * @public
 */
export interface InspectorBodyProps {
    /** What the inspector is showing, and the data that surface needs. */
    readonly selection: InspectorSelection;
}

/**
 * Routes one selection to its surface.
 * @param props - the routing step's props.
 * @returns the surface for this selection kind.
 */
export function InspectorBody(props: InspectorBodyProps): React.JSX.Element | null {
    const { selection } = props;

    switch (selection.kind) {
        case "none":
            return <GraphSummary {...selection.summary} />;
        case "node":
            return <NodeInspector {...selection.node} />;
        case "edge":
            return <EdgeInspector {...selection.edge} />;
        case "multiple":
            return <MultiSelectionInspector {...selection.selection} />;
        case "style-layer":
            return <StyleLayerInspector {...selection.layer} />;
        case "algorithm-result":
            return <ResultInspector {...selection.result} />;
        case "pattern-match":
            return <PatternMatchInspector {...selection.match} />;
        case "cleaning-step":
            return <CleaningStepInspector {...selection.step} />;
        default:
            return null;
    }
}
