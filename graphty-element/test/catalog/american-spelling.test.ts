/**
 * @file The catalog's published text uses American spelling (issue #2105).
 *
 * Plain names and descriptions are shown to readers by consumers that use the catalog's names,
 * so they follow the repository's convention: "Colors", not "Colours". Ids are not checked: an id
 * is a key, and renaming one breaks every consumer that stored it.
 */

import "../../src/algorithms/index";
import "../../src/data/index";
import "../../src/layout/index";

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";
import { channelsFor } from "../../src/session/styles/channels";

/** British spellings, each with the American one the catalog uses instead. */
const BRITISH =
    /\b(colour|grey|behaviour|centre|favourite|neighbour|organis|normalis|minimis|maximis|optimis|visualis|summaris|recognis|initialis|serialis|customis|categoris|randomis|prioritis|analys(e|es|ed|ing)\b|labelled|labelling|modelled|modelling|travelled|cancelled|catalogue|metre|licence|defence|artefact)/i;

/** Keys whose string values are reader-facing text rather than ids. */
const TEXT_KEYS = new Set(["plainName", "description", "label", "name", "summary", "help", "hint", "title"]);

/**
 * Collect every reader-facing string in a catalog value, with the path that reached it.
 * @param value - The value to walk.
 * @param path - Where it sits in the catalog.
 * @param key - The property that holds it.
 * @param found - The strings collected so far.
 * @returns `found`, with this value's strings added.
 */
function texts(value: unknown, path: string, key: string, found: [string, string][]): [string, string][] {
    if (typeof value === "string") {
        if (TEXT_KEYS.has(key)) {
            found.push([path, value]);
        }
    } else if (Array.isArray(value)) {
        value.forEach((item, index) => texts(item, `${path}[${index}]`, key, found));
    } else if (value !== null && typeof value === "object") {
        for (const [k, v] of Object.entries(value)) {
            texts(v, `${path}.${k}`, k, found);
        }
    }

    return found;
}

describe("the catalog's published text", () => {
    it("uses American spelling in every plain name and description", async () => {
        const { catalog } = createGraphSession();
        const lists: Record<string, unknown> = {
            algorithms: catalog.algorithms(),
            layouts: catalog.layouts(),
            formats: catalog.formats(),
            palettes: catalog.palettes(),
            cameras: catalog.cameras(),
            logSinks: catalog.logSinks(),
            scales: catalog.scales(),
            metrics: catalog.metrics(),
            channels: [...channelsFor("node"), ...channelsFor("edge")],
        };
        const options = await Promise.all(
            [...catalog.algorithms().map((a) => a.key), ...catalog.layouts().map((l) => l.id)].map(
                async (key) => [key, await catalog.optionsFor(key)] as const,
            ),
        );
        lists.options = Object.fromEntries(options);

        const all = texts(lists, "catalog", "", []);
        const british = all.filter(([, text]) => BRITISH.test(text)).map(([path, text]) => `${path}: ${text}`);

        assert.isAbove(all.length, 100, "the walk reached the catalog's text");
        assert.deepStrictEqual(british, [], "British spellings in published catalog text");
    });
});
