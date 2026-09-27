import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { AccelerationPolicy, DataSourceInput, GraphSession, Layer } from "@graphty/graphty-element/session";
import { Box } from "@mantine/core";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

import type { LayerItem } from "./layout/LeftSidebar";

/**
 * How often the style effect looks for the element's session while it is still coming up.
 *
 * The element builds its graph asynchronously and publishes no "ready" event a consumer
 * can wait on, so the one honest option is to look again. The interval is cleared the
 * moment the session is found.
 */
const SESSION_POLL_MS = 50;

/**
 * How the app wants the element to draw: node labels that would land on each other are thinned
 * out. A view setting, not a project one, so it is written on the tag and records no step.
 */
const APP_LAYOUT_BEHAVIOR = { labels: { declutter: true } } as const;

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
    /** Called when a node is selected or deselected */
    onSelectionChange?: (detail: SelectionChangedDetail) => void;
    /** Called when style layers change in graphty-element */
    onStylesChange?: (detail: StylesChangedDetail) => void;
    /** Called once with the element's session, as soon as the element has come up */
    onSession?: (session: GraphSession) => void;
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

export interface GraphtyHandle {
    /** Get node and edge data from the graph */
    getData: () => {
        nodes: Record<string, unknown>[];
        edges: Record<string, unknown>[];
    };
    /**
     * The data source a URL names, for `session.data.import`: the format from the extension, or
     * from the content when the extension says nothing. Touches nothing on the element.
     */
    sourceFromUrl: (url: string, format?: string) => Promise<DataSourceInput>;
    /** The data source a file holds, for `session.data.import`, detected the same way. */
    sourceFromFile: (file: File, format?: string) => Promise<DataSourceInput>;
    /** Captures the canvas as an image, forwarded to the element's own verb. */
    captureScreenshot: GraphtyElement["captureScreenshot"];
    /**
     * The element itself, or null before it has mounted: the camera, XR and selection doors the
     * shell calls (`zoomStep`, `loadCameraPreset`, `setXRConfig`, `selectNode`, ...). A change to
     * the graph goes through {@link GraphtyHandle.session} instead, so it is one undoable step.
     */
    element: GraphtyElement | null;
    /** The element's session, or null before the element upgraded. The element publishes its capabilities here. */
    session: GraphSession | null;
}

export const Graphty = forwardRef<GraphtyHandle, GraphtyProps>(function Graphty(
    { layers: _layers, acceleration, onSelectionChange, onStylesChange, onSession },
    ref,
): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphtyRef = useRef<GraphtyElement>(null);

    useImperativeHandle(
        ref,
        () => ({
            /* The node and edge records the data table and the node inspector draw, as the
               session lists them. */
            getData: () => {
                const session = graphtyRef.current?.session;

                return session === undefined
                    ? { nodes: [], edges: [] }
                    : { nodes: [...session.data.nodes()], edges: [...session.data.edges()] };
            },
            sourceFromUrl: async (url: string, format?: string): Promise<DataSourceInput> => {
                const named = format ?? detectFormatFromFilename(url) ?? undefined;

                if (named !== undefined) {
                    // The element fetches it.
                    return { type: named, config: { url } };
                }

                // No extension to go by, so the content decides, and is passed on so it is fetched once.
                const response = await fetch(url);
                if (!response.ok) {
                    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
                }

                const content = await response.text();
                const detected = detectFormatFromContent(content.slice(0, 2048));

                if (!detected) {
                    throw new Error(
                        `Could not detect file format from URL '${url}'. ` +
                            "Supported formats: JSON, GraphML, GEXF, CSV, GML, DOT, Pajek.",
                    );
                }

                return { type: detected, config: { data: content } };
            },
            sourceFromFile: async (file: File, format?: string): Promise<DataSourceInput> => {
                const detected =
                    format ??
                    detectFormatFromFilename(file.name) ??
                    detectFormatFromContent(await file.slice(0, 2048).text());

                if (!detected) {
                    throw new Error(
                        `Could not detect file format from '${file.name}'. ` +
                            "Supported formats: JSON, GraphML, GEXF, CSV, GML, DOT, Pajek.",
                    );
                }

                return { type: detected, config: { data: await file.text() } };
            },
            captureScreenshot: (options) => {
                if (!graphtyRef.current) {
                    return Promise.reject(new Error("Graph element not initialized"));
                }

                return graphtyRef.current.captureScreenshot(options);
            },
            get element() {
                return graphtyRef.current;
            },
            get session() {
                return graphtyRef.current?.session ?? null;
            },
        }),
        [],
    );

    // NOTE: Layer state is managed by graphty-element (Single Source of Truth).
    // The loop is: the app reads `session.styles.list()`, the user edits, the app calls a
    // `session.styles` verb by LAYER ID, the session publishes `style:changed` once the
    // repaint has committed, and the app re-reads. Nothing here holds an index and nothing
    // here pushes a styleTemplate down.

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
        if (!element || (!onStylesChange && !onSession)) {
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
            // Undefined until the tag has upgraded to the element.
            const session = element.session as GraphSession | undefined;
            if (session === undefined) {
                return false;
            }

            onSession?.(session);

            if (onStylesChange) {
                unwatch = session.on("style:changed", () => {
                    onStylesChange({ layers: session.styles.list() });
                });
                onStylesChange({ layers: session.styles.list() });
            }

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
    }, [onSession, onStylesChange]);

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
            <graphty-element ref={graphtyRef} acceleration={acceleration} layoutBehavior={APP_LAYOUT_BEHAVIOR} />
        </Box>
    );
});
