import {describe, expect, it} from "vitest";

import {render, screen} from "../../../../test/test-utils";
import type {GraphInfo} from "../../../../types/selection";
import {GraphPropertiesPanel} from "../GraphPropertiesPanel";

describe("GraphPropertiesPanel", () => {
    const mockGraphInfo: GraphInfo = {
        nodeCount: 100,
        edgeCount: 250,
        density: 0.0505,
        dataSources: [
            {name: "graph.json", type: "json"},
            {name: "edges.csv", type: "csv"},
        ],
        graphType: {
            directed: true,
            weighted: false,
            selfLoops: false,
        },
    };

    it("displays node count", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByText("Nodes")).toBeInTheDocument();
        expect(screen.getByText("100")).toBeInTheDocument();
    });

    it("displays edge count", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByText("Edges")).toBeInTheDocument();
        expect(screen.getByText("250")).toBeInTheDocument();
    });

    it("displays density formatted to 4 decimals", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByText("Density")).toBeInTheDocument();
        expect(screen.getByText("0.0505")).toBeInTheDocument();
    });

    it("shows data source list", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByText("Data Sources")).toBeInTheDocument();
        expect(screen.getByText("graph.json")).toBeInTheDocument();
        expect(screen.getByText("edges.csv")).toBeInTheDocument();
    });

    it("shows 'No data loaded' when dataSources is empty", () => {
        const emptyInfo = {... mockGraphInfo, dataSources: []};
        render(<GraphPropertiesPanel graphInfo={emptyInfo} />);

        expect(screen.getByText("No data loaded")).toBeInTheDocument();
    });

    it("shows statistics section header", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByText("Statistics")).toBeInTheDocument();
    });
});
