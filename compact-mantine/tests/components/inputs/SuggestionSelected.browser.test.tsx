/**
 * A suggestion list under a field the reader types in (an Autocomplete) says "selected" on no
 * option the arrows pass over: the highlight is announced through aria-activedescendant, and an
 * option is selected only once Enter takes it.
 */
import { Autocomplete } from "@mantine/core";
import { screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

describe("an Autocomplete's suggestions", () => {
    it("ArrowDown highlights an option without marking it selected", async () => {
        await renderThemed(<Autocomplete label="Name" data={["GAL1", "GAL2", "GAL4"]} />);
        const name = screen.getByRole("combobox", { name: "Name" });
        await userEvent.click(name);
        await userEvent.keyboard("GAL");
        await waitFor(() => {
            expect(name).toHaveAttribute("aria-expanded", "true");
        });
        await userEvent.keyboard("{ArrowDown}");
        const id = await waitFor(() => {
            const active = name.getAttribute("aria-activedescendant");
            expect(active).not.toBeNull();
            return active ?? "";
        });
        expect(document.getElementById(id)).toHaveTextContent("GAL1");
        for (const option of screen.getAllByRole("option", { hidden: true })) {
            expect(option).toHaveAttribute("aria-selected", "false");
        }
    });
});
