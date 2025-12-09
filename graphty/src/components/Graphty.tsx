import {Box} from "@mantine/core";
import {useEffect, useRef} from "react";

import type {ColorConfig, ShapeConfig} from "../types/style-layer";
import type {LayerItem} from "./layout/LeftSidebar";

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

interface GraphtyProps {
    layers: LayerItem[];
    layout2d?: boolean;
    dataSource?: string;
    dataSourceConfig?: Record<string, unknown>;
    replaceExisting?: boolean;
}

declare module "react" {
    interface IntrinsicElements {
        "graphty-element": React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    }
}

export function Graphty({layers, layout2d = false, dataSource, dataSourceConfig, replaceExisting}: GraphtyProps): React.JSX.Element {
    const containerRef = useRef<HTMLDivElement>(null);
    const graphtyRef = useRef<GraphtyElementType>(null);

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

    // Handle external data source loading
    useEffect(() => {
        if (graphtyRef.current && dataSource && dataSourceConfig) {
            // Clear existing data if replaceExisting is true
            if (replaceExisting && graphtyRef.current.graph) {
                graphtyRef.current.graph.dataManager.clear();
            }

            // Set the data source properties
            graphtyRef.current.dataSource = dataSource;
            graphtyRef.current.dataSourceConfig = dataSourceConfig;
        }
    }, [dataSource, dataSourceConfig, replaceExisting]);

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
}
