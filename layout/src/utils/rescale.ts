/**
 * Layout rescaling utilities
 */

import { PositionMap } from '../types';

/**
 * Returns scaled position array/dict to (-scale, scale) in all axes.
 * 
 * @param pos - Position dictionary or array
 * @param scale - Scale factor for positions
 * @param center - Coordinate pair around which to center the layout
 * @returns Rescaled positions dictionary
 */
export function rescaleLayout(
  pos: PositionMap | number[][],
  scale: number = 1,
  center: number[] = [0, 0]
): PositionMap | number[][] {
  // Check if pos is empty
  if (Array.isArray(pos)) {
    if (pos.length === 0) return [];
  } else {
    if (Object.keys(pos).length === 0) return {};
  }

  // Extract position values
  const posValues: number[][] = Array.isArray(pos) ? pos : Object.values(pos);
  const dim = posValues[0].length;

  // Calculate center of positions
  const posCenter = Array(dim).fill(0);
  for (const p of posValues) {
    for (let i = 0; i < dim; i++) {
      posCenter[i] += p[i] / posValues.length;
    }
  }

  // Center positions
  let centeredPos: PositionMap | number[][] = {};
  if (Array.isArray(pos)) {
    centeredPos = pos.map(p => p.map((val, i) => val - posCenter[i]));
  } else {
    for (const [node, p] of Object.entries(pos)) {
      (centeredPos as PositionMap)[node] = p.map((val, i) => val - posCenter[i]);
    }
  }

  // Find maximum distance from center
  let maxDistance = 0;
  const centeredValues = Array.isArray(centeredPos) ? centeredPos : Object.values(centeredPos);
  for (const p of centeredValues) {
    const distance = Math.sqrt(p.reduce((sum, val) => sum + val * val, 0));
    maxDistance = Math.max(maxDistance, distance);
  }

  // Rescale
  let scaledPos: PositionMap | number[][] = Array.isArray(pos) ? [] : {};

  if (maxDistance > 0) {
    const scaleFactor = scale / maxDistance;

    if (Array.isArray(pos)) {
      (scaledPos as number[][]) = (centeredPos as number[][]).map(p =>
        p.map((val, i) => val * scaleFactor + center[i])
      );
    } else {
      for (const [node, p] of Object.entries(centeredPos as PositionMap)) {
        (scaledPos as PositionMap)[node] = p.map((val, i) => val * scaleFactor + center[i]);
      }
    }
  } else {
    // All nodes at the same position
    if (Array.isArray(pos)) {
      (scaledPos as number[][]) = Array(pos.length).fill(0).map(() => [...center]);
    } else {
      for (const node of Object.keys(pos)) {
        (scaledPos as PositionMap)[node] = [...center];
      }
    }
  }

  return scaledPos;
}

/**
 * Return a dictionary of scaled positions centered at (0, 0).
 * 
 * @param pos - Dictionary of positions
 * @param scale - Scale factor for positions
 * @returns Dictionary of scaled positions
 */
export function rescaleLayoutDict(
  pos: PositionMap,
  scale: number = 1
): PositionMap {
  if (Object.keys(pos).length === 0) {
    return {};
  }

  // Extract positions as array
  const posArray = Object.values(pos);

  // Find center of positions
  const center: number[] = [];
  for (let d = 0; d < posArray[0].length; d++) {
    center[d] = posArray.reduce((sum, p) => sum + p[d], 0) / posArray.length;
  }

  // Center positions
  const centeredPos: PositionMap = {};
  for (const [node, p] of Object.entries(pos)) {
    centeredPos[node] = p.map((val, d) => val - center[d]);
  }

  // Find maximum distance from center
  let maxDist = 0;
  for (const p of Object.values(centeredPos)) {
    const dist = Math.sqrt(p.reduce((sum, val) => sum + val * val, 0));
    maxDist = Math.max(maxDist, dist);
  }

  // Scale positions
  const scaledPos: PositionMap = {};
  if (maxDist > 0) {
    for (const [node, p] of Object.entries(centeredPos)) {
      scaledPos[node] = p.map(val => val * scale / maxDist);
    }
  } else {
    // All points at the center
    for (const node of Object.keys(centeredPos)) {
      scaledPos[node] = Array(centeredPos[node].length).fill(0);
    }
  }

  return scaledPos;
}