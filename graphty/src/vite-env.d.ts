/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_SENTRY_ORG: string;
    readonly VITE_SENTRY_PROJECT: string;
    /** "true" in a built Storybook: the sample datasets and their pictures are served beside it. */
    readonly VITE_LOCAL_SAMPLE_DATA?: string;
    /** The remote-logger server `?remoteLog=1` sends to (src/lib/remoteLog.ts). */
    readonly VITE_REMOTE_LOG_URL?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
