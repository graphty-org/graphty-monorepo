import {Box} from "@mantine/core";
import {useEffect, useRef} from "react";

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
