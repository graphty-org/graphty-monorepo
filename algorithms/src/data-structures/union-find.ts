import type { NodeId } from "../types/index.js";

/**
 * Union-Find (Disjoint Set) data structure with path compression and union by rank
 *
 * Efficiently supports dynamic connectivity queries and is essential for
 * algorithms like connected components and minimum spanning trees.
 */
export class UnionFind {
    private parent: Map<NodeId, NodeId>;
    private rank: Map<NodeId, number>;
    private componentCount: number;

    /**
     * Creates a new UnionFind data structure with the given elements.
     * @param elements - Array of elements to initialize the data structure with
     */
    constructor(elements: NodeId[]) {
        this.parent = new Map();
        this.rank = new Map();
        this.componentCount = elements.length;

        // Initialize each element as its own parent with rank 0
        for (const element of elements) {
            this.parent.set(element, element);
            this.rank.set(element, 0);
        }
    }

    /**
     * Find the root of the set containing the element with path compression
     * @param element - The element to find the root for
     * @returns The root element of the set containing the given element
     */
    find(element: NodeId): NodeId {
        const parent = this.parent.get(element);

        if (parent === undefined) {
            throw new Error(`Element ${String(element)} not found in UnionFind`);
        }

        // Path compression: make every node on the path point directly to the root
        if (parent !== element) {
            this.parent.set(element, this.find(parent));
        }

        const result = this.parent.get(element);
        if (result === undefined) {
            throw new Error(`Element ${String(element)} not found in UnionFind`);
        }

        return result;
    }

    /**
     * Union two sets using union by rank
     * @param elementA - The first element whose set should be merged
     * @param elementB - The second element whose set should be merged
     */
    union(elementA: NodeId, elementB: NodeId): void {
        const rootA = this.find(elementA);
        const rootB = this.find(elementB);

        // Already in the same set
        if (rootA === rootB) {
            return;
        }

        const rankA = this.rank.get(rootA);
        const rankB = this.rank.get(rootB);
        if (rankA === undefined || rankB === undefined) {
            throw new Error("Rank not found for root elements");
        }

        // Union by rank: attach smaller tree under root of larger tree
        if (rankA < rankB) {
            this.parent.set(rootA, rootB);
        } else if (rankA > rankB) {
            this.parent.set(rootB, rootA);
        } else {
            // Same rank: make one root and increment its rank
            this.parent.set(rootB, rootA);
            this.rank.set(rootA, rankA + 1);
        }

        this.componentCount--;
    }

    /**
     * Check if two elements are in the same connected component
     * @param elementA - The first element to check
     * @param elementB - The second element to check
     * @returns True if both elements are in the same component, false otherwise
     */
    connected(elementA: NodeId, elementB: NodeId): boolean {
        try {
            return this.find(elementA) === this.find(elementB);
        } catch {
            return false;
        }
    }

    /**
     * Get the number of connected components
     * @returns The current count of disjoint components
     */
    getComponentCount(): number {
        return this.componentCount;
    }

    /**
     * Get all elements that belong to the same component as the given element
     * @param element - The element whose component should be retrieved
     * @returns Array of all elements in the same component
     */
    getComponent(element: NodeId): NodeId[] {
        const root = this.find(element);
        const component: NodeId[] = [];

        for (const [node] of Array.from(this.parent)) {
            if (this.find(node) === root) {
                component.push(node);
            }
        }

        return component;
    }

    /**
     * Get all connected components as separate arrays
     * @returns Array of arrays, where each inner array contains elements of one component
     */
    getAllComponents(): NodeId[][] {
        const componentMap = new Map<NodeId, NodeId[]>();

        for (const [node] of Array.from(this.parent)) {
            const root = this.find(node);

            if (!componentMap.has(root)) {
                componentMap.set(root, []);
            }

            const component = componentMap.get(root);
            if (component) {
                component.push(node);
            }
        }

        return Array.from(componentMap.values());
    }

    /**
     * Get the size of the component containing the given element
     * @param element - The element whose component size should be retrieved
     * @returns The number of elements in the component containing the given element
     */
    getComponentSize(element: NodeId): number {
        return this.getComponent(element).length;
    }

    /**
     * Add a new element to the data structure
     * @param element - The element to add as a new singleton set
     */
    addElement(element: NodeId): void {
        if (this.parent.has(element)) {
            return; // Element already exists
        }

        this.parent.set(element, element);
        this.rank.set(element, 0);
        this.componentCount++;
    }

    /**
     * Check if an element exists in the data structure
     * @param element - The element to check for
     * @returns True if the element exists, false otherwise
     */
    hasElement(element: NodeId): boolean {
        return this.parent.has(element);
    }

    /**
     * Get the total number of elements
     * @returns The total count of all elements in the data structure
     */
    size(): number {
        return this.parent.size;
    }
}
