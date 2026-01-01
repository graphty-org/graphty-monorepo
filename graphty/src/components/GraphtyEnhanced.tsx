import "@graphty/graphty-element";

import { useEffect, useRef } from "react";

import { GraphData, useGraphtyData } from "../hooks/useGraphtyData";

interface NodeClickDetail {
    id: string;
}

interface EdgeClickDetail {
    source: string;
    target: string;
}

interface GraphtyEnhancedProps {
    initialData?: GraphData;
    layout?: string;
    layout2d?: boolean;
    height?: string;
    onNodeClick?: (nodeId: string) => void;
    onEdgeClick?: (source: string, target: string) => void;
}

/**
 * Enhanced Graphty component that wraps the graphty-element with React hooks for data management.
 * @param root0 - Component props
 * @param root0.initialData - Initial graph data containing nodes and edges
 * @param root0.layout - Layout algorithm to use (defaults to "d3")
 * @param root0.layout2d - Whether to use 2D layout mode
 * @param root0.height - Height of the graph container
 * @param root0.onNodeClick - Callback when a node is clicked
 * @param root0.onEdgeClick - Callback when an edge is clicked
 * @returns The GraphtyEnhanced component
 */
export function GraphtyEnhanced({
    initialData,
    layout = "d3",
    layout2d = false,
    height = "600px",
    onNodeClick,
    onEdgeClick,
}: GraphtyEnhancedProps): React.JSX.Element {
    const graphtyRef = useRef<HTMLElement>(null);
    const { data } = useGraphtyData(initialData);

    useEffect(() => {
        if (graphtyRef.current && data.nodes.length > 0) {
            graphtyRef.current.setAttribute("node-data", JSON.stringify(data.nodes));
            graphtyRef.current.setAttribute("edge-data", JSON.stringify(data.edges));
        }
    }, [data]);

    useEffect(() => {
        const element = graphtyRef.current;

        if (!element) {
            return undefined;
        }

        const handleNodeClick = (event: Event): void => {
            const customEvent = event as CustomEvent<NodeClickDetail>;

            if (onNodeClick) {
                onNodeClick(customEvent.detail.id);
            }
        };

        const handleEdgeClick = (event: Event): void => {
            const customEvent = event as CustomEvent<EdgeClickDetail>;

            if (onEdgeClick) {
                onEdgeClick(customEvent.detail.source, customEvent.detail.target);
            }
        };

        element.addEventListener("nodeClick", handleNodeClick);
        element.addEventListener("edgeClick", handleEdgeClick);

        return () => {
            element.removeEventListener("nodeClick", handleNodeClick);
            element.removeEventListener("edgeClick", handleEdgeClick);
        };
    }, [onNodeClick, onEdgeClick]);

    return (
        <div className="graphty-container">
            <graphty-element ref={graphtyRef} layout={layout} layout2d={layout2d} style={{ width: "100%", height }} />
        </div>
    );
}
