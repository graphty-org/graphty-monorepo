import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useMemo, useRef, useState } from "react";

import { APP_HIGHLIGHT_COLOR } from "../../constants/highlight";
import { LAYOUT_SEED } from "../layout/methods";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";

/**
 * The element's force layout (its catalog id; the element picks the engine), from the app's
 * seed, so every file and sample draws the same way each time it is opened. Declared on the tag,
 * it is where the project starts, not an undoable step.
 */
const LAYOUT_ID = "force";
const LAYOUT_CONFIG = { seed: LAYOUT_SEED } as const;

/**
 * The workspace's View menu offers VR and AR, so the element draws no XR buttons on the canvas.
 */
const XR_CONFIG = { ui: { enabled: false } } as const;

/**
 * Whether a node size is bound to data: a drawn `node.size` legend block that reads a field.
 * Re-read after every style or project change.
 * @param session - the element's session, or null.
 * @returns true while node sizes encode values a reader compares.
 */
function useSizeBound(session: GraphSession | null): boolean {
    const [bound, setBound] = useState(false);
    useEffect(() => {
        if (session === null) {
            setBound(false);
            return undefined;
        }
        const read = (): void => {
            setBound(
                session.styles.legend().some((block) => block.channel === "node.size" && block.field !== undefined),
            );
        };
        read();
        const offs = [session.on("style:changed", read), session.on("project:changed", read)];
        return () => {
            offs.forEach((off) => {
                off();
            });
        };
    }, [session]);
    return bound;
}

/** Props for ElementHost. */
interface ElementHostProps {
    /**
     * Called once the element has upgraded, with the element and its session; called with nulls
     * when it unmounts.
     */
    onReady: (element: GraphtyElement | null, session: GraphSession | null) => void;
}

/**
 * Mounts the one graphty-element and hands its session up. Every graph change goes through that
 * session; this component draws nothing else.
 * @param props - Component props
 * @param props.onReady - Called with the element and its session, and with nulls on unmount
 * @returns The element, filling its region
 */
export function ElementHost({ onReady }: Readonly<ElementHostProps>): React.JSX.Element {
    const ref = useRef<GraphtyElement>(null);
    // Labels that would land on each other are thinned out until the reader turns on Show all
    // labels (tier1-design.md section 2.7). A view setting written on the tag; it records no step.
    const allLabelsShown = useWorkspaceState((state) => state.allLabelsShown);
    // A size bound to data is compared across nodes, so in 3D every node is drawn at one depth's
    // scale: otherwise perspective draws a nearer, smaller value larger than a farther, larger one.
    const sizeBound = useSizeBound(useWorkspace().session);
    const layoutBehavior = useMemo(
        () => ({ labels: { declutter: !allLabelsShown }, node: { depthIndependentSize: sizeBound } }),
        [allLabelsShown, sizeBound],
    );
    // The legend card's margins: the element keeps every fit clear of them.
    const viewInsets = useWorkspaceState((state) => state.viewInsets);

    useEffect(() => {
        let disposed = false;
        const bind = (): void => {
            const element = ref.current;
            // Undefined until the tag has upgraded to the element.
            const session: GraphSession | undefined = element?.session;
            if (!disposed && element !== null && session !== undefined) {
                session.styles.setHighlightColor(APP_HIGHLIGHT_COLOR);
                onReady(element, session);
            }
        };
        if (customElements.get("graphty-element") === undefined) {
            void customElements.whenDefined("graphty-element").then(bind);
        } else {
            bind();
        }
        return () => {
            disposed = true;
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
            viewInsets={viewInsets}
            xr={XR_CONFIG}
            style={{ display: "block", width: "100%", height: "100%" }}
        />
    );
}
