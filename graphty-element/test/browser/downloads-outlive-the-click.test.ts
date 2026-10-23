/**
 * @file Every download the element starts keeps its object URL alive past the click, because iOS
 * and iPadOS WebKit read the URL after `click()` returns; `downloadGraph` assembles the file from
 * the export's chunks and leaves the project's `dirty` alone, and `downloadProject` clears it.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it, vi } from "vitest";

import { downloadBlob } from "../../src/utils/download";

const cleanups: (() => void)[] = [];

afterEach(() => {
    vi.useRealTimers();
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

interface Download {
    readonly name: string;
    readonly url: string;
    /** Whether the URL had been revoked when `click()` ran. */
    readonly revokedAtClick: boolean;
    /** Whether the anchor was in the page when `click()` ran. */
    readonly connected: boolean;
}

/**
 * Record every anchor click and URL revoke instead of downloading.
 * @returns The clicks, and the URLs revoked so far.
 */
function watchDownloads(): { downloads: Download[]; revoked: Set<string> } {
    const downloads: Download[] = [];
    const revoked = new Set<string>();
    const realClick = HTMLAnchorElement.prototype.click;
    const realRevoke = URL.revokeObjectURL.bind(URL);
    HTMLAnchorElement.prototype.click = function (this: HTMLAnchorElement) {
        downloads.push({
            name: this.download,
            url: this.href,
            revokedAtClick: revoked.has(this.href),
            connected: this.isConnected,
        });
    };
    URL.revokeObjectURL = (url: string) => {
        revoked.add(url);
        realRevoke(url);
    };
    cleanups.push(() => {
        HTMLAnchorElement.prototype.click = realClick;
        URL.revokeObjectURL = realRevoke;
    });
    return { downloads, revoked };
}

/**
 * A `<graphty-element>` holding a named two-node project.
 * @returns The element.
 */
async function pioneers(): Promise<HTMLElementTagNameMap["graphty-element"]> {
    const element = document.createElement("graphty-element");
    document.body.append(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.session.data.addNodes([{ id: "ada" }, { id: "grace" }]);
    await element.session.data.addEdges([{ src: "ada", dst: "grace" }]);
    await element.session.project.rename("Pioneers");
    return element;
}

describe("downloads", () => {
    it("revokes the object URL only on a later task, after the click", async () => {
        vi.useFakeTimers();
        const { downloads, revoked } = watchDownloads();
        downloadBlob(new Blob(["hello"], { type: "text/plain" }), "hello.txt");
        assert.strictEqual(downloads.length, 1);
        assert.strictEqual(downloads[0].name, "hello.txt");
        assert.isFalse(downloads[0].revokedAtClick, "the URL is live when click() runs");
        assert.isTrue(downloads[0].connected, "the anchor is in the page when clicked");
        assert.isFalse(revoked.has(downloads[0].url), "not revoked in the clicking task");
        await vi.runAllTimersAsync();
        assert.isTrue(revoked.has(downloads[0].url), "revoked once the later task runs");
        assert.isNull(document.querySelector(`a[href="${downloads[0].url}"]`), "the anchor is removed");
    });

    it("downloadGraph builds the file from the export's bytes, never text()", async () => {
        const { downloads } = watchDownloads();
        const element = await pioneers();
        const realExport = element.exportGraph.bind(element);
        let textCalls = 0;
        element.exportGraph = async (...args) => {
            const result = await realExport(...args);
            return {
                ...result,
                bytes: result.bytes,
                text: () => {
                    textCalls++;
                    return result.text();
                },
            };
        };
        await element.downloadGraph("json");
        assert.strictEqual(textCalls, 0);
        assert.strictEqual(downloads.length, 1);
        assert.strictEqual(downloads[0].name, "Pioneers.json");
        const body = await (await fetch(downloads[0].url)).text();
        assert.include(body, "grace");
    });

    it("downloadGraph('graphty') leaves dirty unchanged; downloadProject clears it", async () => {
        const { downloads } = watchDownloads();
        const element = await pioneers();
        const { project } = element.session;
        assert.isTrue(project.dirty);
        await element.downloadGraph("graphty");
        assert.isTrue(project.dirty, "a copy is not a save");
        assert.strictEqual(downloads[0].name, "Pioneers.graphty.json");
        const copy = await (await fetch(downloads[0].url)).text();
        await element.downloadProject();
        assert.isFalse(project.dirty, "downloadProject is a save");
        assert.strictEqual(downloads[1].name, "Pioneers.graphty.json");
        await element.session.data.addNodes([{ id: "linus" }]);
        await project.open(copy, { discard: true });
        assert.strictEqual(element.session.status.counts.nodes, 2, "the copy opens back");
    });
});
