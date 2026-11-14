/**
 * @file What a screen reader learns about the drawing.
 *
 * The canvas is a picture, so a reader who cannot see it hears nothing from it. This gives it a
 * role and a description, announces the selection in a live region, and can add an off-screen
 * list of nodes a keyboard walks. graphty-element supplies the facts -- counts, the legend, the
 * selected nodes and their neighbors, node names from the data -- and the page supplies every
 * word (`accessibleDescription`, `accessibleAnnouncement`, the host's `aria-label`).
 */

import type { NodeId } from "@graphty/graph-format";

import type { GraphSession } from "../session";
import type { LegendBlock } from "../session/styles/legend";
import type { NodeName } from "../session/types";

/** The most names a selection fact lists; `count` says how many there are in all. */
const NAME_CAP = 50;

/**
 * The selection, as names a reader can hear.
 * @since 3.40.0
 */
export interface AccessibleSelection {
    /** The selected nodes, in index order: at most 50; `count` is how many are selected. */
    readonly nodes: readonly NodeName[];
    /** How many nodes are selected. */
    readonly count: number;
    /** When exactly one node is selected, its neighbors (at most 50, by name); else empty. */
    readonly neighbors: readonly NodeName[];
    /** When exactly one node is selected, how many neighbors it has; else 0. */
    readonly neighborCount: number;
}

/**
 * The facts a description of the drawing is phrased from: numbers, the legend and the selection,
 * never words. {@link Graphty.accessibleFacts} reads them.
 * @since 3.40.0
 */
export interface AccessibleGraphFacts {
    /** Nodes in the graph. */
    readonly nodes: number;
    /** Edges in the graph. */
    readonly edges: number;
    /** What the colors and sizes mean: `session.styles.legend()`. */
    readonly legend: readonly LegendBlock[];
    /** What is selected. */
    readonly selection: AccessibleSelection;
}

/**
 * One thing the live region announces, as a code and its facts; the page words it in
 * `accessibleAnnouncement`. Open: more codes may be added.
 * @since 3.40.0
 */
export interface AccessibleAnnouncement {
    /** `"selection"`: the selection changed. */
    readonly code: "selection";
    /** The selection as it is now. */
    readonly params: AccessibleSelection;
}

/** The host side the view needs: the session, the current canvas and the page's words. */
export interface ScreenReaderHost {
    /** The graph's session. */
    session(): GraphSession;
    /** The canvas drawn on now; it may be replaced when the renderer changes. */
    canvas(): HTMLCanvasElement;
    /** The page's description, or undefined for none. */
    describe(): ((facts: AccessibleGraphFacts) => string) | undefined;
    /** The page's announcement, or undefined for the default (the selected names). */
    announce(): ((announcement: AccessibleAnnouncement) => string) | undefined;
}

/**
 * Off the screen but read: a node with `display: none` is never announced. A stylesheet rather
 * than inline style, so a page's `::part(node-list)` rule can show the list.
 */
const OFF_SCREEN_CSS =
    ".graphty-a11y-off-screen{position:absolute;width:1px;height:1px;margin:-1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap;border:0;}";

const DESCRIPTION_ID = "graphty-a11y-description";

/**
 * Reads the selection facts from a session.
 * @param session - The session.
 * @returns The selection, with names.
 */
function selectionFacts(session: GraphSession): AccessibleSelection {
    const ids = session.selection.nodes;
    const nodes = ids.slice(0, NAME_CAP).map((id) => session.data.nodeName(id));
    if (ids.length !== 1) {
        return { nodes, count: ids.length, neighbors: [], neighborCount: 0 };
    }

    const page = session.data.neighbors(ids[0], { limit: NAME_CAP });
    return {
        nodes,
        count: 1,
        neighbors: page.records.map((n) => session.data.nodeName(n.node.id)),
        neighborCount: page.total,
    };
}

/**
 * Reads every fact a description is phrased from.
 * @param session - The session.
 * @returns The facts.
 */
export function graphFacts(session: GraphSession): AccessibleGraphFacts {
    const stats = session.data.statistics();
    return {
        nodes: stats.nodeCount,
        edges: stats.edgeCount,
        legend: session.styles.legend(),
        selection: selectionFacts(session),
    };
}

/**
 * Calls a page's wording function; a function that throws words nothing and is reported, so it
 * never stops the session's other listeners.
 * @param word - The page's function.
 * @param facts - What it words.
 * @returns Its text, or "" when it threw.
 */
function wordSafely<T>(word: (facts: T) => string, facts: T): string {
    try {
        return word(facts);
    } catch (error) {
        console.error("<graphty-element>: an accessibility wording function threw.", error);
        return "";
    }
}

/**
 * The description, live region and node list in the element's shadow root.
 */
export class ScreenReader {
    readonly #host: ScreenReaderHost;
    readonly #description = document.createElement("div");
    readonly #live = document.createElement("div");
    readonly #style = document.createElement("style");
    #list: HTMLUListElement | undefined;
    /** The node the list's keyboard cursor is on, kept by id across rebuilds. */
    #active: NodeId | undefined;
    /** The node ids in list order. */
    #ids: NodeId[] = [];
    #unwatch: (() => void)[] = [];

    /**
     * Builds the description and the live region; nothing is in the page until `connect`.
     * @param host - The element side.
     */
    constructor(host: ScreenReaderHost) {
        this.#host = host;
        this.#description.id = DESCRIPTION_ID;
        this.#description.hidden = true;
        this.#live.setAttribute("role", "status");
        this.#live.setAttribute("aria-atomic", "true");
        this.#live.className = "graphty-a11y-off-screen";
        this.#style.textContent = OFF_SCREEN_CSS;
    }

    /**
     * Puts the view in the shadow root and follows the session.
     * @param root - The element's shadow root.
     */
    connect(root: Node): void {
        root.appendChild(this.#style);
        root.appendChild(this.#description);
        root.appendChild(this.#live);
        if (this.#list) {
            root.appendChild(this.#list);
        }

        const session = this.#host.session();
        this.#unwatch = [
            session.on("project:derived", () => {
                this.refresh();
                this.#fillList();
            }),
            session.on("visibility:changed", () => {
                this.#fillList();
            }),
            session.on("selection:changed", () => {
                this.refresh();
                this.#announce();
                this.#markSelected();
            }),
        ];
        this.refresh();
        this.#fillList();
    }

    /** Stops following the session and leaves the shadow root. */
    disconnect(): void {
        for (const stop of this.#unwatch.splice(0)) {
            stop();
        }

        this.#style.remove();
        this.#description.remove();
        this.#live.remove();
        this.#list?.remove();
    }

    /**
     * Sets the canvas's role, name and description from the host's label and the page's
     * description. The role is `img` only while the canvas is named: an unnamed image is a
     * failure every checker reports, and an unnamed canvas is no worse than before.
     */
    refresh(): void {
        const canvas = this.#host.canvas();
        const label = canvas.getAttribute("aria-label");
        if (label === null) {
            canvas.removeAttribute("role");
        } else {
            canvas.setAttribute("role", "img");
        }

        const describe = this.#host.describe();
        const text = describe ? wordSafely(describe, this.#facts()) : "";
        this.#description.textContent = text;
        if (text === "") {
            canvas.removeAttribute("aria-describedby");
        } else {
            canvas.setAttribute("aria-describedby", DESCRIPTION_ID);
        }

        if (this.#list) {
            if (label === null) {
                this.#list.removeAttribute("aria-label");
            } else {
                this.#list.setAttribute("aria-label", label);
            }
        }
    }

    /**
     * Shows or removes the off-screen node list.
     * @param on - Whether the list is there.
     * @param root - Where to put it while connected, or undefined when not connected.
     */
    setList(on: boolean, root: Node | undefined): void {
        if (!on) {
            this.#list?.remove();
            this.#list = undefined;
            return;
        }

        if (this.#list) {
            return;
        }

        const list = document.createElement("ul");
        list.setAttribute("role", "listbox");
        list.setAttribute("part", "node-list");
        list.tabIndex = 0;
        list.className = "graphty-a11y-off-screen";
        list.addEventListener("keydown", (event) => {
            this.#onKey(event);
        });
        this.#list = list;
        if (root) {
            root.appendChild(list);
            this.#fillList();
            this.refresh();
        }
    }

    /**
     * The facts now.
     * @returns The facts.
     */
    #facts(): AccessibleGraphFacts {
        return graphFacts(this.#host.session());
    }

    #announce(): void {
        const params = selectionFacts(this.#host.session());
        const announce = this.#host.announce();
        this.#live.textContent = announce
            ? wordSafely(announce, { code: "selection", params })
            : params.nodes.map((n) => n.name).join(", ");
    }

    /** Lists every visible node by name. */
    #fillList(): void {
        const list = this.#list;
        if (!list) {
            return;
        }

        const { data } = this.#host.session();
        // ponytail: one option per visible node, all in the DOM; window it if a graph of 100k+ nodes needs the list.
        const { records } = data.nodePage({ limit: Infinity, scope: "visible" });
        const options = records.map((record, index) => {
            const option = document.createElement("li");
            option.setAttribute("role", "option");
            option.id = `graphty-a11y-node-${index}`;
            option.dataset.index = String(index);
            option.textContent = data.nodeName(record.id).name;
            return option;
        });
        this.#ids = records.map((record) => record.id);
        list.replaceChildren(...options);
        this.#markSelected();
        this.#moveTo(this.#active === undefined ? 0 : Math.max(0, this.#ids.indexOf(this.#active)));
    }

    #markSelected(): void {
        const list = this.#list;
        if (!list) {
            return;
        }

        const { selection } = this.#host.session();
        this.#ids.forEach((id, index) => {
            list.children[index]?.setAttribute("aria-selected", String(selection.has(id)));
        });
    }

    /**
     * Moves the list's keyboard cursor.
     * @param index - The option to move to; clamped to the list.
     */
    #moveTo(index: number): void {
        const list = this.#list;
        if (!list || this.#ids.length === 0) {
            list?.removeAttribute("aria-activedescendant");
            this.#active = undefined;
            return;
        }

        const at = Math.min(Math.max(index, 0), this.#ids.length - 1);
        this.#active = this.#ids[at];
        list.setAttribute("aria-activedescendant", `graphty-a11y-node-${at}`);
    }

    /**
     * Up, Down, Home and End move through the nodes; Enter or Space selects the one the cursor is on.
     * @param event - The key press.
     */
    #onKey(event: KeyboardEvent): void {
        const at = this.#active === undefined ? 0 : this.#ids.indexOf(this.#active);
        const moves: Record<string, number> = {
            ArrowDown: at + 1,
            ArrowUp: at - 1,
            Home: 0,
            End: this.#ids.length - 1,
        };
        if (event.key in moves) {
            this.#moveTo(moves[event.key]);
        } else if ((event.key === "Enter" || event.key === " ") && this.#active !== undefined) {
            void this.#host.session().selection.apply({ ids: [this.#active] });
        } else {
            return;
        }

        event.preventDefault();
    }
}
