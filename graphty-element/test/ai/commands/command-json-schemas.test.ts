/**
 * The JSON Schema every AI command's parameters convert to, through graphty's own conversion
 * (what the provider-API engine and WebLlmProvider hand the model). The committed file was written
 * by the AI SDK 5's `asSchema` and the conversion reproduced it exactly before the SDK was removed,
 * so a change to it is a change in what the model is told, and fails here first. Keys are sorted,
 * so only content counts.
 * @module test/ai/commands/command-json-schemas.test
 */

import { describe, expect, it } from "vitest";

import * as AlgorithmCommands from "../../../src/ai/commands/AlgorithmCommands";
import * as CameraCommands from "../../../src/ai/commands/CameraCommands";
import * as CaptureCommands from "../../../src/ai/commands/CaptureCommands";
import * as LayoutCommands from "../../../src/ai/commands/LayoutCommands";
import * as ModeCommands from "../../../src/ai/commands/ModeCommands";
import * as QueryCommands from "../../../src/ai/commands/QueryCommands";
import * as SchemaCommands from "../../../src/ai/commands/SchemaCommands";
import * as StyleCommands from "../../../src/ai/commands/StyleCommands";
import type { GraphCommand } from "../../../src/ai/commands/types";
import { toolJsonSchema } from "../../../src/ai/engine/jsonSchema";

const modules = [
    AlgorithmCommands,
    CameraCommands,
    CaptureCommands,
    LayoutCommands,
    ModeCommands,
    QueryCommands,
    SchemaCommands,
    StyleCommands,
];

/**
 * A copy of a JSON value with every object's keys in sorted order.
 * @param value - The JSON value to copy
 * @returns The sorted copy
 */
function sortKeys(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(sortKeys);
    }
    if (typeof value === "object" && value !== null) {
        return Object.fromEntries(
            Object.entries(value)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([k, v]) => [k, sortKeys(v)]),
        );
    }
    return value;
}

const commands = modules
    .flatMap((m) => Object.values(m))
    .filter((v): v is GraphCommand => typeof v === "object" && v !== null && "parameters" in v && "name" in v)
    .sort((a, b) => a.name.localeCompare(b.name));

describe("AI command JSON Schemas", () => {
    it("match the committed schemas", async () => {
        const schemas = Object.fromEntries(commands.map((c) => [c.name, sortKeys(toolJsonSchema(c.parameters))]));

        expect(commands.length).toBeGreaterThan(10);
        await expect(`${JSON.stringify(schemas, null, 4)}\n`).toMatchFileSnapshot(
            "./__snapshots__/command-json-schemas.json",
        );
    });
});
