// The part of Cloudflare D1's API the Worker uses, on node:sqlite, so its tests run the real migrations and SQL.
// It refuses a statement over D1's 100 bound parameters, as D1 does.
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

// Every statement any shim database prepared, for the query plan check (index.test.mjs, "query plans")
export const prepared = new Set();

const migrations = new URL("../migrations/", import.meta.url);

/**
 * An in-memory D1 database with every migration applied.
 * @returns `{ prepare, batch, sqlite }`; `sqlite` is the node:sqlite database, for assertions
 */
export function d1() {
    const sqlite = new DatabaseSync(":memory:");
    for (const file of readdirSync(migrations).sort()) sqlite.exec(readFileSync(new URL(file, migrations), "utf8"));
    const statement = (sql, args = []) => {
        prepared.add(sql);
        if (args.length > 100) throw new Error(`D1_ERROR: too many SQL variables (${args.length})`);
        return {
            bind: (...values) => statement(sql, values),
            // rows_read and rows_written stand in for D1's: the rows answered, and the rows changed
            all: async () => {
                const results = sqlite.prepare(sql).all(...args);
                return { success: true, results, meta: { rows_read: results.length, rows_written: 0 } };
            },
            first: async () => sqlite.prepare(sql).get(...args) ?? null,
            run: async () => {
                const changes = Number(sqlite.prepare(sql).run(...args).changes);
                return { success: true, meta: { changes, rows_read: 0, rows_written: changes } };
            },
        };
    };
    const batch = async (statements) => {
        sqlite.exec("BEGIN");
        try {
            const results = [];
            for (const s of statements) results.push(await s.run());
            sqlite.exec("COMMIT");
            return results;
        } catch (error) {
            sqlite.exec("ROLLBACK");
            throw error;
        }
    };
    return { prepare: (sql) => statement(sql), batch, sqlite };
}
