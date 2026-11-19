/**
 * @file Everything projectFile.ts needs from the version 2 save-file code (the `save-files-v2`
 * experiment), in one module it imports on demand: one lazy chunk, so the bundler does not split
 * the modules it shares with the main entry into many small chunks.
 */

export { refetchSources } from "./codecs/dataFetch";
export { openDocument2, saveDocument2 } from "./document";
export { describeFile, describeSave, isWholeSave } from "./facts";
export { assertIJson, isJsonObject, isVersion2, parseDocument } from "./framing";
export { migrateDocument1 } from "./migration";
export { SECTION_CODECS } from "./registry";
