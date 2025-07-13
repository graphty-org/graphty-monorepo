// Import from local development path
import "../../graphty-element";

import {useEffect, useRef} from "react";

import {GraphData, useGraphtyData} from "../hooks/useGraphtyData";

interface GraphtyEnhancedProps {
    initialData?: GraphData;
    layout?: string;
    layout2d?: boolean;
    height?: string;
    onNodeClick?: (nodeId: string) => void;
    onEdgeClick?: (source: string, target: string) => void;
}

export function GraphtyEnhanced({
    initialData,
    layout = "d3",
    layout2d = false,
    height = "600px",
    onNodeClick,
    onEdgeClick,
}: GraphtyEnhancedProps): React.JSX.Element {
    const graphtyRef = useRef<HTMLElement>(null);
    const {data} = useGraphtyData(initialData);

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
            const customEvent = event as CustomEvent;

            if (customEvent.detail && onNodeClick) {
                onNodeClick(customEvent.detail.id);
            }
        };

        const handleEdgeClick = (event: Event): void => {
            const customEvent = event as CustomEvent;

            if (customEvent.detail && onEdgeClick) {
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
            <graphty-element
                ref={graphtyRef}
                layout={layout}
                layout2d={layout2d}
                style={{width: "100%", height}}
            />
        </div>
    );
}
