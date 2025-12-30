/**
 * Line search optimization utilities
 */

/**
 * Backtracking line search to find step size
 * 
 * @param x - Current position
 * @param direction - Search direction
 * @param f - Function value at current position
 * @param grad - Gradient at current position
 * @param func - Function to evaluate cost
 * @param alpha0 - Initial step size
 * @returns Optimal step size
 */
export function _backtrackingLineSearch(
  x: number[],
  direction: number[],
  f: number,
  grad: number[],
  func: (x: number[]) => number,
  alpha0: number
): number {
  const c1 = 1e-4;
  const c2 = 0.9;
  const initialSlope = grad.reduce((sum, g, i) => sum + g * direction[i], 0);

  if (initialSlope >= 0) {
    return 1e-8;  // Direction is not a descent direction
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
    alpha *= c2;
  }

  return alpha;  // Return last alpha even if not optimal
}