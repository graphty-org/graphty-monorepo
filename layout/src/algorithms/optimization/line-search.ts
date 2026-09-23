/**
 * Line search optimization utilities
 */

/**
 * Backtracking line search to find step size
 * @param x - Current position
 * @param direction - Search direction
 * @param f - Function value at current position
 * @param grad - Gradient at current position
 * @param func - Function to evaluate cost
 * @param alpha0 - Initial step size
 * @returns A step size that satisfies the Armijo condition, or 0 when none was found -- the
 *   caller must not move, because every step tried made the cost worse
 */
export function _backtrackingLineSearch(
    x: number[],
    direction: number[],
    f: number,
    grad: number[],
    func: (x: number[]) => number,
    alpha0: number,
): number {
    const c1 = 1e-4;
    const shrink = 0.5;
    const initialSlope = grad.reduce((sum, g, i) => sum + g * direction[i], 0);

    if (initialSlope >= 0) {
        return 0; // Not a descent direction: no step along it lowers the cost
    }

    let alpha = alpha0;
    const maxIter = 20;

    for (let i = 0; i < maxIter; i++) {
        // Try step
        const newX = x.map((val, i) => val + alpha * direction[i]);
        const newF = func(newX);

        // Check sufficient decrease condition (Armijo condition)
        if (newF <= f + c1 * alpha * initialSlope) {
            return alpha;
        }

        // Reduce step size
        alpha *= shrink;
    }

    return 0;
}
