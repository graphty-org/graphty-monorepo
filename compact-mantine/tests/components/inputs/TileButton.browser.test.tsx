/**
 * TileButton in a real browser: a click and a key pick it, the pointer lights it, the keyboard rings it, and its
 * hover and picked grounds are ImagePicker's tile's.
 */
import { screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, assert, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { TileButton } from "../../../src/components/inputs/TileButton";
import { axeFindings } from "../../a11y/axe";
import { renderThemed, resetHarness } from "../../harness/measure";

afterEach(resetHarness);

const DOT =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

/**
 * Two tiles holding the picked one in state.
 * @param props - Component props
 * @param props.onPick - spy for each pick
 * @returns the tiles
 */
function Harness({ onPick }: Readonly<{ onPick: (id: string) => void }>): React.JSX.Element {
    const [picked, setPicked] = useState("a");
    const pick = (id: string): void => {
        setPicked(id);
        onPick(id);
    };
    return (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, width: 240 }}>
            <TileButton
                name="Alpha"
                src={DOT}
                picked={picked === "a"}
                onClick={() => {
                    pick("a");
                }}
            />
            <TileButton
                name="Beta"
                picked={picked === "b"}
                onClick={() => {
                    pick("b");
                }}
            />
        </div>
    );
}

/**
 * A token's color as the browser computes it.
 * @param token - the CSS variable
 * @returns its computed color
 */
function tokenColor(token: string): string {
    const probe = document.createElement("div");
    probe.style.background = `var(${token})`;
    document.body.append(probe);
    const color = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return color;
}

describe("TileButton", () => {
    it("draws its picture above its name, or the picture glyph with no picture", async () => {
        await renderThemed(<Harness onPick={vi.fn()} />);
        const alpha = screen.getByRole("button", { name: "Alpha" });
        const img = alpha.querySelector("img");
        assert.isNotNull(img);
        const name = alpha.querySelector(".cm-tile-button-name");
        assert.isNotNull(name);
        assert.isAbove(
            name.getBoundingClientRect().top,
            img.getBoundingClientRect().bottom - 1,
            "the name is under it",
        );
        const beta = screen.getByRole("button", { name: "Beta" });
        assert.isNotNull(beta.querySelector('svg[data-glyph="picture"]'), "the picture glyph");
        assert.deepEqual(await axeFindings("figma"), []);
    });

    it("picks on a click and on Enter, drawn chosen with ImagePicker's picked ground", async () => {
        const onPick = vi.fn();
        await renderThemed(<Harness onPick={onPick} />);
        const alpha = screen.getByRole("button", { name: "Alpha" });
        const beta = screen.getByRole("button", { name: "Beta" });
        assert.strictEqual(alpha.getAttribute("aria-pressed"), "true");
        await userEvent.click(beta);
        assert.deepEqual(onPick.mock.lastCall, ["b"]);
        assert.strictEqual(beta.getAttribute("aria-pressed"), "true");
        assert.strictEqual(alpha.getAttribute("aria-pressed"), "false");
        assert.strictEqual(getComputedStyle(beta).backgroundColor, tokenColor("--cm-bg-selected"));
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        assert.strictEqual(document.activeElement, alpha);
        await userEvent.keyboard("{Enter}");
        assert.deepEqual(onPick.mock.lastCall, ["a"]);
    });

    it("lights on hover with ImagePicker's hover ground and shows a focus ring from the keyboard", async () => {
        await renderThemed(<Harness onPick={vi.fn()} />);
        const beta = screen.getByRole("button", { name: "Beta" });
        await userEvent.hover(beta);
        assert.strictEqual(getComputedStyle(beta).backgroundColor, tokenColor("--cm-bg-hover"));
        await userEvent.unhover(beta);
        await userEvent.keyboard("{Tab}{Tab}");
        assert.strictEqual(document.activeElement, beta);
        assert.notStrictEqual(getComputedStyle(beta).outlineStyle, "none", "a focus ring");
    });
});
