import { useCommand } from "../state/WorkspaceContext";

/**
 * The place shown for a stored one: a Views place kept from a visit with the camera-views
 * experiment on shows the Graph place while it is off.
 * @param place - the stored place.
 * @returns the place to show.
 */
export function useShownPlace<P extends string>(place: P): P | "graph" {
    const views = useCommand("place.views");
    return place === "views" && views === null ? "graph" : place;
}
