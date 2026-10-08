/**
 * The Data output over a stand-in element: the Format list, the preview read from the first
 * chunks only, and failures worded by code.
 */
import type { Graphty as GraphtyElement } from "@graphty/graphty-element";
import type { FormatDescriptor } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import userEvent from "@testing-library/user-event";
import React from "react";
import { assert, describe, it, vi } from "vitest";

import { render, screen, waitFor } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import { type DataChoices, DEFAULT_DATA, formatRows } from "../choices";
import { DataOutput } from "../DataOutput";

const TABLE = {
    name: "table",
    plainName: "Table",
    technicalName: "table",
    type: "enum",
    values: [
        { value: "edges", label: "Edges" },
        { value: "nodes", label: "Nodes" },
    ],
} as const;

const DELIMITER = {
    name: "delimiter",
    plainName: "Column Separator",
    technicalName: "delimiter",
    type: "string",
    default: ",",
    advanced: true,
} as const;

const FORMATS = [
    {
        id: "json",
        plainName: "JSON",
        extensions: [".json"],
        mimeTypes: ["application/json"],
        canImport: true,
        canExport: true,
        options: [],
        exportVariants: [
            {
                id: "cytoscape",
                plainName: "Cytoscape.js JSON",
                extensions: [".json"],
                mimeTypes: ["application/json"],
                preset: { dialect: "cytoscape" },
                options: [],
            },
        ],
    },
    {
        id: "csv",
        plainName: "CSV",
        extensions: [".csv"],
        mimeTypes: ["text/csv"],
        canImport: true,
        canExport: true,
        options: [],
        exportVariants: [
            {
                id: "gephi",
                plainName: "Gephi CSV",
                extensions: [".csv"],
                mimeTypes: ["text/csv"],
                preset: { dialect: "gephi" },
                options: [TABLE, DELIMITER],
            },
        ],
    },
    {
        id: "dot",
        plainName: "DOT",
        extensions: [".gv"],
        mimeTypes: [],
        canImport: false,
        canExport: false,
        options: [],
    },
    {
        id: "graphty",
        plainName: "Graphty JSON",
        extensions: [".graphty.json"],
        mimeTypes: ["application/json"],
        canImport: false,
        canExport: true,
        options: [],
        writerOptions: [],
    },
] as unknown as readonly FormatDescriptor[];

/**
 * A file far longer than the preview, one line per chunk.
 * @yields each line's bytes.
 */
async function* manyLines(): AsyncIterable<Uint8Array> {
    const encoder = new TextEncoder();
    for (let i = 0; i < 10_000; i++) {
        await Promise.resolve();
        yield encoder.encode(`line ${String(i)}\n`);
    }
}

/**
 * The Data output keeping its own edits, as the dialog does.
 * @param props - Component props
 * @param props.first - the choices it opens on
 * @returns the output
 */
function Stateful({ first }: Readonly<{ first: DataChoices }>): React.JSX.Element {
    const [choices, setChoices] = React.useState(first);
    return <DataOutput choices={choices} onChange={setChoices} onCancel={vi.fn()} onDone={vi.fn()} />;
}

/**
 * Renders the Data output over a stand-in element.
 * @param element - the element's export doors.
 * @param first - the choices it opens on; edits are kept.
 */
function renderData(element: Partial<GraphtyElement>, first: DataChoices = DEFAULT_DATA): void {
    const session = { catalog: { formats: () => FORMATS } } as unknown as GraphSession;
    const store = createWorkspaceStore({ project: { name: "Les Miserables", id: 1 } });
    const value = makeWorkspaceValue(
        store,
        createRegistry(REGISTRATIONS),
        session,
        element as unknown as GraphtyElement,
    );
    render(
        <WorkspaceContext.Provider value={value}>
            <Stateful first={first} />
        </WorkspaceContext.Provider>,
    );
}

describe("the Data output", () => {
    it("lists one row per file type, Graphty JSON first", () => {
        assert.deepEqual(
            formatRows(FORMATS).map((row) => row.plainName),
            ["Graphty JSON", "Cytoscape.js JSON", "Gephi CSV"],
        );
    });

    it("previews the first six lines from the first chunks, never the whole text", async () => {
        const text = vi.fn(() => Promise.reject(new Error("read the whole file")));
        const exportGraph = vi.fn(() =>
            Promise.resolve({ format: "graphty", losses: [], lossNotes: [], text, bytes: manyLines() }),
        );
        renderData({ exportGraph });

        const preview = screen.getByLabelText("Preview of the exported data");
        await waitFor(() => {
            assert.equal(preview.textContent, ["line 0", "line 1", "line 2", "line 3", "line 4", "line 5"].join("\n"));
        });
        assert.equal(text.mock.calls.length, 0);
        assert.deepEqual(exportGraph.mock.calls[0], ["graphty", {}] as unknown as []);
    });

    it("words a failed export by its code, and an unknown code as itself", async () => {
        const exportGraph = vi.fn(() =>
            Promise.resolve({ format: "graphty", losses: [], lossNotes: [], text: vi.fn(), bytes: manyLines() }),
        );
        const downloadGraph = vi.fn(() => Promise.reject(Object.assign(new Error("boom"), { code: "E_X" })));
        renderData({ exportGraph, downloadGraph });

        await userEvent.click(screen.getByRole("button", { name: "Export" }));
        const alert = await screen.findByRole("alert");
        assert.include(alert.textContent, "The file was not written");
        assert.include(alert.textContent, "Something went wrong (E_X).");
        assert.notInclude(alert.textContent, "boom");
    });

    it("keeps the advanced options behind a closed fold and previews with what the reader sets", async () => {
        const exportGraph = vi.fn(() =>
            Promise.resolve({ format: "csv", losses: [], lossNotes: [], text: vi.fn(), bytes: manyLines() }),
        );
        renderData(
            { exportGraph },
            {
                format: "csv",
                variant: "gephi",
                values: {},
            },
        );

        assert.isNull(screen.queryByLabelText("Column Separator"));
        await userEvent.click(screen.getByRole("button", { name: /Advanced/ }));
        const separator = screen.getByLabelText("Column Separator");
        assert.equal((separator as HTMLInputElement).placeholder, ",");
        await userEvent.type(separator, ";");
        await waitFor(() => {
            assert.deepEqual(exportGraph.mock.calls.at(-1), [
                "csv",
                { dialect: "gephi", delimiter: ";", table: "edges" },
            ] as unknown as []);
        });
    });

    it("draws no Advanced fold for a row with no options", () => {
        const exportGraph = vi.fn(() => new Promise(() => undefined));
        renderData({ exportGraph } as unknown as Partial<GraphtyElement>);
        assert.isNull(screen.queryByRole("button", { name: /Advanced/ }));
    });
});
