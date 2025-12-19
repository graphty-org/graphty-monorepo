import {describe, expect, it, vi} from "vitest";

import {fireEvent, render, screen} from "../../../../test/test-utils";
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

    it("shows graph type controls", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByText("Graph Type")).toBeInTheDocument();
        expect(screen.getByRole("radio", {name: "Directed"})).toBeInTheDocument();
        expect(screen.getByRole("radio", {name: "Undirected"})).toBeInTheDocument();
        expect(screen.getByRole("checkbox", {name: "Weighted"})).toBeInTheDocument();
        expect(screen.getByRole("checkbox", {name: "Self-loops"})).toBeInTheDocument();
    });

    it("shows directed radio as checked when graph is directed", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByRole("radio", {name: "Directed"})).toBeChecked();
        expect(screen.getByRole("radio", {name: "Undirected"})).not.toBeChecked();
    });

    it("shows undirected radio as checked when graph is undirected", () => {
        const undirectedInfo = {
            ... mockGraphInfo,
            graphType: {... mockGraphInfo.graphType, directed: false},
        };
        render(<GraphPropertiesPanel graphInfo={undirectedInfo} />);

        expect(screen.getByRole("radio", {name: "Directed"})).not.toBeChecked();
        expect(screen.getByRole("radio", {name: "Undirected"})).toBeChecked();
    });

    it("shows checkboxes unchecked when weighted and selfLoops are false", () => {
        render(<GraphPropertiesPanel graphInfo={mockGraphInfo} />);

        expect(screen.getByRole("checkbox", {name: "Weighted"})).not.toBeChecked();
        expect(screen.getByRole("checkbox", {name: "Self-loops"})).not.toBeChecked();
    });

    it("shows checkboxes checked when weighted and selfLoops are true", () => {
        const infoWithOptions = {
            ... mockGraphInfo,
            graphType: {directed: true, weighted: true, selfLoops: true},
        };
        render(<GraphPropertiesPanel graphInfo={infoWithOptions} />);

        expect(screen.getByRole("checkbox", {name: "Weighted"})).toBeChecked();
        expect(screen.getByRole("checkbox", {name: "Self-loops"})).toBeChecked();
    });

    it("calls onGraphTypeChange when directed/undirected changes", () => {
        const onGraphTypeChange = vi.fn();
        render(
            <GraphPropertiesPanel
                graphInfo={mockGraphInfo}
                onGraphTypeChange={onGraphTypeChange}
            />,
        );

        fireEvent.click(screen.getByRole("radio", {name: "Undirected"}));

        expect(onGraphTypeChange).toHaveBeenCalledWith({
            directed: false,
            weighted: false,
            selfLoops: false,
        });
    });

    it("calls onGraphTypeChange when weighted checkbox changes", () => {
        const onGraphTypeChange = vi.fn();
        render(
            <GraphPropertiesPanel
                graphInfo={mockGraphInfo}
                onGraphTypeChange={onGraphTypeChange}
            />,
        );

        fireEvent.click(screen.getByRole("checkbox", {name: "Weighted"}));

        expect(onGraphTypeChange).toHaveBeenCalledWith({
            directed: true,
            weighted: true,
            selfLoops: false,
        });
    });

    it("calls onGraphTypeChange when self-loops checkbox changes", () => {
        const onGraphTypeChange = vi.fn();
        render(
            <GraphPropertiesPanel
                graphInfo={mockGraphInfo}
                onGraphTypeChange={onGraphTypeChange}
            />,
        );

        fireEvent.click(screen.getByRole("checkbox", {name: "Self-loops"}));

        expect(onGraphTypeChange).toHaveBeenCalledWith({
            directed: true,
            weighted: false,
            selfLoops: true,
        });
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
