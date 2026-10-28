import "./server.css";

import { ControlSection, Popout, PopoutManager, SegmentedControl } from "@graphty/compact-mantine";
import type { SourceCatalogEntry } from "@graphty/graphty-element/catalog";
import { type CodedFact, type SourceParamDescriptor, type SourcePreview } from "@graphty/graphty-element/session";
import {
    ActionIcon,
    Button,
    Checkbox,
    Loader,
    NumberInput,
    PasswordInput,
    Select,
    Text,
    Textarea,
    TextInput,
    Tooltip,
} from "@mantine/core";
import React, { useRef, useState } from "react";

import { GLYPHS } from "../glyphs";
import { useSessionVersion } from "../inspector/hooks";
import { useWorkspace, useWorkspaceState } from "../state/WorkspaceContext";
import {
    EXPAND_DEFAULTS,
    formCredential,
    formReady,
    freshForm,
    SERVER_DIALOG,
    type ServerFormState,
    serverKinds,
    serverRequest,
    START_WORDS,
    STARTER_QUERY,
    withExample,
} from "./commands";
import { CodeChip, PreviewRows } from "./PreviewRows";
import { failureOf } from "./words";

/** Dropdowns render inside the pop-over, so picking an option is not a click outside it. */
const IN_PLACE = { withinPortal: false } as const;

/** The params the form draws as its own rows, not as the source's generic rows. */
const OWN_ROWS = new Set(["mode"]);

/** Params few readers change, drawn in the Advanced section with the source's own advanced ones. */
const RARE_PARAMS = new Set(["transport", "database"]);

/**
 * One property row: a label and its control.
 * @param props - Component props
 * @param props.label - the label.
 * @param props.children - the control.
 * @returns the row.
 */
function Row({ label, children }: Readonly<{ label: string; children: React.ReactNode }>): React.JSX.Element {
    return (
        <div className="sv-row">
            <Text size="xs" c="dimmed" truncate>
                {label}
            </Text>
            <div className="sv-control">{children}</div>
        </div>
    );
}

/** What an expansion fetches, as the form and the node menu's Expand... edit it. */
type ExpandWith = ServerFormState["expandWith"];

/**
 * The rows of an expansion: depth, direction, edge types and limit.
 * @param props - Component props
 * @param props.value - what it fetches now.
 * @param props.onChange - takes the change.
 * @returns the rows.
 */
export function ExpandFields({
    value,
    onChange,
}: Readonly<{ value: ExpandWith; onChange: (next: ExpandWith) => void }>): React.JSX.Element {
    return (
        <>
            <Row label="Depth">
                <NumberInput
                    size="xs"
                    aria-label="Depth"
                    min={1}
                    max={5}
                    value={value.depth}
                    onChange={(depth) => {
                        onChange({ ...value, depth: Number(depth) || 1 });
                    }}
                />
            </Row>
            <Row label="Direction">
                <SegmentedControl
                    size="xs"
                    aria-label="Direction"
                    data={[
                        { value: "out", label: "Out" },
                        { value: "in", label: "In" },
                        { value: "both", label: "Both" },
                    ]}
                    value={value.direction}
                    onChange={(direction) => {
                        onChange({ ...value, direction: direction as ExpandWith["direction"] });
                    }}
                />
            </Row>
            <Row label="Edge types">
                <TextInput
                    size="xs"
                    aria-label="Edge types"
                    placeholder="any"
                    value={value.types}
                    onChange={(event) => {
                        onChange({ ...value, types: event.currentTarget.value });
                    }}
                />
            </Row>
            <Row label="Limit">
                <NumberInput
                    size="xs"
                    aria-label="Expand limit"
                    min={1}
                    value={value.limit}
                    onChange={(limit) => {
                        onChange({ ...value, limit: Number(limit) || EXPAND_DEFAULTS.limit });
                    }}
                />
            </Row>
        </>
    );
}

/**
 * A param's value as a control shows it: a list joined with commas, an object as JSON.
 * @param value - the value.
 * @returns the text.
 */
function shownText(value: unknown): string {
    if (Array.isArray(value)) {
        return value.join(", ");
    }
    if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    return typeof value === "string" || typeof value === "number" ? String(value) : "";
}

/**
 * One of a source's own params as a row, by its type.
 * @param props - Component props
 * @param props.param - the param.
 * @param props.value - its value.
 * @param props.onChange - takes the new value.
 * @returns the row.
 */
function ParamRow({
    param,
    value,
    onChange,
}: Readonly<{ param: SourceParamDescriptor; value: unknown; onChange: (next: unknown) => void }>): React.JSX.Element {
    const label = param.plainName;
    let control: React.ReactNode;
    if (param.type === "enum") {
        control = (
            <Select
                size="xs"
                aria-label={label}
                comboboxProps={IN_PLACE}
                data={(param.values ?? []).map((each) => ({ value: each.value, label: each.label }))}
                value={typeof value === "string" ? value : null}
                onChange={onChange}
            />
        );
    } else if (param.type === "boolean") {
        control = (
            <Checkbox
                size="xs"
                aria-label={label}
                checked={value === true}
                onChange={(event) => {
                    onChange(event.currentTarget.checked);
                }}
            />
        );
    } else if (param.type === "integer" || param.type === "number") {
        control = (
            <NumberInput
                size="xs"
                aria-label={label}
                min={param.min}
                max={param.max}
                value={typeof value === "number" ? value : ""}
                onChange={(next) => {
                    onChange(next === "" ? undefined : Number(next));
                }}
            />
        );
    } else if (param.type === "query" || param.type === "text") {
        control = (
            <Textarea
                size="xs"
                aria-label={label}
                autosize
                minRows={2}
                maxRows={8}
                className="sv-code-input"
                value={shownText(value)}
                onChange={(event) => {
                    onChange(event.currentTarget.value);
                }}
            />
        );
    } else {
        control = (
            <TextInput
                size="xs"
                aria-label={label}
                value={shownText(value)}
                onChange={(event) => {
                    onChange(event.currentTarget.value);
                }}
            />
        );
    }
    return <Row label={label}>{control}</Row>;
}

/**
 * Whether a param belongs in the Advanced section: the source marks it advanced, or few readers
 * change it.
 * @param param - the param.
 * @returns true for an Advanced row.
 */
function isRare(param: SourceParamDescriptor): boolean {
    return param.advanced === true || (RARE_PARAMS.has(param.name) && param.required !== true);
}

/**
 * Which of a source's params the form draws now, in the main rows or in Advanced: every one a
 * form need not hide, but the query only for a Query start and the seeds and depth only for a
 * Seed nodes start.
 * @param entry - the source.
 * @param mode - the Start picked, if the source has one.
 * @param rare - true for the Advanced rows, false for the main ones.
 * @returns the params.
 */
function shownParams(entry: SourceCatalogEntry, mode: unknown, rare: boolean): readonly SourceParamDescriptor[] {
    const hasMode = entry.descriptor.params.some((p) => p.name === "mode");
    return entry.descriptor.params.filter((param) => {
        if (OWN_ROWS.has(param.name) || isRare(param) !== rare) {
            return false;
        }
        if (hasMode && param.type === "query") {
            return mode === "query";
        }
        if (hasMode && (param.type === "node-id" || param.name === "depth")) {
            return mode === "neighborhood";
        }
        return true;
    });
}

/**
 * The API key row, for a source that takes a key and says where it goes; nothing for any other.
 * The key is never saved: the load remembers it in the element's credential store.
 * @param props - Component props
 * @param props.entry - the source.
 * @param props.value - the key typed.
 * @param props.onChange - takes a new key.
 * @returns the row, or nothing.
 */
function ApiKeyRow({
    entry,
    value,
    onChange,
}: Readonly<{ entry: SourceCatalogEntry; value: string; onChange: (key: string) => void }>): React.JSX.Element | null {
    const { auth = [], authRequired, apiKey } = entry.descriptor;
    if (authRequired === "none" || !auth.includes("api-key") || apiKey === undefined) {
        return null;
    }
    return (
        <Row label="API key">
            <PasswordInput
                size="xs"
                aria-label="API key"
                placeholder={authRequired === "optional" ? "optional" : "key"}
                autoComplete="off"
                value={value}
                onChange={(event) => {
                    onChange(event.currentTarget.value);
                }}
            />
        </Row>
    );
}

/**
 * The server form (spec section 3.9): Kind, Example, Endpoint, Sign in, Start, the query or the
 * source's own params, Limit and Expand on double-click; Test reads a preview, Load loads. Rows a
 * source cannot use are absent.
 * @param props - Component props
 * @param props.onClose - closes the pop-over.
 * @returns the form.
 */
function ServerForm({ onClose }: Readonly<{ onClose: () => void }>): React.JSX.Element {
    const { session, element } = useWorkspace();
    const kinds = serverKinds();
    const [form, setForm] = useState<ServerFormState>(() => {
        const first = kinds.find((each) => each.id === "neo4j") ?? kinds[0];
        return freshForm(first);
    });
    const [preview, setPreview] = useState<SourcePreview | null>(null);
    const [failure, setFailure] = useState<CodedFact | null>(null);
    const [busy, setBusy] = useState<"test" | "load" | null>(null);
    const entry = kinds.find((each) => each.id === form.kind);
    if (entry === undefined) {
        return <div className="sv-form" />;
    }
    const { descriptor } = entry;
    const auth = descriptor.auth ?? [];
    const signIn = descriptor.authRequired !== "none" && (auth.includes("basic") || auth.includes("bearer"));
    const modes = descriptor.params.find((p) => p.name === "mode")?.values ?? [];
    const samples = descriptor.samples ?? [];
    const change = (next: Partial<ServerFormState>): void => {
        setForm((was) => ({ ...was, ...next }));
        setPreview(null);
        setFailure(null);
    };
    const setParam = (name: string, value: unknown): void => {
        change({ params: { ...form.params, [name]: value } });
    };

    const ready = formReady(entry, form);
    const advanced = shownParams(entry, form.params.mode, true);
    const test = (): void => {
        if (session === null || busy !== null || !ready) {
            return;
        }
        const { input, options } = serverRequest(entry, form);
        const credential = formCredential(entry, form);
        setBusy("test");
        setFailure(null);
        session.data
            .previewSource(input, {
                maxNodes: 25,
                ...(options.endpoint === undefined ? {} : { endpoint: options.endpoint }),
                ...(credential === undefined ? {} : { credential }),
            })
            .then(setPreview, (error: unknown) => {
                setPreview(null);
                setFailure(failureOf(error));
            })
            .finally(() => {
                setBusy(null);
            });
    };

    const load = async (): Promise<void> => {
        if (session === null || busy !== null || !ready) {
            return;
        }
        const { input, options } = serverRequest(entry, form);
        const credential = formCredential(entry, form);
        const endpoint = options.endpoint ?? descriptor.defaultEndpoint ?? undefined;
        setBusy("load");
        setFailure(null);
        try {
            // Remembered in memory, never in the file, so Load more, Refresh and Expand find it.
            if (credential !== undefined && element !== null && endpoint !== undefined) {
                await element.credentials.remember({ source: entry.id, endpoint }, credential);
            }
            await session.data.import(input, {
                ...options,
                ...(credential === undefined ? {} : { credential }),
                ...(session.data.sources().length > 0 ? { mode: "merge" as const } : {}),
            });
            onClose();
        } catch (error) {
            setFailure(failureOf(error));
        } finally {
            setBusy(null);
        }
    };

    return (
        <form
            className="sv-form"
            aria-label="Server"
            onSubmit={(event) => {
                event.preventDefault();
                void load();
            }}
        >
            <Row label="Kind">
                <Select
                    size="xs"
                    aria-label="Kind"
                    allowDeselect={false}
                    comboboxProps={IN_PLACE}
                    data={kinds.map((each) => ({ value: each.id, label: each.descriptor.plainName }))}
                    value={form.kind}
                    onChange={(id) => {
                        const next = kinds.find((each) => each.id === id);
                        if (next !== undefined) {
                            setForm(freshForm(next));
                            setPreview(null);
                            setFailure(null);
                        }
                    }}
                />
            </Row>
            {samples.length === 0 ? null : (
                <Row label="Example">
                    <Select
                        size="xs"
                        aria-label="Example"
                        placeholder="none"
                        comboboxProps={IN_PLACE}
                        data={samples.map((each) => ({ value: each.id, label: each.plainName }))}
                        value={samples.find((each) => each.plainName === form.example)?.id ?? null}
                        onChange={(id) => {
                            change(withExample(entry, form, id));
                        }}
                    />
                </Row>
            )}
            <Row label="Endpoint">
                <TextInput
                    size="xs"
                    aria-label="Endpoint"
                    placeholder={descriptor.defaultEndpoint ?? "https://"}
                    value={form.endpoint}
                    onChange={(event) => {
                        change({ endpoint: event.currentTarget.value });
                    }}
                />
            </Row>
            {signIn ? (
                <Row label="Sign in">
                    <div className="sv-pair">
                        {auth.includes("basic") ? (
                            <TextInput
                                size="xs"
                                aria-label="User"
                                placeholder="user"
                                autoComplete="off"
                                value={form.user}
                                onChange={(event) => {
                                    change({ user: event.currentTarget.value });
                                }}
                            />
                        ) : null}
                        <PasswordInput
                            size="xs"
                            aria-label={auth.includes("basic") ? "Password" : "Token"}
                            placeholder={auth.includes("basic") ? "password" : "token"}
                            autoComplete="off"
                            value={form.secret}
                            onChange={(event) => {
                                change({ secret: event.currentTarget.value });
                            }}
                        />
                    </div>
                </Row>
            ) : null}
            <ApiKeyRow
                entry={entry}
                value={form.apiKey}
                onChange={(apiKey) => {
                    change({ apiKey });
                }}
            />
            {modes.length === 0 ? null : (
                <Row label="Start">
                    <SegmentedControl
                        size="xs"
                        aria-label="Start"
                        fullWidth
                        data={modes.map((each) => ({
                            value: each.value,
                            label: START_WORDS[each.value] ?? each.label,
                        }))}
                        value={typeof form.params.mode === "string" ? form.params.mode : (modes[0]?.value ?? "")}
                        onChange={(mode) => {
                            const query = descriptor.params.find((p) => p.type === "query");
                            const starter = query?.language === undefined ? undefined : STARTER_QUERY[query.language];
                            const fill =
                                mode === "query" &&
                                query !== undefined &&
                                starter !== undefined &&
                                !form.params[query.name]
                                    ? { [query.name]: starter }
                                    : {};
                            change({ params: { ...form.params, ...fill, mode } });
                        }}
                    />
                </Row>
            )}
            {shownParams(entry, form.params.mode, false).map((param) => (
                <ParamRow
                    key={param.name}
                    param={param}
                    value={form.params[param.name]}
                    onChange={(value) => {
                        setParam(param.name, value);
                    }}
                />
            ))}
            <Row label="Limit">
                <NumberInput
                    size="xs"
                    aria-label="Limit"
                    min={0}
                    placeholder="none"
                    value={form.limit === 0 ? "" : form.limit}
                    onChange={(limit) => {
                        change({ limit: Number(limit) || 0 });
                    }}
                />
            </Row>
            {entry.features.expand ? (
                <Row label="Expand">
                    <div className="sv-pair">
                        <Checkbox
                            size="xs"
                            label="on double-click"
                            checked={form.expand}
                            onChange={(event) => {
                                change({ expand: event.currentTarget.checked });
                            }}
                        />
                        <Popout>
                            <Popout.Trigger>
                                <Tooltip label="Expand settings">
                                    <ActionIcon variant="subtle" size="sm" aria-label="Expand settings">
                                        <GLYPHS.serverOptions size={14} aria-hidden />
                                    </ActionIcon>
                                </Tooltip>
                            </Popout.Trigger>
                            <Popout.Panel
                                width={240}
                                header={{ variant: "title", title: "Expand settings" }}
                                placement="right"
                                alignment="start"
                            >
                                <Popout.Content>
                                    <ExpandFields
                                        value={form.expandWith}
                                        onChange={(expandWith) => {
                                            change({ expandWith });
                                        }}
                                    />
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    </div>
                </Row>
            ) : null}
            {advanced.length === 0 ? null : (
                <ControlSection label="Advanced" defaultOpened={false}>
                    {advanced.map((param) => (
                        <ParamRow
                            key={param.name}
                            param={param}
                            value={form.params[param.name]}
                            onChange={(value) => {
                                setParam(param.name, value);
                            }}
                        />
                    ))}
                </ControlSection>
            )}
            <div className="sv-actions">
                {failure === null ? null : <CodeChip fact={failure} />}
                {/* aria-disabled while busy, not disabled, so the pressed button keeps focus. */}
                <Button
                    size="xs"
                    variant="default"
                    disabled={!ready}
                    aria-disabled={busy !== null}
                    leftSection={busy === "test" ? <Loader size={10} /> : null}
                    onClick={test}
                >
                    Test
                </Button>
                <Button
                    size="xs"
                    type="submit"
                    disabled={!ready}
                    aria-disabled={busy !== null}
                    leftSection={busy === "load" ? <Loader size={10} color="white" /> : null}
                >
                    Load
                </Button>
            </div>
            {preview === null ? null : <PreviewRows preview={preview} />}
        </form>
    );
}

/**
 * A reopened project's loads that wait for the reader (spec section 3.2, requirement 27): one row
 * each, with Approve. Nothing fetches until the reader approves.
 * @returns the rows, or nothing when no load waits.
 */
function WaitingLoads(): React.JSX.Element | null {
    const { session } = useWorkspace();
    useSessionVersion(session);
    const [failed, setFailed] = useState<Readonly<Record<string, CodedFact>>>({});
    const waiting = session?.data.pendingSourceLoads() ?? [];
    if (session === null || waiting.length === 0) {
        return null;
    }
    const names = new Map(serverKinds().map((each) => [each.id, each.descriptor.plainName]));
    return (
        <div // NOSONAR(S6819): a <ul>/<li> would bring list styling and spacing the compact rows do not use; the role gives the same semantics
            role="list"
            aria-label="Waiting loads"
            className="sv-waiting"
        >
            {waiting.map((load) => {
                const host = load.endpoint !== null && URL.canParse(load.endpoint) ? new URL(load.endpoint).host : "";
                const name = `${names.get(load.source) ?? load.source} ${host}`.trim();
                const fact = failed[load.id];
                return (
                    <div // NOSONAR(S6819): a <ul>/<li> would bring list styling and spacing the compact rows do not use; the role gives the same semantics
                        key={load.id}
                        role="listitem"
                        aria-label={name}
                        className="dp-source"
                    >
                        <span className="dp-source-icon">
                            <GLYPHS.server size={14} aria-hidden />
                        </span>
                        <span className="dp-source-name">{name}</span>
                        {fact === undefined ? null : <CodeChip fact={fact} />}
                        <Button
                            size="compact-xs"
                            variant="light"
                            onClick={() => {
                                session.data.runPendingSourceLoad(load.id).catch((error: unknown) => {
                                    setFailed((was) => ({ ...was, [load.id]: failureOf(error) }));
                                });
                            }}
                        >
                            Approve
                        </Button>
                    </div>
                );
            })}
        </div>
    );
}

/**
 * The server place in the left sidebar: the loads waiting for approval, and the anchor the
 * server form opens beside, as a pop-over, while the dialog is `"server"`.
 * @returns the place.
 */
export function ServerPlace(): React.JSX.Element {
    const { store } = useWorkspace();
    const anchor = useRef<HTMLDivElement>(null);
    const opened = useWorkspaceState((state) => state.dialog === SERVER_DIALOG);
    const close = (): void => {
        store.set((state) => (state.dialog === SERVER_DIALOG ? { dialog: null } : {}));
    };
    return (
        <>
            <WaitingLoads />
            <div className="sv-anchor" ref={anchor} aria-hidden />
            {/* Opened from Sources "+", so there is no Popout.Trigger: the panel opens beside the
                sidebar, level with the Sources section. */}
            <PopoutManager>
                <Popout
                    opened={opened}
                    onOpenChange={(open) => {
                        if (!open) {
                            close();
                        }
                    }}
                >
                    <Popout.Panel
                        width={320}
                        header={{ variant: "title", title: "Server" }}
                        anchorX={anchor}
                        anchorY={anchor}
                        placement="right"
                        alignment="start"
                    >
                        <Popout.Content>{opened ? <ServerForm onClose={close} /> : null}</Popout.Content>
                    </Popout.Panel>
                </Popout>
            </PopoutManager>
        </>
    );
}
