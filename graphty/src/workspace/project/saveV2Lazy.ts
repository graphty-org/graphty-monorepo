/**
 * Everything the workspace loads on demand for version 2 save files (the "save-files-v2"
 * experiment): the dialogs, the open question and the report. One module, imported only with
 * `import()`, so the bundler makes one lazy chunk and the landing page carries none of it.
 */

export { SaveFilesV2Dialogs } from "./SaveFilesV2Dialogs";
export { askOpenV2, showReport } from "./saveV2";
