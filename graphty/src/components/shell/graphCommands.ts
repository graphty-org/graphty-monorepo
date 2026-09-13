/**
 * The camera and selection calls the shell makes on graphty-element.
 *
 * The canvas toolbar, the Views menu and the key dispatcher all name actions the SHELL
 * owns -- zoom, the three view presets, Reset view, Zoom to selection -- and every one
 * of them is really a call on the graph instance the `Graphty` wrapper holds. They are
 * gathered here so AppShell wires handlers instead of reaching into the graph in a
 * dozen closures, and so the two guards every call needs are written once: the graph
 * initialises asynchronously, so it is null until it has, and the wrapper publishes it
 * as a structural type whose members beyond the style manager are `unknown`, so each
 * call is checked for before it is made.
 *
 * Nothing here invents a capability. Each function is one published `Graph` method
 * (`zoomToFit`, `getCameraState`, `setCameraState`, `setCameraZoom`, `setCameraTarget`,
 * `resetCamera`, `getNodeMesh`, `selectNode`, `deselectNode`, `setXRConfig`), and where
 * graphty-element publishes nothing -- a marquee, a pointer-driven pan -- the shell has
 * no handler either and says so rather than drawing a control that does nothing.
 */

import type { GraphtyHandle } from "../Graphty";

/**
 * The graph as the `Graphty` wrapper publishes it.
 *
 * Public with every command in this module, all of which take one of these or null.
 * @public
 */
export type ShellGraph = NonNullable<GraphtyHandle["graph"]>;

/**
 * How much one press of Zoom in or Zoom out moves the camera.
 *
 * The sources fix no step -- spec 01 section 4 names the two items and their bindings
 * and stops there -- so one step is a fifth nearer or further, the smallest change that
 * reads as a change on a graph of any size.
 *
 * Exported because the step is a decision rather than a quote: naming it keeps the number
 * readable instead of buried in the command.
 * @public
 */
export const ZOOM_STEP_FACTOR = 1.25;

/** The camera preset names graphty-element publishes for the three view rows. */
const VIEW_PRESETS = {
    top: "topView",
    front: "frontView",
    side: "sideView",
} as const;

/**
 * Which view preset a Views menu row asks for.
 *
 * {@link graphViewPreset}'s parameter.
 * @public
 */
export type GraphViewPreset = keyof typeof VIEW_PRESETS;

/**
 * Calls one method of the graph, if the graph has it.
 *
 * A method that is absent is reported rather than thrown: the wrapper's type says the
 * surface is `unknown`, and a shell built against a graphty-element that has dropped a
 * call should say so in the console, not break the frame. A call that returns a promise
 * has its rejection reported for the same reason -- a camera preset a 2D scene cannot
 * satisfy rejects, and that is information.
 * @param graph - the graph, or null before it has initialised.
 * @param name - the method to call.
 * @param args - its arguments.
 * @returns whatever the method returned, or undefined when it could not be called.
 */
function invoke(graph: ShellGraph | null, name: string, ...args: readonly unknown[]): unknown {
    if (graph === null) {
        return undefined;
    }

    const member = graph[name];

    if (typeof member !== "function") {
        console.warn(`[shell] this graph publishes no ${name}()`);

        return undefined;
    }

    const call = member as (this: ShellGraph, ...rest: unknown[]) => unknown;
    const result = call.apply(graph, [...args]);

    if (result instanceof Promise) {
        result.catch((error: unknown) => {
            console.error(`[shell] graph.${name}() failed:`, error);
        });
    }

    return result;
}

/**
 * Reads one number off a value of unknown shape.
 * @param value - the value to read.
 * @param key - the member to read.
 * @returns the number, or null when the value does not carry one there.
 */
function numberAt(value: unknown, key: string): number | null {
    if (typeof value !== "object" || value === null) {
        return null;
    }

    const member = (value as Record<string, unknown>)[key];

    return typeof member === "number" && Number.isFinite(member) ? member : null;
}

/**
 * Zoom to fit: the one call the graph publishes under that name.
 * @param graph - the graph, or null before it has initialised.
 */
export function graphZoomToFit(graph: ShellGraph | null): void {
    invoke(graph, "zoomToFit");
}

/**
 * Steps the camera nearer or further.
 *
 * 3D is an orbit camera, so the step is its distance from the pivot; 2D has no distance
 * and takes a zoom factor instead, which is why there are two branches.
 * @param graph - the graph, or null before it has initialised.
 * @param direction - "in" to approach, "out" to withdraw.
 */
export function graphZoomStep(graph: ShellGraph | null, direction: "in" | "out"): void {
    if (graph === null) {
        return;
    }

    const factor = direction === "in" ? 1 / ZOOM_STEP_FACTOR : ZOOM_STEP_FACTOR;
    const state = invoke(graph, "getCameraState");
    const is2D = invoke(graph, "is2D") === true;

    if (is2D) {
        const zoom = numberAt(state, "zoom") ?? 1;

        invoke(graph, "setCameraZoom", zoom / factor);

        return;
    }

    const distance = numberAt(state, "cameraDistance");

    if (distance === null) {
        return;
    }

    invoke(graph, "setCameraState", { cameraDistance: distance * factor });
}

/**
 * Centres the camera on the selected node.
 *
 * The node's own mesh is where it is, so the target comes from the graph rather than
 * from the layout the shell last heard about.
 * @param graph - the graph, or null before it has initialised.
 * @param nodeId - the selected node's id, or null when nothing is selected.
 */
export function graphZoomToSelection(graph: ShellGraph | null, nodeId: string | null): void {
    if (graph === null || nodeId === null) {
        return;
    }

    const mesh = invoke(graph, "getNodeMesh", nodeId);

    if (typeof mesh !== "object" || mesh === null) {
        return;
    }

    const { position } = mesh as { position?: unknown };
    const x = numberAt(position, "x");
    const y = numberAt(position, "y");
    const z = numberAt(position, "z");

    if (x === null || y === null || z === null) {
        return;
    }

    invoke(graph, "setCameraTarget", { x, y, z });
}

/**
 * Reset view: back to the camera state the session opened with.
 * @param graph - the graph, or null before it has initialised.
 */
export function graphResetView(graph: ShellGraph | null): void {
    invoke(graph, "resetCamera");
}

/**
 * Applies one of the three view presets the Views menu draws.
 * @param graph - the graph, or null before it has initialised.
 * @param preset - which of Top, Front and Side was taken.
 */
export function graphViewPreset(graph: ShellGraph | null, preset: GraphViewPreset): void {
    invoke(graph, "setCameraState", { preset: VIEW_PRESETS[preset] });
}

/**
 * Selects one node on the canvas, which is what fills the inspector.
 * @param graph - the graph, or null before it has initialised.
 * @param nodeId - the node to select.
 */
export function graphSelectNode(graph: ShellGraph | null, nodeId: string): void {
    invoke(graph, "selectNode", nodeId);
}

/**
 * Clears the canvas selection. The Escape ladder's last rung.
 * @param graph - the graph, or null before it has initialised.
 */
export function graphDeselectNode(graph: ShellGraph | null): void {
    invoke(graph, "deselectNode");
}

/**
 * Turns graphty-element's own XR buttons off.
 *
 * Spec 01 section 2: the built-in buttons are disabled so the legend owns the canvas's
 * bottom right corner, and XR entry belongs to the Views menu.
 * @param graph - the graph, or null before it has initialised.
 */
export function graphDisableBuiltInXrButtons(graph: ShellGraph | null): void {
    invoke(graph, "setXRConfig", { ui: { enabled: false } });
}

/**
 * The graph events that mean the node and edge counts have changed.
 *
 * `data-loaded` fires when a source finishes loading and `data-added` when nodes or
 * edges arrive, which between them cover every way the counts can move.
 */
const DATA_CHANGE_EVENTS = ["data-loaded", "data-added"] as const;

/**
 * Calls back whenever the graph's data changes.
 *
 * The counts are the status bar's own fact (spec 01, One fact one region), so they have
 * to be read when the graph says they moved, never at a moment the shell guesses. The
 * guess is what makes this necessary: `loadData` hands the element a data source and
 * returns, and the load itself runs on graphty-element's operation queue, so a read
 * taken when that call returns counts an empty graph and the bar prints a confident
 * `0 nodes` over a drawn one. A wrong number is worse than an absent slot.
 *
 * `Graph` publishes `addListener` and no matching remove, so this registers for the life
 * of the graph; the caller registers once, when the graph first initialises.
 * @param graph - the graph, or null before it has initialised.
 * @param onChange - called after each change, with no arguments.
 */
export function graphOnDataChanged(graph: ShellGraph | null, onChange: () => void): void {
    for (const type of DATA_CHANGE_EVENTS) {
        invoke(graph, "addListener", type, () => {
            onChange();
        });
    }
}
