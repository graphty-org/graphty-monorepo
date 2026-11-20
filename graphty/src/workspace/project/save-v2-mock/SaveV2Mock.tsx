/**
 * A mock of the graphty app's save and open dialogs for version 2 save files (issue #8029):
 * presentation only, with static data and local state, wired to nothing. When graphty-element
 * saves and opens version 2 files (the "save-files-v2" experiment), the real dialogs read its save
 * report and load plan instead of mockData.ts.
 */

import { ModalFooter, SegmentedControl } from "@graphty/compact-mantine";
import {
    Alert,
    Badge,
    Button,
    Checkbox,
    Group,
    Modal,
    Select,
    SimpleGrid,
    Stack,
    Switch,
    Table,
    Text,
    TextInput,
} from "@mantine/core";
import React, { useState } from "react";

import {
    BIND_NONE,
    BIND_PARTIAL,
    type BindRow,
    MAPPING_ROWS,
    PRESETS,
    type ReportLine,
    type RunRecord,
    RUNS,
    SECTION_LABELS,
    SECTION_SUMMARIES,
    type SectionName,
    SECTIONS,
    SOURCES,
    SPACE_OVERLAPS,
    STYLE_FILE,
} from "./mockData";

const NOOP = (): void => undefined;
const SECONDARY = "var(--cm-text-secondary)";

/**
 * The file name a save writes: one full file, or one section file.
 * @param name - the project's name.
 * @param section - the one section of a section file, or null for a full file.
 * @returns the file name.
 */
function fileName(name: string, section: SectionName | null): string {
    const stem = name
        .toLowerCase()
        .replaceAll(/[^a-z0-9]+/g, "-")
        .replaceAll(/(?:^-)|(?:-$)/g, "");
    return section === null ? `${stem}.graphty.json` : `${stem}.graphty-${section}.json`;
}

/**
 * One checkbox per section, each with what it holds.
 * @param props - Component props
 * @param props.chosen - the sections checked.
 * @param props.onChange - takes the new set.
 * @param props.held - sections held on open, shown with a badge.
 * @param props.summaries - what each section holds, if not the default summaries.
 * @returns the list.
 */
function SectionChecks({
    chosen,
    onChange,
    held = [],
    summaries = SECTION_SUMMARIES,
}: Readonly<{
    chosen: readonly SectionName[];
    onChange: (next: SectionName[]) => void;
    held?: readonly SectionName[];
    summaries?: Record<SectionName, string>;
}>): React.JSX.Element {
    return (
        <Checkbox.Group
            label="Sections"
            value={[...chosen]}
            onChange={(next) => {
                onChange(SECTIONS.filter((s) => next.includes(s)));
            }}
        >
            <SimpleGrid cols={2} spacing="sm" verticalSpacing={6} mt={4}>
                {SECTIONS.map((section) => (
                    <Checkbox
                        key={section}
                        value={section}
                        label={
                            <Group gap={6}>
                                {SECTION_LABELS[section]}
                                {held.includes(section) ? (
                                    <Badge size="xs" color="yellow" variant="light">
                                        Held
                                    </Badge>
                                ) : null}
                            </Group>
                        }
                        description={summaries[section]}
                    />
                ))}
            </SimpleGrid>
        </Checkbox.Group>
    );
}

/**
 * The save report: each thing a save left out, moved or kept, and why.
 * @param props - Component props
 * @param props.lines - the report's lines.
 * @returns the table.
 */
function ReportTable({ lines }: Readonly<{ lines: readonly ReportLine[] }>): React.JSX.Element {
    return (
        <Table fz="sm" verticalSpacing={4}>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>Result</Table.Th>
                    <Table.Th>Why</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {lines.map((line) => (
                    <Table.Tr key={line.item}>
                        <Table.Td>{line.item}</Table.Td>
                        <Table.Td>{line.outcome}</Table.Td>
                        <Table.Td c={SECONDARY}>{line.reason}</Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}

/**
 * Save as... for version 2: which sections, a preset per use case, embed or reference for each
 * data source, and the file form.
 * @param props - Component props
 * @param props.preset - the preset the dialog opens with.
 * @returns the dialog.
 */
export function SaveDialogMock({ preset = "everything" }: Readonly<{ preset?: string }>): React.JSX.Element {
    const name = "Card fraud, week 46";
    const [chosen, setChosen] = useState<SectionName[]>(
        PRESETS.find((p) => p.value === preset)?.sections ?? [...SECTIONS],
    );
    const [storage, setStorage] = useState<Record<string, string>>(
        Object.fromEntries(SOURCES.map((source) => [source.id, source.storage])),
    );
    const [form, setForm] = useState<"full" | "section">("section");
    const matched = PRESETS.find(
        (p) => p.sections.length === chosen.length && p.sections.every((s) => chosen.includes(s)),
    );
    const one = chosen.length === 1 ? chosen[0] : null;
    const sectionFile = one !== null && form === "section";

    return (
        <Modal opened onClose={NOOP} title={`Save ${name} as`} size="lg">
            <Stack gap="sm">
                <TextInput label="Name" defaultValue={name} />
                <Select
                    label="Preset"
                    placeholder="Custom"
                    data={PRESETS.map(({ value, label }) => ({ value, label }))}
                    value={matched?.value ?? null}
                    onChange={(value) => {
                        const next = PRESETS.find((p) => p.value === value);
                        if (next !== undefined) {
                            setChosen(next.sections);
                        }
                    }}
                />
                <SectionChecks
                    chosen={chosen}
                    onChange={setChosen}
                    summaries={{ ...SECTION_SUMMARIES, results: `${SECTION_SUMMARIES.results} . off by default` }}
                />
                {chosen.includes("data") ? (
                    <Stack gap={6}>
                        <Text size="sm" fw={500}>
                            Sources
                        </Text>
                        {SOURCES.map((source) => (
                            <Group key={source.id} justify="space-between" wrap="nowrap">
                                <Stack gap={0} style={{ minWidth: 0 }}>
                                    <Text size="sm" truncate>
                                        {source.label}
                                    </Text>
                                    <Text size="xs" c={SECONDARY}>
                                        {source.detail}
                                    </Text>
                                </Stack>
                                <SegmentedControl
                                    size="xs"
                                    label={`Keep ${source.label}`}
                                    value={storage[source.id]}
                                    data={[
                                        { value: "embed", label: "Embed" },
                                        { value: "reference", label: "Reference", disabled: source.reader === true },
                                    ]}
                                    onChange={(value) => {
                                        setStorage((now) => ({ ...now, [source.id]: value }));
                                    }}
                                />
                            </Group>
                        ))}
                    </Stack>
                ) : null}
                <SegmentedControl
                    label="File"
                    value={sectionFile ? "section" : "full"}
                    data={[
                        { value: "full", label: "Full file" },
                        { value: "section", label: "Section file", disabled: one === null },
                    ]}
                    onChange={(value) => {
                        setForm(value === "section" ? "section" : "full");
                    }}
                />
                <Text size="sm" ff="monospace" c={SECONDARY}>
                    {fileName(name, sectionFile ? one : null)}
                </Text>
            </Stack>
            <ModalFooter mt="md">
                <Button variant="default">Cancel</Button>
                <Button disabled={chosen.length === 0}>Save</Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * What a save left out, moved or kept, shown after the file is written.
 * @param props - Component props
 * @param props.file - the file written.
 * @param props.lines - the report's lines.
 * @returns the dialog.
 */
export function SaveReportMock({
    file,
    lines,
}: Readonly<{ file: string; lines: readonly ReportLine[] }>): React.JSX.Element {
    return (
        <Modal opened onClose={NOOP} title={`Saved ${file}`} size="lg">
            <ReportTable lines={lines} />
            <ModalFooter mt="md">
                <Button>Done</Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * One run record, or the layout record, on open: rerun (the default) or restore its saved results.
 * A run that cannot be replayed exactly only restores.
 * @param props - Component props
 * @param props.run - the record.
 * @param props.saved - whether the file's results section is being loaded.
 * @returns the row.
 */
function RunRow({ run, saved }: Readonly<{ run: RunRecord; saved: boolean }>): React.JSX.Element {
    const [choice, setChoice] = useState("rerun");
    let fixed: string | null = null;
    if (!run.replayable) {
        fixed = saved ? "Restores saved results" : "Not run: no saved results";
    }
    return (
        <Group justify="space-between" wrap="nowrap">
            <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="sm" truncate>
                    {run.label}
                </Text>
                <Text size="xs" c={SECONDARY}>
                    {run.detail}
                </Text>
            </Stack>
            {fixed === null ? (
                <SegmentedControl
                    size="xs"
                    label={`On open, ${run.label}`}
                    value={saved ? choice : "rerun"}
                    data={[
                        { value: "rerun", label: "Rerun" },
                        { value: "restore", label: "Restore", disabled: !saved },
                    ]}
                    onChange={setChoice}
                />
            ) : (
                <Text size="xs" c={SECONDARY}>
                    {fixed}
                </Text>
            )}
        </Group>
    );
}

/**
 * Open for a full file: which sections to load, data replace or add (with the space question for
 * added sources), each run rerun or restored, and a warning for a section held because this release
 * cannot read it. Opening restores the session; the recipe is kept, not applied.
 * @param props - Component props
 * @param props.held - sections held on open.
 * @returns the dialog.
 */
export function OpenDialogMock({ held = [] }: Readonly<{ held?: readonly SectionName[] }>): React.JSX.Element {
    const [chosen, setChosen] = useState<SectionName[]>(SECTIONS.filter((s) => !held.includes(s)));
    const [mode, setMode] = useState("replace");
    const [spaces, setSpaces] = useState<Record<string, string>>({});
    const summaries = {
        ...SECTION_SUMMARIES,
        recipe: `${SECTION_SUMMARIES.recipe} . kept, not applied`,
    };

    return (
        <Modal opened onClose={NOOP} title="Open card-fraud-week-46.graphty.json" size="lg">
            <Stack gap="sm">
                {held.map((section) => (
                    <Alert key={section} color="yellow" title={`${SECTION_LABELS[section]}: version 3`}>
                        Newer than this release. Kept as is; {SECTION_LABELS[section].toLowerCase()} changes are not
                        saved.
                    </Alert>
                ))}
                <SectionChecks chosen={chosen} onChange={setChosen} held={held} summaries={summaries} />
                <SegmentedControl
                    label="Data"
                    value={mode}
                    data={[
                        { value: "replace", label: "Replace" },
                        { value: "add", label: "Add as sources" },
                    ]}
                    onChange={setMode}
                />
                {mode === "add"
                    ? SPACE_OVERLAPS.map((item) => (
                          <Group key={item.source} justify="space-between" wrap="nowrap">
                              <Stack gap={0} style={{ minWidth: 0 }}>
                                  <Text size="sm" truncate>
                                      {item.source}
                                  </Text>
                                  <Text size="xs" c={SECONDARY}>
                                      {item.overlap}
                                  </Text>
                              </Stack>
                              <SegmentedControl
                                  size="xs"
                                  label={`Space for ${item.source}`}
                                  value={spaces[item.source] ?? "separate"}
                                  data={[
                                      { value: "merge", label: "Merge" },
                                      { value: "separate", label: "Keep separate" },
                                  ]}
                                  onChange={(value) => {
                                      setSpaces((now) => ({ ...now, [item.source]: value }));
                                  }}
                              />
                          </Group>
                      ))
                    : null}
                {chosen.includes("view") ? (
                    <Stack gap={6}>
                        <Text size="sm" fw={500}>
                            Runs
                        </Text>
                        {RUNS.map((run) => (
                            <RunRow key={run.id} run={run} saved={chosen.includes("results")} />
                        ))}
                    </Stack>
                ) : null}
            </Stack>
            <ModalFooter mt="md">
                <Button variant="default">Cancel</Button>
                <Button disabled={chosen.length === 0}>Open</Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * The column mapping step: a reusable section (here a starting kit) meets data it was not written
 * on, and each column, type and source role it needs is paired with one of the open data's.
 * @returns the dialog.
 */
export function ColumnMappingMock(): React.JSX.Element {
    const [pairs, setPairs] = useState<Record<string, string | null>>(
        Object.fromEntries(MAPPING_ROWS.map((row) => [row.expected, row.match])),
    );
    const waiting = MAPPING_ROWS.filter((row) => pairs[row.expected] === null).flatMap((row) => row.waiting);

    return (
        <Modal opened onClose={NOOP} title="Map fraud-team-kit to transactions-2026-12.csv" size="lg">
            <Stack gap="sm">
                <Table fz="sm" verticalSpacing={4}>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Expected</Table.Th>
                            <Table.Th>Needs</Table.Th>
                            <Table.Th>Open data</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {MAPPING_ROWS.map((row) => (
                            <Table.Tr key={row.expected}>
                                <Table.Td>{row.expected}</Table.Td>
                                <Table.Td c={SECONDARY}>{row.needs}</Table.Td>
                                <Table.Td>
                                    <Select
                                        size="xs"
                                        aria-label={`Open column for ${row.expected}`}
                                        placeholder="Unpaired"
                                        clearable
                                        data={row.options}
                                        value={pairs[row.expected]}
                                        onChange={(value) => {
                                            setPairs((now) => ({ ...now, [row.expected]: value }));
                                        }}
                                    />
                                </Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
                {waiting.length === 0 ? null : (
                    <Stack gap={2}>
                        <Text size="sm" fw={500}>
                            Waiting for data ({waiting.length})
                        </Text>
                        {waiting.map((item) => (
                            <Text key={item} size="sm" c={SECONDARY}>
                                {item}
                            </Text>
                        ))}
                    </Stack>
                )}
            </Stack>
            <ModalFooter mt="md">
                <Button variant="default">Back</Button>
                <Button>Open</Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * The bind report: how notes, view and results bind when the open data differs from the data
 * they were written on.
 * @param props - Component props
 * @param props.other - true when other data is open (no match), false for the same data refreshed.
 * @returns the dialog.
 */
export function BindReportMock({ other = false }: Readonly<{ other?: boolean }>): React.JSX.Element {
    const rows: readonly BindRow[] = other ? BIND_NONE : BIND_PARTIAL;
    const [anyway, setAnyway] = useState(false);
    return (
        <Modal opened onClose={NOOP} title="Open card-fraud-week-46.graphty.json" size="lg">
            <Stack gap="sm">
                <Text size="sm" c={SECONDARY}>
                    {other ? "Open data: card-activity-week-47 . other dataset" : "Open data: refreshed since saved"}
                </Text>
                <Table fz="sm" verticalSpacing={4}>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Section</Table.Th>
                            <Table.Th>Binding</Table.Th>
                            <Table.Th>Bound</Table.Th>
                            <Table.Th>Detail</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.map((row) => (
                            <Table.Tr key={row.section}>
                                <Table.Td>{SECTION_LABELS[row.section]}</Table.Td>
                                <Table.Td>
                                    <Badge
                                        size="sm"
                                        variant="light"
                                        color={{ Match: "green", Partial: "yellow", "No match": "red" }[row.binding]}
                                    >
                                        {row.binding}
                                    </Badge>
                                </Table.Td>
                                <Table.Td>{row.bound}</Table.Td>
                                <Table.Td c={SECONDARY}>{row.detail}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
                {other ? (
                    <Switch
                        label="Bind to this data by key"
                        checked={anyway}
                        onChange={(event) => {
                            setAnyway(event.currentTarget.checked);
                        }}
                    />
                ) : null}
            </Stack>
            <ModalFooter mt="md">
                <Button variant="default">Back</Button>
                <Button disabled={other && !anyway}>Open</Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * Opening a section file (here a style) goes straight to its apply preview: what it is, what it
 * adds and what it needs from the open data.
 * @returns the dialog.
 */
export function StyleFilePreviewMock(): React.JSX.Element {
    const file = STYLE_FILE;
    const facts: [string, string][] = [
        ["Name", file.name],
        ["Modified", file.modified],
        ["Authors", file.authors],
        ["License", file.license],
        ["From", file.from],
        ["Adds", `${String(file.layers.length)} layers . palette ${file.palettes.join(", ")}`],
    ];
    return (
        <Modal opened onClose={NOOP} title={`Add ${file.fileName}`} size="lg">
            <Stack gap="sm">
                <Table fz="sm" verticalSpacing={2} withRowBorders={false}>
                    <Table.Tbody>
                        {facts.map(([label, value]) => (
                            <Table.Tr key={label}>
                                <Table.Td c={SECONDARY} w={110}>
                                    {label}
                                </Table.Td>
                                <Table.Td>{value}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
                <Text size="sm" fw={500}>
                    Layers, added on top
                </Text>
                <Text size="sm" c={SECONDARY}>
                    {file.layers.join(" . ")}
                </Text>
                <Table fz="sm" verticalSpacing={4}>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Needs</Table.Th>
                            <Table.Th>Open data</Table.Th>
                            <Table.Th>State</Table.Th>
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {file.needs.map((need) => (
                            <Table.Tr key={need.expected}>
                                <Table.Td>{need.expected}</Table.Td>
                                <Table.Td>{need.found}</Table.Td>
                                <Table.Td c={SECONDARY}>{need.state}</Table.Td>
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                </Table>
            </Stack>
            <ModalFooter mt="md">
                <Button variant="default">Cancel</Button>
                <Button variant="default">Map columns</Button>
                <Button>Add style</Button>
            </ModalFooter>
        </Modal>
    );
}
