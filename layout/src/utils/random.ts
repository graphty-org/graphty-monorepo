/**
 * Random number generator for seed-based randomization
 * Maintains exact same functionality as original implementation
 */

/**
 * A deterministic random number generator based on a linear congruential generator (LCG) algorithm.
 * Provides consistent random sequences when initialized with the same seed.
 */
export class RandomNumberGenerator {
    private seed: number;
    private m: number;
    private a: number;
    private c: number;
    private _state: number;

    /**
     * Creates a new random number generator instance.
     * @param seed - Initial seed value for the generator. If not provided, uses a random seed.
     */
    constructor(seed?: number) {
        this.seed = seed || Math.floor(Math.random() * 1000000);
        this.m = 2 ** 35 - 31;
        this.a = 185852;
        this.c = 1;
        this._state = this.seed % this.m;
    }

    /**
     * Generates the next random number in the sequence.
     * @returns A random number between 0 and 1.
     */
    _next(): number {
        this._state = (this.a * this._state + this.c) % this.m;
        return this._state / this.m;
    }

    /**
     * Generates random numbers according to the specified shape.
     * @param shape - Determines the output format: null for single number, number for 1D array, array for multi-dimensional array.
     * @returns A random number, 1D array, or multi-dimensional array depending on the shape parameter.
     */
    rand(shape: number | number[] | null = null): number | number[] | number[][] {
        if (shape === null) {
            return this._next();
        }

        if (typeof shape === "number") {
            const result: number[] = [];
            for (let i = 0; i < shape; i++) {
                result.push(this._next());
            }
            return result;
        }

        if (shape.length === 1) {
            const result: number[] = [];
            for (let i = 0; i < shape[0]; i++) {
                result.push(this._next());
            }
            return result;
        }

        const result: any[] = [];
        for (let i = 0; i < shape[0]; i++) {
            result.push(this.rand(shape.slice(1)));
        }
        return result;
    }
}
