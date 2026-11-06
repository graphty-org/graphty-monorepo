import React, { Suspense, useEffect } from "react";

import { useWorkspace } from "../state/WorkspaceContext";
import { assistantOn, assistantShown } from "./commands";

const AssistantPanel = React.lazy(() => import("../assistant/AssistantPanel"));
const AiProviderSection = React.lazy(() => import("../assistant/AiProviderSection"));

/** Settings' AI provider section, as its section list names it. */
export const AI_PROVIDER_SECTION = { id: "assistant", name: "AI provider" } as const;

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
 * @returns The section
 */
export function AiProviderPage({
    onSaved,
    commit,
}: Readonly<{ onSaved: () => void; commit: PageCommit }>): React.JSX.Element {
    return (
        <Suspense fallback={null}>
            <AiProviderSection onSaved={onSaved} commit={commit} />
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
            <AssistantPanel />
        </Suspense>
    ) : null;
}
