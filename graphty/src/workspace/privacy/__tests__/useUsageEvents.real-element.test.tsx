/**
 * Usage counts from the REAL graphty-element (design/graphty/usage-analytics.md, sections 4.1 and
 * 4.2). Umami's sends are recorded through the analytics seam with graphty.app as the host, and
 * PostHog is on with a recording stand-in whose captures pass through `cleanPostHogEvent`. Each case
 * waits on the event that proves its work finished, then checks both recorders and that no
 * recorded payload carries the case's sentinels.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import {
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
    type UmamiBody,
} from "../../../lib/analytics";
import { openSampleFromStart } from "../../../test/open";
import { render, screen, waitFor } from "../../../test/test-utils";
import { PROTOTYPE_SAMPLES, sampleName, sampleUrl } from "../../start/samples";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const UMAMI = "8f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const VISITS = "graphty.visits.v1";

/** What Umami was sent. */
const umami: UmamiBody[] = [];
/** What reached the PostHog stand-in, after cleaning. */
const posthog: { event: string; properties: Record<string, unknown> }[] = [];
let undoPostHog: () => void = () => undefined;

/**
 * The events of one name each recorder got.
 * @param name - the event name.
 * @returns Umami's payload data and PostHog's properties.
 */
function sent(name: string): { umami: unknown[]; posthog: Record<string, unknown>[] } {
    return {
        umami: umami.filter((body) => body.payload.name === name).map((body) => body.payload.data),
        posthog: posthog.filter((each) => each.event === name).map((each) => each.properties),
    };
}

/**
 * Settles at the next usage event of a name, with its properties. No deadline of its own.
 * @param name - the event name.
 * @returns its properties.
 */
function next(name: string): Promise<Readonly<Record<string, unknown>>> {
    return new Promise((resolve) => {
        const off = onUsageEvent((each, props) => {
            if (each === name) {
                off();
                resolve(props);
            }
        });
    });
}

/**
 * Asserts no recorded payload holds any of the sentinels.
 * @param sentinels - text that must never be sent.
 */
function sendsNone(...sentinels: string[]): void {
    const all = JSON.stringify({ umami, posthog });
    for (const sentinel of sentinels) {
        assert.notInclude(all, sentinel);
    }
}

/**
 * Drops files as the browser does, on the window. A synthetic DragEvent, the one exception to
 * real input here: a page cannot start a drag of a file from the operating system.
 * @param files - the files.
 */
function drop(...files: File[]): void {
    const dataTransfer = new DataTransfer();
    for (const file of files) {
        dataTransfer.items.add(file);
    }
    for (const type of ["dragover", "drop"]) {
        globalThis.dispatchEvent(new DragEvent(type, { dataTransfer, bubbles: true, cancelable: true }));
    }
}

/**
 * A fixture the app serves, under another name.
 * @param fixture - its file name.
 * @param name - the name it is dropped under.
 * @returns the file.
 */
async function fixtureAs(fixture: string, name: string): Promise<File> {
    const sample = PROTOTYPE_SAMPLES.find((each) => sampleName(each) === fixture);
    if (sample === undefined) {
        throw new Error(`no fixture ${fixture}`);
    }
    const response = await fetch(sampleUrl(sample));
    return new File([await response.blob()], name);
}

/**
 * An empty project, as New project leaves it, and its element's session.
 * @returns the session.
 */
async function emptyProject(): Promise<GraphSession> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" })} />);
    let session: GraphSession | undefined;
    await waitFor(() => {
        session = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        )?.session;
        assert.isDefined(session);
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    return session;
}

describe("usage counts from the real element", () => {
    beforeEach(() => {
        resetAnalyticsForTests();
        umami.length = 0;
        posthog.length = 0;
        setAnalyticsCallsForTests({
            send: (body) => {
                umami.push(body);
                return undefined;
            },
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
        });
        startPageCounts({ site: "production", features: [], analytics: { umamiWebsiteId: UMAMI } });
        undoPostHog = setPostHogClientForTests({
            capture: (event, properties) => {
                posthog.push({ event, properties: { ...properties } });
                return undefined;
            },
        });
    });

    afterEach(() => {
        undoPostHog();
        resetAnalyticsForTests();
        setAnalyticsCallsForTests();
        localStorage.removeItem(VISITS);
    });

    it("counts a start-screen sample tile as that sample, once, and nothing from the start page's graph", async () => {
        await openSampleFromStart("Les Miserables");
        const loaded = sent("sample_loaded");
        assert.deepEqual(loaded.umami, [{ sample: "les-miserables" }]);
        assert.lengthOf(loaded.posthog, 1);
        assert.strictEqual(loaded.posthog[0].sample, "les-miserables");
        assert.isEmpty(sent("own_file_opened").posthog);
        // The super properties ride on every PostHog event: the site (site.json's, "unknown" in a test).
        assert.strictEqual(loaded.posthog[0].site, "unknown");
    });

    it("counts a dropped file by its format alone, never its name or contents", async () => {
        await emptyProject();
        const opened = next("own_file_opened");
        drop(await fixtureAs("people.csv", "secret-PATIENT-ids.csv"));
        assert.deepEqual({ ...(await opened) }, { format: "csv", via: "file" });
        assert.deepEqual(sent("own_file_opened").umami, [{ format: "csv", via: "file" }]);
        assert.isEmpty(sent("sample_loaded").posthog);
        sendsNone("secret", "PATIENT", "people");
    });

    it("sends a failed load's code and task, never the file's name", async () => {
        await emptyProject();
        const failed = next("load_failed");
        drop(new File(['<graphml><node id="SECRET_LABEL"'], "SECRET_BAD.graphml"));
        const props = await failed;
        assert.include(["load", "prepare"], props.task);
        assert.isString(props.code);
        assert.lengthOf(sent("load_failed").posthog, 1);
        sendsNone("SECRET_BAD", "SECRET_LABEL");
    });

    it("counts a finished run by its catalog key, never the data it ran over", async () => {
        const session = await emptyProject();
        const loaded = next("own_file_opened");
        drop(await fixtureAs("tp53-interactions.tsv", "SECRET_GENES.tsv"));
        await loaded;
        const ran = next("algorithm_run");
        await session.runs.start("degree", {});
        assert.deepEqual({ ...(await ran) }, { algorithm: "degree", outcome: "succeeded" });
        assert.deepEqual(sent("algorithm_run").umami, [{ algorithm: "degree", outcome: "succeeded" }]);
        sendsNone("SECRET_GENES", "TP53");
    });

    it("sends a journaled change as a graph action by its op alone, and never a run's own entry", async () => {
        const session = await emptyProject();
        const loaded = next("own_file_opened");
        drop(await fixtureAs("tp53-interactions.tsv", "SECRET_GENES.tsv"));
        await loaded;
        const action = next("graph_action");
        await session.layout.setDimension("2d");
        const props = await action;
        assert.strictEqual(props.op, "view.dimension");
        assert.notProperty(props, "suggested");
        const ran = next("algorithm_run");
        await session.runs.start("degree", {});
        await ran;
        const ops = sent("graph_action").posthog.map((each) => each.op);
        assert.notInclude(ops, "algo.run");
        sendsNone("SECRET_GENES", "TP53");
    });

    it("counts a command run from its button, the panel it opens, and marks the button with its id", async () => {
        await emptyProject();
        const button = await screen.findByRole("button", { name: /^Settings/ });
        assert.strictEqual(button.getAttribute("data-ph-capture-attribute-control"), "settings.open");
        const panel = next("panel_opened");
        await userEvent.click(button);
        assert.deepEqual({ ...(await panel) }, { panel: "settings" });
        assert.deepEqual(sent("command_run").posthog.at(-1)?.command, "settings.open");
        // PostHog only: Umami never hears of commands or panels.
        assert.isEmpty(sent("command_run").umami);
        assert.isEmpty(sent("panel_opened").umami);
        sendsNone("Untitled");
    });
});
