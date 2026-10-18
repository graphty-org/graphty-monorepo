import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { type QuickAction, QuickActions } from "../../../src";
import { renderShell } from "./render";

const ACTIONS: QuickAction[] = [
    { value: "fixed", label: "Fixed text" },
    { value: "name", label: "name", section: "In use" },
    { value: "id", label: "id", section: "Data" },
];

describe("QuickActions highlight", () => {
    it("opens on the action in force, and Enter runs it", async () => {
        const onRun = vi.fn();
        renderShell(<QuickActions actions={ACTIONS} onRun={onRun} highlight="name" />);
        expect(screen.getByRole("option", { name: "name" })).toHaveAttribute("data-highlighted");
        expect(screen.getByRole("option", { name: "Fixed text" })).not.toHaveAttribute("data-highlighted");
        await userEvent.keyboard("{Enter}");
        expect(onRun).toHaveBeenCalledWith("name");
    });

    it("a search highlights its first result again", async () => {
        renderShell(<QuickActions actions={ACTIONS} onRun={vi.fn()} highlight="name" />);
        await userEvent.keyboard("id");
        expect(screen.getByRole("option", { name: "id" })).toHaveAttribute("data-highlighted");
    });

    it("with activeOnOpen none, opens with no active row and Enter runs nothing", async () => {
        const onRun = vi.fn();
        renderShell(<QuickActions actions={ACTIONS} onRun={onRun} activeOnOpen="none" />);
        const search = screen.getByRole("combobox");
        expect(search).not.toHaveAttribute("aria-activedescendant");
        expect(document.querySelector("[data-highlighted]")).toBeNull();
        await userEvent.keyboard("{Enter}");
        expect(onRun).not.toHaveBeenCalled();
        // ArrowUp from no row goes to the last; ArrowDown from no row to the first.
        await userEvent.keyboard("{ArrowUp}");
        expect(screen.getByRole("option", { name: "id" })).toHaveAttribute("data-highlighted");
    });

    it("typing makes the first action that can run active, never a disabled one", async () => {
        const onRun = vi.fn();
        renderShell(
            <QuickActions
                actions={[
                    { value: "most-flow", label: "Most flow", disabled: true, description: "Select 2 nodes first" },
                    { value: "most-seen", label: "Most seen" },
                ]}
                onRun={onRun}
                activeOnOpen="none"
            />,
        );
        await userEvent.keyboard("most");
        expect(screen.getByRole("option", { name: "Most seen" })).toHaveAttribute("data-highlighted");
        await userEvent.keyboard("{Enter}");
        expect(onRun).toHaveBeenCalledWith("most-seen");
        // Emptying the search leaves no row active again.
        await userEvent.clear(screen.getByRole("combobox"));
        expect(document.querySelector("[data-highlighted]")).toBeNull();
    });
});
