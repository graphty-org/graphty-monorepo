/**
 * Random number generator for seed-based randomization
 * Maintains exact same functionality as original implementation
 */

export class RandomNumberGenerator {
  private seed: number;
  private m: number;
  private a: number;
  private c: number;
  private _state: number;

  constructor(seed?: number) {
    this.seed = seed || Math.floor(Math.random() * 1000000);
    this.m = 2 ** 35 - 31;
    this.a = 185852;
    this.c = 1;
    this._state = this.seed % this.m;
  }

  _next(): number {
    this._state = (this.a * this._state + this.c) % this.m;
    return this._state / this.m;
  }

  rand(shape: number | number[] | null = null): number | number[] | number[][] {
    if (shape === null) {
      return this._next();
    }

    if (typeof shape === 'number') {
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