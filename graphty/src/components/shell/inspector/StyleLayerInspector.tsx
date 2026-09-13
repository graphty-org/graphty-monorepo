/**
 * The inspector's Style-layer surface (spec 03 section 6, third bullet).
 *
 * The app's existing `StyleLayerPropertiesPanel` is re-homed here WHOLE -- it is the
 * Which nodes / Which edges selector and one field row per encodable channel, and the
 * mode of a channel is what its field contains (build spec 04 section 4.2 step 6). The
 * one addition is a tier 1 `Source` section, drawn only when the layer came from a
 * run, which keeps the layer beside the result that produced it.
 *
 * Design 5.8 records the layer source binding and its Source section as new work, so
 * the section's verb is drawn at its target shape with its own `Coming` tag -- an
 * isolated unshipped row keeps the per-row tag rather than dimming a group.
 */

import { ActionRow, ControlSection, DataRow } from "@graphty/compact-mantine";
import React from "react";

import type { LayerItem } from "../../layout/LeftSidebar";
import { StyleLayerPropertiesPanel } from "../../sidebar/panels/StyleLayerPropertiesPanel";
import { ComingTag } from "./ComingTag";
import { INSPECTOR_SECTION_IDS } from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/**
 * Where a layer came from, when it came from a run rather than from the user.
 */
export interface StyleLayerSource {
    /** The result's own name, e.g. "Bridges". */
    readonly resultName: string;
    /** The method, e.g. "Betweenness centrality". */
    readonly method: string;
    /** What the run covered, e.g. "all 20 visible nodes". */
    readonly scope: string;
    /** When it ran, already formatted. */
    readonly ranAt: string;
    /** Opens the result that produced this layer. */
    readonly onOpenResult: () => void;
}

/**
 * Props of the Style-layer surface.
 */
export interface StyleLayerInspectorProps {
    /** The layer being edited. Its type is the app's own, from the superseded left sidebar. */
    readonly layer: LayerItem;
    /** Where the layer came from, when it came from a run. */
    readonly source?: StyleLayerSource;
    /** Called when the layer's node properties change. */
    readonly onUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["node"]>) => void;
    /** Called when the layer's edge properties change. */
    readonly onEdgeUpdate?: (layerId: string, updates: Partial<LayerItem["styleLayer"]["edge"]>) => void;
}

/**
 * The Style-layer surface.
 * @param props - the surface's props.
 * @returns the Source section, when there is one, above the existing properties panel.
 */
export function StyleLayerInspector(props: StyleLayerInspectorProps): React.JSX.Element {
    const { layer, source, onUpdate, onEdgeUpdate } = props;
    const sourceSection = useInspectorSection(INSPECTOR_SECTION_IDS.layerSource, true);

    return (
        <>
            {source !== undefined && (
                <ControlSection
                    label="Source"
                    opened={sourceSection.opened}
                    onOpenChange={sourceSection.onOpenChange}
                    actions={<ComingTag subject="Source" />}
                >
                    <DataRow name="Result" value={source.resultName} />
                    <DataRow name="Method" value={source.method} />
                    <DataRow name="Scope" value={source.scope} />
                    <DataRow name="Run" value={source.ranAt} />
                    <ActionRow
                        state="Open the result"
                        onClick={() => {
                            source.onOpenResult();
                        }}
                    />
                </ControlSection>
            )}

            <StyleLayerPropertiesPanel layer={layer} onUpdate={onUpdate} onEdgeUpdate={onEdgeUpdate} />
        </>
    );
}
