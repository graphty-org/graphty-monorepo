import {Box} from "@mantine/core";
import {forwardRef, useEffect, useImperativeHandle, useRef} from "react";

import type {ArrowConfig, ColorConfig, EdgeLineConfig, EdgeStyle, NodeEffectsConfig, RichTextStyle, ShapeConfig} from "../types/style-layer";
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

/**
 * Map UI shape types to graphty-element shape types.
 */
const SHAPE_TYPE_MAP: Record<string, string> = {
    torusKnot: "torus-knot",
    torus: "torus-knot", // torus not supported, fallback to torus-knot
    disc: "geodesic", // disc not supported, fallback to geodesic
    plane: "box", // plane not supported, fallback to box
};

/**
 * Convert ShapeConfig to graphty-element format.
 */
function convertShapeConfig(shape: ShapeConfig): {type?: string, size?: number} {
    const type = SHAPE_TYPE_MAP[shape.type] ?? shape.type;
    return {
        type,
        size: shape.size,
    };
}

/**
 * Convert ColorConfig to graphty-element texture.color format.
 */
function convertColorConfig(colorConfig: ColorConfig): string | {colorType: string, value?: string, colors?: string[], direction?: number, opacity?: number} {
    switch (colorConfig.mode) {
        case "solid": {
            // For solid colors, we can use either a simple string or the advanced format
            const {opacity, color} = colorConfig;
            if (opacity === 1.0) {
                // Use simple string format
                return color;
            }

            // Use advanced format with opacity
            return {
                colorType: "solid",
                value: color,
                opacity,
            };
        }

        case "gradient":
            return {
                colorType: "gradient",
                colors: colorConfig.stops.map((stop) => stop.color),
                direction: colorConfig.direction,
                opacity: colorConfig.opacity,
            };

        case "radial":
            return {
                colorType: "radial-gradient",
                colors: colorConfig.stops.map((stop) => stop.color),
                opacity: colorConfig.opacity,
            };

        default:
            // This should never happen, but TypeScript requires exhaustive handling
            return "#5b8ff9";
    }
}

/**
 * Convert EdgeLineConfig to graphty-element line format.
 * Converts opacity from 0-100 to 0-1.
 */
function convertEdgeLineConfig(line: EdgeLineConfig): {type?: string, width?: number, color?: string, opacity?: number} {
    return {
        type: line.type,
        width: line.width,
        color: line.color,
        opacity: line.opacity / 100, // Convert 0-100 to 0-1
    };
}

/**
 * Convert ArrowConfig to graphty-element arrow format.
 * Converts opacity from 0-100 to 0-1.
 */
function convertArrowConfig(arrow: ArrowConfig): {type?: string, size?: number, color?: string, opacity?: number} | undefined {
    // Don't include arrow config if type is "none"
    if (arrow.type === "none") {
        return undefined;
    }

    return {
        type: arrow.type,
        size: arrow.size,
        color: arrow.color,
        opacity: arrow.opacity / 100, // Convert 0-100 to 0-1
    };
}

/**
 * Convert EdgeStyle to graphty-element edge style format.
 */
function convertEdgeStyle(edgeStyle: EdgeStyle): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    if (edgeStyle.line) {
        result.line = convertEdgeLineConfig(edgeStyle.line);
    }

    if (edgeStyle.arrowHead) {
        const converted = convertArrowConfig(edgeStyle.arrowHead);
        if (converted) {
            result.arrowHead = converted;
        }
    }

    if (edgeStyle.arrowTail) {
        const converted = convertArrowConfig(edgeStyle.arrowTail);
        if (converted) {
            result.arrowTail = converted;
        }
    }

    // Convert label if present and enabled
    if (edgeStyle.label) {
        const convertedLabel = convertRichTextStyle(edgeStyle.label);
        if (convertedLabel) {
            result.label = convertedLabel;
        }
    }

    // Convert tooltip if present and enabled
    if (edgeStyle.tooltip) {
        const convertedTooltip = convertRichTextStyle(edgeStyle.tooltip);
        if (convertedTooltip) {
            result.tooltip = convertedTooltip;
        }
    }

    return result;
}

/**
 * Convert NodeEffectsConfig to graphty-element effect format.
 */
function convertEffectsConfig(effects: NodeEffectsConfig): Record<string, unknown> | undefined {
    const result: Record<string, unknown> = {};

    // Add glow if enabled
    if (effects.glow?.enabled) {
        result.glow = {
            color: effects.glow.color,
            strength: effects.glow.strength,
        };
    }

    // Add outline if enabled
    if (effects.outline?.enabled) {
        result.outline = {
            color: effects.outline.color,
            width: effects.outline.width,
        };
    }

    // Add wireframe if true
    if (effects.wireframe) {
        result.wireframe = true;
    }

    // Add flatShaded if true
    if (effects.flatShaded) {
        result.flatShaded = true;
    }

    // Return undefined if no effects are set
    if (Object.keys(result).length === 0) {
        return undefined;
    }

    return result;
}

/**
 * Map UI attach position to graphty-element attach position.
 */
const ATTACH_POSITION_MAP: Record<string, string> = {
    above: "top",
    below: "bottom",
    left: "left",
    right: "right",
    center: "center",
};

/**
 * Convert RichTextStyle to graphty-element text format.
 * Returns undefined if the text style is not enabled.
 */
function convertRichTextStyle(textStyle: RichTextStyle): Record<string, unknown> | undefined {
    // Don't include if not enabled or no text
    if (!textStyle.enabled || !textStyle.text) {
        return undefined;
    }

    // Map attachPosition to location (where the label appears relative to the node)
    const location = ATTACH_POSITION_MAP[textStyle.position.attachPosition] ?? "top";

    const result: Record<string, unknown> = {
        enabled: true,
        text: textStyle.text,
        // Location determines where label appears relative to node
        location,
        // Font settings - flat properties
        font: textStyle.font.family,
        fontSize: textStyle.font.size,
        fontWeight: String(textStyle.font.weight),
        textColor: textStyle.font.color,
        // Position settings
        attachOffset: textStyle.position.offset,
        // Billboard mode: 7 = BILLBOARDMODE_ALL, 0 = none
        billboardMode: textStyle.position.billboard ? 7 : 0,
    };

    // Add background if enabled
    if (textStyle.background?.enabled) {
        result.backgroundColor = textStyle.background.color;
        result.backgroundPadding = textStyle.background.padding;
        result.cornerRadius = textStyle.background.borderRadius;
    }

    // Add outline effect if enabled
    if (textStyle.effects?.outline?.enabled) {
        result.textOutline = true;
        result.textOutlineColor = textStyle.effects.outline.color;
        result.textOutlineWidth = textStyle.effects.outline.width;
    }

    // Add shadow effect if enabled
    if (textStyle.effects?.shadow?.enabled) {
        result.textShadow = true;
        result.textShadowColor = textStyle.effects.shadow.color;
        result.textShadowBlur = textStyle.effects.shadow.blur;
    }

    // Add animation if not "none" - map our animation types to graphty-element types
    // graphty-element supports: "none", "pulse", "bounce", "shake", "glow", "fill"
    // We have: "none", "typewriter", "fade-in", "slide-in"
    // For now, map unsupported animations to "none"
    if (textStyle.animation && textStyle.animation.type !== "none") {
        // Our animation types don't directly map to graphty-element, skip for now
        result.animation = "none";
    }

    // Add advanced options if present
    if (textStyle.advanced) {
        result.resolution = textStyle.advanced.resolution;
        result.depthFadeEnabled = textStyle.advanced.depthFade;
    }

    return result;
}

interface GraphtyProps {
    layers: LayerItem[];
    layout2d?: boolean;
    dataSource?: string;
    dataSourceConfig?: Record<string, unknown>;
    replaceExisting?: boolean;
    layout?: string;
    layoutConfig?: Record<string, unknown>;
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
    {layers, layout2d = false, dataSource, dataSourceConfig, replaceExisting, layout = "d3", layoutConfig},
    ref,
): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphtyRef = useRef<GraphtyElementType>(null);
    const prevDataSourceRef = useRef<{dataSource?: string, dataSourceConfig?: Record<string, unknown>} | undefined>(undefined);

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

    // Handle data source changes from props
    useEffect(() => {
        if (!graphtyRef.current || !dataSource) {
            return;
        }

        // Check if data source actually changed
        const prev = prevDataSourceRef.current;
        if (prev !== undefined) {
            if (prev.dataSource === dataSource && JSON.stringify(prev.dataSourceConfig) === JSON.stringify(dataSourceConfig)) {
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

        prevDataSourceRef.current = {dataSource, dataSourceConfig};
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

    // Handle style layer changes
    useEffect(() => {
        if (graphtyRef.current) {
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
                            const {style} = layer.styleLayer.node;

                            // Convert shape if present
                            if (style.shape) {
                                nodeStyle.shape = convertShapeConfig(style.shape as ShapeConfig);
                            }

                            // Convert color to texture.color format if present
                            if (style.color && typeof style.color === "object" && "mode" in style.color) {
                                nodeStyle.texture = {
                                    color: convertColorConfig(style.color as ColorConfig),
                                };
                            } else if (style.texture && typeof style.texture === "object") {
                                // Legacy texture.color format - pass through
                                nodeStyle.texture = style.texture;
                            }

                            // Convert effects if present
                            if (style.effects && typeof style.effects === "object") {
                                const convertedEffects = convertEffectsConfig(style.effects as NodeEffectsConfig);
                                if (convertedEffects) {
                                    nodeStyle.effect = convertedEffects;
                                }
                            }

                            // Convert label if present and enabled
                            if (style.label && typeof style.label === "object") {
                                const convertedLabel = convertRichTextStyle(style.label as RichTextStyle);
                                if (convertedLabel) {
                                    nodeStyle.label = convertedLabel;
                                }
                            }

                            // Convert tooltip if present and enabled
                            if (style.tooltip && typeof style.tooltip === "object") {
                                const convertedTooltip = convertRichTextStyle(style.tooltip as RichTextStyle);
                                if (convertedTooltip) {
                                    nodeStyle.tooltip = convertedTooltip;
                                }
                            }

                            layerObj.node = {
                                selector: layer.styleLayer.node.selector || "",
                                style: nodeStyle,
                            };
                        }

                        // Convert edge style if present - check for undefined, not falsy
                        if (layer.styleLayer.edge !== undefined) {
                            const edgeStyle = layer.styleLayer.edge.style as EdgeStyle | undefined;
                            layerObj.edge = {
                                selector: layer.styleLayer.edge.selector || "",
                                style: edgeStyle ? convertEdgeStyle(edgeStyle) : {},
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
