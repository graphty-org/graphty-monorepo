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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 96px)", gap: 16, width: 208 }}>
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

    it("lights on hover with the hover ground and a 4px ring of it, and rings its picture from the keyboard", async () => {
        await renderThemed(<Harness onPick={vi.fn()} />);
        const beta = screen.getByRole("button", { name: "Beta" });
        await userEvent.hover(beta);
        assert.strictEqual(getComputedStyle(beta).backgroundColor, tokenColor("--cm-bg-hover"));
        assert.strictEqual(getComputedStyle(beta).outlineWidth, "4px", "Figma's 4px hover ring");
        assert.strictEqual(getComputedStyle(beta).outlineColor, tokenColor("--cm-bg-hover"));
        await userEvent.unhover(beta);
        await userEvent.keyboard("{Tab}{Tab}");
        assert.strictEqual(document.activeElement, beta);
        const picture = beta.querySelector(".cm-tile-button-picture");
        assert.isNotNull(picture);
        assert.strictEqual(getComputedStyle(picture).outlineStyle, "solid", "the picture is ringed");
        assert.strictEqual(getComputedStyle(picture).outlineWidth, "2px");
        assert.strictEqual(getComputedStyle(picture).outlineOffset, "-2px", "inside the picture");
    });

    it("draws each size: sm a 24px row with a 16px thumbnail beside the name, md and lg a 96px or 144px square above it", async () => {
        await renderThemed(
            <div style={{ width: 400 }}>
                <TileButton size="sm" name="Small" src={DOT} />
                <TileButton name="Medium" src={DOT} />
                <TileButton size="lg" name="Large" src={DOT} />
            </div>,
        );
        const small = screen.getByRole("button", { name: "Small" });
        const smallPicture = small.querySelector("img");
        const smallName = small.querySelector(".cm-tile-button-name");
        assert.isNotNull(smallPicture);
        assert.isNotNull(smallName);
        assert.strictEqual(small.getBoundingClientRect().height, 24);
        assert.strictEqual(smallPicture.getBoundingClientRect().width, 16);
        assert.strictEqual(smallPicture.getBoundingClientRect().height, 16);
        assert.isAtLeast(
            smallName.getBoundingClientRect().left,
            smallPicture.getBoundingClientRect().right,
            "the name is beside the thumbnail",
        );
        for (const [name, px] of [
            ["Medium", 96],
            ["Large", 144],
        ] as const) {
            const tile = screen.getByRole("button", { name });
            const picture = tile.querySelector("img");
            assert.isNotNull(picture);
            const box = picture.getBoundingClientRect();
            assert.strictEqual(box.width, px, `${name} picture width`);
            assert.strictEqual(box.height, px, `${name} picture is square`);
            const label = tile.querySelector(".cm-tile-button-name");
            assert.isNotNull(label);
            assert.strictEqual(label.getBoundingClientRect().top - box.bottom, 4, `${name} name 4px under it`);
        }
        assert.deepEqual(await axeFindings("figma"), []);
    });

    it("never draws wider than its grid cell", async () => {
        await renderThemed(
            <div style={{ display: "grid", gridTemplateColumns: "80px", width: 80 }}>
                <TileButton size="lg" name="Large" src={DOT} />
            </div>,
        );
        assert.strictEqual(screen.getByRole("button", { name: "Large" }).getBoundingClientRect().width, 80);
    });
});
