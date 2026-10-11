/**
 * @file What graphty-element's assistant offers a model, as plain data: its tools and their
 * actions, the kinds of thing its `catalog` tool finds, and the codes its tool results carry. An
 * application that renders a transcript, or names the tools in its own words, reads these; the
 * assistant's own tools are generated to match them (`test/ai/tools/manifest.test.ts`).
 */

/** The kinds of thing the assistant's `catalog` tool finds. */
export const CATALOG_KINDS = Object.freeze([
    "algorithm",
    "layout",
    "format",
    "palette",
    "scale",
    "channel",
    "camera",
    "setting",
    "tool",
] as const);

/** One kind of thing the assistant's `catalog` tool finds. */
export type CatalogKind = (typeof CATALOG_KINDS)[number];

/** One built-in assistant tool. */
export interface AssistantToolDescriptor {
    /** The name a model calls it by, which a consumer command may not reuse. */
    readonly name: string;
    /** The default name an application may show for it. */
    readonly plainName: string;
    /** Offered on every turn (`true`), or once a `catalog` result names it. */
    readonly core: boolean;
    /** Its actions, the values of its `action` field. */
    readonly actions: readonly string[];
}

/**
 * Every built-in assistant tool. A consumer command registered under one of these names is
 * refused with `E_DUPLICATE_PLUGIN`. `call` exists only in the small-model profile, where it
 * reaches every other tool.
 */
export const ASSISTANT_TOOLS: readonly AssistantToolDescriptor[] = Object.freeze([
    { name: "catalog", plainName: "Catalog", core: true, actions: ["search", "describe"] },
    {
        name: "query",
        plainName: "Query data",
        core: true,
        actions: [
            "overview",
            "nodes",
            "edges",
            "node",
            "neighbors",
            "find",
            "attributes",
            "histogram",
            "statistics",
            "count",
        ],
    },
    {
        name: "select",
        plainName: "Select",
        core: true,
        actions: ["set", "add", "remove", "clear", "neighborhood", "save_as_set"],
    },
    { name: "run_algorithm", plainName: "Run an algorithm", core: true, actions: ["run"] },
    {
        name: "results",
        plainName: "Algorithm results",
        core: true,
        actions: ["list", "summary", "top", "histogram", "page", "rerun", "cancel", "remove"],
    },
    {
        name: "style",
        plainName: "Style",
        core: true,
        actions: [
            "add",
            "update",
            "remove",
            "move",
            "encode",
            "apply_suggestion",
            "highlight",
            "hide_value",
            "clear_mine",
            "list",
            "legend",
            "explain",
        ],
    },
    {
        name: "filter",
        plainName: "Filter",
        core: true,
        actions: ["show_only", "hide", "clear", "range", "keep_neighbors", "context"],
    },
    { name: "layout", plainName: "Layout", core: true, actions: ["set", "scope", "pin", "unpin", "set_positions"] },
    {
        name: "view",
        plainName: "View",
        core: true,
        actions: ["dimension", "camera", "zoom_to", "fit", "save", "restore", "remove_saved", "list_saved"],
    },
    {
        name: "edit_data",
        plainName: "Edit data",
        core: true,
        actions: [
            "add_nodes",
            "add_edges",
            "update_nodes",
            "update_edges",
            "remove_nodes",
            "remove_edges",
            "delete_all",
        ],
    },
    { name: "undo", plainName: "Undo", core: true, actions: ["undo", "redo", "recent"] },
    {
        name: "sets",
        plainName: "Sets",
        core: false,
        actions: [
            "create",
            "create_from",
            "path",
            "combine",
            "rename",
            "redefine",
            "add_members",
            "remove_members",
            "remove",
            "restore",
            "list",
            "get",
            "containing",
            "offers",
        ],
    },
    { name: "notes", plainName: "Notes", core: false, actions: ["add", "update", "remove", "list", "get"] },
    { name: "import_data", plainName: "Import data", core: false, actions: ["import", "rename_source", "last_import"] },
    { name: "export_graph", plainName: "Export", core: false, actions: ["export"] },
    { name: "project", plainName: "Project", core: false, actions: ["settings", "rename", "declare", "status"] },
    { name: "capture", plainName: "Capture", core: false, actions: ["screenshot", "animation", "cancel"] },
    { name: "immersive", plainName: "VR and AR", core: false, actions: ["enter", "exit", "support"] },
    { name: "call", plainName: "Call a tool", core: true, actions: [] },
]);

/**
 * The codes a tool result carries for the model, beside the session's own `E_*` codes and its
 * success codes. An application that shows a transcript words them itself. OPEN UNION: codes may
 * be added in a minor release.
 */
export const AI_TOOL_CAUSE_CODES = Object.freeze([
    "AI_OK",
    "AI_UNKNOWN_ACTION",
    "AI_ARG_INVALID",
    "AI_ARG_OUT_OF_RANGE",
    "AI_UNKNOWN_ENTRY",
    "AI_UNKNOWN_NODE",
    "AI_UNKNOWN_EDGE",
    "AI_UNKNOWN_COLUMN",
    "AI_UNKNOWN_RUN",
    "AI_BAD_SELECTOR",
    "AI_EMPTY_MATCH",
    "AI_NOT_AVAILABLE",
    "AI_CONFIRM_REQUIRED",
    "AI_IMPORT_URL_REFUSED",
    "AI_UNDO_NOTHING",
    "AI_UNDO_NOT_ALONE",
    "AI_UNDO_NOT_MINE",
    "AI_UNDO_IN_MESSAGE",
    "AI_CURSOR_STALE",
    "AI_TOOL_NOT_RUN",
    "AI_TOOL_UNKNOWN",
] as const);

/** One code a tool result carries for the model. OPEN UNION. */
export type AiToolCauseCode = (typeof AI_TOOL_CAUSE_CODES)[number] | (string & {}); // NOSONAR(S4335): the open-union idiom; keeps the known codes in autocomplete while accepting a session code
