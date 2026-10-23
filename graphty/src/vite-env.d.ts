/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_SENTRY_DSN: string;
    readonly VITE_SENTRY_ORG: string;
    readonly VITE_SENTRY_PROJECT: string;
    /** "true" in a built Storybook: the sample datasets and their pictures are served beside it. */
    readonly VITE_LOCAL_SAMPLE_DATA?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
