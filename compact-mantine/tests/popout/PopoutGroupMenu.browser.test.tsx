/**
 * A pop-out's header "..." (`more`), the menu rows that mark a set group (`MenuGroupItem`), and a
 * group pop-over opened beside its pop-out (`placement="beside"`), driven by a real pointer and
 * keyboard: the tooltip and set look of "...", picking a group from the menu, one group at a time,
 * the side with room (desktop and a 768 x 1024 tablet held upright), and focus going back to "...".
 */
import { MantineProvider, Tooltip } from "@mantine/core";
import { render, screen, waitFor, within } from "@testing-library/react";
import { useState } from "react";
import { afterEach, assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { MenuGroupItem } from "../../src/components/overlays";
import { Popout, PopoutManager } from "../../src/components/popout";
import { chooseBesideSide } from "../../src/components/popout/utils/position";
import { compactTheme } from "../../src/theme";

const GROUPS = ["Wrap", "Badge"] as const;

/**
 * The set Wrap row's accessible name: its name, then the hidden ", set" (the browser's name
 * computation may put a space before the comma, as the hidden text is its own box).
 */
const SET_WRAP = /^Wrap\s*, set$/;

/**
 * A "Label" pop-out opened below its button at `left`, whose "..." lists Wrap (set) and Badge;
 * each opens its own pop-over beside the Label pop-out.
 * @param props - Component props
 * @param props.left - How far from the window's left edge the button sits
 * @param props.groupWidth - The group pop-overs' width
 * @param props.direct - Give "..." a click that opens Wrap directly instead of a menu
 * @param props.rows - How many fields a group pop-over holds: a few fit beside the Label pop-out,
 *     level with its top; many run past the window and scroll
 * @returns The button with its pop-outs
 */
function Thing({
    left,
    groupWidth = 280,
    direct = false,
    rows = 6,
}: Readonly<{ left: number; groupWidth?: number; direct?: boolean; rows?: number }>): React.JSX.Element {
    const [group, setGroup] = useState<string | null>(null);
    return (
        <div style={{ position: "fixed", top: 40, left }}>
            <Popout>
                <Popout.Trigger>
                    <button type="button">Label</button>
                </Popout.Trigger>
                <Popout.Panel
                    width={240}
                    placement="bottom"
                    header={{ variant: "title", title: "Label" }}
                    more={
                        direct
                            ? {
                                  label: "Wrap settings",
                                  expanded: group === "Wrap",
                                  onClick: () => {
                                      setGroup(group === "Wrap" ? null : "Wrap");
                                  },
                              }
                            : {
                                  label: "More label settings",
                                  set: true,
                                  children: GROUPS.map((name) => (
                                      <MenuGroupItem
                                          key={name}
                                          set={name === "Wrap"}
                                          onClick={() => {
                                              setGroup(name);
                                          }}
                                      >
                                          {name}
                                      </MenuGroupItem>
                                  )),
                              }
                    }
                >
                    <Popout.Content>
                        <input aria-label="Text" style={{ display: "block", height: 24 }} />
                    </Popout.Content>
                    {GROUPS.map((name) => (
                        <Popout
                            key={name}
                            opened={group === name}
                            onOpenChange={(opened) => {
                                if (!opened) {
                                    setGroup((current) => (current === name ? null : current));
                                }
                            }}
                        >
                            <Popout.Panel
                                width={groupWidth}
                                placement="beside"
                                gap={8}
                                header={{ variant: "title", title: name }}
                            >
                                <Popout.Content>
                                    {Array.from({ length: rows }, (_, i) => (
                                        <input
                                            key={i}
                                            aria-label={`${name} ${String(i + 1)}`}
                                            style={{ display: "block", height: 24 }}
                                        />
                                    ))}
                                </Popout.Content>
                            </Popout.Panel>
                        </Popout>
                    ))}
                </Popout.Panel>
            </Popout>
        </div>
    );
}

function renderThing(props: Parameters<typeof Thing>[0]): void {
    // A warm tooltip group (no open delay), so the tooltip shows on hover without waiting out
    // the theme's cold delay.
    render(
        <MantineProvider theme={compactTheme}>
            <Tooltip.Group openDelay={0} closeDelay={0}>
                <PopoutManager>
                    <Thing {...props} />
                </PopoutManager>
            </Tooltip.Group>
        </MantineProvider>,
    );
}

/**
 * The open pop-out titled `title`, once it has been placed.
 * @param title - its title
 * @returns the panel
 */
async function placed(title: string): Promise<HTMLElement> {
    const panel = await screen.findByRole("dialog", { name: title });
    await waitFor(() => {
        assert.notEqual(panel.style.visibility, "hidden");
        assert.isFalse(panel.hasAttribute("data-cm-repositioning"));
    });
    return panel;
}

async function openLabel(): Promise<HTMLElement> {
    await userEvent.click(screen.getByRole("button", { name: "Label" }));
    return placed("Label");
}

function overlaps(a: DOMRect, b: DOMRect): boolean {
    return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * Resolves with the first element `match` accepts, as soon as one is in the page.
 * @param match - what to wait for
 * @returns the element
 */
function appears(match: (element: Element) => boolean): Promise<Element> {
    return new Promise((resolve) => {
        const look = (): boolean => {
            const found = [...document.body.querySelectorAll("*")].find(match);
            if (found !== undefined) {
                observer.disconnect();
                resolve(found);
                return true;
            }
            return false;
        };
        const observer = new MutationObserver(look);
        if (!look()) {
            observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        }
    });
}

describe("a pop-out's group menu and the group pop-overs beside it (browser)", () => {
    afterEach(async () => {
        await page.viewport(1280, 800);
    });

    it("a panel without `more` has no '...' button", async () => {
        render(
            <MantineProvider theme={compactTheme}>
                <PopoutManager>
                    <Popout defaultOpened>
                        <Popout.Trigger>
                            <button type="button">Open</button>
                        </Popout.Trigger>
                        <Popout.Panel width={240} header={{ variant: "title", title: "Plain" }}>
                            <Popout.Content>Body</Popout.Content>
                        </Popout.Panel>
                    </Popout>
                </PopoutManager>
            </MantineProvider>,
        );
        const panel = await placed("Plain");
        assert.deepEqual(
            within(panel)
                .getAllByRole("button")
                .map((button) => button.getAttribute("aria-label")),
            ["Close panel"],
        );
    });

    it("'...' has a tooltip, a set look, and a menu marking the set group", async () => {
        renderThing({ left: 600 });
        const panel = await openLabel();
        const more = within(panel).getByRole("button", { name: "More label settings" });
        const close = within(panel).getByRole("button", { name: "Close panel" });
        assert.notEqual(getComputedStyle(more).color, getComputedStyle(close).color, "set: brand ink");

        const tip = appears((el) => el.classList.contains("cm-tooltip") && el.textContent === "More label settings");
        await userEvent.hover(more);
        await tip;

        await userEvent.click(more);
        const wrap = await screen.findByRole("menuitem", { name: SET_WRAP });
        const badge = screen.getByRole("menuitem", { name: "Badge" });
        assert.equal(wrap.getAttribute("aria-haspopup"), "dialog");
        assert.isNotNull(wrap.querySelector(".cm-menu-row-set"));
        assert.isNull(badge.querySelector(".cm-menu-row-set"));
        const dot = wrap.querySelector(".cm-menu-row-set");
        assert.isNotNull(dot);
        const rect = dot.getBoundingClientRect();
        assert.deepEqual([rect.width, rect.height], [5, 5]);
        assert.equal(more.getAttribute("aria-expanded"), "true");
    });

    it("picking a group opens it beside the pop-out on the start side, one at a time", async () => {
        renderThing({ left: 600 });
        const panel = await openLabel();
        await userEvent.click(within(panel).getByRole("button", { name: "More label settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: SET_WRAP }));
        const wrap = await placed("Wrap");
        const parentRect = panel.getBoundingClientRect();
        const wrapRect = wrap.getBoundingClientRect();
        assert.isFalse(overlaps(parentRect, wrapRect));
        assert.closeTo(wrapRect.right, parentRect.left - 8, 1, "start (left) side, 8 apart");
        assert.closeTo(wrapRect.top, parentRect.top, 1, "level with the pop-out's top");

        await userEvent.click(within(panel).getByRole("button", { name: "More label settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Badge" }));
        await placed("Badge");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Wrap" }));
        });
        assert.isTrue(panel.isConnected, "the pop-out it opened from stays open");
    });

    it("opens on the end side when the start side has no room", async () => {
        renderThing({ left: 16 });
        const panel = await openLabel();
        await userEvent.click(within(panel).getByRole("button", { name: "More label settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Badge" }));
        const badge = await placed("Badge");
        const parentRect = panel.getBoundingClientRect();
        const badgeRect = badge.getBoundingClientRect();
        assert.isFalse(overlaps(parentRect, badgeRect));
        assert.closeTo(badgeRect.left, parentRect.right + 8, 1);
    });

    it("on a 768 x 1024 tablet held upright, opens below when neither side has room, no taller than the room", async () => {
        await page.viewport(768, 1024);
        renderThing({ left: 200, groupWidth: 400, rows: 30 });
        const panel = await openLabel();
        await userEvent.click(within(panel).getByRole("button", { name: "More label settings" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Badge" }));
        const badge = await placed("Badge");
        const parentRect = panel.getBoundingClientRect();
        const badgeRect = badge.getBoundingClientRect();
        assert.isFalse(overlaps(parentRect, badgeRect));
        assert.isAtLeast(badgeRect.top, parentRect.bottom);
        assert.isAtMost(badgeRect.bottom, window.innerHeight);
        assert.isAtLeast(badgeRect.right, 0);
        assert.isAtMost(badgeRect.right, window.innerWidth);
    });

    it("from the keyboard: Enter opens the menu, a group takes focus, Escape gives it back to '...'", async () => {
        renderThing({ left: 600 });
        const panel = await openLabel();
        const more = within(panel).getByRole("button", { name: "More label settings" });
        more.focus();
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.equal(document.activeElement?.textContent, "Wrap, set");
        });
        await userEvent.keyboard("{ArrowDown}");
        await waitFor(() => {
            assert.equal(document.activeElement?.textContent, "Badge");
        });
        await userEvent.keyboard("{Enter}");
        const badge = await placed("Badge");
        await waitFor(() => {
            assert.isTrue(badge.contains(document.activeElement));
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Badge" }));
            assert.equal(document.activeElement, more);
        });
        assert.isTrue(panel.isConnected, "Escape closed only the group");
    });

    it("without entries, '...' opens its one group directly and reports it expanded", async () => {
        renderThing({ left: 600, direct: true });
        const panel = await openLabel();
        const more = within(panel).getByRole("button", { name: "Wrap settings" });
        assert.equal(more.getAttribute("aria-haspopup"), "dialog");
        assert.equal(more.getAttribute("aria-expanded"), "false");
        await userEvent.click(more);
        const wrap = await placed("Wrap");
        assert.isFalse(overlaps(panel.getBoundingClientRect(), wrap.getBoundingClientRect()));
        assert.equal(more.getAttribute("aria-expanded"), "true");
    });
});

describe("chooseBesideSide", () => {
    const view = { width: 1000, top: 0, bottom: 800 };
    const parent = (left: number, top = 100, height = 200): DOMRect => new DOMRect(left, top, 240, height);

    it("prefers the start side, then the end side", () => {
        assert.deepEqual(chooseBesideSide(parent(400), 300, 8, view, "ltr"), { placement: "left" });
        assert.deepEqual(chooseBesideSide(parent(100), 300, 8, view, "ltr"), { placement: "right" });
        assert.deepEqual(chooseBesideSide(parent(400), 300, 8, view, "rtl"), { placement: "right" });
    });

    it("falls back to below or above, whichever has more room, with that room", () => {
        assert.deepEqual(chooseBesideSide(parent(300, 100), 500, 8, view, "ltr"), {
            placement: "bottom",
            room: 800 - 300 - 8,
        });
        assert.deepEqual(chooseBesideSide(parent(300, 500), 500, 8, view, "ltr"), {
            placement: "top",
            room: 500 - 8,
        });
    });
});
