declare module "ngraph.random" {
    /** A seeded generator; `nextDouble()` is uniform in [0, 1). */
    export interface RandomGenerator {
        next(maxValue: number): number;
        nextDouble(): number;
    }

    export interface RandomAPI {
        (seed?: number): RandomGenerator;
        random: (seed?: number) => RandomGenerator;
    }

    const random: RandomAPI;
    export default random;
}
