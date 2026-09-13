/**
 * The inspector's Nothing-selected surface (spec 03 section 4).
 *
 * Header kind string `Graph summary`; the header's trailing cluster is `Copy reading`
 * and `Toggle inspector (D)` and NO pin, which the chrome decides from the selection
 * kind. There is no count line above the reading -- the status bar owns node and edge
 * totals.
 *
 * Content, in order:
 *
 * 1. the reading (RT-10, tier 1, floor item 1: on screen, in full, never circled);
 * 2. Counts, a tier 2 section collapsed by default and remembered per 6.5;
 * 3. Most connected (Degree centrality), tier 1 and open, with its top five, its
 *    degree histogram and its See-all link;
 * 4. Schema, a tier 1 section that expands IN PLACE, with its two type tables, its
 *    verb row, its `Export schema JSON` and its 480 pop-out opening to the LEFT;
 * 5. Attributes, a tier 2 section collapsed, with its Nodes and Edges tabs;
 * 6. case notes as ONE row, not a section;
 * 7. one `More in Analyze` link.
 */

import { ActionRow, AdvancedButton, ControlSection, DataRow, DataRowHeader, type HistogramBin, HistogramRow, PANEL_GRID, PANEL_INK, PanelField, Popout, ProseBlock, UiGlyph, useNumberFormatter } from "@graphty/compact-mantine";
import { Box, Menu, Tabs, Text, Tooltip, UnstyledButton } from "@mantine/core";
import React, { useMemo, useState } from "react";

import { keyChipFor } from "../bindings";
import { TOOLTIP_DELAY_MS } from "../constants";
import {
    ATTRIBUTE_ROW_CAP,
    COUNTS_ROW_LABELS,
    GRAPH_SUMMARY_LABELS,
    INSPECTOR_CLUSTER_GAP,
    INSPECTOR_POPOUT_WIDE_WIDTH,
    INSPECTOR_SECTION_IDS,
    KEY_CHIP_GAP,
    MOST_CONNECTED_TOP_N,
    SCHEMA_TYPE_ROW_CAP,
} from "./inspectorConstants";
import { useInspectorSection } from "./sections";

/**
 * The Counts section's content, already formatted for the reader's locale. Members
 * left out are not drawn: 6.2's zero rule, which is why there is no "Isolated nodes 0"
 * and why self-loops and parallel edges appear only when non-zero.
 */
export interface GraphSummaryCounts {
    /** The node total, or "shown of loaded of total" while a filter, window or subset is active. */
    readonly nodes: string;
    /** The edge total, under the same rule. */
    readonly edges: string;
    /** One row: "Directed (from file), weighted (amount), timed (opened)". */
    readonly types: string;
    /** Density in plain form, e.g. "0.153". */
    readonly density: string;
    /** The same density in scientific notation, e.g. "1.53e-1", carried on hover. */
    readonly densityTitle: string;
    /** Mean degree, e.g. "2.9". */
    readonly averageDegree: string;
    /** Connected components, e.g. "3,412". */
    readonly connectedParts: string;
    /** Drawn only when non-zero. */
    readonly selfLoops?: string;
    /** Drawn only when non-zero. */
    readonly parallelEdges?: string;
}

/**
 * One row of the top-five-by-degree table: the user's own label and its bare number.
 *
 * Built by the caller and handed in through {@link GraphSummaryProps.mostConnected}.
 * @public
 */
export interface MostConnectedRow {
    /** The node's id, which is what a click selects. */
    readonly id: string;
    /** The node's own label -- floor item 7, so it keeps its text column. */
    readonly label: string;
    /** The degree, already formatted. The unit word rides on the column caption. */
    readonly value: string;
}

/**
 * One row of a schema type table.
 *
 * The row type of four {@link GraphSummarySchema} tables, all filled in by the caller.
 * @public
 */
export interface SchemaTypeCount {
    /** The type's own name. */
    readonly name: string;
    /** How many nodes or edges carry it, already formatted. */
    readonly count: string;
}

/**
 * The Schema section's content.
 *
 * Handed in through {@link GraphSummaryProps.schema}.
 * @public
 */
export interface GraphSummarySchema {
    /** Whether SchemaExtractor has finished. Until it has, the closed header reads "measuring...". */
    readonly ready: boolean;
    /** The closed header's state mark, e.g. "3 node types, 7 edge types". */
    readonly summary: string;
    /** Node types with their counts. */
    readonly nodeTypes: readonly SchemaTypeCount[];
    /** Edge types with their counts. */
    readonly edgeTypes: readonly SchemaTypeCount[];
    /** Per-type completeness, which lives behind the gear. */
    readonly completeness?: readonly SchemaTypeCount[];
    /** Edges by type pair, the matrix that keeps its 480 because it is two-dimensional. */
    readonly typePairs?: readonly SchemaTypeCount[];
}

/**
 * One row of the Attributes section.
 *
 * The row type of both {@link GraphSummaryAttributes} tables.
 * @public
 */
export interface AttributeSummaryRow {
    /** The attribute's own name -- floor item 7. */
    readonly name: string;
    /** Its type word, e.g. "text", "number". */
    readonly type: string;
    /** Its distinct-value count, already formatted and already capped at "1,000+ values". */
    readonly distinct: string;
    /** Whether it is id-like, in which case the row is marked `unique` instead of counted. */
    readonly unique?: boolean;
}

/**
 * The Attributes section's content.
 *
 * Handed in through {@link GraphSummaryProps.attributes}.
 * @public
 */
export interface GraphSummaryAttributes {
    /** Node attributes. */
    readonly nodes: readonly AttributeSummaryRow[];
    /** Edge attributes. */
    readonly edges: readonly AttributeSummaryRow[];
    /**
     * The sampling caveat, stated once inside the section when the distinct counts came
     * from a sample rather than from every row. Floor item 2.
     */
    readonly samplingCaveat?: string;
}

/**
 * Props of the Graph summary surface.
 */
export interface GraphSummaryProps {
    /** The plain-language reading. Floor item 1: on screen, in full, never shortened. */
    readonly reading: string;
    /** The Counts rows, or null while the background pass is still running. */
    readonly counts: GraphSummaryCounts | null;
    /** The top five by degree. An empty list means the section does not render (Rule 7c). */
    readonly mostConnected: readonly MostConnectedRow[];
    /** How many nodes the ranked list holds, for `See all N ranked`. */
    readonly rankedCount: number;
    /** The degree histogram's bins; each label is the bar's own title, e.g. "3 links: 12 nodes". */
    readonly degreeBins: readonly HistogramBin[];
    /** The value at the start of the histogram's axis. */
    readonly degreeAxisMin: string;
    /** The value at the end of the histogram's axis. */
    readonly degreeAxisMax: string;
    /** The Schema section's content. */
    readonly schema: GraphSummarySchema;
    /** The Attributes section's content. */
    readonly attributes: GraphSummaryAttributes;
    /** How many case notes the graph carries. */
    readonly caseNoteCount: number;
    /** Opens the Data table drawer on the ranked list. */
    readonly onShowInTable: () => void;
    /** Writes the top 20 as CSV. */
    readonly onExportTop: () => void;
    /** Writes the whole ranked list as CSV. */
    readonly onExportRanked: () => void;
    /** Opens the Data table drawer on every ranked node. */
    readonly onSeeAllRanked: () => void;
    /** Selects one of the top five. */
    readonly onSelectNode?: (nodeId: string) => void;
    /** Writes the schema as JSON. */
    readonly onExportSchemaJson: () => void;
    /** Filters the canvas to the schema's types. */
    readonly onFilterToType: () => void;
    /** Selects every member of the schema's types. */
    readonly onSelectAllOfType: () => void;
    /** Opens the graph-level annotation. */
    readonly onOpenCaseNotes: () => void;
    /** Opens the Analyze panel, where diameter, average path length and the methods live. */
    readonly onMoreInAnalyze: () => void;
}

/**
 * A row of the Counts section, or its `Computing...` stand-in.
 * @param name - the row's name, from `COUNTS_ROW_LABELS`.
 * @param value - the figure, or undefined while the pass is running.
 * @param title - the alternative spelling a pointer reaches, such as density in scientific notation.
 * @returns one data row.
 */
function countsRow(name: string, value: string | undefined, title?: string): React.JSX.Element {
    const text = value ?? GRAPH_SUMMARY_LABELS.computing;

    return (
        <DataRow
            key={name}
            name={name}
            value={
                title === undefined ? (
                    text
                ) : (
                    <Box component="span" title={title}>
                        {text}
                    </Box>
                )
            }
        />
    );
}

/**
 * The value cell of a schema table's "N more" row.
 *
 * Floor item 7 is why it draws the names rather than only counting them: every one of
 * them is a string the user's data supplied. It is capped at one field width and
 * ellipsized, with the whole list in its own title, so the row cannot blow the 256 px
 * band out however many types the cap hid.
 */
interface MoreTypesValueProps {
    readonly rows: readonly SchemaTypeCount[];
}

/**
 * Draws the hidden types of a capped schema table.
 * @param props - the cell's props.
 * @returns the ellipsized list, with the whole of it in its title.
 */
function MoreTypesValue(props: MoreTypesValueProps): React.JSX.Element {
    const { rows } = props;
    const names = rows.map((row) => `${row.name} ${row.count}`).join(", ");

    return (
        <Box
            component="span"
            title={names}
            style={{
                display: "inline-block",
                maxWidth: PANEL_GRID.FIELD,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                verticalAlign: "bottom",
            }}
        >
            {names}
        </Box>
    );
}

/**
 * A text button for a verb the icon register does not name, or that carries a count, a
 * format or a scope -- which build spec 04 section 8.1 keeps in words.
 */
interface VerbButtonProps {
    readonly words: string;
    readonly chip?: string | null;
    readonly testId: string;
    readonly onClick: () => void;
}

/**
 * Draws one text verb at panel scale.
 * @param props - the verb's props.
 * @returns the button, with its binding in the tooltip after a 6 px gap.
 */
function VerbButton(props: VerbButtonProps): React.JSX.Element {
    const { words, chip, testId, onClick } = props;

    const button = (
        <UnstyledButton
            type="button"
            aria-label={words}
            data-testid={testId}
            onClick={onClick}
            style={{
                flex: "0 0 auto",
                height: PANEL_GRID.CONTROL_HEIGHT,
                paddingInline: PANEL_GRID.PAD_RIGHT,
                borderRadius: PANEL_GRID.TRIPLE_GAP,
                color: PANEL_INK.CHROME,
                fontSize: "var(--mantine-font-size-sm)",
                fontWeight: 500,
                whiteSpace: "nowrap",
            }}
        >
            {words}
        </UnstyledButton>
    );

    if (chip === undefined || chip === null) {
        return button;
    }

    return (
        <Tooltip
            openDelay={TOOLTIP_DELAY_MS}
            position="top"
            withinPortal
            label={
                <Box component="span" style={{ display: "inline-flex", alignItems: "center", gap: KEY_CHIP_GAP }}>
                    <Box component="span">{words}</Box>
                    <Box component="span">{chip}</Box>
                </Box>
            }
        >
            {button}
        </Tooltip>
    );
}

/**
 * The Nothing-selected surface.
 * @param props - the surface's props.
 * @returns the reading, the five sections, the case note row and the Analyze link.
 */
export function GraphSummary(props: GraphSummaryProps): React.JSX.Element {
    const {
        reading,
        counts,
        mostConnected,
        rankedCount,
        degreeBins,
        degreeAxisMin,
        degreeAxisMax,
        schema,
        attributes,
        caseNoteCount,
        onShowInTable,
        onExportTop,
        onExportRanked,
        onSeeAllRanked,
        onSelectNode,
        onExportSchemaJson,
        onFilterToType,
        onSelectAllOfType,
        onOpenCaseNotes,
        onMoreInAnalyze,
    } = props;

    const formatter = useNumberFormatter();
    const countsSection = useInspectorSection(INSPECTOR_SECTION_IDS.counts, false);
    const mostConnectedSection = useInspectorSection(INSPECTOR_SECTION_IDS.mostConnected, true);
    const schemaSection = useInspectorSection(INSPECTOR_SECTION_IDS.schema, true);
    const attributesSection = useInspectorSection(INSPECTOR_SECTION_IDS.attributes, false);

    const [attributeTab, setAttributeTab] = useState<string>("nodes");
    const [attributeFilter, setAttributeFilter] = useState<string>("");

    const topFive = mostConnected.slice(0, MOST_CONNECTED_TOP_N);
    const nodeTypes = schema.nodeTypes.slice(0, SCHEMA_TYPE_ROW_CAP);
    const edgeTypes = schema.edgeTypes.slice(0, SCHEMA_TYPE_ROW_CAP);
    const hiddenNodeTypes = schema.nodeTypes.slice(SCHEMA_TYPE_ROW_CAP);
    const hiddenEdgeTypes = schema.edgeTypes.slice(SCHEMA_TYPE_ROW_CAP);
    const schemaDetail = [...(schema.completeness ?? []), ...(schema.typePairs ?? [])];

    const attributeRows = attributeTab === "edges" ? attributes.edges : attributes.nodes;
    const filteredAttributes = useMemo(() => {
        const needle = attributeFilter.trim().toLowerCase();

        if (needle === "") {
            return attributeRows;
        }

        return attributeRows.filter((row) => row.name.toLowerCase().includes(needle));
    }, [attributeFilter, attributeRows]);
    const shownAttributes = filteredAttributes.slice(0, ATTRIBUTE_ROW_CAP);
    const hiddenAttributeCount = filteredAttributes.length - shownAttributes.length;

    const caseNoteWords =
        caseNoteCount === 0
            ? GRAPH_SUMMARY_LABELS.addCaseNote
            : `${formatter.format(caseNoteCount)} case notes`;
    const addNoteChip = keyChipFor("addNote");
    const caseNoteTitle =
        caseNoteCount === 0 && addNoteChip !== null
            ? `${GRAPH_SUMMARY_LABELS.addCaseNote} (${addNoteChip})`
            : caseNoteWords;

    return (
        <>
            {/* Floor item 1. The 16 / 8 padding is drawn here rather than on the
                scroll region, because every ControlSection below draws the panel's
                own padding itself and would otherwise be indented twice. */}
            <Box
                data-testid="graph-summary-reading"
                style={{
                    flex: "0 0 auto",
                    paddingBlock: PANEL_GRID.SECTION_PAD_BOTTOM,
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                <ProseBlock variant="reading">{reading}</ProseBlock>
            </Box>

            <ControlSection
                label={GRAPH_SUMMARY_LABELS.counts}
                opened={countsSection.opened}
                onOpenChange={countsSection.onOpenChange}
            >
                {countsRow(COUNTS_ROW_LABELS.nodes, counts?.nodes)}
                {countsRow(COUNTS_ROW_LABELS.edges, counts?.edges)}
                {countsRow(COUNTS_ROW_LABELS.type, counts?.types)}
                {countsRow(COUNTS_ROW_LABELS.density, counts?.density, counts?.densityTitle)}
                {countsRow(COUNTS_ROW_LABELS.averageDegree, counts?.averageDegree)}
                {countsRow(COUNTS_ROW_LABELS.connectedParts, counts?.connectedParts)}
                {counts?.selfLoops !== undefined && countsRow(COUNTS_ROW_LABELS.selfLoops, counts.selfLoops)}
                {counts?.parallelEdges !== undefined &&
                    countsRow(COUNTS_ROW_LABELS.parallelEdges, counts.parallelEdges)}
            </ControlSection>

            {topFive.length > 0 && (
                <ControlSection
                    label={GRAPH_SUMMARY_LABELS.mostConnected}
                    opened={mostConnectedSection.opened}
                    onOpenChange={mostConnectedSection.onOpenChange}
                    actions={
                        mostConnectedSection.opened ? (
                            <Box style={{ display: "flex", alignItems: "center", gap: INSPECTOR_CLUSTER_GAP }}>
                                <VerbButton
                                    words={GRAPH_SUMMARY_LABELS.showInTable}
                                    chip={keyChipFor("toggleDataDrawer")}
                                    testId="most-connected-show-in-table"
                                    onClick={onShowInTable}
                                />
                                <Menu position="bottom-end" withinPortal>
                                    <Menu.Target>
                                        <UnstyledButton
                                            type="button"
                                            aria-label={GRAPH_SUMMARY_LABELS.exportMenu}
                                            data-testid="most-connected-export"
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: PANEL_GRID.TRIPLE_GAP,
                                                height: PANEL_GRID.CONTROL_HEIGHT,
                                                paddingInline: PANEL_GRID.PAD_RIGHT,
                                                borderRadius: PANEL_GRID.TRIPLE_GAP,
                                                color: PANEL_INK.CHROME,
                                                fontSize: "var(--mantine-font-size-sm)",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {GRAPH_SUMMARY_LABELS.exportMenu}
                                            <UiGlyph name="chevronDown" size={PANEL_GRID.CHEVRON} />
                                        </UnstyledButton>
                                    </Menu.Target>
                                    <Menu.Dropdown>
                                        <Menu.Item onClick={onExportTop}>
                                            {GRAPH_SUMMARY_LABELS.exportTopCsv}
                                        </Menu.Item>
                                        <Menu.Item onClick={onExportRanked}>
                                            {GRAPH_SUMMARY_LABELS.exportRankedCsv}
                                        </Menu.Item>
                                    </Menu.Dropdown>
                                </Menu>
                            </Box>
                        ) : (
                            <Text span style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}>
                                {topFive[0].label}
                            </Text>
                        )
                    }
                >
                    {/* Rule 9: the unit word rides on the column caption once and never
                        on the five value cells. The caption's name column is empty
                        because the section header two rows above already carries it. */}
                    <DataRowHeader label="" unit={GRAPH_SUMMARY_LABELS.linksUnit} />

                    {topFive.map((row) => (
                        <DataRow
                            key={row.id}
                            name={row.label}
                            value={row.value}
                            onClick={
                                onSelectNode === undefined
                                    ? undefined
                                    : () => {
                                          onSelectNode(row.id);
                                      }
                            }
                        />
                    ))}

                    <HistogramRow
                        label="Links per node"
                        bins={[...degreeBins]}
                        minLabel={degreeAxisMin}
                        maxLabel={degreeAxisMax}
                    />

                    <ActionRow
                        state={`See all ${formatter.format(rankedCount)} ranked`}
                        onClick={() => {
                            onSeeAllRanked();
                        }}
                    />
                </ControlSection>
            )}

            {(schema.nodeTypes.length > 0 || schema.edgeTypes.length > 0) && (
                <ControlSection
                    label={GRAPH_SUMMARY_LABELS.schema}
                    opened={schemaSection.opened}
                    onOpenChange={schemaSection.onOpenChange}
                    actions={
                        schemaSection.opened ? (
                            <Box style={{ display: "flex", alignItems: "center", gap: INSPECTOR_CLUSTER_GAP }}>
                                <VerbButton
                                    words={GRAPH_SUMMARY_LABELS.exportSchemaJson}
                                    testId="schema-export-json"
                                    onClick={onExportSchemaJson}
                                />
                                {schemaDetail.length > 0 ? (
                                    <Popout>
                                        <Popout.Trigger>
                                            <AdvancedButton label={GRAPH_SUMMARY_LABELS.schemaDetail} />
                                        </Popout.Trigger>
                                        {/* 6.11: an inspector pop-out opens LEFT and
                                            never flips, and a two-dimensional table
                                            takes the widest rung of the ladder. */}
                                        <Popout.Panel
                                            width={INSPECTOR_POPOUT_WIDE_WIDTH}
                                            placement="left"
                                            alignment="start"
                                            header={{ variant: "title", title: GRAPH_SUMMARY_LABELS.schemaDetail }}
                                        >
                                            <Popout.Content>
                                                {schemaDetail.map((row) => (
                                                    <DataRow key={row.name} name={row.name} value={row.count} />
                                                ))}
                                            </Popout.Content>
                                        </Popout.Panel>
                                    </Popout>
                                ) : (
                                    // Floor item 4: a disabled control names its reason,
                                    // which AdvancedButton draws as both its tooltip and
                                    // its accessible name.
                                    <AdvancedButton
                                        label={`${GRAPH_SUMMARY_LABELS.schemaDetail}. Available once the schema has been measured`}
                                        disabled
                                    />
                                )}
                            </Box>
                        ) : (
                            <Text
                                span
                                data-testid="schema-summary-mark"
                                style={{ fontSize: "var(--mantine-font-size-sm)", color: PANEL_INK.CHROME }}
                            >
                                {schema.ready ? schema.summary : GRAPH_SUMMARY_LABELS.schemaMeasuring}
                            </Text>
                        )
                    }
                >
                    <DataRowHeader
                        label={GRAPH_SUMMARY_LABELS.nodeTypeColumn}
                        unit={GRAPH_SUMMARY_LABELS.nodeCountColumn}
                    />
                    {nodeTypes.map((row) => (
                        <DataRow key={`node-type-${row.name}`} name={row.name} value={row.count} />
                    ))}
                    {hiddenNodeTypes.length > 0 && (
                        <DataRow
                            name={`${formatter.format(hiddenNodeTypes.length)} more`}
                            value={<MoreTypesValue rows={hiddenNodeTypes} />}
                        />
                    )}

                    <DataRowHeader
                        label={GRAPH_SUMMARY_LABELS.edgeTypeColumn}
                        unit={GRAPH_SUMMARY_LABELS.edgeCountColumn}
                    />
                    {edgeTypes.map((row) => (
                        <DataRow key={`edge-type-${row.name}`} name={row.name} value={row.count} />
                    ))}
                    {hiddenEdgeTypes.length > 0 && (
                        <DataRow
                            name={`${formatter.format(hiddenEdgeTypes.length)} more`}
                            value={<MoreTypesValue rows={hiddenEdgeTypes} />}
                        />
                    )}

                    <ActionRow
                        residentActions={
                            <>
                                <VerbButton
                                    words={GRAPH_SUMMARY_LABELS.filterToType}
                                    testId="schema-filter-to-type"
                                    onClick={onFilterToType}
                                />
                                <VerbButton
                                    words={GRAPH_SUMMARY_LABELS.selectAllOfType}
                                    testId="schema-select-all-of-type"
                                    onClick={onSelectAllOfType}
                                />
                            </>
                        }
                    />
                </ControlSection>
            )}

            {(attributes.nodes.length > 0 || attributes.edges.length > 0) && (
                <ControlSection
                    label={GRAPH_SUMMARY_LABELS.attributes}
                    opened={attributesSection.opened}
                    onOpenChange={attributesSection.onOpenChange}
                >
                    <Tabs
                        value={attributeTab}
                        onChange={(next) => {
                            setAttributeTab(next ?? "nodes");
                        }}
                    >
                        <Tabs.List>
                            <Tabs.Tab value="nodes">{`Nodes ${formatter.format(attributes.nodes.length)}`}</Tabs.Tab>
                            <Tabs.Tab value="edges">{`Edges ${formatter.format(attributes.edges.length)}`}</Tabs.Tab>
                        </Tabs.List>
                    </Tabs>

                    <PanelField
                        label="Filter attributes"
                        kind="text"
                        width={PANEL_GRID.BODY}
                        value={attributeFilter}
                        onChange={(next) => {
                            setAttributeFilter(String(next));
                        }}
                    />

                    {attributes.samplingCaveat !== undefined && (
                        <ProseBlock variant="departure">{attributes.samplingCaveat}</ProseBlock>
                    )}

                    {shownAttributes.map((row) => (
                        <DataRow
                            key={`${attributeTab}-${row.name}`}
                            name={row.name}
                            value={row.unique === true ? `${row.type}, unique` : `${row.type}, ${row.distinct}`}
                        />
                    ))}

                    {hiddenAttributeCount > 0 && <DataRow name={`${formatter.format(hiddenAttributeCount)} more`} />}
                </ControlSection>
            )}

            {/* Case notes are ONE row, not a section with a count of nothing beside a
                plus: 5.4 names the zero state in words, and a floor string outranks a
                row type. */}
            <Box
                style={{
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                }}
            >
                {/* The binding rides in the row's own title, where a binding belongs
                    (5.6), and NOT in the accessible name -- 8.2 says a control's name
                    is its tooltip with the key chip removed. Passing the words as
                    markup with their own title is what separates the two. */}
                <ActionRow
                    state={
                        <Box component="span" title={caseNoteTitle}>
                            {caseNoteWords}
                        </Box>
                    }
                    stateTitle={caseNoteWords}
                    onClick={() => {
                        onOpenCaseNotes();
                    }}
                />

                <ActionRow
                    state={GRAPH_SUMMARY_LABELS.moreInAnalyze}
                    onClick={() => {
                        onMoreInAnalyze();
                    }}
                />
            </Box>
        </>
    );
}
