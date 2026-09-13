/**
 * The two drawings design 5.8 asks for where a capability has not shipped.
 *
 * A control whose status is not shipped is DRAWN -- at its target shape -- and carries
 * a muted `Coming` tag, rather than being replaced by a control that silently does
 * nothing. Where three or more contiguous rows share that status the tag rises once to
 * the group header and the rows below are dimmed and disabled instead of tagged one by
 * one, with a single info circle reading "Dimmed rows are not built yet."
 *
 * An unshipped row carries no key chip anywhere (5.6), which is why nothing here
 * accepts one.
 */

import { InfoCircle } from "@graphty/compact-mantine";
import { Group } from "@mantine/core";
import React from "react";

import { ComingTag } from "../ComingTag";
import { INSPECTOR_CLUSTER_GAP, UNSHIPPED_GROUP_INFO } from "./inspectorConstants";

/*
 * The pill itself is shell-wide -- the activity panel and the Views menu draw the same
 * one -- so it is declared once in `shell/ComingTag.tsx` and re-exported here, where
 * the inspector's own files already import it from.
 */
export { ComingTag };

/**
 * Props of the group-level unshipped mark.
 * @public
 */
export interface UnshippedGroupMarkProps {
    /** The group this mark belongs to, for the pill's and the circle's accessible names. */
    readonly subject: string;
}

/**
 * The one tag plus one info circle that stand for a run of three or more contiguous
 * unshipped rows, which are dimmed and disabled rather than tagged individually.
 *
 * Put it in the group header's trailing slot. The rows it covers take
 * `disabled` and their own dimmed ink; nothing about the state depends on telling two
 * greys apart, because every row is also inoperable.
 * @param props - the mark's props.
 * @returns the tag and its info circle.
 */
export function UnshippedGroupMark(props: UnshippedGroupMarkProps): React.JSX.Element {
    const { subject } = props;

    return (
        <Group gap={INSPECTOR_CLUSTER_GAP} wrap="nowrap" data-testid="unshipped-group-mark">
            <ComingTag subject={subject} />
            <InfoCircle label={subject}>{UNSHIPPED_GROUP_INFO}</InfoCircle>
        </Group>
    );
}
