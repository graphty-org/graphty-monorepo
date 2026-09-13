/**
 * The inspector's Pattern-match surface (spec 03 section 6, fifth bullet).
 *
 * Match count, the ranked match list, the matched nodes of the current match,
 * `Center on match` and `Select match`.
 *
 * Subgraph search is unbuilt -- design 5.8 records "subgraph search (the package has
 * whole-graph isomorphism only)" as new work, and Explore's own `Find a pattern`
 * section carries the same tag -- so this surface is drawn at its target shape with
 * 5.8's group treatment on its actions block.
 *
 * Only the header and the documented section skeleton are built in this pass.
 */

import { ControlSection, DataRow, PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Box, Text } from "@mantine/core";
import React from "react";

import { type InspectorAction, InspectorActions } from "./InspectorActions";
import { INSPECTOR_KIND_FONT_SIZE, INSPECTOR_SECTION_IDS } from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/**
 * One match in the ranked list.
 *
 * Built by the caller and handed in through {@link PatternMatchInspectorProps.matches}.
 * @public
 */
export interface PatternMatchRow {
    /** Stable id. */
    readonly id: string;
    /** The match's own name, e.g. the nodes it binds. */
    readonly name: string;
    /** Its score, already formatted. */
    readonly score: string;
}

/**
 * Props of the Pattern-match surface.
 */
export interface PatternMatchInspectorProps {
    /** The match count, e.g. "412 matches". */
    readonly countLabel: string;
    /** The ranked matches. */
    readonly matches: readonly PatternMatchRow[];
    /** The matched nodes of the match currently shown. */
    readonly matchedNodes: readonly string[];
    /** The id of the match currently shown. */
    readonly currentMatchId?: string;
    /** Shows a different match. */
    readonly onSelectMatch: (matchId: string) => void;
    /** Runs one verb of the actions block. */
    readonly onAction: (actionId: string) => void;
}

/**
 * The Pattern-match surface.
 * @param props - the surface's props.
 * @returns the match count, the ranked list, the matched nodes and the actions block.
 */
export function PatternMatchInspector(props: PatternMatchInspectorProps): React.JSX.Element {
    const { countLabel, matches, matchedNodes, currentMatchId, onSelectMatch, onAction } = props;
    const matchesSection = useInspectorSection(INSPECTOR_SECTION_IDS.patternMatches, true);

    const actions: InspectorAction[] = [
        { id: "centerOnMatch", label: "Center on match" },
        { id: "selectMatch", label: "Select match" },
    ].map((action) => ({
        ...action,
        coming: true,
        onSelect: () => {
            onAction(action.id);
        },
    }));

    return (
        <>
            <Box
                data-testid="pattern-header-block"
                style={{
                    flex: "0 0 auto",
                    paddingBlock: PANEL_GRID.SECTION_PAD_BOTTOM,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                <Text
                    span
                    data-testid="pattern-count"
                    style={{ fontSize: INSPECTOR_KIND_FONT_SIZE, fontWeight: 500, color: PANEL_INK.VALUE }}
                >
                    {countLabel}
                </Text>
            </Box>

            <ControlSection
                label="Matches"
                opened={matchesSection.opened}
                onOpenChange={matchesSection.onOpenChange}
                empty={matches.length === 0 && matchedNodes.length === 0}
            >
                {matches.map((match) => (
                    <DataRow
                        key={match.id}
                        name={match.name}
                        value={match.score}
                        selected={match.id === currentMatchId}
                        onClick={() => {
                            onSelectMatch(match.id);
                        }}
                    />
                ))}

                {matchedNodes.map((node) => (
                    <DataRow key={`matched-${node}`} name={node} />
                ))}
            </ControlSection>

            <InspectorActions label="Actions" actions={actions} />
        </>
    );
}
