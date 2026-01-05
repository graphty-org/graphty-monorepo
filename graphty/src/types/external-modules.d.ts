/**
 * Module declarations for third-party packages without TypeScript types
 * Used by dependent packages imported via path aliases
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
declare module "d3-force-3d" {
    // Use any for complex d3-force-3d types to avoid type conflicts
    // The graphty-element package handles its own type assertions
    export const forceSimulation: any;
    export const forceLink: any;
    export const forceManyBody: any;
    export const forceCenter: any;
    export type Node = any;
    export type Edge<_T = any> = any;
    export type InputEdge = any;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

declare module "ngraph.random" {
    interface RandomGenerator {
        next(max: number): number;
        nextDouble(): number;
    }

    function random(seed?: number): RandomGenerator;
    export = random;
}
