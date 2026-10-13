/**
 * The power function the generators use, returning the same bits on every JavaScript engine.
 * `detExp` and `detLog` are graph-format's ports of fdlibm (e_exp.c, e_log.c), which use only
 * IEEE-754 double arithmetic that ECMAScript requires to be correctly rounded.
 */

import { detExp, detLog } from "@graphty/graph-format";

export { detExp };

/**
 * x^y as `detExp(y * detLog(x))` for x > 0: deterministic, not correctly rounded (the relative
 * error grows with |y ln x|, about 1e-13 for the magnitudes the generators use). 0^y is 0 for
 * y > 0.
 * @param x - the base, >= 0
 * @param y - the exponent
 * @returns x^y
 */
export function detPow(x: number, y: number): number {
    if (x === 0) {
        if (y === 0) {
            return 1;
        }
        return y > 0 ? 0 : Infinity;
    }
    return detExp(y * detLog(x));
}
