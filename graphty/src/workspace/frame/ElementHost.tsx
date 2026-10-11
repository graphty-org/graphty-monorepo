import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useRef } from "react";

/**
 * Labels that would land on each other are thinned out until the reader turns on Show all
 * labels (tier1-design.md section 2.7), and a still graph is not drawn again on every animation
 * frame: the workspace never changes the Babylon scene behind the element's back, so nothing it
 * shows needs those frames, and on a software GPU each one holds the page's main thread for tens
 * of milliseconds (issue #1943). View settings written on the tag; they record no step.
 */
const LAYOUT_BEHAVIOR = { labels: { declutter: true }, rendering: { onDemand: true } } as const;

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

    useEffect(() => {
        let disposed = false;
        const bind = (): void => {
            const element = ref.current;
            // Undefined until the tag has upgraded to the element.
            const session: GraphSession | undefined = element?.session;
            if (!disposed && element !== null && session !== undefined) {
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
            layoutBehavior={LAYOUT_BEHAVIOR}
            style={{ display: "block", width: "100%", height: "100%" }}
        />
    );
}
