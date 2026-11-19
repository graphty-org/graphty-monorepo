/**
 * A camera or tour card's menu in the Views place: its own rows, one submenu of radio choices
 * (a camera's Key, a tour's Easing), Move up and Move down, then Delete.
 */

import { MenuCheckItem } from "@graphty/compact-mantine";
import { Menu } from "@mantine/core";
import React from "react";

import { RowMore, type SelectionMenuItem, SelectionMenuItems } from "../selection/SelectionMenu";

/** Props for CardMenu. */
interface CardMenuProps {
    /** The card's name. */
    readonly name: string;
    /** The rows above the submenu. */
    readonly first: SelectionMenuItem[];
    /** The submenu's label. */
    readonly choose: string;
    /** The submenu's choices. */
    readonly choices: readonly { readonly value: string; readonly label: string }[];
    /** The choice checked. */
    readonly chosen: string;
    /** Runs a choice. */
    readonly onChoose: (value: string) => void;
    /** The rows below the submenu. */
    readonly rest: SelectionMenuItem[];
    /** The rows after the divider. */
    readonly removal: SelectionMenuItem[];
}

/**
 * A card's menu.
 * @param props - Component props
 * @param props.name - the card's name
 * @param props.first - the rows above the submenu
 * @param props.choose - the submenu's label
 * @param props.choices - the submenu's choices
 * @param props.chosen - the choice checked
 * @param props.onChoose - runs a choice
 * @param props.rest - the rows below the submenu
 * @param props.removal - the rows after the divider
 * @returns The menu
 */
export function CardMenu({
    name,
    first,
    choose,
    choices,
    chosen,
    onChoose,
    rest,
    removal,
}: CardMenuProps): React.JSX.Element {
    return (
        <RowMore name={name} items={[]}>
            <SelectionMenuItems items={first} />
            <Menu.Sub>
                <Menu.Sub.Target>
                    <Menu.Sub.Item>{choose}</Menu.Sub.Item>
                </Menu.Sub.Target>
                <Menu.Sub.Dropdown>
                    {choices.map((choice) => (
                        <MenuCheckItem
                            key={choice.value}
                            radio
                            checked={chosen === choice.value}
                            onClick={() => {
                                onChoose(choice.value);
                            }}
                        >
                            {choice.label}
                        </MenuCheckItem>
                    ))}
                </Menu.Sub.Dropdown>
            </Menu.Sub>
            <SelectionMenuItems items={rest} />
            <Menu.Divider />
            <SelectionMenuItems items={removal} />
        </RowMore>
    );
}
