import * as Sentry from "@sentry/react";
import React from "react";

import type { FallbackProps } from "@/types/error-boundary";

import { bootSignal } from "../bootSignal";
import { ErrorFallback } from "./ErrorFallback";

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

/**
 * Sentry's fallback render: the fallback UI, given what Sentry passes it.
 * @param props - The error and the function that resets the boundary
 * @returns The error fallback UI
 */
function renderFallback(props: FallbackProps): React.JSX.Element {
    return <ErrorFallback {...props} />;
}

/**
 * A crash shows the fallback, and the loading screen must not stay over it if it was held up.
 * @param error - what was thrown.
 */
function releaseLoadingScreen(error: unknown): void {
    bootSignal({ line: `render crashed: ${String(error)}`, error: true, done: true });
}

/**
 * Error boundary component that catches React errors and reports them to Sentry.
 * @param root0 - Component props
 * @param root0.children - Child components to wrap
 * @returns The error boundary wrapper component
 */
export function ErrorBoundary({ children }: Readonly<ErrorBoundaryProps>): React.JSX.Element {
    return (
        <Sentry.ErrorBoundary fallback={renderFallback} onError={releaseLoadingScreen}>
            {children}
        </Sentry.ErrorBoundary>
    );
}
