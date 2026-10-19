/**
 * A natural logarithm that returns the same bits on every JavaScript engine.
 *
 * ECMAScript leaves `Math.log` "implementation-approximated", so two engines may differ in the
 * last bit, and a geometric skip `floor(log(u) / log(1 - p))` that lands on an integer boundary
 * would then pick a different edge. `detLog` is graph-format's port of fdlibm's `__ieee754_log`,
 * shared by every graphty package that turns a seed into a result.
 */

export { detLog } from "@graphty/graph-format";
