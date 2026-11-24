/**
 * Drill-in (design/ui/style-panel-v2/design.md, "Input rules"): a pop-out opened from inside a settings pop-over
 * replaces the pop-over's content in place, with a back button in its header, instead of floating beside it as a
 * pop-out of its own. So the panel's pop-over is the first pop-out level, whatever drills into it stays at that
 * level, and a picker it opens (a color, a drop-down's list) is the second and last.
 *
 * `Pop` is written as compact-mantine's `Popout` is (`PopTrigger`, `PopPanel`, `PopContent` for its parts): inside a
 * pop-over that hosts drill-in (`useDrillHost`: a v2 row's settings, or a `Pop` drawn as a pop-out) it drills,
 * anywhere else it is that `Popout`, which hosts drill-in in turn (a link dialog opened from a panel line drills its
 * Advanced view into itself).
 */

import { Popout } from "@graphty/compact-mantine";
import { Button, Tooltip } from "@mantine/core";
import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { GLYPHS } from "../glyphs";
import { DrillHostContext as HostContext, useDrillHost } from "./useDrillHost";

/** One `Pop`'s state, for its trigger and panel. */
interface PopValue {
    readonly open: boolean;
    readonly setOpen: (open: boolean) => void;
    readonly id: string;
    readonly trigger: React.RefObject<HTMLElement | null>;
}

const PopContext = createContext<PopValue | null>(null);

/**
 * Drills into the pop-over it is in, or is a `Popout` outside one: see the file header.
 * @param props - Component props
 * @param props.opened - whether it is open, when the caller drives it
 * @param props.onOpenChange - told when it opens or closes
 * @param props.children - its trigger and panel
 * @returns The pop-out
 */
export function Pop({
    opened,
    onOpenChange,
    children,
}: Readonly<{
    opened?: boolean;
    onOpenChange?: (open: boolean) => void;
    children: React.ReactNode;
}>): React.JSX.Element {
    const host = useContext(HostContext);
    const [own, setOwn] = useState(false);
    const id = `drill-${useId().replaceAll(":", "")}`;
    const trigger = useRef<HTMLElement | null>(null);
    const open = opened ?? own;
    const setOpen = useCallback(
        (next: boolean) => {
            setOwn(next);
            onOpenChange?.(next);
        },
        [onOpenChange],
    );
    const value = useMemo(() => ({ open, setOpen, id, trigger }), [open, setOpen, id]);
    if (host === null) {
        return (
            <Popout opened={opened} onOpenChange={onOpenChange}>
                {children}
            </Popout>
        );
    }
    return <PopContext.Provider value={value}>{children}</PopContext.Provider>;
}

type TriggerChild = React.ReactElement<{
    onClick?: React.MouseEventHandler;
    ref?: React.Ref<HTMLElement>;
    children?: React.ReactNode;
}>;

/**
 * The control that opens it: `Popout.Trigger`, or, drilling, a click that drills in.
 * @param props - Component props
 * @param props.children - one element, a button (or a Tooltip around one)
 * @returns The trigger
 */
export function PopTrigger({ children }: Readonly<{ children: React.ReactElement }>): React.JSX.Element {
    const pop = useContext(PopContext);
    if (pop === null) {
        return <Popout.Trigger>{children}</Popout.Trigger>;
    }
    const attach = (target: TriggerChild): React.ReactElement =>
        React.cloneElement(target, {
            onClick: (event: React.MouseEvent) => {
                target.props.onClick?.(event);
                event.stopPropagation();
                pop.setOpen(!pop.open);
            },
            ref: pop.trigger,
            "aria-expanded": pop.open,
            "aria-controls": pop.id,
            "aria-haspopup": "dialog",
            "data-drill": "",
        } as Record<string, unknown>);
    const child = children as TriggerChild;
    // A Tooltip passes its own props to its bubble: the button inside takes them, as Popout.Trigger does.
    if (child.type === Tooltip && React.isValidElement(child.props.children)) {
        return React.cloneElement(child, { children: attach(child.props.children as TriggerChild) });
    }
    return attach(child);
}

/** Popout.Panel's props: drilling reads only the title. */
type PanelProps = React.ComponentProps<typeof Popout.Panel>;

/**
 * Its content: `Popout.Panel` hosting drill-in, or, drilling, a view in the pop-over with its title in the header.
 * @param props - Popout.Panel's props
 * @returns The panel or the view
 */
export function PopPanel(props: Readonly<PanelProps>): React.JSX.Element | null {
    const pop = useContext(PopContext);
    const host = useContext(HostContext);
    const title = props.header?.variant === "title" ? props.header.title : "";
    const own = useDrillHost(title);
    const { push, drop } = host ?? {};
    const open = pop?.open === true;
    const setOpen = pop?.setOpen;
    const id = pop?.id ?? "";
    const { width } = props;
    const view = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open || push === undefined || drop === undefined || setOpen === undefined) {
            return undefined;
        }
        push({
            id,
            title,
            width,
            back: () => {
                setOpen(false);
            },
        });
        return () => {
            drop(id);
        };
    }, [open, push, drop, setOpen, id, title, width]);
    const shown = host?.top === id;
    useEffect(() => {
        if (shown) {
            view.current?.querySelector<HTMLElement>("button, input, [tabindex='0']")?.focus();
        }
    }, [shown]);
    useEffect(() => {
        const node = view.current;
        if (node === null || setOpen === undefined) {
            return undefined;
        }
        // Escape goes back one view, not out of the pop-over.
        const back = (event: KeyboardEvent): void => {
            if (event.key === "Escape" && !event.defaultPrevented) {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
            }
        };
        node.addEventListener("keydown", back);
        return () => {
            node.removeEventListener("keydown", back);
        };
    }, [open, shown, setOpen]);
    useEffect(() => {
        const trigger = pop?.trigger.current;
        return () => {
            // Going back puts focus where the reader drilled from.
            if (open && trigger?.isConnected === true) {
                trigger.focus();
            }
        };
    }, [open, pop?.trigger]);
    if (pop === null) {
        return (
            <Popout.Panel
                {...props}
                width={own.width ?? props.width}
                header={props.header?.variant === "title" ? { ...props.header, title: own.title } : props.header}
                actions={own.actions ?? props.actions}
            >
                {own.body(props.children)}
            </Popout.Panel>
        );
    }
    if (!open || host?.target === null || host === null) {
        return null;
    }
    return createPortal(
        <div // eslint-disable-line jsx-a11y/prefer-tag-over-role -- an ARIA group naming the drilled view; a fieldset would draw its own border and legend
            ref={view}
            id={id}
            role="group"
            aria-label={title}
            data-drill-view=""
            hidden={!shown}
        >
            {props.children}
        </div>,
        host.target,
    );
}

/**
 * Its padded body: `Popout.Content` in a pop-out; drilled in, the pop-over's own padding holds it.
 * @param props - Component props
 * @param props.children - the body
 * @returns The body
 */
export function PopContent({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
    return useContext(PopContext) === null ? <Popout.Content>{children}</Popout.Content> : <>{children}</>;
}

/**
 * A pop-over's last line, "Advanced": drills in to the pop-over's rare settings (design "Input rules").
 * @param props - Component props
 * @param props.name - the button's accessible name ("Node label advanced settings")
 * @param props.title - the view's title in the header
 * @param props.changed - whether a setting in it is set
 * @param props.children - the rare settings
 * @returns The line
 */
export function AdvancedDrill({
    name,
    title,
    changed,
    children,
}: Readonly<{ name: string; title: string; changed: boolean; children: React.ReactNode }>): React.JSX.Element {
    return (
        <div className="ws-row" data-line="advanced">
            <Pop>
                <PopTrigger>
                    <Button
                        variant="subtle"
                        size="xs"
                        fullWidth
                        justify="space-between"
                        aria-label={name}
                        data-changed={changed ? "" : undefined}
                        rightSection={<GLYPHS.more size={14} aria-hidden />}
                    >
                        Advanced
                    </Button>
                </PopTrigger>
                <PopPanel
                    // Wider than a pop-over: its rarer settings have longer names ("Letter outline opacity").
                    width={312}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title }}
                    closeLabel={`Close ${title}`}
                >
                    <PopContent>{children}</PopContent>
                </PopPanel>
            </Pop>
        </div>
    );
}
