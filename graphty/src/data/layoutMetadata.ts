/**
 * Layout metadata definitions for all 16 available graph layout algorithms.
 * This file defines the structure and categorization of layouts used in the
 * Run Layouts modal.
 */

export interface LayoutMetadata {
    type: string;
    label: string;
    description: string;
    maxDimensions: 2 | 3;
    category: "force" | "geometric" | "hierarchical" | "special";
    /** Fields that require special input (like node selection) */
    requiredFields?: string[];
}

/**
 * Complete list of all 16 available layout algorithms with their metadata.
 * Categories:
 * - force: Force-directed layout algorithms
 * - geometric: Geometric/positional layouts
 * - hierarchical: Tree/hierarchy-based layouts
 * - special: Special-purpose layouts
 */
export const LAYOUT_METADATA: LayoutMetadata[] = [
    // Force-directed layouts
    {
        type: "d3",
        label: "D3 Force",
        description: "D3 force-directed simulation with customizable physics parameters",
        maxDimensions: 3,
        category: "force",
    },
    {
        type: "ngraph",
        label: "NGraph",
        description: "Fast force-directed layout optimized for large graphs",
        maxDimensions: 3,
        category: "force",
    },
    {
        type: "forceatlas2",
        label: "ForceAtlas2",
        description: "Gephi-style force-directed layout with gravity and repulsion",
        maxDimensions: 3,
        category: "force",
    },
    {
        type: "spring",
        label: "Spring",
        description: "Spring-embedded layout using Fruchterman-Reingold algorithm",
        maxDimensions: 3,
        category: "force",
    },
    {
        type: "kamada-kawai",
        label: "Kamada-Kawai",
        description: "Energy-minimizing layout based on graph-theoretic distances",
        maxDimensions: 3,
        category: "force",
    },
    {
        type: "arf",
        label: "ARF",
        description: "Attractive and Repulsive Forces layout algorithm",
        maxDimensions: 2,
        category: "force",
    },

    // Geometric layouts
    {
        type: "circular",
        label: "Circular",
        description: "Positions nodes in a circle or sphere",
        maxDimensions: 3,
        category: "geometric",
    },
    {
        type: "spiral",
        label: "Spiral",
        description: "Arranges nodes along a spiral pattern",
        maxDimensions: 2,
        category: "geometric",
    },
    {
        type: "shell",
        label: "Shell",
        description: "Positions nodes in concentric circles",
        maxDimensions: 2,
        category: "geometric",
    },
    {
        type: "random",
        label: "Random",
        description: "Randomly positions nodes in space",
        maxDimensions: 3,
        category: "geometric",
    },
    {
        type: "planar",
        label: "Planar",
        description: "Attempts to create a planar graph embedding",
        maxDimensions: 2,
        category: "geometric",
    },
    {
        type: "spectral",
        label: "Spectral",
        description: "Uses eigenvectors of the graph Laplacian for positioning",
        maxDimensions: 2,
        category: "geometric",
    },

    // Hierarchical layouts
    {
        type: "bfs",
        label: "BFS Tree",
        description: "Breadth-first search tree layout from a starting node",
        maxDimensions: 2,
        category: "hierarchical",
        requiredFields: ["start"],
    },
    {
        type: "bipartite",
        label: "Bipartite",
        description: "Two-column layout for bipartite graphs",
        maxDimensions: 2,
        category: "hierarchical",
        requiredFields: ["nodes"],
    },
    {
        type: "multipartite",
        label: "Multipartite",
        description: "Multi-column layout based on node subset keys",
        maxDimensions: 2,
        category: "hierarchical",
        requiredFields: ["subsetKey"],
    },

    // Special layouts
    {
        type: "fixed",
        label: "Fixed",
        description: "Uses pre-defined node positions from data",
        maxDimensions: 3,
        category: "special",
    },
];

/**
 * Get layout metadata by type
 */
export function getLayoutMetadata(type: string): LayoutMetadata | undefined {
    return LAYOUT_METADATA.find((layout) => layout.type === type);
}

/**
 * Get all layouts in a specific category
 */
export function getLayoutsByCategory(category: LayoutMetadata["category"]): LayoutMetadata[] {
    return LAYOUT_METADATA.filter((layout) => layout.category === category);
}

/**
 * Category labels for display
 */
export const CATEGORY_LABELS: Record<LayoutMetadata["category"], string> = {
    force: "Force-Directed",
    geometric: "Geometric",
    hierarchical: "Hierarchical",
    special: "Special",
};
