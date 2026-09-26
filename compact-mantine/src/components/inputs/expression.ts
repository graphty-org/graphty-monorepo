/**
 * Arithmetic in a number field (design/figma-spec.md 6.1): `40*2` commits 80, `1800/2` commits
 * 900. Plus, minus, times, divide, unary signs and parentheses; no `eval`.
 */

const OPERATORS = new Set(["+", "-", "*", "/", "(", ")"]);

/**
 * Evaluate what was typed into a number field.
 *
 * Every run of characters between operators is read by `parseNumber`, so a locale's own decimal
 * separator and digits work inside an expression (`1,5*2` is 3 in German).
 * @param text - what the field holds
 * @param parseNumber - reads one number, `NaN` when the text is not one (the locale parser)
 * @returns the value, or null when the text is not a finite expression (`abc`, `1+`, `10/0`)
 */
export function evaluateExpression(text: string, parseNumber: (text: string) => number = Number): number | null {
    const tokens: string[] = [];
    let run = "";
    for (const ch of text) {
        if (OPERATORS.has(ch) || /\s/.test(ch)) {
            if (run) {
                tokens.push(run);
                run = "";
            }
            if (OPERATORS.has(ch)) {
                tokens.push(ch);
            }
        } else {
            run += ch;
        }
    }
    if (run) {
        tokens.push(run);
    }
    if (tokens.length === 0) {
        return null;
    }

    let i = 0;
    const fail = (): never => {
        throw new SyntaxError("not an expression");
    };
    const factor = (): number => {
        const t = tokens[i++];
        if (t === "+" || t === "-") {
            const v = factor();
            return t === "-" ? -v : v;
        }
        if (t === "(") {
            const v = sum();
            if (tokens[i++] !== ")") {
                fail();
            }
            return v;
        }
        if (t === undefined || OPERATORS.has(t)) {
            return fail();
        }
        const v = parseNumber(t);
        return Number.isNaN(v) ? fail() : v;
    };
    const product = (): number => {
        let v = factor();
        while (tokens[i] === "*" || tokens[i] === "/") {
            v = tokens[i++] === "*" ? v * factor() : v / factor();
        }
        return v;
    };
    const sum = (): number => {
        let v = product();
        while (tokens[i] === "+" || tokens[i] === "-") {
            v = tokens[i++] === "+" ? v + product() : v - product();
        }
        return v;
    };

    try {
        const value = sum();
        return i === tokens.length && Number.isFinite(value) ? value : null;
    } catch {
        return null;
    }
}

/**
 * Round away floating-point noise (`0.1 + 0.2`) without changing a real value.
 * @param value - a computed number
 * @returns the value to 10 decimal places
 */
export function tidy(value: number): number {
    return Math.round(value * 1e10) / 1e10;
}

/**
 * Pull a value into `min..max`.
 * @param value - the value
 * @param min - the lower bound, when there is one
 * @param max - the upper bound, when there is one
 * @returns the clamped value
 */
export function clamp(value: number, min?: number, max?: number): number {
    let v = value;
    if (min !== undefined && v < min) {
        v = min;
    }
    if (max !== undefined && v > max) {
        v = max;
    }
    return v;
}
