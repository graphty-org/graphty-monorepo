import * as Sentry from "@sentry/react";
import React from "react";

import type { FallbackProps } from "@/types/error-boundary";

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
 * Error boundary component that catches React errors and reports them to Sentry.
 * @param root0 - Component props
 * @param root0.children - Child components to wrap
 * @returns The error boundary wrapper component
 */
export function ErrorBoundary({ children }: Readonly<ErrorBoundaryProps>): React.JSX.Element {
    return <Sentry.ErrorBoundary fallback={renderFallback}>{children}</Sentry.ErrorBoundary>;
}
