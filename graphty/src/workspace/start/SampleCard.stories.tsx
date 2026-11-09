import { ActionIcon, Modal } from "@mantine/core";
import type { Meta, StoryObj } from "@storybook/react";
import React from "react";

import { GLYPHS } from "../glyphs";
import { SampleCard } from "./SampleCard";
import { GENERATED, type LibraryTile, offeredTiles } from "./sampleLibrary";

/** A few of the library's tiles: two of the app's own samples, a large dataset and a generator. */
const TILES: readonly LibraryTile[] = (() => {
    const all = offeredTiles(false);
    const pick = (test: (tile: LibraryTile) => boolean): LibraryTile[] => all.filter(test).slice(0, 1);
    return [
        ...all.slice(0, 2),
        ...pick((tile) => tile.note !== undefined),
        ...pick((tile) => tile.field === GENERATED),
    ];
})();

/**
 * The cards in the start page's library grid.
 * @returns The cards
 */
function OnStartPage(): React.JSX.Element {
    return (
        <div className="ws-land" style={{ minHeight: 0, padding: 24 }}>
            <div className="ws-land-samples" data-view="grid">
                {TILES.map((tile) => (
                    <SampleCard key={tile.id} card={tile} label={tile.name} onClick={() => undefined} />
                ))}
            </div>
        </div>
    );
}

/**
 * The cards in the Samples dialog, over a project that holds data: each offers Open as a separate
 * graph in its corner.
 * @returns The dialog
 */
function InSamplesDialog(): React.JSX.Element {
    return (
        <Modal opened onClose={() => undefined} title="Samples" size={800} transitionProps={{ duration: 0 }}>
            <div className="ws-land-cards ws-land-samples" data-view="grid">
                {TILES.map((tile) => (
                    <SampleCard
                        key={tile.id}
                        card={tile}
                        label={tile.name}
                        onClick={() => undefined}
                        corner={
                            <ActionIcon
                                variant="default"
                                size="sm"
                                aria-label={`Open ${tile.name} as a separate graph`}
                            >
                                <GLYPHS.openExternal size={14} aria-hidden />
                            </ActionIcon>
                        }
                    />
                ))}
            </div>
        </Modal>
    );
}

const meta: Meta = {
    title: "Workspace/Sample card",
    parameters: { layout: "fullscreen" },
    // The picture is taken once every card's picture has drawn (the dialog's are in a portal). The
    // cards load their pictures lazily, which a page that is not on screen (a story test's) never
    // starts, so each is asked for now.
    play: async ({ canvasElement }) => {
        const pictures = [...canvasElement.ownerDocument.querySelectorAll("img")];
        await Promise.all(
            pictures.map((img) => {
                img.loading = "eager";
                return img.decode();
            }),
        );
    },
};
export default meta;

type Story = StoryObj;

/** The start page's library cards. */
export const StartPage: Story = { render: () => <OnStartPage /> };

/** The same cards in the Samples dialog. */
export const SamplesDialog: Story = { render: () => <InSamplesDialog /> };
