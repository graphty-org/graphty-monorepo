/**
 * The version 2 save and open dialogs (the "save-files-v2" experiment): Save as with its sections,
 * presets, copy or reference per source and file form; Open with its sections, runs, referenced
 * sources and binding; and the report either shows after. Every fact comes from graphty-element
 * (`project.describe`, `project.inspect`, the save and open reports); the words are the app's.
 */

import { ModalFooter, pickFiles, SegmentedControl, ToggleIconButton } from "@graphty/compact-mantine";
import {
    DOCUMENT_SECTIONS,
    type DocumentSection,
    type DocumentSectionFacts,
    type ProjectFileFacts,
    projectFileName,
    type ProjectFileSection,
    type ProjectOpenOptions,
    type ProjectSaveFacts,
    type ProjectSourceChoice,
    type SourceStorage,
} from "@graphty/graphty-element/session";
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
} from "@mantine/core";
import React, { useEffect, useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import { SAVE_AS_DIALOG, saveProjectAsV2 } from "./actions";
import { NameField } from "./NameField";
import { OPEN_V2_DIALOG, openQuestion, REPORT_V2_DIALOG, shownReport } from "./saveV2";
import {
    aboutRows,
    heldWords,
    needRows,
    refusedWords,
    type ReportLine,
    savePresets,
    SECTION_LABELS,
    sectionSummary,
    sourceDetail,
} from "./saveV2Words";

const SECONDARY = "var(--cm-text-secondary)";

/**
 * One checkbox per section, each with what it holds.
 * @param props - Component props
 * @param props.sections - the sections to list, with what graphty-element said each holds.
 * @param props.chosen - the sections checked.
 * @param props.onChange - takes the new choice.
 * @param props.summary - a section's line, when not its plain summary.
 * @returns the list.
 */
function SectionChecks({
    sections,
    chosen,
    onChange,
    summary = sectionSummary,
}: Readonly<{
    sections: readonly DocumentSectionFacts[];
    chosen: readonly DocumentSection[];
    onChange: (next: DocumentSection[]) => void;
    summary?: (facts: DocumentSectionFacts) => string;
}>): React.JSX.Element {
    return (
        <Checkbox.Group
            label="Sections"
            value={[...chosen]}
            onChange={(next) => {
                onChange(DOCUMENT_SECTIONS.filter((section) => next.includes(section)));
            }}
        >
            <SimpleGrid cols={2} spacing="sm" verticalSpacing={6} mt={4}>
                {sections.map((facts) => (
                    <Checkbox
                        key={facts.section}
                        value={facts.section}
                        label={
                            <Group gap={6}>
                                {SECTION_LABELS[facts.section]}
                                {facts.held === undefined ? null : (
                                    <Badge size="xs" color="yellow" variant="light">
                                        Held
                                    </Badge>
                                )}
                            </Group>
                        }
                        description={summary(facts)}
                    />
                ))}
            </SimpleGrid>
        </Checkbox.Group>
    );
}

/**
 * A report: each thing a save or open left out, kept or changed, and why.
 * @param props - Component props
 * @param props.lines - the report's lines.
 * @returns the table.
 */
export function ReportTable({ lines }: Readonly<{ lines: readonly ReportLine[] }>): React.JSX.Element {
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
                    <Table.Tr key={`${line.item}\n${line.outcome}\n${line.reason}`}>
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
 * A row with a name, a detail line under it and a control at its end.
 * @param props - Component props
 * @param props.name - the row's name.
 * @param props.detail - the line under it.
 * @param props.children - the control.
 * @returns the row.
 */
function ChoiceRow({
    name,
    detail,
    children,
}: Readonly<{ name: string; detail: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <Group justify="space-between" wrap="nowrap">
            <Stack gap={0} style={{ minWidth: 0 }}>
                <Text size="sm" truncate>
                    {name}
                </Text>
                <Text size="xs" c={SECONDARY}>
                    {detail}
                </Text>
            </Stack>
            {children}
        </Group>
    );
}

/**
 * The file's form: a full file, or a section file, which only one section can be.
 * @param props - Component props
 * @param props.sectionFile - whether a section file is chosen.
 * @param props.oneSection - whether exactly one section is chosen.
 * @param props.onChange - takes the new form.
 * @returns the control.
 */
export function FileForm({
    sectionFile,
    oneSection,
    onChange,
}: Readonly<{
    sectionFile: boolean;
    oneSection: boolean;
    onChange: (form: "full" | "section") => void;
}>): React.JSX.Element {
    return (
        <SegmentedControl
            label="File"
            value={sectionFile ? "section" : "full"}
            data={[
                { value: "full", label: "Full file" },
                { value: "section", label: "Section file", disabled: !oneSection },
            ]}
            onChange={(value) => {
                onChange(value === "section" ? "section" : "full");
            }}
        />
    );
}

/** How every source is kept: one choice, with a gear for each source's own. */
type Keep = "copy" | "reference";

/**
 * The sources' copy or reference choice: one switch for all, and a gear listing each source with
 * its own choice; a source graphty-element says cannot be referenced stays a copy, with why.
 * @param props - Component props
 * @param props.sources - what graphty-element said of each source.
 * @param props.storage - each source's choice, by record id.
 * @param props.onChange - takes the new choices.
 * @returns the control.
 */
function SourcesChoice({
    sources,
    storage,
    onChange,
}: Readonly<{
    sources: readonly ProjectSourceChoice[];
    storage: Readonly<Record<string, SourceStorage>>;
    onChange: (next: Record<string, SourceStorage>) => void;
}>): React.JSX.Element {
    const [each, setEach] = useState(false);
    const referable = sources.filter((source) => source.referable);
    const all: Keep =
        referable.length > 0 && referable.every((source) => storage[source.id] === "referenced") ? "reference" : "copy";
    return (
        <Stack gap={6}>
            <Text size="sm" fw={500}>
                Sources
            </Text>
            <Group gap="xs" wrap="nowrap" align="flex-end">
                <SegmentedControl
                    size="xs"
                    label="Sources"
                    value={all}
                    data={[
                        { value: "copy", label: "Copy" },
                        { value: "reference", label: "Reference", disabled: referable.length === 0 },
                    ]}
                    onChange={(value) => {
                        const kept: SourceStorage = value === "reference" ? "referenced" : "embedded";
                        onChange({ ...storage, ...Object.fromEntries(referable.map((source) => [source.id, kept])) });
                    }}
                />
                <ToggleIconButton
                    label="Each source"
                    icon={<GLYPHS.settings size={14} aria-hidden />}
                    checked={each}
                    onChange={setEach}
                />
            </Group>
            {each
                ? sources.map((source) => {
                      const refused = refusedWords(source);
                      const name = source.kind === "reader" ? "Your changes" : source.name;
                      return (
                          <ChoiceRow
                              key={source.id}
                              name={name}
                              detail={
                                  refused === undefined ? sourceDetail(source) : `${sourceDetail(source)} . ${refused}`
                              }
                          >
                              <SegmentedControl
                                  size="xs"
                                  label={`Keep ${name}`}
                                  value={storage[source.id] === "referenced" ? "reference" : "copy"}
                                  data={[
                                      { value: "copy", label: "Copy" },
                                      { value: "reference", label: "Reference", disabled: !source.referable },
                                  ]}
                                  onChange={(value) => {
                                      onChange({
                                          ...storage,
                                          [source.id]: value === "reference" ? "referenced" : "embedded",
                                      });
                                  }}
                              />
                          </ChoiceRow>
                      );
                  })
                : null}
        </Stack>
    );
}

/**
 * Each source's choice as graphty-element keeps it when not told, the reader's own changes left out.
 * @param facts - what graphty-element said a save would write.
 * @returns the choices, by record id.
 */
function storageOf(facts: ProjectSaveFacts): Record<string, SourceStorage> {
    return Object.fromEntries(
        facts.sources.filter((source) => source.kind !== "reader").map((source) => [source.id, source.storage]),
    );
}

/**
 * Save as... with version 2 files on (`#/project-menu/save-as`): the name, a preset per use case,
 * the sections with what each holds, copy or reference for the sources, and the file's form. The
 * whole project is kept in this browser, as Save as keeps it; anything else downloads as a copy.
 * @returns the dialog.
 */
function SaveAsV2Dialog(): React.JSX.Element {
    const workspace = useWorkspace();
    const { session } = workspace;
    const opened = useWorkspaceState((state) => state.dialog === SAVE_AS_DIALOG);
    const current = useWorkspaceState((state) => state.project?.name ?? "");
    const [name, setName] = useState(current);
    const [facts, setFacts] = useState<ProjectSaveFacts | null>(null);
    const [chosen, setChosen] = useState<DocumentSection[]>([...DOCUMENT_SECTIONS]);
    const [storage, setStorage] = useState<Record<string, SourceStorage>>({});
    const [form, setForm] = useState<"full" | "section">("full");
    const [saving, setSaving] = useState(false);
    // Whether the save chosen is the project or a copy, as graphty-element says for the choice.
    const [whole, setWhole] = useState(true);
    // Whether another dialog took the slot during a save: the save then leaves the slot to it.
    const left = useRef(false);

    useEffect(() => {
        if (!opened || session === null) {
            left.current = true;
            return undefined;
        }
        setName(workspace.store.get().project?.name ?? "");
        setChosen([...DOCUMENT_SECTIONS]);
        setForm("full");
        setFacts(null);
        let live = true;
        session.project.describe().then(
            (described) => {
                if (live) {
                    setFacts(described);
                    setStorage(storageOf(described));
                }
            },
            () => {
                if (live) {
                    workspace.store.set({
                        dialog: null,
                        notice: { message: "This project cannot be saved as a version 2 file.", error: true },
                    });
                }
            },
        );
        return () => {
            live = false;
        };
    }, [opened, session, workspace.store]);

    const presets = savePresets(DOCUMENT_SECTIONS);
    const matched = presets.find(
        (preset) => preset.sections.length === chosen.length && preset.sections.every((s) => chosen.includes(s)),
    );
    const one = chosen.length === 1 ? chosen[0] : null;
    const sectionFile = one !== null && form === "section";
    const fileForm = sectionFile ? "section" : "full";

    useEffect(() => {
        if (!opened || session === null || chosen.length === 0) {
            return undefined;
        }
        let live = true;
        session.project.describe({ sections: chosen, form: fileForm }).then(
            (described) => {
                if (live) {
                    setWhole(described.project);
                }
            },
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [opened, session, chosen, fileForm]);

    const trimmed = name.trim();
    const close = (): void => {
        workspace.store.set({ dialog: null });
    };
    const save = async (): Promise<void> => {
        if (trimmed === "" || saving || facts === null || chosen.length === 0) {
            return;
        }
        setSaving(true);
        left.current = false;
        try {
            await saveProjectAsV2(workspace, trimmed, { sections: chosen, form: fileForm, embed: storage }, whole);
            if (!left.current) {
                close();
            }
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal opened={opened} onClose={close} title={`Save ${current} as`} size="lg">
            <form
                onSubmit={(event) => {
                    event.preventDefault();
                    void save();
                }}
            >
                <Stack gap="sm">
                    <NameField value={name} onChange={setName} />
                    <Select
                        label="Preset"
                        placeholder="Custom"
                        data={presets.map(({ value, label }) => ({ value, label }))}
                        value={matched?.value ?? null}
                        onChange={(value) => {
                            const next = presets.find((preset) => preset.value === value);
                            if (next !== undefined) {
                                setChosen([...next.sections]);
                            }
                        }}
                    />
                    {facts === null ? null : (
                        <SectionChecks
                            sections={facts.sections}
                            chosen={chosen}
                            onChange={setChosen}
                            summary={(section) =>
                                facts.sections.find((each) => each.section === section.section)?.saved === false
                                    ? `${sectionSummary(section)} . off by default`
                                    : sectionSummary(section)
                            }
                        />
                    )}
                    {facts !== null && chosen.includes("data") && facts.sources.length > 0 ? (
                        <SourcesChoice sources={facts.sources} storage={storage} onChange={setStorage} />
                    ) : null}
                    <FileForm sectionFile={sectionFile} oneSection={one !== null} onChange={setForm} />
                    {whole ? null : (
                        <Text size="sm" ff="monospace" c={SECONDARY}>
                            {projectFileName(trimmed, sectionFile && one !== null ? { section: one } : {})}
                        </Text>
                    )}
                </Stack>
                <ModalFooter mt="md">
                    <Button variant="default" onClick={close}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={trimmed === "" || facts === null || chosen.length === 0}
                        loading={saving}
                    >
                        {whole ? "Save" : "Save copy"}
                    </Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

/**
 * One run in the Open dialog: rerun (the default) or restore its saved results; a run that cannot
 * be replayed exactly only restores.
 * @param props - Component props
 * @param props.name - the run's name.
 * @param props.replayable - whether it can be replayed.
 * @param props.restorable - whether its saved results load.
 * @param props.rerun - whether it reruns now.
 * @param props.onChange - takes the reader's choice.
 * @returns the row.
 */
function RunRow({
    name,
    replayable,
    restorable,
    rerun,
    onChange,
}: Readonly<{
    name: string;
    replayable: boolean;
    restorable: boolean;
    rerun: boolean;
    onChange: (rerun: boolean) => void;
}>): React.JSX.Element {
    if (!replayable) {
        return (
            <ChoiceRow name={name} detail="">
                <Text size="xs" c={SECONDARY}>
                    {restorable ? "Restores saved results" : "Not run: no saved results"}
                </Text>
            </ChoiceRow>
        );
    }
    return (
        <ChoiceRow name={name} detail="">
            <SegmentedControl
                size="xs"
                label={`On open, ${name}`}
                value={rerun || !restorable ? "rerun" : "restore"}
                data={[
                    { value: "rerun", label: "Rerun" },
                    { value: "restore", label: "Restore", disabled: !restorable },
                ]}
                onChange={(value) => {
                    onChange(value === "rerun");
                }}
            />
        </ChoiceRow>
    );
}

/**
 * A referenced source in the Open dialog: where it is read from, and Locate... for a file.
 * @param props - Component props
 * @param props.name - its name.
 * @param props.where - its address or path.
 * @param props.picked - the file the reader picked for it, if any.
 * @param props.onPick - takes the picked file; absent for a source read from the web.
 * @returns the row.
 */
function ReferencedRow({
    name,
    where,
    picked,
    onPick,
}: Readonly<{ name: string; where: string; picked?: File; onPick?: (file: File) => void }>): React.JSX.Element {
    return (
        <ChoiceRow name={name} detail={picked?.name ?? where}>
            {onPick === undefined ? null : (
                <Button
                    size="xs"
                    variant="default"
                    aria-label={`Locate ${name}`}
                    onClick={() => {
                        void pickFiles().then(([file]) => {
                            if (file !== undefined) {
                                onPick(file);
                            }
                        });
                    }}
                >
                    Locate...
                </Button>
            )}
        </ChoiceRow>
    );
}

/**
 * The facts a section file gives of itself, as rows of a label and a value.
 * @param props - Component props
 * @param props.rows - the rows.
 * @returns the table.
 */
function AboutTable({ rows }: Readonly<{ rows: readonly [string, string][] }>): React.JSX.Element {
    return (
        <Table fz="sm" verticalSpacing={2} withRowBorders={false}>
            <Table.Tbody>
                {rows.map(([label, value]) => (
                    <Table.Tr key={label}>
                        <Table.Td c={SECONDARY} w={110}>
                            {label}
                        </Table.Td>
                        <Table.Td>{value}</Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}

/**
 * What a section file needs from the open data, and whether the open data has it.
 * @param props - Component props
 * @param props.facts - what graphty-element read of the section.
 * @returns the table, or nothing when it needs nothing.
 */
function NeedsTable({ facts }: Readonly<{ facts: ProjectFileSection }>): React.JSX.Element | null {
    const rows = needRows(facts);
    if (rows.length === 0) {
        return null;
    }
    return (
        <Table fz="sm" verticalSpacing={4}>
            <Table.Thead>
                <Table.Tr>
                    <Table.Th>Needs</Table.Th>
                    <Table.Th>Open data</Table.Th>
                    <Table.Th>State</Table.Th>
                </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
                {rows.map((row) => (
                    <Table.Tr key={row.need}>
                        <Table.Td>{row.need}</Table.Td>
                        <Table.Td>{row.found}</Table.Td>
                        <Table.Td c={SECONDARY}>{row.state}</Table.Td>
                    </Table.Tr>
                ))}
            </Table.Tbody>
        </Table>
    );
}

/**
 * The sections an open would load by default: every one the file holds that is not held.
 * @param facts - what graphty-element read of the file.
 * @returns the sections.
 */
function loadable(facts: ProjectFileFacts | undefined): DocumentSection[] {
    return (facts?.sections ?? []).filter((section) => section.held === undefined).map((section) => section.section);
}

/**
 * Open with version 2 files on: a version 2 file is asked about before it opens -- a warning per
 * held section, the sections to load, each run rerun or restored, its referenced sources (fetching
 * one is the reader's click) and whether sections written on other data bind by key. A section
 * file other than data is added to the project, so it shows what it is, what it adds and what it
 * needs from the open data.
 * @returns the dialog.
 */
function OpenV2Dialog(): React.JSX.Element {
    const { store, session } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === OPEN_V2_DIALOG);
    const question = opened ? openQuestion(store) : undefined;
    const facts = question?.facts;
    const [chosen, setChosen] = useState<DocumentSection[]>([]);
    const [restore, setRestore] = useState<ReadonlySet<string>>(new Set());
    const [fetch, setFetch] = useState(false);
    const [bind, setBind] = useState(false);
    const [files, setFiles] = useState<Record<string, File>>({});
    // How each bound section would bind with the sections chosen, as graphty-element says.
    const [bound, setBound] = useState<ProjectFileFacts | undefined>(undefined);

    useEffect(() => {
        if (!opened) {
            return undefined;
        }
        setChosen(loadable(openQuestion(store)?.facts));
        setRestore(new Set());
        setFetch(false);
        setBind(false);
        setFiles({});
        // Closed without an answer (another dialog took the slot): the open is cancelled.
        return () => {
            openQuestion(store)?.answer(null);
        };
    }, [opened, store]);

    const file = question?.file;
    useEffect(() => {
        setBound(undefined);
        if (file === undefined || session === null) {
            return undefined;
        }
        let live = true;
        session.project.inspect(file, { sections: chosen }).then(
            (read) => {
                if (live) {
                    setBound(read);
                }
            },
            () => undefined,
        );
        return () => {
            live = false;
        };
    }, [file, session, chosen]);

    const finish = (options: ProjectOpenOptions | null): void => {
        question?.answer(options);
        store.set({ dialog: null });
    };
    const sections = facts?.sections ?? [];
    const runs = facts?.runs ?? [];
    const results = chosen.includes("results");
    const referenced = (facts?.sources ?? []).filter((source) => source.storage === "referenced");
    const other = (bound?.sections ?? [])
        .filter((section) => section.binding === "other-data")
        .map((section) => section.section);
    const open = (): void => {
        finish({
            sections: chosen,
            rerun: true,
            runs: Object.fromEntries(runs.map((run) => [run.id, !(results && run.restorable && restore.has(run.id))])),
            fetchSources: fetch,
            bindOtherData: bind,
            ...(Object.keys(files).length === 0 ? {} : { files }),
        });
    };
    const cancel = (): void => {
        finish(null);
    };
    // Sections written on other data load only when the reader binds them by key.
    const bindChoice =
        other.length > 0 ? (
            <ChoiceRow name={other.map((section) => SECTION_LABELS[section]).join(", ")} detail="Written on other data">
                <Switch
                    label="Bind to this data by key"
                    checked={bind}
                    onChange={(event) => {
                        setBind(event.currentTarget.checked);
                    }}
                />
            </ChoiceRow>
        ) : null;
    // A section file other than data is added to the project.
    const [only] = sections;
    const adds = facts?.form === "section" && only !== undefined && only.section !== "data" ? only : undefined;

    if (adds !== undefined) {
        const label = SECTION_LABELS[adds.section];
        return (
            <Modal opened={opened} onClose={cancel} title={`Add ${question?.fileName ?? ""}`} size="lg">
                <Stack gap="sm">
                    {adds.held === undefined ? null : (
                        <Alert color="yellow" title={`${label}: ${heldWords(adds.held.reason, adds.held.version)}`} />
                    )}
                    <AboutTable rows={aboutRows(adds)} />
                    <NeedsTable facts={adds} />
                    {bindChoice}
                </Stack>
                <ModalFooter mt="md">
                    <Button variant="default" onClick={cancel}>
                        Cancel
                    </Button>
                    <Button data-autofocus disabled={adds.held !== undefined} onClick={open}>
                        {`Add ${label.toLowerCase()}`}
                    </Button>
                </ModalFooter>
            </Modal>
        );
    }

    return (
        <Modal opened={opened} onClose={cancel} title={`Open ${question?.fileName ?? ""}`} size="lg">
            <Stack gap="sm">
                {sections
                    .filter((section) => section.held !== undefined)
                    .map((section) => (
                        <Alert
                            key={section.section}
                            color="yellow"
                            title={`${SECTION_LABELS[section.section]}: ${heldWords(section.held?.reason, section.held?.version)}`}
                        >
                            Kept as is; {SECTION_LABELS[section.section].toLowerCase()} changes are not saved.
                        </Alert>
                    ))}
                <SectionChecks
                    sections={sections}
                    chosen={chosen}
                    onChange={setChosen}
                    summary={(section) =>
                        section.section === "recipe"
                            ? `${sectionSummary(section)} . kept, not applied`
                            : sectionSummary(section)
                    }
                />
                {chosen.includes("data") && referenced.length > 0 ? (
                    <Stack gap={6}>
                        <Text size="sm" fw={500}>
                            Referenced sources
                        </Text>
                        {referenced.map((source) => (
                            <ReferencedRow
                                key={source.id}
                                name={source.name}
                                where={source.url ?? source.path ?? ""}
                                picked={files[source.id]}
                                {...(source.url === undefined
                                    ? {
                                          onPick: (file: File) => {
                                              setFiles((now) => ({ ...now, [source.id]: file }));
                                          },
                                      }
                                    : {})}
                            />
                        ))}
                        {referenced.some((source) => source.url !== undefined) ? (
                            <Switch
                                label="Fetch referenced sources"
                                checked={fetch}
                                onChange={(event) => {
                                    setFetch(event.currentTarget.checked);
                                }}
                            />
                        ) : null}
                    </Stack>
                ) : null}
                {chosen.includes("view") && runs.length > 0 ? (
                    <Stack gap={6}>
                        <Text size="sm" fw={500}>
                            Runs
                        </Text>
                        {runs.map((run) => (
                            <RunRow
                                key={run.id}
                                name={run.id === "layout" ? "Layout" : (run.name ?? run.algorithm ?? run.id)}
                                replayable={run.replayable}
                                restorable={results && run.restorable}
                                rerun={!restore.has(run.id)}
                                onChange={(rerun) => {
                                    setRestore((now) => {
                                        const next = new Set(now);
                                        if (rerun) {
                                            next.delete(run.id);
                                        } else {
                                            next.add(run.id);
                                        }
                                        return next;
                                    });
                                }}
                            />
                        ))}
                    </Stack>
                ) : null}
                {bindChoice}
            </Stack>
            <ModalFooter mt="md">
                <Button
                    variant="default"
                    onClick={() => {
                        finish(null);
                    }}
                >
                    Cancel
                </Button>
                <Button data-autofocus disabled={chosen.length === 0} onClick={open}>
                    Open
                </Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * What a version 2 save or open reported: each thing left out, kept or changed, and why.
 * @returns the dialog.
 */
function ReportV2Dialog(): React.JSX.Element {
    const { store } = useWorkspace();
    const opened = useWorkspaceState((state) => state.dialog === REPORT_V2_DIALOG);
    const report = opened ? shownReport(store) : undefined;
    const close = (): void => {
        store.set({ dialog: null });
    };
    return (
        <Modal opened={opened} onClose={close} title={report?.title ?? ""} size="lg">
            <ReportTable lines={report?.lines ?? []} />
            <ModalFooter mt="md">
                <Button data-autofocus onClick={close}>
                    Done
                </Button>
            </ModalFooter>
        </Modal>
    );
}

/**
 * The version 2 Save as, Open and report dialogs, which the workspace loads on first use.
 * @returns the dialogs.
 */
export function SaveFilesV2Dialogs(): React.JSX.Element {
    return (
        <>
            <SaveAsV2Dialog />
            <OpenV2Dialog />
            <ReportV2Dialog />
        </>
    );
}
