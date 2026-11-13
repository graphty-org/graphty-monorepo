/**
 * Network data (data prototype spec section 3.9): the Sources "+" Network data... door (the start
 * page's Open network data chooser, whose cards open the server form), the
 * Expand... and Collapse verbs on a node a server load brought, and how the form's rows become one
 * `data.import` call. graphty-element reads the server, pages, refreshes and expands; this file
 * only turns what the reader picked into its inputs.
 */

import { type SourceCatalogEntry, sourceDescriptors } from "@graphty/graphty-element/catalog";
import {
    type Credential,
    credentials,
    type ExpandBehavior,
    type GraphSession,
    type NodeId,
    type SourceInput,
    type SourceKey,
    type SourceLoadOptions,
    type SourceParamDescriptor,
    type SourceSettings,
} from "@graphty/graphty-element/session";

import { type CommandContext, defineRegistration } from "../commands/registry";
import { newProjectId, type WorkspaceStore } from "../state/store";
import { panelsInView } from "../time/timeActions";
import { codeWords, failureOf, kindName } from "./words";

/** The `dialog` value that opens Open network data, the chooser of servers and a web address. */
export const NETWORK_DIALOG = "network";

/** The `dialog` value that opens the server form beside the Sources section. */
export const SERVER_DIALOG = "server";

/** The `dialog` value that opens Expand... for the selected node. */
export const EXPAND_DIALOG = "server-expand";

/** What each Start value is called; the element's own name for a value not listed here. */
export const START_WORDS: Readonly<Record<string, string>> = {
    query: "Query",
    neighborhood: "Seed nodes",
    all: "Everything",
};

/** A query to start from, per query language, so Test has something to run. */
const STARTER_QUERY: Readonly<Record<string, string>> = {
    cypher: "MATCH (n)-[r]->(m) RETURN n, r, m",
    sparql: "CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }",
};

/**
 * The servers the form offers: every registered source this browser can reach.
 * @returns the catalog entries.
 */
export function serverKinds(): readonly SourceCatalogEntry[] {
    return sourceDescriptors().filter((each) => each.descriptor.runtimes?.browser?.supported !== false);
}

/** What the form holds. */
export interface ServerFormState {
    /** The source id. */
    readonly kind: string;
    /** The endpoint; the source's default when blank. */
    readonly endpoint: string;
    /** A basic sign-in's user. */
    readonly user: string;
    /** A basic sign-in's password, or a bearer token. Never saved. */
    readonly secret: string;
    /** An API key, for a source that says where its key goes. Never saved. */
    readonly apiKey: string;
    /** The source's params, as typed. */
    readonly params: Readonly<Record<string, unknown>>;
    /** At most this many nodes; 0 for no cap. */
    readonly limit: number;
    /** Whether a double-click expands a node this load brings. */
    readonly expand: boolean;
    /** What an expansion fetches. */
    readonly expandWith: Required<Pick<ExpandBehavior, "depth" | "direction" | "limit">> & {
        /** Edge types, comma separated; blank for any. */
        readonly types: string;
    };
}

/** What an expansion fetches until the reader changes it (spec section 3.9). */
export const EXPAND_DEFAULTS: ServerFormState["expandWith"] = { depth: 1, direction: "both", limit: 50, types: "" };

/**
 * A fresh form for a source: its first Start, its starter query, a 500 node cap, and expand on
 * double-click when the source can expand.
 * @param entry - the source.
 * @returns the form.
 */
export function freshForm(entry: SourceCatalogEntry): ServerFormState {
    const mode = entry.descriptor.params.find((p) => p.name === "mode")?.values?.[0]?.value;
    const query = entry.descriptor.params.find((p) => p.type === "query");
    const starter = query?.language === undefined ? undefined : STARTER_QUERY[query.language];
    return {
        kind: entry.id,
        endpoint: "",
        user: "",
        secret: "",
        apiKey: "",
        params: {
            ...(mode === undefined ? {} : { mode }),
            ...(query === undefined || starter === undefined ? {} : { [query.name]: starter }),
        },
        limit: 500,
        expand: entry.features.expand,
        expandWith: EXPAND_DEFAULTS,
    };
}

/**
 * How a load started, as its settings say (graphty-element fills in the mode a query source read in).
 * @param config - the load's params.
 * @returns the Start value, or null when the params name none.
 */
function startOf(config: Readonly<Record<string, unknown>>): string | null {
    return typeof config.mode === "string" ? config.mode : null;
}

/**
 * A form opened to edit a load: its settings, with the sign-in rows empty. User stays empty on
 * purpose: a user with a blank password would be a login that overrides the remembered one.
 * @param entry - the source.
 * @param settings - what the load holds, from `data.sourceSettings`.
 * @returns the form.
 */
export function formFromSettings(entry: SourceCatalogEntry, settings: SourceSettings): ServerFormState {
    const { expand, config } = settings;
    return {
        kind: entry.id,
        endpoint: settings.endpoint ?? "",
        user: "",
        secret: "",
        apiKey: "",
        params: { ...config },
        limit: settings.limits?.maxNodes ?? 0,
        expand: expand !== undefined,
        expandWith:
            expand === undefined
                ? EXPAND_DEFAULTS
                : {
                      depth: expand.depth ?? EXPAND_DEFAULTS.depth,
                      direction: expand.direction ?? EXPAND_DEFAULTS.direction,
                      limit: expand.limit ?? EXPAND_DEFAULTS.limit,
                      types: (expand.relationshipTypes ?? []).join(", "),
                  },
    };
}

/**
 * The params a load holds that its source does not declare (a Web API's template values), as
 * params the form can draw.
 * @param entry - the source.
 * @param params - the params the form holds.
 * @returns one descriptor per undeclared param, named by itself.
 */
export function undeclaredParams(
    entry: SourceCatalogEntry,
    params: Readonly<Record<string, unknown>>,
): readonly SourceParamDescriptor[] {
    const declared = new Set(entry.descriptor.params.map((p) => p.name));
    return Object.keys(params)
        .filter((name) => !declared.has(name))
        .map((name) => ({ name, plainName: name, type: "string" as const }));
}

/** What the right panel draws about a load's settings. */
export interface SettingsFacts {
    /** Short values, one row each. */
    readonly rows: readonly { readonly name: string; readonly value: string | number }[];
    /** Long values (a query, a mapping), each its own section. */
    readonly long: readonly { readonly name: string; readonly value: string }[];
}

/**
 * A param's value as the panel shows it.
 * @param value - the value.
 * @returns the text, or null for nothing to show.
 */
function shownValue(value: unknown): string | null {
    if (Array.isArray(value)) {
        return value.join(", ");
    }
    if (typeof value === "object" && value !== null) {
        return JSON.stringify(value, null, 2);
    }
    if (typeof value === "boolean") {
        return value ? "Yes" : "No";
    }
    return typeof value === "string" || typeof value === "number" ? String(value) : null;
}

/**
 * What a load connects to and fetches, as the right panel draws it: Start, each param with a
 * value, Limit and Expand. A query or a mapping is long, and goes in a section of its own.
 * @param entry - the source.
 * @param settings - what the load holds.
 * @returns the rows.
 */
export function settingsFacts(entry: SourceCatalogEntry, settings: SourceSettings): SettingsFacts {
    const { config } = settings;
    const { params } = entry.descriptor;
    const rows: SettingsFacts["rows"][number][] = [];
    const long: SettingsFacts["long"][number][] = [];
    const start = startOf(config);
    if (start !== null && params.some((p) => p.name === "mode")) {
        rows.push({ name: "Start", value: START_WORDS[start] ?? start });
    }
    for (const { name, plainName, type } of [...params, ...undeclaredParams(entry, config)]) {
        const value = name === "mode" ? null : shownValue(config[name]);
        if (value !== null && value !== "") {
            (type === "query" || type === "text" ? long : rows).push({ name: plainName, value });
        }
    }
    if (settings.limits?.maxNodes !== undefined) {
        rows.push({ name: "Limit", value: settings.limits.maxNodes });
    }
    if (settings.expand !== undefined) {
        rows.push({ name: "Expand", value: "On double-click" });
    }
    return { rows, long };
}

/**
 * Whether a source can be edited in the form: a network load of a kind this browser can reach.
 * @param session - the session.
 * @param key - the source's key.
 * @returns its settings, or undefined when it cannot be edited.
 */
export function editableSettings(session: GraphSession | null, key: SourceKey): SourceSettings | undefined {
    const settings = session?.data.sourceSettings(key);
    return settings !== undefined && serverKinds().some((each) => each.id === settings.source) ? settings : undefined;
}

/**
 * Whether a typed value is blank: nothing, empty text or an empty list.
 * @param value - the value.
 * @returns true when blank.
 */
function isBlank(value: unknown): boolean {
    return (
        value === undefined ||
        value === null ||
        (typeof value === "string" && value.trim() === "") ||
        (Array.isArray(value) && value.length === 0)
    );
}

/**
 * Whether the form holds what Test and Load need: an endpoint when the source has no default,
 * every required param, the query for a Query start and the seeds for a Seed nodes start.
 * @param entry - the source.
 * @param form - the form.
 * @returns true when ready.
 */
export function formReady(entry: SourceCatalogEntry, form: ServerFormState): boolean {
    const { descriptor } = entry;
    if (form.endpoint.trim() === "" && isBlank(descriptor.defaultEndpoint)) {
        return false;
    }
    const hasMode = descriptor.params.some((p) => p.name === "mode");
    const { mode } = form.params;
    return descriptor.params.every((param) => {
        const needed =
            param.required === true ||
            (hasMode && param.type === "query" && mode === "query") ||
            (hasMode && param.type === "node-id" && mode === "neighborhood");
        return !needed || !isBlank(form.params[param.name]);
    });
}

/**
 * The form with a new Start: a Query start gets the starter query when its box is empty.
 * @param entry - the source.
 * @param form - the form now.
 * @param mode - the Start picked.
 * @returns the form.
 */
export function withStart(entry: SourceCatalogEntry, form: ServerFormState, mode: string): ServerFormState {
    const query = entry.descriptor.params.find((p) => p.type === "query");
    const starter = query?.language === undefined ? undefined : STARTER_QUERY[query.language];
    const fill =
        mode === "query" && query !== undefined && starter !== undefined && !form.params[query.name]
            ? { [query.name]: starter }
            : {};
    return { ...form, params: { ...form.params, ...fill, mode } };
}

/**
 * Splits a comma list into its trimmed, non-empty items.
 * @param text - the list.
 * @returns the items.
 */
export function splitList(text: string): string[] {
    return text
        .split(",")
        .map((each) => each.trim())
        .filter((each) => each !== "");
}

/**
 * A typed param's value as the source takes it: a node-id list split on commas, a text param
 * that holds JSON (a REST mapping) parsed, a blank left out.
 * @param type - the param's type.
 * @param value - what was typed.
 * @returns the value, or undefined to leave it out.
 */
function paramValue(type: string, value: unknown): unknown {
    if (typeof value !== "string") {
        return value;
    }
    if (value.trim() === "") {
        return undefined;
    }
    if (type === "node-id") {
        return splitList(value);
    }
    if (type === "text" && value.trim().startsWith("{")) {
        try {
            return JSON.parse(value) as unknown;
        } catch {
            return value;
        }
    }
    return value;
}

/**
 * The credential the form's Sign in or API key rows make, or undefined when they are blank or the
 * source takes none of basic, bearer or an API key it says where to send.
 * @param entry - the source.
 * @param form - the form.
 * @returns the credential.
 */
function formCredential(entry: SourceCatalogEntry, form: ServerFormState): Credential | undefined {
    const auth = entry.descriptor.auth ?? [];
    if (auth.includes("basic") && form.user !== "") {
        return credentials.basic(form.user, form.secret);
    }
    if (auth.includes("bearer") && form.secret !== "") {
        return credentials.bearer(form.secret);
    }
    const where = entry.descriptor.apiKey;
    if (auth.includes("api-key") && where !== undefined && form.apiKey !== "") {
        return credentials.apiKey(where, form.apiKey);
    }
    return undefined;
}

/**
 * The form as one `data.import` call: the source and its params, and the endpoint, the cap and
 * the load's own double-click expand. The credential is not in it: `serverLoad` adds it.
 * @param entry - the source.
 * @param form - the form.
 * @returns the input and the options.
 */
export function serverRequest(
    entry: SourceCatalogEntry,
    form: ServerFormState,
): { input: SourceInput; options: SourceLoadOptions } {
    const config: Record<string, unknown> = {};
    for (const { name, type } of [...entry.descriptor.params, ...undeclaredParams(entry, form.params)]) {
        const value = paramValue(type, form.params[name]);
        if (value !== undefined) {
            config[name] = value;
        }
    }
    const endpoint = form.endpoint.trim();
    const types = splitList(form.expandWith.types);
    const expand: ExpandBehavior = {
        trigger: "double-click",
        depth: form.expandWith.depth,
        direction: form.expandWith.direction,
        limit: form.expandWith.limit,
        ...(types.length === 0 ? {} : { relationshipTypes: types }),
    };
    const host = URL.canParse(endpoint) ? new URL(endpoint).host : null;
    const name = host === null ? kindName(entry) : `${kindName(entry)} ${host}`;
    return {
        input: { source: entry.id, config, name },
        options: {
            ...(endpoint === "" ? {} : { endpoint }),
            ...(form.limit > 0 ? { limits: { maxNodes: form.limit, onLimit: "stop" as const } } : {}),
            ...(form.expand && entry.features.expand ? { expand } : {}),
        },
    };
}

/** What Load and Test send: the read, and the sign-in to remember in memory. */
export interface ServerLoad {
    readonly input: SourceInput;
    /** The load's options, the credential among them. */
    readonly options: SourceLoadOptions;
    readonly credential: Credential | undefined;
    /** Where the credential goes: the typed endpoint, else the source's default. */
    readonly endpoint: string | undefined;
}

/**
 * The form as what Load hands over.
 * @param entry - the source.
 * @param form - the form.
 * @returns the load.
 */
export function serverLoad(entry: SourceCatalogEntry, form: ServerFormState): ServerLoad {
    const { input, options } = serverRequest(entry, form);
    const credential = formCredential(entry, form);
    return {
        input,
        options: credential === undefined ? options : { ...options, credential },
        credential,
        endpoint: options.endpoint ?? entry.descriptor.defaultEndpoint ?? undefined,
    };
}

/**
 * Opens the server form on the Data place, opening an empty project first when none is open
 * (the start screen's Open network data).
 * @param store - the workspace store.
 * @param kind - the source the form opens on, or none for its first.
 * @param editing - the network source the form opens filled in with, whose Load replaces it.
 */
export function openServerForm(
    store: WorkspaceStore,
    kind: string | null = null,
    editing: SourceKey | null = null,
): void {
    store.set((state) => ({
        ...(state.project === null
            ? { project: { name: "Untitled", id: newProjectId(state), blank: true as const }, inspected: null }
            : {}),
        page: "panels",
        place: "data",
        ...panelsInView(),
        dialog: SERVER_DIALOG,
        serverKind: kind,
        serverEdit: editing,
    }));
}

/**
 * The source a node came from, when that source can expand it: the node's first load, by its
 * `_source.loads` fact.
 * @param session - the session.
 * @param id - the node.
 * @returns the load's source id, or undefined.
 */
function expandableSource(session: GraphSession | null, id: NodeId): string | undefined {
    const loads = session?.data.node(id)?.["_source.loads"];
    if (!Array.isArray(loads) || session === null) {
        return undefined;
    }
    const keys = new Set(loads.map((key) => String(key).split("/")[0]));
    const load = session.data.loads().find((each) => keys.has(each.key));
    const entry = sourceDescriptors().find((each) => each.id === load?.source);
    return entry?.features.expand === true ? entry.id : undefined;
}

/**
 * How many more neighbors a node has on its server, when the server says.
 * @param session - the session.
 * @param id - the node.
 * @returns the count, or null when unknown or none.
 */
function hiddenNeighbors(session: GraphSession | null, id: NodeId): number | null {
    const hidden = session?.data.node(id)?.["_source.hidden"];
    return typeof hidden === "number" && hidden > 0 ? hidden : null;
}

/**
 * Whether the node an expansion of another node brought (`_source.expansion` not "none") can be
 * collapsed: it has expanded at least once.
 * @param session - the session.
 * @param id - the node.
 * @returns true when Collapse applies.
 */
function collapsible(session: GraphSession | null, id: NodeId): boolean {
    const expansion = session?.data.node(id)?.["_source.expansion"];
    return expansion === "partial" || expansion === "complete";
}

/**
 * The selected node, when exactly one is selected.
 * @param ctx - the command context.
 * @returns its id, or undefined.
 */
function selectedNode(ctx: CommandContext): NodeId | undefined {
    const nodes = ctx.session?.selection.nodes ?? [];
    return nodes.length === 1 ? nodes[0] : undefined;
}

/**
 * Collapses a node, with a notice on refusal.
 * @param workspace - the workspace store.
 * @param session - the session.
 * @param id - the node.
 */
function collapseNode(workspace: WorkspaceStore, session: GraphSession, id: NodeId): void {
    session.data.collapse(id).catch((error: unknown) => {
        workspace.set({ notice: { message: `Not collapsed: ${codeWords(failureOf(error))}` } });
    });
}

/**
 * The server package's registration: Network data... on the Sources "+", and Expand... and
 * Collapse.
 */
export const registration = defineRegistration({
    owner: "server",
    commands: [
        {
            id: "data.add-server",
            label: "Network data...",
            group: "Data",
            keywords: ["add", "source", "server", "database", "neo4j", "cypher", "sparql", "ndex", "openalex", "rest"],
            shown: (ctx) => ctx.session !== null,
            run: (ctx) => {
                ctx.workspace.set({ dialog: NETWORK_DIALOG });
            },
        },
        {
            id: "node.expand",
            label: "Expand...",
            group: "Selection",
            keywords: ["neighbors", "server", "fetch"],
            tooltip: (ctx) => {
                const id = selectedNode(ctx);
                const hidden = id === undefined ? null : hiddenNeighbors(ctx.session, id);
                return hidden === null ? "Expand..." : `Expand... (+${String(hidden)} on the server)`;
            },
            shown: (ctx) => {
                const id = selectedNode(ctx);
                return id !== undefined && expandableSource(ctx.session, id) !== undefined;
            },
            run: (ctx) => {
                ctx.workspace.set({ dialog: EXPAND_DIALOG });
            },
        },
        {
            id: "node.collapse",
            label: "Collapse",
            group: "Selection",
            keywords: ["neighbors", "server"],
            shown: (ctx) => {
                const id = selectedNode(ctx);
                return id !== undefined && collapsible(ctx.session, id);
            },
            run: (ctx) => {
                const id = selectedNode(ctx);
                if (id !== undefined && ctx.session !== null) {
                    collapseNode(ctx.workspace, ctx.session, id);
                }
            },
        },
    ],
    sourceRow: [
        {
            id: "source.edit-network",
            label: "Edit...",
            order: 15,
            shown: (ctx, source) => editableSettings(ctx.session, source.key) !== undefined,
            run: (ctx, source) => {
                openServerForm(ctx.workspace, editableSettings(ctx.session, source.key)?.source ?? null, source.key);
            },
        },
    ],
});
