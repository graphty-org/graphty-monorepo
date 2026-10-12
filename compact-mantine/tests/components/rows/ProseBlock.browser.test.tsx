/**
 * What a screen reader is told about a departure line, read from Chromium's own accessibility
 * tree rather than from a JavaScript reimplementation of the accessible-name rules: a note, named
 * by the severity word and the line's own text, with nothing from the glyph beside it.
 */
import "../../harness/measure";

import { MantineProvider } from "@mantine/core";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { commands } from "vitest/browser";

import { compactTheme } from "../../../src";
import { ProseBlock } from "../../../src/components/rows/ProseBlock";
import { LabelsProvider } from "../../../src/i18n";

const LINE = "Approximate (sample of 8). Largest connected part only, 18 of 20 nodes.";

afterEach(() => {
    cleanup();
});

/**
 * The notes the browser exposes.
 * @returns every node whose computed role is note
 */
async function notes(): Promise<{ role: string; name: string; description: string }[]> {
    const tree = await commands.accessibilityTree();
    return tree.filter((node) => node.role === "note");
}

describe("ProseBlock departure line in the browser's accessibility tree", () => {
    it("is a note named by the severity word and its own text", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <ProseBlock variant="departure">{LINE}</ProseBlock>
            </MantineProvider>,
        );

        const found = await notes();
        expect(found).toHaveLength(1);
        expect(found[0].name).toBe(`Warning ${LINE}`);
        expect(found[0].name).not.toMatch(/departure|warning-glyph/i);
    });

    it("takes the severity word from the labels", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <LabelsProvider labels={{ departure: "Warnung" }}>
                    <ProseBlock variant="departure">{LINE}</ProseBlock>
                </LabelsProvider>
            </MantineProvider>,
        );

        const found = await notes();
        expect(found.map((node) => node.name)).toEqual([`Warnung ${LINE}`]);
    });
});
