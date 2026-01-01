/**
 * NumPy-like array manipulation functions
 * Maintains exact same functionality as original implementation
 */

export const np = {
    zeros: function (shape: number | number[]): number | number[] | number[][] | any[] {
        if (typeof shape === "number") {
            return Array(shape).fill(0);
        }
        if (shape.length === 1) {
            return Array(shape[0]).fill(0);
        }
        return Array(shape[0])
            .fill(0)
            .map(() => this.zeros(shape.slice(1)));
    },

    ones: function (shape: number | number[]): number | any[] {
        if (typeof shape === "number") {
            return Array(shape).fill(1);
        }
        if (shape.length === 1) {
            return Array(shape[0]).fill(1);
        }
        return Array(shape[0])
            .fill(1)
            .map(() => this.ones(shape.slice(1)));
    },

    linspace: function (start: number, stop: number, num: number): number[] {
        if (num === 1) {
            return [start];
        }
        const step = (stop - start) / (num - 1);
        return Array.from({ length: num }, (_, i) => start + i * step);
    },

    array: function (arr: any): any[] {
        return Array.isArray(arr) ? [...arr] : [arr];
    },

    repeat: function (a: any, repeats: number): any[] {
        const result: any[] = [];
        for (let i = 0; i < repeats; i++) {
            result.push(...np.array(a));
        }
        return result;
    },

    mean: function (arr: number[] | number[][], axis: number | null = null): number | number[] {
        if (axis === null) {
            const flatArr = Array.isArray(arr[0])
                ? ((arr as number[][]).flat(Infinity) as number[])
                : (arr as number[]);
            const sum = flatArr.reduce((a, b) => a + b, 0);
            return sum / flatArr.length;
        }

        if (axis === 0) {
            const result: number[] = [];
            const matrix = arr as number[][];
            for (let i = 0; i < matrix[0].length; i++) {
                let sum = 0;
                for (let j = 0; j < matrix.length; j++) {
                    sum += matrix[j][i];
                }
                result.push(sum / matrix.length);
            }
            return result;
        }

        return (arr as number[][]).map((row) => np.mean(row) as number);
    },

    add: function (a: number | number[], b: number | number[]): number | number[] {
        if (!Array.isArray(a) && !Array.isArray(b)) {
            return a + b;
        }
        if (!Array.isArray(a)) {
            return (b as number[]).map((val) => a + val);
        }
        if (!Array.isArray(b)) {
            return (a).map((val) => val + b);
        }
        return (a).map((val, i) => val + (b)[i]);
    },

    subtract: function (a: number | number[], b: number | number[]): number | number[] {
        if (!Array.isArray(a) && !Array.isArray(b)) {
            return a - b;
        }
        if (!Array.isArray(a)) {
            return (b as number[]).map((val) => a - val);
        }
        if (!Array.isArray(b)) {
            return (a).map((val) => val - b);
        }
        return (a).map((val, i) => val - (b)[i]);
    },

    max: function (arr: number | number[]): number {
        if (!Array.isArray(arr)) {return arr;}
        return Math.max(...((arr).flat(Infinity)));
    },

    min: function (arr: number | number[]): number {
        if (!Array.isArray(arr)) {return arr;}
        return Math.min(...((arr).flat(Infinity)));
    },

    norm: function (arr: number[]): number {
        return Math.sqrt(arr.reduce((sum, val) => sum + val * val, 0));
    },
};
