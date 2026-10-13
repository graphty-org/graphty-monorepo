/**
 * Commands Module - Command infrastructure for AI-powered graph control.
 * @module ai/commands
 */

// Registry
export { CommandRegistry } from "./CommandRegistry";

/* eslint-disable @typescript-eslint/no-deprecated -- still published until the next major release for consumers that register the hand-written commands themselves */
// Query Commands
export { findNodes, queryGraph } from "./QueryCommands";

// Layout Commands
export { setDimension, setLayout } from "./LayoutCommands";

// Mode Commands
export { setImmersiveMode } from "./ModeCommands";

// Style Commands
export { clearStyles, findAndStyleEdges, findAndStyleNodes } from "./StyleCommands";

// Camera Commands
export { setCameraPosition, zoomToNodes } from "./CameraCommands";

// Algorithm Commands
export { listAlgorithms, runAlgorithm } from "./AlgorithmCommands";

// Capture Commands
export { captureScreenshot, captureVideo } from "./CaptureCommands";

// Schema Commands
export { describeProperty, sampleData } from "./SchemaCommands";
/* eslint-enable @typescript-eslint/no-deprecated */
