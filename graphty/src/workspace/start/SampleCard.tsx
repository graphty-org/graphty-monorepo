import "./start.css";

import { UnstyledButton } from "@mantine/core";
import React, { useSyncExternalStore } from "react";

import { onSiteConfig } from "../../siteConfig";
import { GLYPHS } from "../glyphs";
import { GENERATED, type SampleCardData } from "./sampleLibrary";

/**
 * A card's picture, or a plain stand-in where there is none. Drawn again once the site's
 * configuration loads, which can move the picture to the site's own copy.
 * @param props - Component props
 * @param props.address - Works out the picture's address, or undefined
 * @returns The picture
 */
function CardPicture({ address }: Readonly<{ address: () => string | undefined }>): React.JSX.Element {
    const picture = useSyncExternalStore(onSiteConfig, address);
    return picture === undefined ? (
        <span className="ws-land-sample-pic ws-land-sample-none" aria-hidden>
            <GLYPHS.noPicture />
        </span>
    ) : (
        <img className="ws-land-sample-pic" src={picture} alt="" loading="lazy" />
    );
}

/** What a sample card is given. */
export interface SampleCardProps {
    readonly card: SampleCardData;
    /** What it is called for a screen reader. */
    readonly label: string;
    /** What a click does: the start page opens a new project, the Samples dialog adds to this one. */
    readonly onClick: () => void;
    /** A control in the card's corner, such as the Samples dialog's Open as a separate graph. */
    readonly corner?: React.ReactNode;
}

/**
 * One sample, as the start page's library and the Samples dialog both show it: its picture, the
 * field tag, the short title, the name and size (a generator's description), and the note on a
 * large dataset. Drawn inside `.ws-land-samples`, under `.ws-land` or `.ws-land-cards`.
 * @param props - Component props
 * @param props.card - What it shows
 * @param props.label - Its name for a screen reader
 * @param props.onClick - What a click does
 * @param props.corner - A control in its corner, or none
 * @returns The card
 */
export function SampleCard({ card, label, onClick, corner }: SampleCardProps): React.JSX.Element {
    const generated = card.field === GENERATED;
    const button = (
        <UnstyledButton className="ws-land-sample" aria-label={label} title={card.sentence} onClick={onClick}>
            <CardPicture address={card.picture} />
            <span className="ws-land-sample-tag">
                {generated ? <GLYPHS.generated size={11} aria-hidden /> : null}
                {card.field}
            </span>
            <span className="ws-land-sample-t">{card.hook}</span>
            <span className="ws-land-sample-m">{generated ? card.sentence : `${card.name} -- ${card.size}`}</span>
            {card.note === undefined ? null : <span className="ws-land-sample-note">{card.note}</span>}
        </UnstyledButton>
    );
    return corner === undefined ? (
        button
    ) : (
        <div className="ws-land-sample-cell">
            {button}
            <span className="ws-land-sample-corner">{corner}</span>
        </div>
    );
}
