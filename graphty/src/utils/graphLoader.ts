import {GraphData} from "../hooks/useGraphtyData";

export async function loadGraphFromJSON(url: string): Promise<GraphData> {
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Failed to load graph data: ${response.statusText}`);
    }

    const data = await response.json();
    return validateGraphData(data);
}

export function validateGraphData(data: unknown): GraphData {
    if (!isValidGraphData(data)) {
        throw new Error("Invalid graph data format");
    }

    return data;
}

function isValidGraphData(data: unknown): data is GraphData {
    if (!data || typeof data !== "object") {
        return false;
    }

    const graphData = data as Record<string, unknown>;

    if (!Array.isArray(graphData.nodes) || !Array.isArray(graphData.edges)) {
        return false;
    }

    // Validate nodes
    for (const node of graphData.nodes) {
        if (!node || typeof node !== "object" || !("id" in node)) {
            return false;
        }
    }

    // Validate edges
    for (const edge of graphData.edges) {
        if (
            !edge ||
            typeof edge !== "object" ||
            !("source" in edge) ||
            !("target" in edge)
        ) {
            return false;
        }
    }

    return true;
}

export function exportGraphData(data: GraphData): string {
    return JSON.stringify(data, null, 2);
}

export function downloadGraphData(data: GraphData, filename = "graph.json"): void {
    const jsonString = exportGraphData(data);
    const blob = new Blob([jsonString], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}
