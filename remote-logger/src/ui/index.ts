/**
 * UI components for console capture and display.
 *
 * Usage:
 *   import { initConsoleCaptureUI } from "@graphty/remote-logger/ui";
 *   initConsoleCaptureUI();
 *
 * Or access programmatically:
 *   import { ConsoleCaptureUI } from "@graphty/remote-logger/ui";
 *   const ui = new ConsoleCaptureUI();
 *   console.log("This will be captured");
 *   console.log(ui.getLogs());
 */

export { ConsoleCaptureUI, initConsoleCaptureUI } from "./ConsoleCaptureUI.js";
