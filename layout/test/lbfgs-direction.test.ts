import { assert, describe, it } from "vitest";

import { _lbfgsDirection } from "../src/algorithms/optimization/lbfgs";

describe("the L-BFGS direction", () => {
    it("is the Newton step on a quadratic whose curvature the history captures exactly", () => {
        // f(x) = 0.5 x^T A x with A = diag(1, 10). One step along each axis gives y = A s, so the
        // two-loop recursion reproduces A^-1 and the direction for gradient g is -A^-1 g.
        const sList = [
            [1, 0],
            [0, 1],
        ];
        const yList = [
            [1, 0],
            [0, 10],
        ];

        const direction = _lbfgsDirection([1, 1], sList, yList, 10);

        assert.approximately(direction[0], -1, 1e-12);
        assert.approximately(direction[1], -0.1, 1e-12);
    });

    it("honours the secant equation of its newest pair, and points downhill", () => {
        // BFGS guarantees H y = s for the newest pair, so the direction for gradient y_k is -s_k.
        // A = [[4, 1], [1, 3]] with pairs taken along non-axis directions.
        const mul = (v: number[]): number[] => [4 * v[0] + v[1], v[0] + 3 * v[1]];
        const sList = [
            [1, 0.5],
            [-0.3, 1],
        ];
        const yList = sList.map(mul);

        const secant = _lbfgsDirection(yList[1], sList, yList, 10);
        assert.approximately(secant[0], -sList[1][0], 1e-12);
        assert.approximately(secant[1], -sList[1][1], 1e-12);

        const grad = [2, -1];
        const direction = _lbfgsDirection(grad, sList, yList, 10);
        assert.isBelow(direction[0] * grad[0] + direction[1] * grad[1], 0);
    });
});
