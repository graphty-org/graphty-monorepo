import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { AccelerationPolicy, GraphSession, Layer } from "@graphty/graphty-element/session";
import { Box } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { LayerItem } from "./layout/LeftSidebar";

interface GraphNode {
    id: string | number;
    data: Record<string, unknown>;
}

interface GraphEdge {
    id: string;
    srcId: string | number;
    dstId: string | number;
    data: Record<string, unknown>;
}

/**
 * The element as this wrapper drives it.
 *
 * The property half is still written out here, because the element's own class type cannot be
 * used whole: `Graph.dataManager` is private on it and {@link GraphtyHandle.getData} reads the
 * node and edge maps through it, which is the element gap recorded on `getData` itself.
 *
 * The pin verbs and `session` are NOT written out. They are picked off the element's own class,
 * so their signatures are the element's and a rename over there is a type error here rather than
 * a method that quietly stops existing. That is how every member reaches this interface from now
 * on: the ten below are a duck-type of the element (root CLAUDE.md, "duck-typing or re-declaring
 * the element's types") that the element's exported `GraphtyElement` makes unnecessary, and they
 * survive only because replacing them wholesale touches every effect in this file.
 */
interface GraphtyElementType extends HTMLElement, Pick<GraphtyElement, "pin" | "unpin" | "pinnedNodes" | "session"> {
    nodeData?: { id: number | string; [key: string]: unknown }[];
    edgeData?: { source: number | string; target: number | string; [key: string]: unknown }[];
    layout?: string;
    /** @deprecated Use viewMode instead */
    layout2d?: boolean;
    /** View mode: "2d", "3d", "vr", or "ar" */
    viewMode?: "2d" | "3d" | "vr" | "ar";
    layoutConfig?: Record<string, unknown>;
    dataSource?: string;
    dataSourceConfig?: Record<string, unknown>;
    /** Clears the graph AND resets the element's per-load data-source guard. */
    clearData?: () => void;
    graph?: Graph;
}

/**
 * How often the style effect looks for the element's session while it is still coming up.
 *
 * The element builds its graph asynchronously and publishes no "ready" event a consumer
 * can wait on, so the one honest option is to look again. The interval is cleared the
 * moment the session is found.
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

// Format detection utilities
type FormatType = "json" | "graphml" | "gexf" | "csv" | "gml" | "dot" | "pajek";

const FORMAT_EXTENSIONS: Record<string, FormatType> = {
    ".json": "json",
    ".graphml": "graphml",
    ".xml": "graphml",
    ".gexf": "gexf",
    ".csv": "csv",
    ".edges": "csv",
    ".edgelist": "csv",
    ".gml": "gml",
    ".dot": "dot",
    ".gv": "dot",
    ".net": "pajek",
    ".paj": "pajek",
};

function detectFormatFromFilename(filename: string): FormatType | null {
    const ext = /\.[^.]+$/.exec(filename.toLowerCase())?.[0];
    if (ext && ext in FORMAT_EXTENSIONS) {
        return FORMAT_EXTENSIONS[ext];
    }

    return null;
}

function detectFormatFromContent(content: string): FormatType | null {
    const trimmed = content.trim();

    // XML-based formats
    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
        if (trimmed.includes('xmlns="http://graphml.graphdrawing.org')) {
            return "graphml";
        }

        if (trimmed.includes('xmlns="http://gexf.net')) {
            return "gexf";
        }

        // Check for graphml or gexf root elements
        if (trimmed.includes("<graphml") || trimmed.includes("<graph")) {
            return "graphml";
        }

        if (trimmed.includes("<gexf")) {
            return "gexf";
        }

        return "graphml"; // Default to graphml for XML
    }

    // JSON
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        return "json";
    }

    // GML
    if (/graph\s*\[/i.test(trimmed)) {
        return "gml";
    }

    // Pajek
    if (/^\*vertices/i.test(trimmed)) {
        return "pajek";
    }

    // DOT
    if (/^\s*(strict\s+)?(di)?graph\s+/i.test(trimmed)) {
        return "dot";
    }

    // CSV (very generic, check last)
    if (/^[\w-]+\s*,\s*[\w-]+/m.test(trimmed)) {
        return "csv";
    }

    return null;
}

/**
 * Graph type representing the underlying graphty-element Graph instance.
 * This is used for advanced integrations like AI control.
 */
interface Graph {
    dataManager: {
        clear: () => void;
        nodes: Map<string | number, GraphNode>;
        edges: Map<string, GraphEdge>;
    };
    /**
     * The headless model: the style stack, the runs and their results, the selection.
     *
     * The only door to the layers. There is no `getStyleManager` and no `getLayers` here
     * any more -- both addressed a layer by its place in an array, and the stack is now
     * read bottom first off `session.styles.list()` with every layer carrying its own id.
     */
    getSession: () => GraphSession;
    // Additional Graph methods accessible via the instance
    [key: string]: unknown;
}

export interface GraphtyHandle {
    /** Get node and edge data from the graph */
    getData: () => {
        nodes: Record<string, unknown>[];
        edges: Record<string, unknown>[];
    };
    /** Load data from a URL */
    loadFromUrl: (url: string, format?: string) => Promise<void>;
    /** Load data from a File object */
    loadFromFile: (file: File, format?: string) => Promise<void>;
    /** Load data with a specific format and config */
    loadData: (format: string, config: Record<string, unknown>) => void;
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
    /** Access to the underlying Graph instance for advanced operations (e.g., AI integration) */
    graph: Graph | null;
    /** The element's session, or null before the element upgraded. The element publishes its capabilities here. */
    session: GraphSession | null;
}

export const Graphty = forwardRef<GraphtyHandle, GraphtyProps>(function Graphty(
    { layers: _layers, acceleration, viewMode, dataSource, dataSourceConfig, replaceExisting, layout = "d3", layoutConfig, onSelectionChange, onStylesChange, ...rest },
    ref,
): React.JSX.Element {
    // Resolve viewMode from props, with backward compatibility for deprecated layout2d prop
    const deprecatedLayout2d = (rest as { layout2d?: boolean }).layout2d;
    const resolvedViewMode: ViewMode = viewMode ?? (deprecatedLayout2d ? "2d" : "3d");
    const containerRef = useRef<HTMLDivElement>(null);
    const graphtyRef = useRef<GraphtyElementType>(null);
    const prevDataSourceRef = useRef<{ dataSource?: string; dataSourceConfig?: Record<string, unknown> } | undefined>(
        undefined,
    );

    useImperativeHandle(
        ref,
        () => ({
            /*
             * The node and edge records the data table and the node inspector draw.
             *
             * ELEMENT GAP, and the reason this reaches through `graph.dataManager` -- which is
             * PRIVATE on the element's own class, so the wrapper cannot use that class as its
             * element type and writes the property half out by hand instead. The session's data
             * surface answers `node(id)` and `edge(id)` one at a time and publishes no listing
             * verb: its own documentation says id listings over a scope are asynchronous by
             * construction and not part of that surface yet. Until one exists there is no
             * supported way to ask the element for its records, so this walks the maps behind
             * the private field. Delete this the day the element publishes a listing.
             */
            getData: () => {
                const dataManager = graphtyRef.current?.graph?.dataManager;
                if (!dataManager) {
                    return { nodes: [], edges: [] };
                }

                // Extract node data from the Map
                const nodes = Array.from(dataManager.nodes.values()).map((node) => ({
                    id: node.id,
                    ...node.data,
                }));

                // Extract edge data from the Map, under the names the element publishes. The id
                // is written LAST rather than first: a record that carries its own `id` -- a GEXF
                // file's edge identifier, say -- used to win the collision through the spread and
                // replace the element's id in every record the app then read.
                const edges = Array.from(dataManager.edges.values()).map((edge) => ({
                    ...edge.data,
                    id: edge.id,
                    source: edge.srcId,
                    target: edge.dstId,
                }));

                return { nodes, edges };
            },
            loadFromUrl: async (url: string, format?: string) => {
                if (!graphtyRef.current) {
                    throw new Error("Graph element not initialized");
                }

                let detectedFormat = format;

                // If no format provided, try to detect from URL extension
                detectedFormat ??= detectFormatFromFilename(url) ?? undefined;

                // If still no format, fetch content and detect from content
                if (!detectedFormat) {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
                    }

                    const content = await response.text();
                    const sample = content.slice(0, 2048);
                    detectedFormat = detectFormatFromContent(sample) ?? undefined;

                    if (!detectedFormat) {
                        throw new Error(
                            `Could not detect file format from URL '${url}'. ` +
                                "Supported formats: JSON, GraphML, GEXF, CSV, GML, DOT, Pajek.",
                        );
                    }

                    // Pass content directly to avoid double-fetch
                    graphtyRef.current.dataSource = detectedFormat;
                    graphtyRef.current.dataSourceConfig = { data: content };
                    return;
                }

                // Pass URL for graphty-element to fetch
                graphtyRef.current.dataSource = detectedFormat;
                graphtyRef.current.dataSourceConfig = { url };
            },
            loadFromFile: async (file: File, format?: string) => {
                if (!graphtyRef.current) {
                    throw new Error("Graph element not initialized");
                }

                let detectedFormat = format;

                // If no format provided, try to detect from filename
                detectedFormat ??= detectFormatFromFilename(file.name) ?? undefined;

                // If still no format, read content and detect from content
                if (!detectedFormat) {
                    const sample = await file.slice(0, 2048).text();
                    detectedFormat = detectFormatFromContent(sample) ?? undefined;

                    if (!detectedFormat) {
                        throw new Error(
                            `Could not detect file format from '${file.name}'. ` +
                                "Supported formats: JSON, GraphML, GEXF, CSV, GML, DOT, Pajek.",
                        );
                    }
                }

                // Read full file content
                const content = await file.text();
                graphtyRef.current.dataSource = detectedFormat;
                graphtyRef.current.dataSourceConfig = { data: content };
            },
            loadData: (format: string, config: Record<string, unknown>) => {
                if (!graphtyRef.current) {
                    throw new Error("Graph element not initialized");
                }

                graphtyRef.current.dataSource = format;
                graphtyRef.current.dataSourceConfig = config;
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
            clearData: () => {
                // The element's own method, not `graph.dataManager.clear()`: clearing the
                // data has to reset the element's per-load data-source guard as well, and
                // only the element can reach it. Reaching past it left a second load
                // setting the new source without ever starting it.
                graphtyRef.current?.clearData?.();
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

        // Clear existing data if requested
        if (replaceExisting) {
            graphtyRef.current.graph?.dataManager.clear();
        }

        graphtyRef.current.dataSource = dataSource;
        if (dataSourceConfig) {
            graphtyRef.current.dataSourceConfig = dataSourceConfig;
        }

        prevDataSourceRef.current = { dataSource, dataSourceConfig };
    }, [dataSource, dataSourceConfig, replaceExisting]);

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
            // Guard against a partially initialised graph, which is what a test environment
            // and the first few frames of a real load both hand back.
            const { graph } = element;
            if (!graph || typeof graph.getSession !== "function") {
                return false;
            }

            const session = graph.getSession();

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
            <graphty-element
                ref={graphtyRef}
                acceleration={acceleration}
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </Box>
    );
});
