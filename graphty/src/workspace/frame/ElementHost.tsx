import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { GraphSession } from "@graphty/graphty-element/session";
import { useEffect, useMemo, useRef, useState } from "react";

import { APP_HIGHLIGHT_COLOR } from "../../constants/highlight";
import { loadGraphtyElement } from "../../elementLoader";
import { siteConfig } from "../../siteConfig";
import { WORKSPACE_AUTOSAVE_KEY, WORKSPACE_AUTOSAVE_OPTIONS } from "../autosave/autosave";
import { LAYOUT_SEED } from "../layout/methods";
import { ACCELERATION, readPreference } from "../settings/preferences";
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

/** The room between the canvas toolbar and the map's credits under it, in pixels. */
const TOOLBAR_GAP = 12;

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
    // The map's credits sit above the canvas toolbar, measured from its dock; and a reader who
    // prefers less motion gets camera moves without the glide. View settings, written on the
    // element; they record no step.
    const still = useReducedMotion();
    useEffect(() => {
        const element = ref.current;
        if (element === null || hosted === null) {
            return undefined;
        }

        element.cameraTransitionDuration = still ? 0 : undefined;
        const canvas = element.closest<HTMLElement>(".ws-canvas");
        const dock = canvas?.querySelector<HTMLElement>(".ws-toolbar-dock");
        if (canvas === null || canvas === undefined || dock === null || dock === undefined) {
            element.attributionOffset = 0;
            return undefined;
        }

        const place = (): void => {
            element.attributionOffset = Math.max(0, canvas.clientHeight - dock.offsetTop + TOOLBAR_GAP);
        };
        place();
        const observer = new ResizeObserver(place);
        observer.observe(canvas);
        observer.observe(dock);
        return () => {
            observer.disconnect();
        };
    }, [hosted, still]);

    // React 19 writes a prop onto a custom element as a property only when the tag is defined at
    // commit time; before that it writes `String(value)` as an attribute, or drops a `false`, and
    // never tries again (issue #3375). The frame's code can arrive before the element's, so the tag
    // is rendered only once it is defined, as graphty-element's React guide asks.
    const [defined, setDefined] = useState(() => customElements.get("graphty-element") !== undefined);
    useEffect(() => {
        if (defined) {
            return undefined;
        }
        let live = true;
        void loadGraphtyElement()
            .then(() => customElements.whenDefined("graphty-element"))
            .then(() => {
                if (live) {
                    setDefined(true);
                }
            });
        return () => {
            live = false;
        };
    }, [defined]);

    useEffect(() => {
        const element = ref.current;
        const session: GraphSession | undefined = element?.session;
        if (defined && element !== null && session?.status.ready === true) {
            // The app keeps one highlight color, a presentation choice (constants/highlight.ts).
            session.styles.setHighlightColor(APP_HIGHLIGHT_COLOR);
            setHosted(session);
            onReady(element, session);
            // The element disposes its session when it leaves the page, which React does not always
            // do (a story's page emptied under it): nothing may render from it after that.
            const off = session.on("session:disposed", () => {
                setHosted(null);
                onReady(null, null);
            });
            return () => {
                off();
                // Already handed down when the element left the page first.
                if (session.status.ready) {
                    onReady(null, null);
                }
            };
        }
        return () => {
            onReady(null, null);
        };
    }, [onReady, defined]);

    if (!defined) {
        return <div data-element-host="loading" style={{ display: "block", width: "100%", height: "100%" }} />;
    }

    return (
        <graphty-element
            ref={ref}
            aria-label="Graph drawing"
            layout={LAYOUT_ID}
            layoutConfig={LAYOUT_CONFIG}
            layoutBehavior={layoutBehavior}
            lighting={lighting}
            // The app's own Undo and Redo take these keys everywhere, the drawing included, so
            // every step taken back is named in a notice.
            historyKeys={false}
            zoomToPointer
            xr={XR_CONFIG}
            {...(autosave ? { autosave: WORKSPACE_AUTOSAVE_KEY, autosaveOptions: WORKSPACE_AUTOSAVE_OPTIONS } : {})}
            // On the tag, so the reader's policy is in force before the element's first GPU probe.
            acceleration={readPreference(ACCELERATION)}
            // The site's experiments and the address's ?features=, read when the session is made.
            features={siteConfig().features}
            style={{ display: "block", width: "100%", height: "100%" }}
        />
    );
}

/**
 * Whether the reader asked for less motion, following the system setting as it changes.
 * @returns True when the system says so.
 */
function useReducedMotion(): boolean {
    const query = useMemo(() => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)"), []);
    const [still, setStill] = useState(query?.matches ?? false);
    useEffect(() => {
        if (query === undefined) {
            return undefined;
        }
        const changed = (): void => {
            setStill(query.matches);
        };
        query.addEventListener("change", changed);
        return () => {
            query.removeEventListener("change", changed);
        };
    }, [query]);
    return still;
}
