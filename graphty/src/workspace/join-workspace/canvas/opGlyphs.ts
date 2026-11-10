import { GLYPHS } from "../../glyphs";
import type { JoinOp } from "./ops";

/** Each join kind's glyph: on its tile, its pill and its tab. */
export const OP_GLYPHS: Readonly<Record<JoinOp, (typeof GLYPHS)[keyof typeof GLYPHS]>> = {
    values: GLYPHS.joinValues,
    edges: GLYPHS.joinEdges,
    link: GLYPHS.link,
    map: GLYPHS.joinMap,
    merge: GLYPHS.joinMerge,
    compare: GLYPHS.join,
    flag: GLYPHS.joinFlag,
    kind: GLYPHS.joinKind,
    split: GLYPHS.joinSplit,
};
