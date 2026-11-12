import { PopoutManager } from "@graphty/compact-mantine";
import React from "react";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { render, screen, waitFor } from "../../../test/test-utils";
import { SettingsPopout } from "../SettingsPopout";

describe("a settings popout", () => {
    it("opens one panel from its button, which shows it is open", async () => {
        render(
            <PopoutManager>
                <SettingsPopout label="Line settings">
                    <p>Width</p>
                </SettingsPopout>
            </PopoutManager>,
        );
        const button = screen.getByRole("button", { name: "Line settings" });
        assert.strictEqual(button.getAttribute("aria-expanded"), "false");
        await userEvent.click(button);
        await screen.findByRole("dialog", { name: "Line settings" });
        assert.strictEqual(button.getAttribute("aria-expanded"), "true");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog"));
        });
    });

    it("says on its button that a setting inside is changed", () => {
        render(
            <PopoutManager>
                <SettingsPopout label="Line settings" changed>
                    <p>Width</p>
                </SettingsPopout>
            </PopoutManager>,
        );
        assert.isNotNull(screen.getByRole("button", { name: "Line settings has configured values" }));
    });

    it("refuses to open a settings popover from a settings popover", () => {
        assert.throws(() => {
            render(
                <PopoutManager>
                    <SettingsPopout label="Outer" opened>
                        <SettingsPopout label="Inner">
                            <p>Width</p>
                        </SettingsPopout>
                    </SettingsPopout>
                </PopoutManager>,
            );
        }, /inside another/);
    });
});
