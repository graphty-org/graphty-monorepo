/**
 * @file The sidebar order in `.storybook/preview.ts` is the section list in
 * `tools/storybook-taxonomy.json`.
 *
 * Storybook reads `parameters.options.storySort` by parsing `preview.ts`, not by running it, and
 * refuses anything but a literal there ("Parameter 'options.storySort' should be defined inline").
 * So the list cannot be imported from the taxonomy file and is written out a second time. This
 * test reads the literal with Storybook's own parser and fails when the two copies drift apart.
 */

import { readFileSync } from "node:fs";
import path from "node:path";

import { getStorySortParameter } from "storybook/internal/csf-tools";
import { assert, describe, it } from "vitest";

import { PACKAGE_ROOT } from "./story-source";

/** The taxonomy entry for this package. */
interface PackageTaxonomy {
    /** The top-level sections, in sidebar order. */
    sections: string[];
    /** The Introduction's pages, in sidebar order. */
    introduction: string[];
}

const taxonomy = JSON.parse(
    readFileSync(path.join(PACKAGE_ROOT, "..", "tools", "storybook-taxonomy.json"), "utf8"),
) as { packages: Record<string, PackageTaxonomy> };

const sort = getStorySortParameter(readFileSync(path.join(PACKAGE_ROOT, ".storybook", "preview.ts"), "utf8")) as
    { order?: unknown[]; method?: string } | undefined;

describe("the sidebar order", () => {
    const mine = taxonomy.packages["graphty-element"];

    it("lists the taxonomy's sections in the taxonomy's order", () => {
        const sections = (sort?.order ?? []).filter((entry): entry is string => typeof entry === "string");

        assert.deepEqual(
            sections,
            mine.sections,
            `.storybook/preview.ts sorts the sidebar by a section list that differs from ` +
                `tools/storybook-taxonomy.json. Change both together: the taxonomy is what the Storybook ` +
                `checks read, and preview.ts is what the sidebar shows.`,
        );
    });

    it("opens the Introduction on the taxonomy's pages, and every other section on its Overview", () => {
        const order = sort?.order ?? [];

        for (const [index, section] of mine.sections.entries()) {
            const children = order[order.indexOf(section) + 1];

            assert.deepEqual(
                children,
                index === 0 ? mine.introduction : ["Overview", "*"],
                `The children of "${section}" in preview.ts's storySort are not what the taxonomy says.`,
            );
        }
    });

    it("keeps each file's export order within a component", () => {
        assert.isUndefined(
            sort?.method,
            `storySort.method sorts the stories inside a component, which puts Default and Playground ` +
                `wherever the alphabet does. Leave it unset so a file's export order is the order a ` +
                `reader sees.`,
        );
    });
});
