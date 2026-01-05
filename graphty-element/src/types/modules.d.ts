/**
 * Module declarations for third-party packages without TypeScript types
 */

declare module "d3-force-3d" {
    export interface Node {
        x?: number;
        y?: number;
        z?: number;
        vx?: number;
        vy?: number;
        vz?: number;
        fx?: number | null;
        fy?: number | null;
        fz?: number | null;
        index?: number;
    }

    export interface Edge<NodeType = Node> {
        source: NodeType | string | number;
        target: NodeType | string | number;
        index?: number;
    }

    export type InputEdge = Edge;

    export interface ForceSimulation<NodeType = Node> {
        tick(iterations?: number): this;
        nodes(): NodeType[];
        nodes(nodes: NodeType[]): this;
        alpha(): number;
        alpha(alpha: number): this;
        alphaMin(): number;
        alphaMin(min: number): this;
        alphaDecay(): number;
        alphaDecay(decay: number): this;
        alphaTarget(): number;
        alphaTarget(target: number): this;
        velocityDecay(): number;
        velocityDecay(decay: number): this;
        force(name: string): unknown;
        force(name: string, force: null | ((alpha: number) => void)): this;
        numDimensions(): number;
        numDimensions(dims: number): this;
        on(typenames: string, listener: null | ((this: this) => void)): this;
        stop(): this;
        restart(): this;
    }

    export function forceSimulation<NodeType extends Node = Node>(
        nodes?: NodeType[],
    ): ForceSimulation<NodeType>;

    export interface ForceLink<NodeType = Node, EdgeType = Edge<NodeType>> {
        links(): EdgeType[];
        links(links: EdgeType[]): this;
        id(): (node: NodeType, index: number, nodes: NodeType[]) => string | number;
        id(id: (node: NodeType, index: number, nodes: NodeType[]) => string | number): this;
        distance(): number | ((link: EdgeType, index: number, links: EdgeType[]) => number);
        distance(distance: number | ((link: EdgeType, index: number, links: EdgeType[]) => number)): this;
        strength(): number | ((link: EdgeType, index: number, links: EdgeType[]) => number);
        strength(strength: number | ((link: EdgeType, index: number, links: EdgeType[]) => number)): this;
    }

    export function forceLink<NodeType extends Node = Node, EdgeType extends Edge<NodeType> = Edge<NodeType>>(
        links?: EdgeType[],
    ): ForceLink<NodeType, EdgeType>;

    export interface ForceManyBody<NodeType = Node> {
        strength(): number | ((node: NodeType, index: number, nodes: NodeType[]) => number);
        strength(strength: number | ((node: NodeType, index: number, nodes: NodeType[]) => number)): this;
        theta(): number;
        theta(theta: number): this;
        distanceMin(): number;
        distanceMin(distance: number): this;
        distanceMax(): number;
        distanceMax(distance: number): this;
    }

    export function forceManyBody<NodeType extends Node = Node>(): ForceManyBody<NodeType>;

    export interface ForceCenter {
        x(): number;
        x(x: number): this;
        y(): number;
        y(y: number): this;
        z(): number;
        z(z: number): this;
        strength(): number;
        strength(strength: number): this;
    }

    export function forceCenter(x?: number, y?: number, z?: number): ForceCenter;
}

declare module "ngraph.random" {
    interface RandomGenerator {
        next(max: number): number;
        nextDouble(): number;
    }

    function random(seed?: number): RandomGenerator;
    export = random;
}
