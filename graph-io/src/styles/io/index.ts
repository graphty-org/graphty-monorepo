/**
 * Reading and writing styles through the importer and exporter contracts: the `graphty.styles` block, the generic
 * reader of style roles, and what an exporter receives when styles are written.
 */

export {
    blockStyles,
    MAX_STYLE_BLOCK_LENGTH,
    type ParsedStyleBlock,
    parseStyleBlock,
    STYLE_BLOCK_NAME,
    type StyleBlock,
    styleTag,
    writeStyleBlock,
    type WriteStyleBlockOptions,
} from "./block.js";
export { extractStyles, type ExtractStylesOptions, type StyleImportOptions } from "./generic.js";
export { type ExporterStyleInput, type ExporterStyleOptions } from "./writer.js";
