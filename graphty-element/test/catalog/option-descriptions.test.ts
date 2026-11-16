/**
 * @file No option descriptor in the catalog carries an English sentence without a coded form:
 * a `description` always comes with a `descriptionId` an application keys its own words on, and
 * the old `unsupportedReason` sentence is gone.
 */

import { assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import { CAMERA_DESCRIPTORS } from "../../src/catalog/cameras";
import { FORMAT_DESCRIPTORS } from "../../src/catalog/formats";
import { LAYOUT_CATALOG } from "../../src/catalog/layouts";
import { LOG_SINK_DESCRIPTORS } from "../../src/catalog/logSinks";
import { SCALE_DESCRIPTORS } from "../../src/catalog/scales";
import { catalogFormatDescriptors } from "../../src/catalog/writerRegistry";
import { transitionDescriptors } from "../../src/transitions/registry";

/** Every built-in catalog, by name. */
const CATALOGUES: Record<string, unknown> = {
    algorithms: BUILT_IN_ALGORITHMS,
    layouts: LAYOUT_CATALOG,
    cameras: CAMERA_DESCRIPTORS,
    formats: FORMAT_DESCRIPTORS,
    writers: catalogFormatDescriptors(),
    logSinks: LOG_SINK_DESCRIPTORS,
    scales: SCALE_DESCRIPTORS,
    transitions: transitionDescriptors(),
};

/** Every option descriptor reachable from the built-in catalogs, with where it was found. */
function allOptions(): { where: string; option: Record<string, unknown> }[] {
    const found: { where: string; option: Record<string, unknown> }[] = [];
    const seen = new Set<unknown>();
    const walk = (value: unknown, where: string): void => {
        if (typeof value !== "object" || value === null || seen.has(value)) {
            return;
        }

        seen.add(value);
        for (const [key, inner] of Object.entries(value)) {
            if (/options$/i.test(key) && Array.isArray(inner)) {
                for (const option of inner as unknown[]) {
                    if (typeof option === "object" && option !== null && "name" in option && "type" in option) {
                        found.push({
                            where: `${where}.${String(option.name)}`,
                            option,
                        });
                    }
                }
            }

            walk(inner, `${where}.${key}`);
        }
    };
    for (const [name, value] of Object.entries(CATALOGUES)) {
        walk(value, name);
    }

    return found;
}

describe("option descriptors carry no English sentences", () => {
    const options = allOptions();

    it("finds the catalogue's options", () => {
        assert.isAbove(options.length, 100);
    });

    it("pairs every description with a stable descriptionId", () => {
        const missing = options
            .filter(({ option }) => option.description !== undefined && typeof option.descriptionId !== "string")
            .map(({ where }) => where);
        assert.deepEqual(missing, []);
    });

    it("carries no unsupportedReason sentence", () => {
        const sentences = options.filter(({ option }) => "unsupportedReason" in option).map(({ where }) => where);
        assert.deepEqual(sentences, []);
    });
});

describe("catalogue descriptors carry a stable descriptionId beside their sentence", () => {
    const described: { where: string; descriptor: { description?: string; descriptionId?: string } }[] = [
        ...BUILT_IN_ALGORITHMS.map((descriptor) => ({ where: `algorithm ${descriptor.key}`, descriptor })),
        ...LAYOUT_CATALOG.flatMap(({ descriptor, implementations }) => [
            { where: `layout ${descriptor.id}`, descriptor },
            ...implementations.map((implementation) => ({
                where: `layout ${descriptor.id}:${implementation.engine}`,
                descriptor: implementation,
            })),
        ]),
        ...CAMERA_DESCRIPTORS.map((descriptor) => ({ where: `camera ${descriptor.id}`, descriptor })),
        ...LOG_SINK_DESCRIPTORS.map((descriptor) => ({ where: `logSink ${descriptor.id}`, descriptor })),
        ...FORMAT_DESCRIPTORS.map((descriptor) => ({ where: `format ${descriptor.id}`, descriptor })),
    ];

    it("pairs every description with a descriptionId, unique across the catalogue", () => {
        const missing = described
            .filter(({ descriptor }) => descriptor.description !== undefined && descriptor.descriptionId === undefined)
            .map(({ where }) => where);
        assert.deepEqual(missing, []);
        const ids = described.map(({ descriptor }) => descriptor.descriptionId).filter((id) => id !== undefined);
        assert.strictEqual(new Set(ids).size, ids.length);
    });

    it("names each by its catalogue and id", () => {
        const pagerank = BUILT_IN_ALGORITHMS.find((descriptor) => descriptor.key === "pagerank");
        const force = LAYOUT_CATALOG.find(({ descriptor }) => descriptor.id === "force");
        assert.strictEqual(pagerank?.descriptionId, "algorithm.pagerank");
        assert.strictEqual(force?.descriptor.descriptionId, "layout.force");
        assert.include(
            force?.implementations.map((implementation) => implementation.descriptionId) ?? [],
            "layout.force:d3",
        );
        assert.strictEqual(CAMERA_DESCRIPTORS[0]?.descriptionId, `camera.${CAMERA_DESCRIPTORS[0]?.id}`);
        assert.strictEqual(LOG_SINK_DESCRIPTORS[0]?.descriptionId, `logSink.${LOG_SINK_DESCRIPTORS[0]?.id}`);
        assert.strictEqual(
            FORMAT_DESCRIPTORS.find((descriptor) => descriptor.id === "graphty")?.descriptionId,
            "format.graphty",
        );
    });
});
