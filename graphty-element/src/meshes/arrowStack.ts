import { EdgeArrowTypes } from "../config/EdgeStyle";

/** One cap of an end cap's `stack`: its type, and the side, size and width it has of its own. */
export interface ArrowStackPart {
    readonly type: string;
    readonly side?: "left" | "right";
    readonly size?: number;
    readonly width?: number;
}

/** The types a stacked cap may be: every cap type but none, and a picture, which has no picture of its own here. */
const STACKABLE: ReadonlySet<string> = new Set(EdgeArrowTypes.options.filter((t) => t !== "none" && t !== "image"));

const NUMBER = String.raw`(\d+(?:\.\d+)?|\.\d+)`;
const PART = new RegExp(String.raw`^([a-z-]+)(?::(left|right))?(?:\*${NUMBER})?(?:x${NUMBER})?$`);

/**
 * The caps an end cap's `stack` draws behind it, in order from it. A word that is not a cap type, or a size of 0, is
 * left out: a style never fails to draw.
 * @param stack - The `stack` value.
 * @returns The parts.
 */
export function parseArrowStack(stack: string | undefined): ArrowStackPart[] {
    if (stack === undefined) {
        return [];
    }

    return stack
        .trim()
        .split(/\s+/)
        .flatMap((word) => {
            const m = PART.exec(word);
            if (m === null || !STACKABLE.has(m[1])) {
                return [];
            }

            const [, type, side, size, width] = m;
            const part: ArrowStackPart = {
                type,
                ...(side === undefined ? {} : { side: side as "left" | "right" }),
                ...(size === undefined ? {} : { size: Number(size) }),
                ...(width === undefined ? {} : { width: Number(width) }),
            };
            return part.size === 0 ? [] : [part];
        });
}
