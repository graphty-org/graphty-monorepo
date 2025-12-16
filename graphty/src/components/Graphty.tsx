import {Box} from "@mantine/core";
import {forwardRef, useEffect, useImperativeHandle, useRef} from "react";

import type {LayerItem} from "./layout/LeftSidebar";

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

interface GraphtyElementType extends HTMLElement {
    nodeData?: {id: number | string, [key: string]: unknown}[];
    edgeData?: {src: number | string, dst: number | string, [key: string]: unknown}[];
    layout?: string;
    layout2d?: boolean;
    layoutConfig?: Record<string, unknown>;
    styleTemplate?: unknown;
    dataSource?: string;
    dataSourceConfig?: Record<string, unknown>;
    graph?: {
        dataManager: {
            clear: () => void;
            nodes: Map<string | number, GraphNode>;
            edges: Map<string, GraphEdge>;
        };
    };
}

interface GraphtyProps {
    layers: LayerItem[];
    layout2d?: boolean;
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
    const ext = (/\.[^.]+$/.exec(filename.toLowerCase()))?.[0];
    if (ext && ext in FORMAT_EXTENSIONS) {
        return FORMAT_EXTENSIONS[ext];
    }

    return null;
}

function detectFormatFromContent(content: string): FormatType | null {
    const trimmed = content.trim();

    // XML-based formats
    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<")) {
        if (trimmed.includes("xmlns=\"http://graphml.graphdrawing.org")) {
            return "graphml";
        }

        if (trimmed.includes("xmlns=\"http://gexf.net")) {
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
    getData: () => {
        nodes: Record<string, unknown>[];
        edges: Record<string, unknown>[];
    };
    loadFromUrl: (url: string, format?: string) => Promise<void>;
    loadFromFile: (file: File, format?: string) => Promise<void>;
    loadData: (format: string, config: Record<string, unknown>) => void;
    clearData: () => void;
}

declare module "react" {
    interface IntrinsicElements {
        "graphty-element": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
}

export const Graphty = forwardRef<GraphtyHandle, GraphtyProps>(function Graphty(
    {layers, layout2d = false},
    ref,
): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphtyRef = useRef<GraphtyElementType>(null);

    useImperativeHandle(ref, () => ({
        getData: () => {
            const dataManager = graphtyRef.current?.graph?.dataManager;
            if (!dataManager) {
                return {nodes: [], edges: []};
            }

            // Extract node data from the Map
            const nodes = Array.from(dataManager.nodes.values()).map((node) => ({
                id: node.id,
                ... node.data,
            }));

            // Extract edge data from the Map
            const edges = Array.from(dataManager.edges.values()).map((edge) => ({
                id: edge.id,
                src: edge.srcId,
                dst: edge.dstId,
                ... edge.data,
            }));

            return {nodes, edges};
        },
        loadFromUrl: async(url: string, format?: string) => {
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
                graphtyRef.current.dataSourceConfig = {data: content};
                return;
            }

            // Pass URL for graphty-element to fetch
            graphtyRef.current.dataSource = detectedFormat;
            graphtyRef.current.dataSourceConfig = {url};
        },
        loadFromFile: async(file: File, format?: string) => {
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
            graphtyRef.current.dataSourceConfig = {data: content};
        },
        loadData: (format: string, config: Record<string, unknown>) => {
            if (!graphtyRef.current) {
                throw new Error("Graph element not initialized");
            }

            graphtyRef.current.dataSource = format;
            graphtyRef.current.dataSourceConfig = config;
        },
        clearData: () => {
            graphtyRef.current?.graph?.dataManager.clear();
        },
    }), []);

    useEffect(() => {
        if (graphtyRef.current) {
            // Set default layout
            graphtyRef.current.layout = "d3";

            // Create styleTemplate from layers
            // Reverse the array so layers at the top of the UI have higher precedence
            const styleTemplate = {
                graphtyTemplate: true,
                majorVersion: "1",
                graph: {
                    addDefaultStyle: true,
                },
                layers: [... layers]
                    .reverse()
                    .map((layer) => {
                        const layerObj: {node?: unknown, edge?: unknown} = {};

                        // Convert node style if present - check for undefined, not falsy (allow empty string)
                        if (layer.styleLayer.node !== undefined) {
                            const nodeStyle: Record<string, unknown> = {};

                            // Convert color to texture.color format if present
                            if (layer.styleLayer.node.style.color) {
                                nodeStyle.texture = {
                                    color: layer.styleLayer.node.style.color,
                                };
                            }

                            layerObj.node = {
                                selector: layer.styleLayer.node.selector || "",
                                style: nodeStyle,
                            };
                        }

                        // Convert edge style if present - check for undefined, not falsy
                        if (layer.styleLayer.edge !== undefined) {
                            layerObj.edge = {
                                selector: layer.styleLayer.edge.selector || "",
                                style: layer.styleLayer.edge.style,
                            };
                        }

                        return layerObj;
                    })
                    .filter((layer) => layer.node !== undefined || layer.edge !== undefined),
            };

            graphtyRef.current.styleTemplate = styleTemplate;
        }
    }, [layers]);

    useEffect(() => {
        if (graphtyRef.current) {
            graphtyRef.current.layout2d = layout2d;
        }
    }, [layout2d]);

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
                style={{
                    display: "block",
                    width: "100%",
                    height: "100%",
                }}
            />
        </Box>
    );
});
