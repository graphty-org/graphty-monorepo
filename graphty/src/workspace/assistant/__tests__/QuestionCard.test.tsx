/**
 * A waiting question is its card's title: it reads in the approval title's size, weight and ink,
 * not as a field caption, while the group keeps the question as its name and the radios keep
 * their size.
 */
import { Text } from "@mantine/core";
import React from "react";
import { assert, describe, it } from "vitest";

import { render, screen } from "../../../test/test-utils";
import { createRegistry } from "../../commands/registry";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { makeWorkspaceValue, WorkspaceContext } from "../../state/WorkspaceContext";
import type { AssistantView } from "../useAssistantView";
import { Waiting } from "../Waiting";

const QUESTION = "Which group should be colored first?";

/**
 * Renders the waiting section holding one question, beside an approval-title-styled reference.
 * @param multiple - checkboxes instead of radios.
 * @returns the question's text and the reference.
 */
function show(multiple: boolean): { question: HTMLElement; title: HTMLElement } {
    const store = createWorkspaceStore();
    const value = makeWorkspaceValue(store, createRegistry(REGISTRATIONS), null, null);
    const view: AssistantView = {
        status: null,
        conversation: null,
        approvals: [],
        questions: [{ id: "q1", question: QUESTION, choices: ["even", "odd"], multiple }],
        linked: true,
        keyMissing: false,
    };
    render(
        <WorkspaceContext.Provider value={value}>
            <Waiting view={view} choice={{ provider: "mock", model: "mock", remember: false }} />
            <Text size="sm" fw={600} data-testid="title">
                Title
            </Text>
        </WorkspaceContext.Provider>,
    );
    return { question: screen.getByText(QUESTION), title: screen.getByTestId("title") };
}

describe("QuestionCard", () => {
    for (const multiple of [false, true]) {
        it(`reads its question as the card's title (${multiple ? "checkboxes" : "radios"})`, () => {
            const { question, title } = show(multiple);
            const asked = getComputedStyle(question);
            const titled = getComputedStyle(title);
            assert.strictEqual(asked.fontSize, titled.fontSize);
            assert.strictEqual(asked.fontWeight, titled.fontWeight);
            assert.strictEqual(asked.color, titled.color);
            assert.isOk(screen.getByRole(multiple ? "group" : "radiogroup", { name: QUESTION }));
        });
    }

    it("keeps the radios their own size", () => {
        show(false);
        const radio = screen.getByRole("radio", { name: "even" });
        assert.isAtMost(radio.getBoundingClientRect().height, 16);
    });
});
