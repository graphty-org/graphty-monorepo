/**
 * Tests for NumPy-like utility functions
 */

import { describe, it, expect } from 'vitest';
import { np } from '../src/utils/numpy';

describe('NumPy Utils', () => {
  describe('zeros', () => {
    it('should create 1D array of zeros', () => {
      expect(np.zeros(3)).toEqual([0, 0, 0]);
      expect(np.zeros(0)).toEqual([]);
      expect(np.zeros(1)).toEqual([0]);
    });

    it('should create 1D array from single-element array shape', () => {
      expect(np.zeros([3])).toEqual([0, 0, 0]);
      expect(np.zeros([0])).toEqual([]);
    });

    it('should create 2D array of zeros', () => {
      expect(np.zeros([2, 3])).toEqual([[0, 0, 0], [0, 0, 0]]);
      expect(np.zeros([3, 2])).toEqual([[0, 0], [0, 0], [0, 0]]);
      expect(np.zeros([1, 1])).toEqual([[0]]);
    });

    it('should create 3D array of zeros', () => {
      const result = np.zeros([2, 2, 2]) as number[][][];
      expect(result).toEqual([
        [[0, 0], [0, 0]],
        [[0, 0], [0, 0]]
      ]);
    });
  });

  describe('ones', () => {
    it('should create 1D array of ones', () => {
      expect(np.ones(3)).toEqual([1, 1, 1]);
      expect(np.ones(0)).toEqual([]);
      expect(np.ones(1)).toEqual([1]);
    });

    it('should create 1D array from single-element array shape', () => {
      expect(np.ones([3])).toEqual([1, 1, 1]);
      expect(np.ones([0])).toEqual([]);
    });

    it('should create 2D array of ones', () => {
      expect(np.ones([2, 3])).toEqual([[1, 1, 1], [1, 1, 1]]);
      expect(np.ones([3, 2])).toEqual([[1, 1], [1, 1], [1, 1]]);
    });

    it('should create 3D array of ones', () => {
      const result = np.ones([2, 1, 2]) as number[][][];
      expect(result).toEqual([
        [[1, 1]],
        [[1, 1]]
      ]);
    });
  });

  describe('linspace', () => {
    it('should create linearly spaced array', () => {
      const result = np.linspace(0, 1, 5);
      expect(result).toHaveLength(5);
      expect(result[0]).toBe(0);
      expect(result[4]).toBe(1);
      expect(result[2]).toBeCloseTo(0.5);
    });

    it('should handle single point', () => {
      expect(np.linspace(5, 5, 1)).toEqual([5]);
    });

    it('should handle reverse range', () => {
      const result = np.linspace(10, 0, 3);
      expect(result).toEqual([10, 5, 0]);
    });

    it('should handle negative numbers', () => {
      const result = np.linspace(-1, 1, 3);
      expect(result).toEqual([-1, 0, 1]);
    });
  });

  describe('array', () => {
    it('should copy arrays', () => {
      const input = [1, 2, 3];
      const result = np.array(input);
      expect(result).toEqual(input);
      expect(result).not.toBe(input); // different reference
    });

    it('should wrap non-arrays', () => {
      expect(np.array(5)).toEqual([5]);
      expect(np.array('hello')).toEqual(['hello']);
      expect(np.array(null)).toEqual([null]);
    });

    it('should handle nested arrays', () => {
      const input = [[1, 2], [3, 4]];
      const result = np.array(input);
      expect(result).toEqual(input);
      expect(result).not.toBe(input);
    });
  });

  describe('repeat', () => {
    it('should repeat single values', () => {
      expect(np.repeat(5, 3)).toEqual([5, 5, 5]);
      expect(np.repeat('a', 2)).toEqual(['a', 'a']);
    });

    it('should repeat arrays', () => {
      expect(np.repeat([1, 2], 2)).toEqual([1, 2, 1, 2]);
      expect(np.repeat([1, 2, 3], 3)).toEqual([1, 2, 3, 1, 2, 3, 1, 2, 3]);
    });

    it('should handle zero repeats', () => {
      expect(np.repeat(5, 0)).toEqual([]);
      expect(np.repeat([1, 2], 0)).toEqual([]);
    });

    it('should handle single repeat', () => {
      expect(np.repeat([1, 2, 3], 1)).toEqual([1, 2, 3]);
    });
  });

  describe('mean', () => {
    it('should calculate mean of 1D array', () => {
      expect(np.mean([1, 2, 3, 4, 5])).toBe(3);
      expect(np.mean([2, 4, 6])).toBe(4);
      expect(np.mean([10])).toBe(10);
    });

    it('should calculate mean of 2D array (flatten)', () => {
      expect(np.mean([[1, 2], [3, 4]])).toBe(2.5);
      expect(np.mean([[1, 1], [1, 1]])).toBe(1);
    });

    it('should calculate mean along axis 0 (columns)', () => {
      const result = np.mean([[1, 2, 3], [4, 5, 6]], 0) as number[];
      expect(result).toEqual([2.5, 3.5, 4.5]);
    });

    it('should calculate mean along axis 1 (rows)', () => {
      const result = np.mean([[1, 2, 3], [4, 5, 6]], 1) as number[];
      expect(result).toEqual([2, 5]);
    });

    it('should handle empty arrays', () => {
      expect(np.mean([])).toBeNaN();
    });

    it('should handle nested empty arrays', () => {
      expect(np.mean([[], []])).toBeNaN();
    });
  });

  describe('add', () => {
    it('should add two numbers', () => {
      expect(np.add(5, 3)).toBe(8);
      expect(np.add(-2, 7)).toBe(5);
    });

    it('should add number to array', () => {
      expect(np.add(2, [1, 2, 3])).toEqual([3, 4, 5]);
      expect(np.add([1, 2, 3], 10)).toEqual([11, 12, 13]);
    });

    it('should add two arrays element-wise', () => {
      expect(np.add([1, 2, 3], [4, 5, 6])).toEqual([5, 7, 9]);
      expect(np.add([10, 20], [1, 2])).toEqual([11, 22]);
    });

    it('should handle negative numbers', () => {
      expect(np.add([-1, -2], [1, 2])).toEqual([0, 0]);
      expect(np.add(5, [-3, -7])).toEqual([2, -2]);
    });
  });

  describe('subtract', () => {
    it('should subtract two numbers', () => {
      expect(np.subtract(8, 3)).toBe(5);
      expect(np.subtract(-2, 7)).toBe(-9);
    });

    it('should subtract number from array', () => {
      expect(np.subtract(10, [1, 2, 3])).toEqual([9, 8, 7]);
      expect(np.subtract([5, 6, 7], 2)).toEqual([3, 4, 5]);
    });

    it('should subtract two arrays element-wise', () => {
      expect(np.subtract([5, 7, 9], [1, 2, 3])).toEqual([4, 5, 6]);
      expect(np.subtract([10, 20], [3, 5])).toEqual([7, 15]);
    });

    it('should handle negative results', () => {
      expect(np.subtract([1, 2], [5, 7])).toEqual([-4, -5]);
    });
  });

  describe('max', () => {
    it('should return single number as-is', () => {
      expect(np.max(42)).toBe(42);
      expect(np.max(-5)).toBe(-5);
    });

    it('should find max in 1D array', () => {
      expect(np.max([1, 5, 3, 9, 2])).toBe(9);
      expect(np.max([-10, -5, -20])).toBe(-5);
      expect(np.max([7])).toBe(7);
    });

    it('should find max in nested arrays', () => {
      expect(np.max([[1, 2], [3, 4]])).toBe(4);
      expect(np.max([[10, 5], [2, 8], [1, 12]])).toBe(12);
    });

    it('should handle deeply nested arrays', () => {
      expect(np.max([[[1, 2]], [[3, 4]]])).toBe(4);
    });
  });

  describe('min', () => {
    it('should return single number as-is', () => {
      expect(np.min(42)).toBe(42);
      expect(np.min(-5)).toBe(-5);
    });

    it('should find min in 1D array', () => {
      expect(np.min([1, 5, 3, 9, 2])).toBe(1);
      expect(np.min([-10, -5, -20])).toBe(-20);
      expect(np.min([7])).toBe(7);
    });

    it('should find min in nested arrays', () => {
      expect(np.min([[1, 2], [3, 4]])).toBe(1);
      expect(np.min([[10, 5], [2, 8], [1, 12]])).toBe(1);
    });

    it('should handle deeply nested arrays', () => {
      expect(np.min([[[1, 2]], [[3, 4]]])).toBe(1);
    });
  });

  describe('norm', () => {
    it('should calculate Euclidean norm', () => {
      expect(np.norm([3, 4])).toBe(5); // 3-4-5 triangle
      expect(np.norm([1, 0])).toBe(1);
      expect(np.norm([0, 0])).toBe(0);
    });

    it('should handle negative values', () => {
      expect(np.norm([-3, 4])).toBe(5);
      expect(np.norm([-3, -4])).toBe(5);
    });

    it('should handle single element', () => {
      expect(np.norm([5])).toBe(5);
      expect(np.norm([-7])).toBe(7);
    });

    it('should handle higher dimensions', () => {
      expect(np.norm([1, 2, 2])).toBeCloseTo(3); // sqrt(1 + 4 + 4) = 3
    });

    it('should handle empty array', () => {
      expect(np.norm([])).toBe(0);
    });
  });
});