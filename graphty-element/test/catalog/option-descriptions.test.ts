/**
 * @file No option descriptor in the catalogue carries an English sentence without a coded form:
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

/** Every built-in catalogue, by name. */
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

/** Every option descriptor reachable from the built-in catalogues, with where it was found. */
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
