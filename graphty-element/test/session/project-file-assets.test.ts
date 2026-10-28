/**
 * The `graphty-assets` member (design/documents/assets.md): a project file embeds every model a
 * layer names, exactly as given and once per digest, and opening it puts each model back through
 * the same checks a dropped file passes, after checking its bytes against the recorded digest.
 */

import { readFileSync } from "node:fs";

import { Ajv2020 } from "ajv/dist/2020.js";
import { afterEach, assert, describe, it, vi } from "vitest";

import { buildParts, reassemble } from "../../src/autosave/parts";
import { isGraphtyError } from "../../src/errors";
import type { AssetsApiInternal } from "../../src/session/assets/AssetsApi";
import { MAX_DOCUMENT_ASSET_BYTES } from "../../src/session/assets/projectMember";
import type { GraphSession } from "../../src/session/types";
import { PNG_1X1, sphereGlb, texturedGltfSet } from "../fixtures/models/fixtures";
import { baseSession, sessionWithRuns } from "../helpers/project-session";

const schema = JSON.parse(
    readFileSync(new URL("../../../design/documents/assets.schema.json", import.meta.url), "utf8"),
) as object;
const validate = new Ajv2020({ allErrors: true, strict: false }).compile(schema);

/** The member as the file holds it. */
interface Member {
    kind: string;
    version: number;
    assets: {
        id: string;
        sha256: string;
        format: string;
        main: string;
        source?: string;
        stored?: string;
        files?: { path: string; mediaType: string; byteLength: number; data: string }[];
    }[];
}

/**
 * A session with a GLB on node a and a glTF + bin + texture on node b, each named by a layer.
 * @returns The session and the two ids.
 */
async function sessionWithModels(): Promise<{ session: GraphSession; glbId: string; gltfId: string }> {
    const session = await baseSession();
    const glb = await session.assets.add({ files: new Map([["ball.glb", sphereGlb(8, 4)]]) });
    const gltf = await session.assets.add({ files: texturedGltfSet() });
    assert.equal(glb.state, "accepted", JSON.stringify(glb.problems));
    assert.equal(gltf.state, "accepted", JSON.stringify(gltf.problems));
    await session.styles.add({
        name: "ball",
        target: "node",
        selector: { match: "ids", nodes: ["a"] },
        set: { "node.model": glb.id },
    });
    await session.styles.encode({
        column: { kind: "node", name: "dept" },
        channel: "node.model",
        values: { "2": gltf.id, "1": "asset:sample/box" },
    });
    return { session, glbId: glb.id, gltfId: gltf.id };
}

/**
 * The assets member of a saved file.
 * @param text - The file.
 * @returns The member and the document.
 */
function memberOf(text: string): { member: Member; document: { requires: string[]; members: Member[] } } {
    const document = JSON.parse(text) as { requires: string[]; members: Member[] };
    const member = document.members.find((each) => each.kind === "graphty-assets");
    assert.isDefined(member, "the file holds an assets member");
    return { member: member, document };
}

/**
 * Open a file in a fresh session.
 * @param text - The file.
 * @returns The session and the open's report.
 */
async function reopen(text: string) {
    const session = sessionWithRuns();
    const report = await session.project.open(text);
    return { session, report };
}

describe("graphty-assets: saving", () => {
    it("embeds every model a layer names, files as given, and requires the member", async () => {
        const { session, glbId, gltfId } = await sessionWithModels();
        const saved = await session.project.save();
        const { member, document } = memberOf(saved.text);

        assert.include(document.requires, "graphty-assets");
        assert.include(saved.report.written, "graphty-assets");
        assert.isTrue(validate(member), JSON.stringify(validate.errors));
        assert.deepEqual(
            member.assets.map((entry) => entry.id),
            [glbId, gltfId],
            "the literal and the encoded model, never the sample",
        );
        const gltf = member.assets[1];
        assert.equal(gltf.format, "gltf");
        assert.equal(gltf.main, "tri.gltf");
        assert.equal(`asset:${gltf.sha256}`, gltfId);
        const files = new Map((gltf.files ?? []).map((file) => [file.path, file]));
        assert.sameMembers([...files.keys()], ["tri.gltf", "tri.bin", "tex.png"]);
        assert.equal(files.get("tex.png")?.mediaType, "image/png");
        const original = session.assets.files(gltfId as `asset:${string}`).get("tri.bin");
        assert.equal(files.get("tri.bin")?.byteLength, original?.length);
        assert.equal(files.get("tri.bin")?.data, Buffer.from(original ?? []).toString("base64"));
    });

    it("writes no member when no layer names a held model, and says which were not embedded", async () => {
        const session = await baseSession();
        await session.styles.add({
            name: "missing",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": "asset:not-held" },
        });
        const saved = await session.project.save();
        assert.notInclude(saved.report.written, "graphty-assets");
        assert.notInclude((JSON.parse(saved.text) as { requires: string[] }).requires, "graphty-assets");
        const notEmbedded = saved.report.leftOut.find((problem) => problem.code === "W_MODEL_NOT_EMBEDDED");
        assert.equal(notEmbedded?.params.ref, "asset:not-held");
    });

    it("writes one copy of the files per digest", async () => {
        const session = await baseSession();
        const bytes = sphereGlb(8, 4);
        const plain = await session.assets.add({ files: new Map([["ball.glb", bytes]]) });
        const named = await session.assets.add({ files: new Map([["ball.glb", bytes]]) }, { name: "asset:ball" });
        for (const [at, id] of [plain.id, named.id].entries()) {
            await session.styles.add({
                name: `layer ${String(at)}`,
                target: "node",
                selector: { match: "ids", nodes: [at === 0 ? "a" : "b"] },
                set: { "node.model": id },
            });
        }

        const { member } = memberOf((await session.project.save()).text);
        assert.lengthOf(member.assets, 2);
        assert.isDefined(member.assets[0].files);
        assert.isUndefined(member.assets[1].files, "the second id shares the first one's files");
        const { session: opened, report } = await reopen((await session.project.save()).text);
        assert.deepEqual(report.problems, []);
        assert.equal(opened.assets.get("asset:ball")?.state, "accepted");
    });
});

describe("graphty-assets: opening", () => {
    it("puts every model back in a fresh session, with the same ids and bytes", async () => {
        const { session, glbId, gltfId } = await sessionWithModels();
        const { session: opened, report } = await reopen((await session.project.save()).text);
        assert.deepEqual(report.problems, []);
        for (const id of [glbId, gltfId] as `asset:${string}`[]) {
            assert.equal(opened.assets.get(id)?.state, "accepted");
            assert.deepEqual(opened.assets.files(id), session.assets.files(id));
        }
    });

    it("refuses a model whose bytes were changed, with E_MODEL_DIGEST_MISMATCH, and opens the rest", async () => {
        const { session, glbId, gltfId } = await sessionWithModels();
        const document = JSON.parse((await session.project.save()).text) as { members: Member[] };
        const member = document.members.find((each) => each.kind === "graphty-assets") as Member;
        const bin = member.assets[1].files?.find((file) => file.path === "tri.bin");
        assert.isDefined(bin);
        const bytes = Buffer.from(bin?.data ?? "", "base64");
        bytes[0] ^= 0xff;
        (bin as { data: string }).data = bytes.toString("base64");

        const { session: opened, report } = await reopen(JSON.stringify(document));
        assert.deepEqual(report.problems, [
            { code: "E_MODEL_DIGEST_MISMATCH", params: { kind: "graphty-assets", id: gltfId } },
        ]);
        assert.isUndefined(opened.assets.get(gltfId as `asset:${string}`));
        assert.equal(opened.assets.get(glbId as `asset:${string}`)?.state, "accepted");
        assert.lengthOf(opened.styles.list(), session.styles.list().length, "the layers still open");
    });

    it("refuses an id that claims another file's digest", async () => {
        const { session, glbId } = await sessionWithModels();
        const document = JSON.parse((await session.project.save()).text) as { members: Member[] };
        const member = document.members.find((each) => each.kind === "graphty-assets") as Member;
        member.assets[0].id = `asset:${"0".repeat(64)}`;
        const { report } = await reopen(JSON.stringify(document));
        assert.equal(report.problems[0]?.code, "E_MODEL_DIGEST_MISMATCH");
        assert.notEqual(report.problems[0]?.params.id, glbId);
    });

    it("refuses an oversized member whole, with E_MODEL_TOO_LARGE, before the session changes", async () => {
        const { session } = await sessionWithModels();
        const document = JSON.parse((await session.project.save()).text) as { members: Member[] };
        const member = document.members.find((each) => each.kind === "graphty-assets") as Member;
        const huge = Math.ceil((MAX_DOCUMENT_ASSET_BYTES + 3) / 3) * 3;
        member.assets[0].files?.push({
            path: "padding.bin",
            mediaType: "application/octet-stream",
            byteLength: huge,
            data: "A".repeat((huge / 3) * 4),
        });
        const target = sessionWithRuns();
        const error = await target.project.open(JSON.stringify(document)).catch((caught: unknown) => caught);
        assert.isTrue(isGraphtyError(error));
        assert.equal((error as { code: string }).code, "E_MODEL_TOO_LARGE");
        assert.equal((error as { details: { what: string } }).details.what, "documentBytes");
        assert.lengthOf(target.assets.list(), 0);
        assert.lengthOf(target.data.nodes(), 0);
    });

    it("refuses one model over the per-model byte limit before decoding it", async () => {
        const { session, gltfId } = await sessionWithModels();
        const { text } = await session.project.save();
        const target = sessionWithRuns();
        target.assets.setLimits({ maxBytes: 100 });
        const report = await target.project.open(text);
        const problem = report.problems.find((each) => each.params.id === gltfId);
        assert.equal(problem?.code, "E_MODEL_TOO_LARGE");
        assert.equal(problem?.params.what, "bytes");
    });

    it("refuses an unknown member of an entry, E_BAD_DOCUMENT, and a sample id, E_MODEL_NAME_TAKEN", async () => {
        const { session } = await sessionWithModels();
        const document = JSON.parse((await session.project.save()).text) as { members: Member[] };
        const member = document.members.find((each) => each.kind === "graphty-assets") as Member;
        (member.assets[0] as Record<string, unknown>).encoding = "gzip";
        member.assets[1].id = "asset:sample/box";
        const { report } = await reopen(JSON.stringify(document));
        assert.deepEqual(
            report.problems.map((problem) => [problem.code, problem.params.pointer ?? problem.params.id]),
            [
                ["E_BAD_DOCUMENT", "/assets/0/encoding"],
                ["E_MODEL_NAME_TAKEN", "asset:sample/box"],
            ],
        );
    });

    it("refuses a whole member with an unknown top-level member", async () => {
        const { session } = await sessionWithModels();
        const document = JSON.parse((await session.project.save()).text) as { members: Record<string, unknown>[] };
        const member = document.members.find((each) => each.kind === "graphty-assets") as Record<string, unknown>;
        member.compression = "zstd";
        const error = await sessionWithRuns()
            .project.open(JSON.stringify(document))
            .catch((caught: unknown) => caught);
        assert.equal((error as { code: string }).code, "E_BAD_DOCUMENT");
    });
});

describe("graphty-assets: a model a layer named by URL", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it("embeds the fetched bytes with the URL as source, and resolves the URL with no fetch on open", async () => {
        const url = "https://models.example.com/ball.glb";
        const bytes = sphereGlb(8, 4);
        const spy = vi.fn(() =>
            Promise.resolve({
                ok: true,
                status: 200,
                headers: { get: (name: string) => (name === "content-length" ? String(bytes.length) : null) },
                body: null,
                arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
            }),
        );
        vi.stubGlobal("fetch", spy);
        const session = await baseSession();
        await session.styles.add({
            name: "by url",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": url },
        });
        assert.equal((await session.assets.ready(url)).state, "accepted");
        const { member } = memberOf((await session.project.save()).text);
        assert.equal(member.assets[0].source, url);

        const { session: opened, report } = await reopen((await session.project.save()).text);
        assert.deepEqual(report.problems, []);
        const calls = spy.mock.calls.length;
        const record = await opened.assets.ready(url);
        assert.equal(record.state, "accepted");
        assert.equal(spy.mock.calls.length, calls, "the embedded copy answers the URL");
        assert.isDefined((opened.assets as AssetsApiInternal).urlRecord(url));
    });

    it("keeps a URL model by its URL and digest when asked, and notices a changed file on reopen", async () => {
        const url = "https://models.example.com/ball.glb";
        let bytes = sphereGlb(8, 4);
        vi.stubGlobal(
            "fetch",
            vi.fn(() =>
                Promise.resolve({
                    ok: true,
                    status: 200,
                    headers: { get: () => null },
                    body: null,
                    arrayBuffer: () => Promise.resolve(bytes.slice().buffer),
                }),
            ),
        );
        const session = await baseSession();
        await session.styles.add({
            name: "by url",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": url },
        });
        const first = await session.assets.ready(url);
        assert.equal(first.url, url);
        const saved = await session.project.save({ assets: { [url]: "url" } });
        const { member } = memberOf(saved.text);
        assert.isTrue(validate(member), JSON.stringify(validate.errors));
        assert.deepEqual(member.assets[0], {
            id: first.id,
            sha256: first.digest,
            format: "glb",
            main: "ball.glb",
            source: url,
            stored: "url",
        });

        bytes = sphereGlb(10, 5);
        const { session: opened, report } = await reopen(saved.text);
        assert.deepEqual(report.problems, []);
        assert.isUndefined(opened.assets.get(first.id), "nothing was embedded");
        const changed = await opened.assets.ready(url);
        assert.equal(changed.state, "accepted");
        const notice = changed.problems.find((problem) => problem.code === "W_MODEL_CHANGED");
        assert.equal(notice?.params.expected, first.digest);
    });

    it("names a URL that never loaded as not embedded", async () => {
        const session = await baseSession();
        await session.styles.add({
            name: "never fetched",
            target: "node",
            selector: { match: "everything" },
            set: { "node.model": "https://models.example.com/never.glb" },
        });
        const saved = await session.project.save();
        assert.deepEqual(
            saved.report.leftOut.filter((problem) => problem.code === "W_MODEL_NOT_EMBEDDED").map((p) => p.params.ref),
            ["https://models.example.com/never.glb"],
        );
    });
});

describe("graphty-assets: pictures", () => {
    it("embeds a picture node.texture names, and reads it back as an image", async () => {
        const session = await baseSession();
        const picture = await session.assets.add({ files: new Map([["dots.png", PNG_1X1]]) });
        assert.equal(picture.kind, "image");
        await session.styles.add({
            name: "picture",
            target: "node",
            selector: { match: "everything" },
            set: { "node.texture": picture.id },
        });
        const { member } = memberOf((await session.project.save()).text);
        assert.equal(member.assets[0].format, "png");
        const { session: opened, report } = await reopen((await session.project.save()).text);
        assert.deepEqual(report.problems, []);
        assert.equal(opened.assets.get(picture.id)?.kind, "image");
    });
});

describe("graphty-assets: autosave", () => {
    it("keeps each model's files in a part of its own, and reassembles the file project.save writes", async () => {
        const { session } = await sessionWithModels();
        const tags = new Set(["data", "arrangement", "rest", "runs", "stash"] as const);
        const first = buildParts(session, tags, new Map(), new Map());
        const assetParts = Object.keys(first.parts).filter((name) => name.startsWith("asset:"));
        assert.lengthOf(assetParts, 2);
        assert.notInclude(first.parts.rest ?? "", '"files":', "the rest part holds no file bytes");

        const stored = Object.fromEntries(
            Object.entries(first.parts).filter((entry): entry is [string, string] => entry[1] !== null),
        );
        const document = reassemble({ id: "x", key: "k", gen: 1, seq: 1, runs: first.order }, stored);
        assert.deepEqual(document, JSON.parse((await session.project.save()).text));

        // A second write with the parts in the store writes no model again.
        const second = buildParts(session, new Set(["rest"] as const), new Map(), new Map(), first.assets);
        assert.deepEqual(
            Object.keys(second.parts).filter((name) => name.startsWith("asset:")),
            [],
        );

        // Restored, the models come back.
        const { session: opened, report } = await reopen(JSON.stringify(document));
        assert.deepEqual(report.problems, []);
        assert.lengthOf(opened.assets.list(), 2);
    });

    it("removes the part of a model no layer names any more", async () => {
        const { session, glbId } = await sessionWithModels();
        const first = buildParts(session, new Set(["rest"] as const), new Map(), new Map());
        const layer = session.styles.list().find((each) => each.set?.["node.model"] === glbId);
        assert.isDefined(layer);
        await session.styles.remove(layer?.id);
        const second = buildParts(session, new Set(["rest"] as const), new Map(), new Map(), first.assets);
        const glbDigest = glbId.slice("asset:".length);
        assert.strictEqual(second.parts[`asset:${glbDigest}`], null);
    });
});
