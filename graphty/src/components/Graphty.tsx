import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type {
    AccelerationPolicy,
    EdgeRecord,
    GraphSession,
    Layer,
    NodeRecord,
} from "@graphty/graphty-element/session";
import { Box } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { LayerItem } from "./shell/panel/StyleLayerList";

/**
 * How often the style effect looks for the element's session while the tag is not yet upgraded.
 *
 * The element builds its session in its constructor, so once `<graphty-element>` is defined
 * the session is there from the first render. It is absent only while the tag is still an
 * unknown element -- a page that defines it after mounting this wrapper -- and the interval is
 * cleared the moment the session is found.
 */
const SESSION_POLL_MS = 50;

/** What {@link GraphtyHandle.pinnedNodes} answers before the element exists to be asked. */
const EMPTY_PINNED_NODES: ReadonlySet<string | number> = new Set<string | number>();

type ViewMode = "2d" | "3d" | "vr" | "ar";

/** Event detail for selection-changed events */
export interface SelectionChangedDetail {
    previousNodeId: string | number | null;
    currentNodeId: string | number | null;
    currentNodeData: Record<string, unknown> | null;
}

/**
 * One style layer, exactly as the element holds it.
 *
 * Re-exported rather than re-declared. The app used to carry its own shape for this --
 * a metadata bag and two halves of loose records -- and every field of it was a guess at
 * what `StyleManager` happened to accept. A layer is now addressed by {@link Layer.id},
 * says who owns it in {@link Layer.source}, and carries the channels it paints in
 * `set` and `encode`, so there is one declaration and it is the element's.
 */
type StyleLayer = Layer;

/** Event detail for style-changed events */
export interface StylesChangedDetail {
    layers: readonly StyleLayer[];
}

interface GraphtyProps {
    layers: LayerItem[];
    /** The element's acceleration policy, written on the tag so it is in force before the probe starts. */
    acceleration?: AccelerationPolicy;
    /** @deprecated Use viewMode instead */
    layout2d?: boolean;
    /** View mode: "2d", "3d", "vr", or "ar" */
    viewMode?: ViewMode;
    dataSource?: string;
    dataSourceConfig?: Record<string, unknown>;
    replaceExisting?: boolean;
    layout?: string;
    layoutConfig?: Record<string, unknown>;
    /** Called when a node is selected or deselected */
    onSelectionChange?: (detail: SelectionChangedDetail) => void;
    /** Called when style layers change in graphty-element */
    onStylesChange?: (detail: StylesChangedDetail) => void;
}

/** How a load treats the graph already drawn. */
interface LoadOptions {
    /** Replace the graph, but only once the new data has parsed; a failed load keeps the old one. */
    replace?: boolean;
}

export interface GraphtyHandle {
    /**
     * Every node and edge record the element holds, through the session's documented listing:
     * the "graph" scope for the ids, then `session.data` for each record. Empty before the
     * element has a session.
     */
    getData: () => Promise<{
        nodes: NodeRecord[];
        edges: EdgeRecord[];
    }>;
    /**
     * Load data from a URL, through the element's own awaited method. It detects the format when
     * none is named, rejects when the load fails, and with `replace` keeps the current graph
     * until the new data has parsed.
     */
    loadFromUrl: (url: string, format?: string, options?: LoadOptions) => Promise<{ loadId: number }>;
    /** Load data from a File object; the same contract as {@link GraphtyHandle.loadFromUrl}. */
    loadFromFile: (file: File, format?: string, options?: LoadOptions) => Promise<{ loadId: number }>;
    /** Load data with a specific format and config; the same contract as {@link GraphtyHandle.loadFromUrl}. */
    loadData: (format: string, config: Record<string, unknown>, options?: LoadOptions) => Promise<{ loadId: number }>;
    /** Clear all data from the graph */
    clearData: () => void;
    /**
     * Pin nodes where they are, so no layout moves them again.
     *
     * Forwarded to the element's own verb rather than reached through `graph`. The ids are the
     * element's own, `string | number`, NOT the printed form a surface holds: the element looks
     * a node up by exact map key, so `pin("34")` finds nothing on a graph whose ids are numbers.
     */
    pin: (ids: (string | number) | readonly (string | number)[]) => void;
    /** Release nodes a reader or a drag pinned. The same id rule as {@link GraphtyHandle.pin}. */
    unpin: (ids: (string | number) | readonly (string | number)[]) => void;
    /** Which nodes are pinned right now, by the element's own ids; empty before the element is up. */
    pinnedNodes: ReadonlySet<string | number>;
    /** Captures the canvas as an image, forwarded to the element's own verb. */
    captureScreenshot: GraphtyElement["captureScreenshot"];
    /**
     * The element's `Graph`, for the calls the session does not carry yet (the camera, the AI
     * manager, runs addressed by namespace). Published as a plain object: every caller checks
     * for the member it calls before calling it.
     */
    graph: object | null;
    /** The element's session, or null before the element upgraded. The element publishes its capabilities here. */
    session: GraphSession | null;
}

export const Graphty = forwardRef<GraphtyHandle, GraphtyProps>(function Graphty(
    {
        layers: _layers,
        acceleration,
        viewMode,
        dataSource,
        dataSourceConfig,
        replaceExisting,
        layout = "d3",
        layoutConfig,
        onSelectionChange,
        onStylesChange,
        ...rest
    },
    ref,
): React.JSX.Element {
    // Resolve viewMode from props, with backward compatibility for deprecated layout2d prop
    const deprecatedLayout2d = (rest as { layout2d?: boolean }).layout2d;
    const resolvedViewMode: ViewMode = viewMode ?? (deprecatedLayout2d ? "2d" : "3d");
    const containerRef = useRef<HTMLDivElement>(null);
    const graphtyRef = useRef<GraphtyElement>(null);
    const prevDataSourceRef = useRef<{ dataSource?: string; dataSourceConfig?: Record<string, unknown> } | undefined>(
        undefined,
    );

    useImperativeHandle(
        ref,
        () => ({
            /*
             * The node and edge records the data table and the node inspector draw, listed the
             * way graphty-element documents: resolve the "graph" scope for the ids, then read
             * each record by id. A record carries the element's own id, written after the
             * file's keys, so a file row with its own `id` column cannot replace it.
             */
            getData: async () => {
                const session = graphtyRef.current?.session;
                if (!session) {
                    return { nodes: [], edges: [] };
                }

                const { nodes, edges } = await session.scope.resolve("graph");

                return {
                    nodes: [...nodes].flatMap((id) => session.data.node(id) ?? []),
                    edges: [...edges].flatMap((id) => session.data.edge(id) ?? []),
                };
            },
            loadFromUrl: async (url: string, format?: string, options?: LoadOptions) => {
                if (!graphtyRef.current) {
                    throw new Error("Graph element not initialized");
                }

                return graphtyRef.current.loadFromUrl(url, { format, replace: options?.replace });
            },
            loadFromFile: async (file: File, format?: string, options?: LoadOptions) => {
                if (!graphtyRef.current) {
                    throw new Error("Graph element not initialized");
                }

                return graphtyRef.current.loadFromFile(file, { format, replace: options?.replace });
            },
            loadData: async (format: string, config: Record<string, unknown>, options?: LoadOptions) => {
                if (!graphtyRef.current) {
                    throw new Error("Graph element not initialized");
                }

                return graphtyRef.current.addDataFromSource(format, config, { replace: options?.replace });
            },
            pin: (ids: (string | number) | readonly (string | number)[]) => {
                graphtyRef.current?.pin(ids);
            },
            unpin: (ids: (string | number) | readonly (string | number)[]) => {
                graphtyRef.current?.unpin(ids);
            },
            get pinnedNodes() {
                return graphtyRef.current?.pinnedNodes ?? EMPTY_PINNED_NODES;
            },
            captureScreenshot: (options) => {
                if (!graphtyRef.current) {
                    return Promise.reject(new Error("Graph element not initialized"));
                }

                return graphtyRef.current.captureScreenshot(options);
            },
            clearData: () => {
                graphtyRef.current?.clearData();
            },
            get graph() {
                return graphtyRef.current?.graph ?? null;
            },
            get session() {
                return graphtyRef.current?.session ?? null;
            },
        }),
        [],
    );

    // Handle data source changes from props
    useEffect(() => {
        if (!graphtyRef.current || !dataSource) {
            return;
        }

        // Check if data source actually changed
        const prev = prevDataSourceRef.current;
        if (prev !== undefined) {
            if (
                prev.dataSource === dataSource &&
                JSON.stringify(prev.dataSourceConfig) === JSON.stringify(dataSourceConfig)
            ) {
                return;
            }
        }

        // The element reports a failure on its own `data-loading-error` channel; a prop has no
        // caller to hand the rejection to.
        graphtyRef.current
            .addDataFromSource(dataSource, dataSourceConfig ?? {}, { replace: replaceExisting })
            .catch(() => undefined);

        prevDataSourceRef.current = { dataSource, dataSourceConfig };
    }, [dataSource, dataSourceConfig, replaceExisting]);

    // The app thins out node labels that would be drawn over each other. The element does the
    // work; its default is off so that every other consumer keeps the picture it had.
    useEffect(() => {
        if (graphtyRef.current) {
            graphtyRef.current.layoutBehavior = { labels: { declutter: true } };
        }
    }, []);

    // Handle layout changes
    useEffect(() => {
        if (graphtyRef.current) {
            graphtyRef.current.layout = layout;
            if (layoutConfig) {
                graphtyRef.current.layoutConfig = layoutConfig;
            }
        }
    }, [layout, layoutConfig]);

    // NOTE: Layer state is managed by graphty-element (Single Source of Truth).
    // The loop is: the app reads `session.styles.list()`, the user edits, the app calls a
    // `session.styles` verb by LAYER ID, the session publishes `style:changed` once the
    // repaint has committed, and the app re-reads. Nothing here holds an index and nothing
    // here pushes a styleTemplate down.

    useEffect(() => {
        if (graphtyRef.current) {
            graphtyRef.current.viewMode = resolvedViewMode;
        }
    }, [resolvedViewMode]);

    // Handle selection-changed events from graphty-element
    useEffect(() => {
        const element = graphtyRef.current;
        if (!element || !onSelectionChange) {
            return undefined;
        }

        const handleSelectionChanged = (event: Event): void => {
            const customEvent = event as CustomEvent<{
                previousNodeId: string | number | null;
                currentNodeId: string | number | null;
                currentNode: { data: Record<string, unknown> } | null;
            }>;

            const { previousNodeId, currentNodeId, currentNode } = customEvent.detail;

            onSelectionChange({
                previousNodeId,
                currentNodeId,
                currentNodeData: currentNode?.data ?? null,
            });
        };

        element.addEventListener("selection-changed", handleSelectionChanged);

        return () => {
            element.removeEventListener("selection-changed", handleSelectionChanged);
        };
    }, [onSelectionChange]);

    /* The style stack, read back whenever it changes.

       Through the SESSION rather than through a DOM event. `style:changed` is published by
       the session for every verb that changes the stack -- including the ones the element
       itself performs, such as the encoding a finished run paints by itself -- and it
       arrives AFTER the repaint has committed, so what `list()` answers next is what the
       canvas is already showing. The element's `style-changed` DOM event predates the
       stack and fires for none of that.

       The session appears when the element finishes coming up, which is asynchronous, so
       this polls for it exactly as the layer sync did before. */
    useEffect(() => {
        const element = graphtyRef.current;
        if (!element || !onStylesChange) {
            return undefined;
        }

        let unwatch: (() => void) | null = null;
        let pollInterval: ReturnType<typeof setInterval> | null = null;

        const stopPolling = (): void => {
            if (pollInterval !== null) {
                clearInterval(pollInterval);
                pollInterval = null;
            }
        };

        const bind = (): boolean => {
            // Undefined only while the tag has not been upgraded yet.
            const session = element.session as GraphSession | undefined;
            if (!session) {
                return false;
            }

            unwatch = session.on("style:changed", () => {
                onStylesChange({ layers: session.styles.list() });
            });
            onStylesChange({ layers: session.styles.list() });

            return true;
        };

        if (!bind()) {
            pollInterval = setInterval(() => {
                if (bind()) {
                    stopPolling();
                }
            }, SESSION_POLL_MS);
        }

        return () => {
            stopPolling();
            unwatch?.();
        };
    }, [onStylesChange]);

    return (
        <Box
            ref={containerRef}
            className="graphty-container"
            style={{
                width: "100%",
                height: "100%",
                position: "relative",
                overflow: "hidden",
            }}
        >
            <graphty-element ref={graphtyRef} acceleration={acceleration} />
        </Box>
    );
});
