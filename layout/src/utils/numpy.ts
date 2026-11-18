/**
 * NumPy-like array helpers the layouts use
 */

export const np = {
    linspace: function (start: number, stop: number, num: number): number[] {
        if (num === 1) {
            return [start];
        }
        const step = (stop - start) / (num - 1);
        return Array.from({ length: num }, (_, i) => start + i * step);
    },
};
