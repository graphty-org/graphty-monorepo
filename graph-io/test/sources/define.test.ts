/**
 * defineSource and registration: the id form, exactly one read method, declared features, and
 * duplicate ids.
 */

import { describe, expect, it } from "vitest";

import { createRegistry, defineSource, type GraphSource } from "../../src/index.js";
import { rejection } from "./helpers.js";

const ok = { id: "ok", records: () => Promise.resolve({}) };

/**
 * The E_SOURCE_INVALID params of a definition that throws.
 * @param define - the definition
 * @returns the params
 */
async function invalid(define: () => unknown): Promise<unknown> {
    const err = await rejection(Promise.resolve().then(define));
    expect(err.issue?.code).toBe("E_SOURCE_INVALID");
    return err.issue?.params;
}

describe("defineSource", () => {
    it("returns the source unchanged", () => {
        expect(defineSource(ok)).toBe(ok);
    });

    it("refuses an id that is not lowercase letters, digits and dashes", async () => {
        for (const id of ["", "Upper", "a_b", "-a", "a--b", "a b"]) {
            expect(await invalid(() => defineSource({ ...ok, id }))).toEqual({ id, reason: "id" });
        }
        expect(defineSource({ ...ok, id: "a-1" }).id).toBe("a-1");
    });

    it("refuses no read method or more than one", async () => {
        expect(await invalid(() => defineSource({ id: "none" } as unknown as GraphSource))).toEqual({
            id: "none",
            reason: "read-methods",
        });
        const two = { id: "two", records: () => Promise.resolve({}), file: () => Promise.resolve({ body: "" }) };
        expect(await invalid(() => defineSource(two as unknown as GraphSource))).toEqual({
            id: "two",
            reason: "read-methods",
        });
    });

    it("refuses a declared feature without its method", async () => {
        const source = { ...ok, descriptor: { plainName: "x", params: [], features: ["expand"] } };
        expect(await invalid(() => defineSource(source))).toEqual({ id: "ok", reason: "features" });
        // "page" is declared, not a method
        expect(defineSource({ ...ok, descriptor: { plainName: "x", params: [], features: ["page"] } })).toBeDefined();
    });

    it("refuses a duplicate id in one registry", async () => {
        const formats = createRegistry();
        formats.registerSource(ok);
        expect(await invalid(() => formats.registerSource(ok))).toEqual({ id: "ok", reason: "duplicate" });
        expect(await invalid(() => formats.registerSource({ ...ok, id: "ndex" }))).toEqual({
            id: "ndex",
            reason: "duplicate",
        });
    });

    it("keeps source ids apart from format names", () => {
        const formats = createRegistry();
        expect(formats.hasSource("neo4j")).toBe(true);
        expect(formats.hasImporter("neo4j")).toBe(true);
    });
});
