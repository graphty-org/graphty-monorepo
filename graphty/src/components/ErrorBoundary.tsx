import * as Sentry from "@sentry/react";
import React from "react";

import { ErrorFallback } from "./ErrorFallback";

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

/**
 * Error boundary component that catches React errors and reports them to Sentry.
 * @param root0 - Component props
 * @param root0.children - Child components to wrap
 * @returns The error boundary wrapper component
 */
export function ErrorBoundary({ children }: ErrorBoundaryProps): React.JSX.Element {
    return <Sentry.ErrorBoundary fallback={(props) => <ErrorFallback {...props} />}>{children}</Sentry.ErrorBoundary>;
}
