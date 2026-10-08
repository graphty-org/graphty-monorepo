/**
 * @file `jsx.ts`, the `@graphty/graphty-element/jsx` entry point, says what the custom elements
 * manifest says.
 *
 * `npm run build` writes `jsx.ts` from `dist/custom-elements.json` with
 * `scripts/generate-jsx-types.ts`, and the file is committed because the graphty app and the docs
 * read the package from source. So the two can disagree in exactly one way: the element changed,
 * the manifest changed with it, and nobody committed the regenerated `jsx.ts`. The first test
 * catches that. The second reads the manifest independently of the generator, so a generator that
 * quietly drops a property, an attribute or an event cannot pass by agreeing with itself.
 *
 * Both read the BUILT manifest: run `npm run build` first. CI's test shards get it from the build
 * job's artifacts.
 *
 * Whether the declaration compiles against the published `.d.ts`, applies after the opt-in and
 * does not apply without it is checked by `npm run typecheck:strict-consumer`
 * (`test/types/consumer/jsx-opt-in.tsx`, `test/types/no-jsx-opt-in/element-only.tsx`).
 */

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { generateJsxTypes, type Manifest } from "../../scripts/generate-jsx-types";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const MANIFEST = resolve(PACKAGE_ROOT, "dist/custom-elements.json");

/**
 * The built manifest.
 * @returns The parsed manifest.
 */
function builtManifest(): Manifest {
    assert.isTrue(existsSync(MANIFEST), "dist/custom-elements.json is missing: run `npm run build` first");

    return JSON.parse(readFileSync(MANIFEST, "utf8")) as Manifest;
}

describe("the ./jsx entry point", () => {
    it("is exactly what the build generates from the custom elements manifest", () => {
        assert.strictEqual(
            readFileSync(resolve(PACKAGE_ROOT, "jsx.ts"), "utf8"),
            generateJsxTypes(builtManifest()),
            "jsx.ts disagrees with dist/custom-elements.json: run `npm run build` and commit jsx.ts",
        );
    });

    it("names every writable property, every attribute and every event the manifest lists", () => {
        const source = readFileSync(resolve(PACKAGE_ROOT, "jsx.ts"), "utf8");
        const declaration = (builtManifest().modules ?? [])
            .flatMap((module) => module.declarations ?? [])
            .find((candidate) => candidate.tagName === "graphty-element");
        assert.isDefined(declaration);

        /** True when the generated interface declares this key. */
        const declares = (key: string): boolean =>
            source.includes(`\n    ${key}?:`) || source.includes(`\n    "${key}"?:`);

        const writable = (declaration?.members ?? []).filter(
            (member) => member.kind === "field" && member.static !== true && member.readonly !== true,
        );
        const attributes = declaration?.attributes ?? [];
        const events = declaration?.events ?? [];

        // Not vacuous: the element has dozens of each.
        assert.isAbove(writable.length, 20);
        assert.isAbove(attributes.length, 20);
        assert.isAbove(events.length, 20);

        assert.deepEqual(
            writable.filter((member) => !declares(member.name)).map((member) => member.name),
            [],
            "properties missing from jsx.ts",
        );
        assert.deepEqual(
            attributes.filter((attribute) => !declares(attribute.name)).map((attribute) => attribute.name),
            [],
            "attributes missing from jsx.ts",
        );
        assert.deepEqual(
            events.filter((event) => !declares(`on${event.name}`)).map((event) => event.name),
            [],
            "events missing from jsx.ts",
        );
    });

    it("lists only events the element dispatches", () => {
        const events = new Set(
            (builtManifest().modules ?? [])
                .flatMap((module) => module.declarations ?? [])
                .flatMap((declaration) => declaration.events ?? [])
                .map((event) => event.name),
        );

        // Node events reach the DOM under their graphty- names; the internal snapshot events and
        // the edge events never reach it; and "name" was the analyzer reading a variable.
        for (const name of ["graphty-node-click", "graphty-label-change", "graph-settled", "ai-status-change"]) {
            assert.isTrue(events.has(name), name);
        }
        for (const name of ["node-click", "snapshot-replaced", "edge-add-before", "name"]) {
            assert.isFalse(events.has(name), name);
        }
    });
});
