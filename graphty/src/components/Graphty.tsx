// Import from local development path - will need to be updated when graphty-element is published
import "graphty-element";

import {useEffect, useRef} from "react";

export function Graphty(): React.JSX.Element {
    const graphtyRef = useRef<HTMLElement>(null);

    useEffect(() => {
        // Example data - replace with your actual data
        const nodeData = [
            {id: "1", label: "Node 1"},
            {id: "2", label: "Node 2"},
            {id: "3", label: "Node 3"},
        ];

        const edgeData = [
            {source: "1", target: "2"},
            {source: "2", target: "3"},
        ];

        if (graphtyRef.current) {
            graphtyRef.current.setAttribute("node-data", JSON.stringify(nodeData));
            graphtyRef.current.setAttribute("edge-data", JSON.stringify(edgeData));
        }
    }, []);

    return (
        <div className="graphty-container">
            <graphty-element
                ref={graphtyRef}
                layout="d3"
                style={{width: "100%", height: "600px"}}
            />
        </div>
    );
}
