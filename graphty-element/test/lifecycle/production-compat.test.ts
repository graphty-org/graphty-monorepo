/**
 * Saved work across a release: the candidate build (the built ./bundle) and production's build (the
 * graphty-element npm `latest` points at) share one origin's storage, as a reader who moves between
 * them does (issue #3459).
 *
 * - The candidate opens what production saved, the autosave database and a project file, whole.
 * - Production opens what the candidate saved: it reads it whole, or it refuses, says so, and leaves
 *   the saved data exactly as it was. A rollback to production must never destroy a reader's work.
 *
 * Production's build is `npm pack`ed once per version into node_modules/.cache;
 * GRAPHTY_PRODUCTION_ELEMENT names another version (or a path to a graphty.bundle.js) to test against.
 */

import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import type { BrowserContext, Page } from "playwright";
import { afterAll, assert, beforeAll, describe, it, onTestFailed } from "vitest";

import { assertInvariant, launch, profile } from "./engines";
import { type Fixture, type PageCheck, startFixture } from "./fixture";

const here = path.dirname(fileURLToPath(import.meta.url));
const PACKAGE = "@graphty/graphty-element";

/**
 * Production's graphty.bundle.js, fetched from npm the first time a version is asked for.
 * @returns Its path.
 */
function productionBundle(): string {
    const asked = process.env.GRAPHTY_PRODUCTION_ELEMENT ?? "";
    if (asked.endsWith(".js")) {
        return path.resolve(asked);
    }
    const version =
        asked !== ""
            ? asked
            : execFileSync("npm", ["view", `${PACKAGE}@latest`, "version"], { encoding: "utf8" }).trim();
    const dir = path.resolve(here, "../../node_modules/.cache/production-element", version);
    const bundle = path.join(dir, "package/dist/graphty.bundle.js");
    if (!existsSync(bundle)) {
        rmSync(dir, { recursive: true, force: true });
        mkdirSync(dir, { recursive: true });
        const tarball = execFileSync("npm", ["pack", `${PACKAGE}@${version}`, "--silent"], {
            cwd: dir,
            encoding: "utf8",
        })
            .trim()
            .split("\n")
            .at(-1);
        execFileSync("tar", ["xzf", String(tarball), "package/dist/graphty.bundle.js"], { cwd: dir });
    }
    return bundle;
}

/** Every record of the autosave database, each as one string, by store; run in a page of the origin. */
const DUMP = `(async () => {
    const db = await new Promise((res, rej) => { const r = indexedDB.open("graphty-autosave"); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
    const out = { version: db.version, stores: {} };
    for (const name of db.objectStoreNames) {
        const all = await new Promise((res, rej) => { const r = db.transaction(name).objectStore(name).getAll(); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
        out.stores[name] = all.map((record) => JSON.stringify(record, (_, v) => (v instanceof Uint8Array ? { bytes: Array.from(v) } : v)));
    }
    db.close();
    return out;
})()`;

interface Dump {
    version: number;
    stores: Record<string, string[]>;
}

let fx: Fixture;
let context: BrowserContext;
let dir: string;

beforeAll(async () => {
    fx = await startFixture({ bundles: { production: productionBundle() } });
    dir = profile("compat");
    context = await launch("chromium", dir);
});

afterAll(async () => {
    await context.close().catch(() => undefined);
    rmSync(dir, { recursive: true, force: true, maxRetries: 10 });
    await fx.close();
});

/**
 * Open the fixture on one build and wait until its restore is decided and its rows are in.
 * @param params - The fixture's parameters; `build: "production"` for production's build.
 * @returns The page.
 */
async function openFixture(params: Record<string, string | number>): Promise<Page> {
    onTestFailed(() => {
        console.log(`last reports: ${JSON.stringify(fx.log.slice(-25))}`);
    });
    const page = await context.newPage();
    await page.goto(fx.url(params));
    await page.evaluate("fixture.ready()");
    return page;
}

const check = (page: Page): Promise<PageCheck> => page.evaluate<PageCheck>("fixture.check()");

/**
 * Make edits in a page and wait until the last one is saved.
 * @param page - The page.
 * @param count - How many edits.
 * @returns The last edit's revision.
 */
async function editAndSave(page: Page, count: number): Promise<number> {
    let revision = 0;
    for (let i = 0; i < count; i++) {
        revision = await page.evaluate<number>("fixture.next()");
    }
    await page.evaluate("fixture.flush()");
    const { status } = await check(page);
    assert.strictEqual(status.state, "saved", "the edits were saved");
    assert.isNull(status.problem);
    return revision;
}

/**
 * The autosave database's records, read from another page of the origin with no element on it.
 * @returns Every record.
 */
async function dump(): Promise<Dump> {
    const page = await context.newPage();
    await page.goto(`${fx.origin}/away.html`);
    const records = await page.evaluate<Dump>(DUMP);
    await page.close();
    return records;
}

describe("saved work between production's build and the candidate", () => {
    it("the candidate restores production's autosave whole", async () => {
        const key = "forward";
        const tab = `${key}.production`;
        const production = await openFixture({ key, tab, build: "production" });
        const entries = (await check(production)).entries.map((entry) => entry.id);
        await editAndSave(production, 3);
        await production.close();

        const candidate = await openFixture({ key, tab: `${key}.candidate` });
        const after = await check(candidate);
        assert.isNull(after.status.problem, "the candidate reports no problem with production's work");
        assertInvariant(after, fx, [tab], [...entries, ...after.entries.map((entry) => entry.id)]);
        assert.strictEqual(after.nodes, 30, "every node came back");
        await candidate.close();
    });

    it("production restores the candidate's autosave whole, or refuses it and leaves it as it was", async () => {
        const key = "reverse";
        const tab = `${key}.candidate`;
        const candidate = await openFixture({ key, tab });
        const revision = await editAndSave(candidate, 3);
        await candidate.close();
        const before = await dump();

        const productionTab = `${key}.production`;
        const production = await openFixture({ key, tab: productionTab, build: "production" });
        const seen = await check(production);
        await production.close();
        const reads = seen.restored?.revision === revision && seen.probes.length === 1 && seen.probes[0] === revision;
        if (reads) {
            assert.strictEqual(seen.nodes, 30, "every node came back");
            return;
        }

        // Refused: production said so, and every record the candidate wrote is still there, unchanged.
        const said = seen.status.problem !== null || fx.events(productionTab, "available").length > 0;
        assert.isTrue(
            said,
            `production neither restored the candidate's work nor reported why: ${JSON.stringify(seen)}`,
        );
        const after = await dump();
        assert.strictEqual(after.version, before.version, "the database version is unchanged");
        for (const [store, records] of Object.entries(before.stores)) {
            const kept = new Set(after.stores[store] ?? []);
            for (const record of records) {
                assert.isTrue(kept.has(record), `a record of ${store} was changed or removed: ${record.slice(0, 200)}`);
            }
        }
    });

    it("the candidate opens production's project file whole", async () => {
        const production = await openFixture({
            key: "file-forward",
            tab: "file-forward.production",
            build: "production",
        });
        await production.evaluate("fixture.edit(7)");
        const text = await production.evaluate<string>("fixture.el.session.project.save().then((saved) => saved.text)");
        await production.close();

        const candidate = await openFixture({ key: "file-forward", tab: "file-forward.candidate" });
        const report = await candidate.evaluate<{ opened: string; problems: unknown[] }>(
            `fixture.el.session.project.open(${JSON.stringify(text)}, { discard: true }).then((r) => ({ opened: r.opened, problems: r.problems }))`,
        );
        assert.deepEqual(report, { opened: "project", problems: [] }, "production's project opened with nothing lost");
        const after = await check(candidate);
        assert.strictEqual(after.nodes, 30);
        assert.deepEqual(after.probes, [7], "every node's value came back");
        await candidate.close();
    });

    it("production opens the candidate's project file whole, or refuses it and changes nothing", async () => {
        const candidate = await openFixture({ key: "file-reverse", tab: "file-reverse.candidate" });
        await candidate.evaluate("fixture.edit(9)");
        const text = await candidate.evaluate<string>("fixture.el.session.project.save().then((saved) => saved.text)");
        await candidate.close();

        const production = await openFixture({
            key: "file-reverse",
            tab: "file-reverse.production",
            build: "production",
        });
        await production.evaluate("fixture.edit(4)");
        const before = await check(production);
        const outcome = await production.evaluate<{ opened?: string; problems?: unknown[]; refused?: string }>(
            `fixture.el.session.project.open(${JSON.stringify(text)}, { discard: true }).then(
                (r) => ({ opened: r.opened, problems: r.problems }),
                (e) => ({ refused: String(e?.code ?? e) }),
            )`,
        );
        const after = await check(production);
        await production.close();
        if (outcome.refused === undefined) {
            assert.deepEqual(
                outcome,
                { opened: "project", problems: [] },
                "the candidate's project opened with nothing lost",
            );
            assert.deepEqual(after.probes, [9], "every node's value came back");
            return;
        }

        assert.match(outcome.refused, /^E_[A-Z_]+$/, "production refused with a code");
        assert.strictEqual(after.nodes, before.nodes, "the open left production's session as it was");
        assert.deepEqual(after.probes, before.probes, "the open left production's session as it was");
    });
});
