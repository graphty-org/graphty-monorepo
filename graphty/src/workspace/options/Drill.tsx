/**
 * Drill-in (design/ui/style-panel-v2/design.md, "Input rules"): a pop-out opened from inside a settings pop-over
 * replaces the pop-over's content in place, with a back button in its header, instead of floating beside it as a
 * pop-out of its own. So the panel's pop-over is the first pop-out level, whatever drills into it stays at that
 * level, and a picker it opens (a color, a drop-down's list) is the second and last.
 *
 * `Pop` is written exactly as compact-mantine's `Popout` is (`Pop.Trigger`, `Pop.Panel`, `Pop.Content`): inside a
 * pop-over that hosts drill-in (`useDrillHost`: a v2 row's settings, or a `Pop` drawn as a pop-out) it drills,
 * anywhere else it is that `Popout`, which hosts drill-in in turn (a link dialog opened from a panel line drills its
 * Advanced view into itself).
 */

import { Popout } from "@graphty/compact-mantine";
import { Button, Tooltip } from "@mantine/core";
import React, { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { GLYPHS } from "../glyphs";

/** A view drilled into the pop-over: its title, and what going back does. */
interface DrillEntry {
    readonly id: string;
    readonly title: string;
    readonly back: () => void;
}

/** What a pop-over hosting drill-in offers the views drilled into it. */
interface DrillHostValue {
    /** Where drilled views are drawn: after the pop-over's own content, inside its panel. */
    readonly target: HTMLElement | null;
    /** The view on top, the one shown, by id. */
    readonly top: string | undefined;
    readonly push: (entry: DrillEntry) => void;
    readonly drop: (id: string) => void;
}

const HostContext = createContext<DrillHostValue | null>(null);

/**
 * A pop-over's drill-in: its content, hidden while a view is drilled into it, and the place drilled views draw.
 * @param title - the pop-over's own title.
 * @returns the header's title and actions, and the body to draw in the panel.
 */
export function useDrillHost(title: string): {
    title: string;
    actions: { id: string; icon: React.ReactNode; label: string; onClick: () => void }[] | undefined;
    body: (children: React.ReactNode) => React.JSX.Element;
} {
    const [stack, setStack] = useState<readonly DrillEntry[]>([]);
    const [target, setTarget] = useState<HTMLElement | null>(null);
    const push = useCallback((entry: DrillEntry) => {
        setStack((now) => [...now.filter((each) => each.id !== entry.id), entry]);
    }, []);
    const drop = useCallback((id: string) => {
        setStack((now) => now.filter((each) => each.id !== id));
    }, []);
    const top = stack.at(-1);
    const value = useMemo(() => ({ target, top: top?.id, push, drop }), [target, top?.id, push, drop]);
    const under = stack.at(-2)?.title ?? title;
    return {
        title: top?.title ?? title,
        actions:
            top === undefined
                ? undefined
                : [
                      {
                          id: "back",
                          icon: <GLYPHS.back size={14} aria-hidden />,
                          label: `Back to ${under}`,
                          onClick: top.back,
                      },
                  ],
        body: (children) => (
            <HostContext.Provider value={value}>
                <div hidden={top !== undefined}>{children}</div>
                <div ref={setTarget} data-drill-target="" />
            </HostContext.Provider>
        ),
    };
}

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
function PopRoot({
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
function PopTrigger({ children }: Readonly<{ children: React.ReactElement }>): React.JSX.Element {
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
            ref: pop.trigger as React.Ref<HTMLElement>,
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
function PopPanel(props: PanelProps): React.JSX.Element | null {
    const pop = useContext(PopContext);
    const host = useContext(HostContext);
    const title = props.header?.variant === "title" ? String(props.header.title) : "";
    const own = useDrillHost(title);
    const { push, drop } = host ?? {};
    const open = pop?.open === true;
    const setOpen = pop?.setOpen;
    const id = pop?.id ?? "";
    const view = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (!open || push === undefined || drop === undefined || setOpen === undefined) {
            return undefined;
        }
        push({ id, title, back: () => setOpen(false) });
        return () => {
            drop(id);
        };
    }, [open, push, drop, setOpen, id, title]);
    const shown = host?.top === id;
    useEffect(() => {
        if (shown) {
            view.current?.querySelector<HTMLElement>("button, input, [tabindex='0']")?.focus();
        }
    }, [shown]);
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
        <div
            ref={view}
            id={id}
            role="group"
            aria-label={title}
            data-drill-view=""
            hidden={!shown}
            onKeyDown={(event) => {
                if (event.key === "Escape" && !event.defaultPrevented) {
                    // Escape goes back one view, not out of the pop-over.
                    event.preventDefault();
                    event.stopPropagation();
                    pop.setOpen(false);
                }
            }}
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
function PopContent({ children }: Readonly<{ children: React.ReactNode }>): React.JSX.Element {
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
                <Pop.Trigger>
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
                </Pop.Trigger>
                <Pop.Panel
                    width={264}
                    placement="left"
                    alignment="start"
                    header={{ variant: "title", title }}
                    closeLabel={`Close ${title}`}
                >
                    <Pop.Content>{children}</Pop.Content>
                </Pop.Panel>
            </Pop>
        </div>
    );
}

/** Drill-in or Popout, written as Popout is: see the file header. */
export const Pop = Object.assign(PopRoot, {
    Trigger: PopTrigger,
    Panel: PopPanel,
    Content: PopContent,
});
