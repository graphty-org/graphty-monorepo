/**
 * @file The section codecs version 2 reads and writes, by section. Experimental (`save-files-v2`).
 */

import { dataCodec } from "./codecs/data";
import { notesCodec } from "./codecs/notes";
import { recipeCodec } from "./codecs/recipe";
import { resultsCodec } from "./codecs/results";
import { settingsCodec } from "./codecs/settings";
import { styleCodec } from "./codecs/style";
import { viewCodec } from "./codecs/view";
import type { CodecRegistry } from "./types";

/** Every section codec, by section. */
export const SECTION_CODECS: CodecRegistry = Object.freeze({
    data: dataCodec,
    style: styleCodec,
    recipe: recipeCodec,
    settings: settingsCodec,
    results: resultsCodec,
    notes: notesCodec,
    view: viewCodec,
});
