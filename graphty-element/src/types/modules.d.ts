/**
 * Module declarations for third-party packages without TypeScript types
 */

declare module "d3-force-3d" {
    /** A node once the simulation has initialized it: every coordinate and velocity is set. */
    export interface Node {
        index: number;
        x: number;
        y: number;
        z: number;
        vx: number;
        vy: number;
        vz: number;
        fx?: number;
        fy?: number;
        fz?: number;
    }

    /** A link once the link force has resolved its endpoints to nodes. */
    export interface Edge {
        source: Node;
        target: Node;
        index: number;
    }

    /** A link as it is handed in: its endpoints are ids until the link force resolves them. */
    export interface InputEdge {
        source: unknown;
        target: unknown;
    }

    /** In d3 every force is a function the simulation calls with the current alpha on each tick. */
    export type Force = (alpha: number) => void;

    export interface ForceSimulation {
        tick(iterations?: number): this;
        nodes(): Node[];
        nodes(nodes: Partial<Node>[]): this;
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
        force(name: string): Force | undefined;
        force(name: string, force: Force | null): this;
        numDimensions(): number;
        numDimensions(dims: number): this;
        on(typenames: string, listener: null | ((this: this) => void)): this;
        stop(): this;
        restart(): this;
    }

    export function forceSimulation(nodes?: Partial<Node>[], numDimensions?: number): ForceSimulation;

    export interface ForceLink {
        (alpha: number): void;
        links(): Edge[];
        links(links: InputEdge[]): this;
        id(): (node: Node, index: number, nodes: Node[]) => string | number;
        id(id: (node: Node, index: number, nodes: Node[]) => string | number): this;
        distance(): number | ((link: Edge, index: number, links: Edge[]) => number);
        distance(distance: number | ((link: Edge, index: number, links: Edge[]) => number)): this;
        strength(): number | ((link: Edge, index: number, links: Edge[]) => number);
        strength(strength: number | ((link: Edge, index: number, links: Edge[]) => number)): this;
    }

    export function forceLink(links?: InputEdge[]): ForceLink;

    export interface ForceManyBody {
        (alpha: number): void;
        strength(): number | ((node: Node, index: number, nodes: Node[]) => number);
        strength(strength: number | ((node: Node, index: number, nodes: Node[]) => number)): this;
        theta(): number;
        theta(theta: number): this;
        distanceMin(): number;
        distanceMin(distance: number): this;
        distanceMax(): number;
        distanceMax(distance: number): this;
    }

    export function forceManyBody(): ForceManyBody;

    export interface ForceCenter {
        (alpha: number): void;
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
    /** A seeded generator; `nextDouble()` is uniform in [0, 1). */
    interface RandomGenerator {
        next(max: number): number;
        nextDouble(): number;
    }

    function random(seed?: number): RandomGenerator;
    export = random;
}
