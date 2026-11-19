/**
 * @file A file source referenced by a browser file handle (spec 4.1.2 rule 6) is kept in IndexedDB,
 * keyed by source id and copy id, so a later visit -- a fresh page, with none of this page's
 * modules -- reads it back on open. IndexedDB is a small in-memory stand-in; the later visit is a
 * fresh module graph (`vi.resetModules`).
 */

import { afterEach, assert, describe, it, vi } from "vitest";

import type { ProjectFileHandle } from "../../../src/session/document2/codecs/fileHandles";

const ON = { features: ["save-files-v2"] };
const CSV = "source,target,w\nAva,Ben,1\nBen,Cara,2\n";

/** A request that succeeds with its result on the next turn. */
function succeeded<T>(result: T): IDBRequest<T> {
    const request = { result } as { result: T; onsuccess?: () => void };
    queueMicrotask(() => request.onsuccess?.());
    return request as unknown as IDBRequest<T>;
}

/**
 * An IndexedDB holding one object store per database in memory, as much as graphty-element uses.
 * @returns The factory and every record put, by key.
 */
function memoryIndexedDb(): { factory: IDBFactory; records: Map<string, unknown> } {
    const records = new Map<string, unknown>();
    const store = {
        put: (value: unknown, key: string) => {
            records.set(key, value);
            return succeeded(key);
        },
        get: (key: string) => succeeded(records.get(key)),
    };
    const db = {
        createObjectStore: () => store,
        transaction: () => ({ objectStore: () => store }),
        close: () => undefined,
    };
    const factory = {
        open: () => {
            const request = { result: db } as { result: unknown; onupgradeneeded?: () => void; onsuccess?: () => void };
            queueMicrotask(() => {
                request.onupgradeneeded?.();
                request.onsuccess?.();
            });
            return request;
        },
    };
    return { factory: factory as unknown as IDBFactory, records };
}

describe("file handles kept in IndexedDB", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it("keeps a handle by source id and copy id, and a later visit opens the source through it", async () => {
        const { factory, records } = memoryIndexedDb();
        vi.stubGlobal("indexedDB", factory);
        const file = new File([CSV], "friends.csv");
        const handle: ProjectFileHandle = { name: file.name, getFile: () => Promise.resolve(file) };

        const first = await import("../../../session");
        const session = first.createGraphSession(ON);
        await session.data.import({ type: "csv", config: { file } });
        const [{ key }] = session.data.sources();
        const saved = await session.project.save({
            format: 2,
            embed: { [key]: "referenced" },
            handles: { [key]: handle },
        });
        const { sources } = (JSON.parse(saved.text) as { sections: { data: { sources: Record<string, unknown>[] } } })
            .sections.data;
        const record = sources.find((each) => each.kind !== "reader") as { id: string; origin: { copy: string } };
        assert.deepEqual([...records.keys()], [`${record.id} ${record.origin.copy}`]);
        assert.strictEqual(records.get(`${record.id} ${record.origin.copy}`), handle);

        vi.resetModules();
        const later = await import("../../../session");
        const reopened = later.createGraphSession(ON);
        const report = await reopened.project.open(saved.text);
        assert.notInclude(
            report.problems.map((problem) => problem.code),
            "W_SOURCE_UNAVAILABLE",
        );
        assert.deepEqual(
            reopened.data.nodes().map((node) => node.id),
            session.data.nodes().map((node) => node.id),
        );
        session.dispose();
        reopened.dispose();
    });
});
