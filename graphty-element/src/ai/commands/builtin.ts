/**
 * The commands every assistant gets unless its configuration turns them off.
 * @module ai/commands/builtin
 */

import { listAlgorithms, runAlgorithm } from "./AlgorithmCommands";
import { setCameraPosition, zoomToNodes } from "./CameraCommands";
import { setDimension, setLayout } from "./LayoutCommands";
import { setImmersiveMode } from "./ModeCommands";
import { findNodes, getSchema, queryGraph } from "./QueryCommands";
import { describeProperty, sampleData } from "./SchemaCommands";
import { clearStyles, findAndStyleEdges, findAndStyleNodes } from "./StyleCommands";
import type { GraphCommand } from "./types";

/**
 * The built-in commands, in the order they are offered to the model. AiManager registers these,
 * and the LLM regression harness offers the model exactly this list, so the two cannot drift.
 */
export const BUILTIN_COMMANDS: readonly GraphCommand[] = [
    queryGraph,
    findNodes,
    getSchema,
    sampleData,
    describeProperty,
    listAlgorithms,
    runAlgorithm,
    setLayout,
    setDimension,
    setImmersiveMode,
    findAndStyleNodes,
    findAndStyleEdges,
    clearStyles,
    setCameraPosition,
    zoomToNodes,
];
