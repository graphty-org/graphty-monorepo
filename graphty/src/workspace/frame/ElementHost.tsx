import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useMemo, useRef, useState } from "react";

import { APP_HIGHLIGHT_COLOR } from "../../constants/highlight";
import { loadGraphtyElement } from "../../elementLoader";
import { WORKSPACE_AUTOSAVE_KEY, WORKSPACE_AUTOSAVE_OPTIONS } from "../autosave/autosave";
import { LAYOUT_SEED } from "../layout/methods";
import { ACCELERATION, readPreference } from "../settings/preferences";
import { bindShaderSettings } from "../settings/shaderPreferences";
import { useWorkspaceState } from "../state/WorkspaceContext";
import { useSizeBound } from "./useSizeBound";

/**
 * The element's force layout (its catalog id; the element picks the engine), from the app's
 * seed, so every file and sample draws the same way each time it is opened. Declared on the tag,
 * it is where the project starts, not an undoable step.
 */
const LAYOUT_ID = "force";
const LAYOUT_CONFIG = { seed: LAYOUT_SEED } as const;

/**
 * The workspace's View menu offers VR and AR, so XR is on (graphty-element leaves it off unless a
 * page asks) and the element draws no XR buttons of its own on the canvas.
 */
const XR_CONFIG = { enabled: true, ui: { enabled: false } } as const;

/** Props for ElementHost. */
interface ElementHostProps {
    /**
     * Called once the element has upgraded, with the element and its session; called with nulls
     * when it unmounts.
     */
    onReady: (element: GraphtyElement | null, session: GraphSession | null) => void;
    /** Whether the element keeps the reader's work in the browser (graphty-element's autosave). */
    autosave?: boolean;
}

/**
 * Mounts the one graphty-element and hands its session up. Every graph change goes through that
 * session; this component draws nothing else.
 * @param props - Component props
 * @param props.onReady - Called with the element and its session, and with nulls on unmount
 * @param props.autosave - Whether the element autosaves
 * @returns The element, filling its region
 */
export function ElementHost({ onReady, autosave = false }: Readonly<ElementHostProps>): React.JSX.Element {
    const ref = useRef<GraphtyElement>(null);
    // Labels that would land on each other are thinned out until the reader turns on Show all
    // labels (tier1-design.md section 2.7), and a still graph is not drawn again on every animation
    // frame: the workspace never changes the Babylon scene behind the element's back, so nothing it
    // shows needs those frames, and on a software GPU each one holds the page's main thread for
    // tens of milliseconds (issue #1943). View settings written on the tag; they record no step.
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    // A size bound to data is compared across nodes, so in 3D every node is drawn at one depth's
    // scale: otherwise perspective draws a nearer, smaller value larger than a farther, larger one.
    // Read from this host's own element: the workspace still holds the previous project's session,
    // disposed with its element, until this one hands its own up.
    const [hosted, setHosted] = useState<GraphSession | null>(null);
    const sizeBound = useSizeBound(hosted);
    // Graph settings: the reader's choices, view preferences that record no step. Same size at
    // any depth follows the size binding until the reader sets it.
    const labelsAvoid = useWorkspaceState((state) => state.labelsAvoid);
    const sameSize = useWorkspaceState((state) => state.sameSizeAtAnyDepth) ?? sizeBound;
    const lighting = useWorkspaceState((state) => state.lighting);
    const outlineWidth = useWorkspaceState((state) => state.outlineWidth);
    const layoutBehavior = useMemo(
        () => ({
            labels: { declutter: !allLabelsShown, avoidNodesAndEdges: labelsAvoid },
            node: { depthIndependentSize: sameSize, ...(outlineWidth === null ? {} : { outlineWidth }) },
            rendering: { onDemand: true },
            camera: { pivotOnSelection: true },
        }),
        [allLabelsShown, labelsAvoid, sameSize, outlineWidth],
    );
    // The legend card's margins: the element keeps every fit clear of them.
    const viewInsets = useWorkspaceState((state) => state.viewInsets);

    useEffect(() => {
        let disposed = false;
        let unbindShaders: (() => void) | null = null;
        const bind = (): void => {
            const element = ref.current;
            // Undefined until the tag has upgraded to the element.
            const session: GraphSession | undefined = element?.session;
            if (!disposed && element !== null && session !== undefined) {
                // The app keeps one highlight color, a presentation choice (constants/highlight.ts).
                session.styles.setHighlightColor(APP_HIGHLIGHT_COLOR);
                // The reader's shader preferences and remembered approvals (Graph settings).
                unbindShaders = bindShaderSettings(element);
                setHosted(session);
                onReady(element, session);
            }
        };
        if (customElements.get("graphty-element") === undefined) {
            void loadGraphtyElement();
            void customElements.whenDefined("graphty-element").then(bind);
        } else {
            bind();
        }
        return () => {
            disposed = true;
            unbindShaders?.();
            onReady(null, null);
        };
    }, [onReady]);

    return (
        <graphty-element
            ref={ref}
            aria-label="Graph drawing"
            layout={LAYOUT_ID}
            layoutConfig={LAYOUT_CONFIG}
            layoutBehavior={layoutBehavior}
            lighting={lighting}
            viewInsets={viewInsets}
            // The app's own Undo and Redo take these keys everywhere, the drawing included, so
            // every step taken back is named in a notice.
            historyKeys={false}
            zoomToPointer
            xr={XR_CONFIG}
            {...(autosave ? { autosave: WORKSPACE_AUTOSAVE_KEY, autosaveOptions: WORKSPACE_AUTOSAVE_OPTIONS } : {})}
            // On the tag, so the reader's policy is in force before the element's first GPU probe.
            acceleration={readPreference(ACCELERATION)}
            style={{ display: "block", width: "100%", height: "100%" }}
        />
    );
}
