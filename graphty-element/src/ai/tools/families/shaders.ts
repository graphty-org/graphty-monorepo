/**
 * @file `shaders`: the project's shaders. Text a model writes is added as content, which the
 * session holds until the reader approves it, so nothing a model wrote runs on its say-so.
 */

import { z } from "zod";

import { text } from "../fields";
import type { ActionSpec, ToolDefinition } from "../types";
import { coded, list, ok } from "./common";

const id = z.string().max(200).describe("The shader's id, from list.");
const source = z.string().max(200_000).describe("The shader's text.");

/** The `shaders` tool. */
export const shadersTool: ToolDefinition = {
    name: "shaders",
    plainName: "Shaders",
    core: false,
    description:
        "The project's shaders: read, check, add, replace, remove. A shader you add waits for the reader's approval.",
    example: { action: "list" },
    actions: [
        {
            name: "list",
            summary: "the project's shaders and what each can do now",
            fields: {},
            effect: "read",
            reaches: [
                { door: "SessionShaders.list" },
                { door: "SessionShaders.status" },
                { door: "SessionShaders.availability" },
            ],
            run: ({ tx }) =>
                Promise.resolve(
                    ok(
                        list(
                            tx.shaders.list().map((shader) => ({
                                shader,
                                status: tx.shaders.status(shader.id),
                                availability: tx.shaders.availability(shader.id),
                            })),
                        ),
                    ),
                ),
        },
        {
            name: "get",
            summary: "one shader's text",
            fields: { id },
            effect: "read",
            reaches: [{ door: "SessionShaders.source" }],
            run: async ({ tx }, args) => ok(await coded(() => tx.shaders.source(text(args.id)))),
        },
        {
            name: "check",
            summary: "check text without adding it",
            fields: { text: source },
            effect: "read",
            reaches: [{ door: "SessionShaders.check" }],
            run: async ({ tx }, args) =>
                ok(await coded(() => tx.shaders.check(text(args.text), { source: "content" }))),
        },
        {
            name: "add",
            summary: "",
            fields: { text: source },
            effect: "write",
            reaches: [{ door: "SessionShaders.add" }, { op: "shader.set" }],
            run: async ({ tx }, args) => ok(await coded(() => tx.shaders.add(text(args.text), { source: "content" }))),
        },
        {
            name: "replace",
            summary: "new text for a shader, keeping its id",
            fields: { id, text: source },
            effect: "write",
            reaches: [{ door: "SessionShaders.replace" }, { op: "shader.set" }],
            run: async ({ tx }, args) => ok(await coded(() => tx.shaders.replace(text(args.id), text(args.text)))),
        },
        {
            name: "remove",
            summary: "",
            fields: { id },
            effect: "write",
            reaches: [{ door: "SessionShaders.remove" }, { op: "shader.set" }],
            run: async ({ tx }, args) => {
                await coded(() => tx.shaders.remove(text(args.id)));
                return ok(undefined, { id: text(args.id) });
            },
        },
    ] satisfies ActionSpec[],
};
