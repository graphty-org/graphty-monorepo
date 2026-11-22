import type { GraphSession, LegendBlock } from "@graphty/graphty-element/session";

import { keyNames, type KeySection, keySections } from "./legendWords";
import { modelName, pictureName } from "./models";

/**
 * The sections the card draws for the blocks, each named from the session: what the card shows,
 * so a read that gives the same sections draws nothing again.
 * @param session - the session.
 * @param blocks - the blocks, the stack bottom first.
 * @returns the sections, the winner first.
 */
export function legendSections(session: GraphSession, blocks: readonly LegendBlock[]): KeySection[] {
    return keySections(
        blocks.map((block) => withAssetNames(session, block)),
        keyNames(session),
    );
}

/**
 * A model's or a picture's rows named as the Style panel names
 * them ("police"), never by the element's asset id or the address a layer names, whose query may
 * hold a signed token.
 * @param session - the session.
 * @param block - one legend block.
 * @returns the block, its model and picture rows named.
 */
function withAssetNames(session: GraphSession, block: LegendBlock): LegendBlock {
    if (block.channel !== "node.model" && block.channel !== "node.texture") {
        return block;
    }
    const nameOf = block.channel === "node.model" ? modelName : pictureName;
    return {
        ...block,
        swatches: block.swatches.map((swatch) => {
            // What it paints is the ref itself, so it is not printed beside the name either.
            const { paints, ...rest } = swatch;
            const ref = typeof paints === "string" ? paints : swatch.value;
            return typeof ref === "string" ? { ...rest, name: swatch.name ?? nameOf(session, ref) } : swatch;
        }),
    };
}
