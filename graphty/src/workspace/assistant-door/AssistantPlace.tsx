import React, { Suspense, useEffect, useState } from "react";

import { keptPlace } from "../state/store";
import { useWorkspace } from "../state/WorkspaceContext";
import { assistantOn, assistantShown } from "./commands";

type PanelModule = typeof import("../assistant/AssistantPanel");
/** The panel's code once it is in. */
let loaded: PanelModule["default"] | null = null;
/**
 * Fetches the panel's code.
 * @returns the module.
 */
function loadPanel(): Promise<PanelModule> {
    return import("../assistant/AssistantPanel").then((module) => {
        loaded = module.default;
        return module;
    });
}
const AssistantPanel = React.lazy(loadPanel);
// A reload that kept the Assistant open fetches its code with the frame's, so the panel is drawn
// when the rail marks the place, and a click meant to open it never lands on a place still loading.
if (keptPlace().place === "assistant") {
    void loadPanel();
}
const AiProviderSection = React.lazy(() => import("../assistant/AiProviderSection"));

/**
 * What Settings' Done runs on a page that holds unsaved input: true when the page took the press
 * (saved and closed, or kept open on a problem), false when there was nothing to commit.
 */
export type PageCommit = React.RefObject<(() => Promise<boolean>) | null>;

/**
 * Settings' AI provider section, loaded with the panel's code.
 * @param props - Component props
 * @param props.onSaved - called as Save closes Settings, with focus bound for the composer
 * @param props.commit - set by the section to what Done runs
 * @param props.onPopoutOpen - called as a pop-out on the page opens or closes, so Esc closes it alone
 * @returns The section
 */
export function AiProviderPage({
    onSaved,
    commit,
    onPopoutOpen,
}: Readonly<{ onSaved: () => void; commit: PageCommit; onPopoutOpen?: (open: boolean) => void }>): React.JSX.Element {
    return (
        <Suspense fallback={null}>
            <AiProviderSection onSaved={onSaved} commit={commit} onPopoutOpen={onPopoutOpen} />
        </Suspense>
    );
}

/**
 * The Assistant place: its panel while the element has the experiment on, nothing until the element
 * reports, and the Graph place when it reports off (a tab reloaded without `?features=assistant`
 * keeps this place in session storage).
 * @returns The panel, or nothing
 */
export function AssistantPlace(): React.JSX.Element | null {
    const { element, store } = useWorkspace();
    const on = assistantOn(element);
    // Code already in is drawn at once: a lazy component suspends on its first render even then,
    // and React holds a suspended reveal back about 300 ms, a gap in which the rail marks the place
    // and a click on it closes a panel the reader never saw. Chosen once, so the panel never remounts.
    const [Panel] = useState(() => loaded ?? AssistantPanel);
    useEffect(() => {
        if (on === false) {
            store.set({ place: "graph" });
        }
    }, [on, store]);
    // A Talk press lasts as long as the place: one left waiting would open the microphone later.
    useEffect(
        () => () => {
            if (!assistantShown(store)) {
                store.set({ assistantTalkPress: false });
            }
        },
        [store],
    );
    return on === true ? (
        <Suspense fallback={null}>
            <Panel />
        </Suspense>
    ) : null;
}
