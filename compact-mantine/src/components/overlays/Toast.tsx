import { Button, Notification, type NotificationProps, Portal } from "@mantine/core";
import {
    createContext,
    forwardRef,
    type JSX,
    type MouseEvent,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

// Accessibility: the pill is a group; the message inside it is role="alert",
// so each toast (a new one replaces the old and is re-mounted) is announced
// once. A toast with an action never times out, so the action stays reachable
// for as long as the person needs; the dismiss button has a name.
//
// The look is Figma's toast (design/figma-spec.md 8.6), drawn by the theme's
// Notification classNames (cm-toast*) in src/theme/css/overlays.css.ts: a 40px
// #2c2c2c pill in both themes, 11/16 550 white text, an outlined 24px action,
// and an optional 33px dismiss segment.

/** A button in the toast that acts on what the message is about. */
export interface ToastAction {
    /** The button's text, such as "Copy to clipboard". */
    label: string;
    /** What the button does. The toast stays up until it is dismissed. */
    onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * Props for Toast: the message and its extras, plus any Mantine `Notification`
 * prop except the ones the toast owns.
 */
export interface ToastProps
    extends Omit<NotificationProps, "children" | "title" | "icon" | "onClose" | "withCloseButton" | "role"> {
    /** The message, such as "Zoom to selection". */
    message: ReactNode;
    /** An optional 16px glyph before the message. */
    icon?: ReactNode;
    /** An optional action button after the message. */
    action?: ToastAction;
    /** Show the dismiss X at the end. @default false */
    withCloseButton?: boolean;
    /** Called when the dismiss X is pressed. */
    onClose?: () => void;
    /** The dismiss button's accessible name. @default "Dismiss" */
    closeLabel?: string;
}

/**
 * One toast: Figma's pill notification (design/figma-spec.md 8.6). Render it
 * yourself where it should sit, or let `ToastProvider` and `useToast` place,
 * time and replace it.
 * @param props - Component props
 * @param props.message - The message
 * @param props.icon - An optional 16px glyph before the message
 * @param props.action - An optional action button
 * @param props.withCloseButton - Show the dismiss X
 * @param props.onClose - Called when the dismiss X is pressed
 * @param props.closeLabel - The dismiss button's accessible name
 * @returns The toast
 */
export const Toast = forwardRef<HTMLDivElement, ToastProps>(function Toast(
    { message, icon, action, withCloseButton = false, onClose, closeLabel = "Dismiss", ...props },
    ref,
) {
    return (
        <Notification
            ref={ref}
            role="group"
            withCloseButton={withCloseButton}
            onClose={onClose}
            closeButtonProps={{ "aria-label": closeLabel, iconSize: 10 }}
            data-testid="toast"
            {...props}
        >
            <span role="alert" className="cm-toast-message">
                {icon}
                {message}
            </span>
            {action ? (
                <Button variant="default" className="cm-toast-action" onClick={action.onClick}>
                    {action.label}
                </Button>
            ) : null}
        </Notification>
    );
});

/** What `useToast().show` takes: a message, or a message with its extras. */
export interface ToastOptions extends Omit<ToastProps, "onClose" | "message"> {
    /** The message. */
    message: ReactNode;
    /**
     * How long it stays, in ms; `null` keeps it until it is dismissed or
     * replaced. Defaults to Figma's rule: about 3 s for a message under 20
     * characters, about 6 s for a longer one, and never for a toast with an
     * action.
     */
    duration?: number | null;
}

/** The toast controls `useToast` returns. */
export interface ToastApi {
    /** Show a toast, replacing the one on screen and restarting the timer. */
    show: (toast: ReactNode | ToastOptions) => void;
    /** Take the toast down. */
    hide: () => void;
}

/** A message under this many characters is short and stays about 3 s (Figma: 14-17). */
const SHORT_MESSAGE = 20;
const SHORT_DURATION = 3000;
const LONG_DURATION = 6000;

/**
 * How long a toast stays, by Figma's rule.
 * @param toast - The toast
 * @returns The duration in ms, or null for "until dismissed"
 */
function toastDuration(toast: ToastOptions): number | null {
    if (toast.duration !== undefined) {
        return toast.duration;
    }
    if (toast.action) {
        return null;
    }
    const text = typeof toast.message === "string" ? toast.message : null;
    return text !== null && text.length < SHORT_MESSAGE ? SHORT_DURATION : LONG_DURATION;
}

function isOptions(toast: ReactNode | ToastOptions): toast is ToastOptions {
    return typeof toast === "object" && toast !== null && "message" in toast;
}

const ToastContext = createContext<ToastApi | null>(null);

/** Props for ToastProvider. */
export interface ToastProviderProps {
    /** The part of the tree that may show toasts. Usually the whole application. */
    children: ReactNode;
    /**
     * The distance from the window's bottom edge to the toast's, in px. Figma
     * keeps the toast 16px above its bottom toolbar; the default clears a
     * 60px toolbar the same way.
     * @default 76
     */
    bottom?: number;
    /** The layer the toast draws at. @default 1300 */
    zIndex?: number;
}

/**
 * The one toast the page shows (design/figma-spec.md 8.6): centred
 * horizontally near the bottom of the window. Only one exists; a new one
 * replaces the text and restarts the timer. It appears and goes in one frame,
 * and hovering it does not pause the timer. Wrap the application once and call
 * `useToast()` anywhere inside.
 * @param props - Component props
 * @param props.children - The part of the tree that may show toasts
 * @param props.bottom - The distance from the window's bottom edge, in px
 * @param props.zIndex - The layer the toast draws at
 * @returns The provider and, while a toast is up, the toast
 * @example
 * ```tsx
 * <ToastProvider>
 *     <App />
 * </ToastProvider>
 * // anywhere inside:
 * const toast = useToast();
 * toast.show("Zoom to selection");
 * ```
 */
export function ToastProvider({ children, bottom = 76, zIndex }: ToastProviderProps): JSX.Element {
    const [toast, setToast] = useState<(ToastOptions & { key: number }) | null>(null);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const counter = useRef(0);

    const hide = useCallback(() => {
        clearTimeout(timer.current);
        setToast(null);
    }, []);

    const show = useCallback(
        (next: ReactNode | ToastOptions) => {
            const options: ToastOptions = isOptions(next) ? next : { message: next };
            clearTimeout(timer.current);
            counter.current += 1;
            setToast({ ...options, key: counter.current });
            const duration = toastDuration(options);
            if (duration !== null) {
                timer.current = setTimeout(hide, duration);
            }
        },
        [hide],
    );

    useEffect(() => () => { clearTimeout(timer.current); }, []);

    const api = useMemo<ToastApi>(() => ({ show, hide }), [show, hide]);

    let layer: ReactNode = null;
    if (toast) {
        const { key, duration: _duration, ...toastProps } = toast;
        layer = (
            <Portal>
                <div className="cm-toast-layer" style={{ bottom, zIndex }}>
                    <Toast key={key} {...toastProps} onClose={hide} />
                </div>
            </Portal>
        );
    }

    return (
        <ToastContext.Provider value={api}>
            {children}
            {layer}
        </ToastContext.Provider>
    );
}

/**
 * The page's toast: `show` a message (it replaces any toast on screen) or
 * `hide` it. Call it inside a `ToastProvider`.
 * @returns The toast controls
 */
export function useToast(): ToastApi {
    const api = useContext(ToastContext);
    if (!api) {
        throw new Error("useToast must be used inside a ToastProvider");
    }
    return api;
}
