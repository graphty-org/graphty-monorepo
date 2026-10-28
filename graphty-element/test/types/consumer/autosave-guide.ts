/**
 * @file The autosave guide's simple path (docs/guide/autosave.md), compiled against the published
 * declarations with no cast: the status words keyed by state, the status event, `ready` and the
 * at-risk fact. Nothing here runs; `tsconfig.strict-consumer.json` checks it against `dist/`.
 */

import type { AutosaveStatus } from "@graphty/graphty-element";

/** The guide's script, as a function over the page's two elements. */
export function simplePath(): void {
    const element = document.querySelector("graphty-element");
    const status = document.getElementById("status");
    if (element === null || status === null) {
        return;
    }

    // Optional: show the state. The words are yours.
    const words = { saved: "All changes saved", pending: "Saving...", failing: "Not saved", off: "" };
    const show = (s: AutosaveStatus): string => (status.textContent = words[s.state]);
    show(element.autosaver.status); // the status event does not fire at start
    element.addEventListener("graphty-autosave-status", (e) => show(e.detail));

    // Optional: say when work came back, and when only a file copy keeps it safe.
    void element.autosaver.ready.then((restored) => restored && console.log("Restored work from", restored.savedAt));
    element.addEventListener("graphty-autosave-at-risk", () => console.log("Suggest saving a file"));
}

/** The other three events and the API the guide teaches, typed with no cast. */
export async function theRest(element: HTMLElementTagNameMap["graphty-element"], text: string): Promise<void> {
    element.autosave = "acme.org-chart";
    element.autosaveRestore = "manual";
    element.autosaveOptions = { persist: true, unloadGuard: "unexported" };
    element.addEventListener("graphty-autosave-restored", (e) => {
        const { entry, savedAt, revision, report, others, pageOverrides } = e.detail;
        console.log(entry.id, savedAt, revision, report.problems.length, others, pageOverrides);
    });
    element.addEventListener("graphty-autosave-available", (e) => {
        const { entry, reason, problem } = e.detail;
        console.log(entry.dirty, reason, problem?.code);
    });
    element.addEventListener("graphty-autosave-at-risk", (e) => {
        const { code, params } = e.detail;
        console.log(code, params.persisted, params.ephemeral, params.unexported);
    });
    element.autosaver.stash("org.example.note-draft", text);
    const entries = await element.autosaver.list();
    const first = entries[0];
    if (first !== undefined) {
        await element.autosaver.restore(first.id, { discard: true });
        await element.autosaver.remove(first.id);
    }

    await element.autosaver.removeAll();
    await element.autosaver.flush();
    const persisted: boolean = await element.autosaver.requestPersistence();
    console.log(persisted, element.autosaver.stashed("org.example.note-draft"));
}
