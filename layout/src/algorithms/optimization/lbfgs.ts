/**
 * L-BFGS optimization utilities
 */

/**
 * Compute the search direction using L-BFGS approximation
 * 
 * @param grad - Current gradient
 * @param sList - List of position differences (s_k)
 * @param yList - List of gradient differences (y_k)
 * @param m - Memory size
 * @returns Direction vector
 */
export function _lbfgsDirection(
  grad: number[],
  sList: number[][],
  yList: number[][],
  m: number
): number[] {
  if (sList.length === 0) {
    // First iteration - use negative gradient
    return grad.map(g => -g);
  }

  const q = grad.slice();
  const alpha = Array(sList.length).fill(0);
  const rho: number[] = [];

  // Compute rho values
  for (let i = 0; i < sList.length; i++) {
    const s = sList[i];
    const y = yList[i];
    rho.push(1 / y.reduce((sum, val, j) => sum + val * s[j], 0));
  }

  // Forward pass
  for (let i = sList.length - 1; i >= 0; i--) {
    const s = sList[i];
    alpha[i] = rho[i] * s.reduce((sum, val, j) => sum + val * q[j], 0);
    for (let j = 0; j < q.length; j++) {
      q[j] -= alpha[i] * yList[i][j];
    }
  }

  // Scale initial Hessian approximation
  let gamma = 1;
  if (sList.length > 0 && yList.length > 0) {
    const y = yList[yList.length - 1];
    const s = sList[sList.length - 1];
    gamma = s.reduce((sum, val, i) => sum + val * y[i], 0) /
      y.reduce((sum, val) => sum + val * val, 0);
  }

  // Initialize direction with scaled negative gradient
  const direction = q.map(val => -gamma * val);

  // Backward pass
  for (let i = 0; i < sList.length; i++) {
    const s = sList[i];
    const y = yList[i];
    const beta = rho[i] * y.reduce((sum, val, j) => sum + val * direction[j], 0);
    for (let j = 0; j < direction.length; j++) {
      direction[j] += s[j] * (alpha[i] - beta);
    }
  }

  return direction;
}