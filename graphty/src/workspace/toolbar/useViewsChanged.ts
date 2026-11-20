import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import { useEffect, useReducer } from "react";

/**
 * Draws again whenever anything `viewProblem` or `planTour` reads may have changed: views, their
 * order, tours, the drawing mode, an immersive session, a registered camera view.
 * @param element - the element, or null.
 */
export function useViewsChanged(element: GraphtyElement | null): void {
    const [, redraw] = useReducer((n: number) => n + 1, 0);
    useEffect(() => {
        if (element === null) {
            return undefined;
        }
        element.addEventListener("views-changed", redraw);
        return () => {
            element.removeEventListener("views-changed", redraw);
        };
    }, [element]);
}
