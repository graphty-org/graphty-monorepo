# Implementation Plan for Sentry.io Integration

## Overview

This plan implements Sentry.io integration for the Graphty React application, providing:

- Automatic JavaScript error tracking with source-mapped stack traces
- User feedback collection via a modal dialog accessible from the hamburger menu
- File attachment support for user feedback
- React error boundary for graceful error handling
- Privacy-first approach with session replay disabled

Each phase delivers user-testable functionality, starting with a working Sentry integration in Phase 1.

## Phase Breakdown

### Phase 1: Sentry SDK + Test Error Button

**Objective**: Install Sentry SDK and add a visible "Test Error" button so you can immediately verify errors appear in Sentry.

**What You Can Test**:

- Click a button in the app to trigger an error
- View the error in the Sentry dashboard within seconds
- Storybook story demonstrates the error trigger

**Tests to Write First**:

- `src/lib/sentry.test.ts`: Test Sentry initialization logic

    ```typescript
    import { describe, it, expect, vi, beforeEach } from "vitest";

    describe("Sentry initialization", () => {
        beforeEach(() => {
            vi.resetModules();
        });

        it("should not initialize when DSN is not configured", async () => {
            vi.stubEnv("VITE_SENTRY_DSN", "");
            const { initSentry, isSentryEnabled } = await import("./sentry");
            initSentry();
            expect(isSentryEnabled()).toBe(false);
        });

        it("should initialize when DSN is configured", async () => {
            vi.stubEnv("VITE_SENTRY_DSN", "https://test@test.ingest.sentry.io/123");
            const { initSentry, isSentryEnabled } = await import("./sentry");
            initSentry();
            expect(isSentryEnabled()).toBe(true);
        });
    });
    ```

**Implementation**:

1. Install dependencies:

    ```bash
    npm install @sentry/react
    ```

2. Create `src/lib/sentry.ts`:

    ```typescript
    import * as Sentry from "@sentry/react";

    let initialized = false;

    export function initSentry(): void {
        const dsn = import.meta.env.VITE_SENTRY_DSN;
        if (!dsn) {
            console.warn("Sentry DSN not configured, error tracking disabled");
            return;
        }

        Sentry.init({
            dsn,
            environment: import.meta.env.MODE,
            tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
            replaysSessionSampleRate: 0, // Privacy-first
            replaysOnErrorSampleRate: 0,
        });
        initialized = true;
    }

    export function isSentryEnabled(): boolean {
        return initialized;
    }

    export function testCaptureError(): void {
        Sentry.captureException(new Error("Test error from Graphty"));
    }
    ```

3. Update `src/main.tsx` to call `initSentry()` before React render

4. Add temporary "Test Error" button to `TopMenuBar.tsx`:

    ```typescript
    // In the hamburger menu dropdown, add:
    <MantineMenu.Label>Debug</MantineMenu.Label>
    <MantineMenu.Item
        leftSection={<AlertTriangle size={14} />}
        onClick={() => {
            import("../lib/sentry").then(m => m.testCaptureError());
        }}
    >
        Test Sentry Error
    </MantineMenu.Item>
    ```

5. Create `.env.development`:

    ```bash
    VITE_SENTRY_DSN=https://your-dsn@xxx.ingest.sentry.io/xxx
    ```

6. Create Storybook story `src/stories/SentryTest.stories.tsx`:
    ```typescript
    export const TestSentryError: Story = {
        render: () => (
            <Button onClick={() => testCaptureError()}>
                Click to Send Test Error to Sentry
            </Button>
        ),
    };
    ```

**Dependencies**:

- External: `@sentry/react` (^8.x)

**User Verification**:

1. Set up your Sentry project (see design doc for instructions)
2. Add your DSN to `.env.development`
3. Run: `npm run dev`
4. Click hamburger menu → "Test Sentry Error"
5. Open Sentry dashboard → See the error appear within seconds
6. Alternative: Run `npm run storybook` and use the test button there

---

### Phase 2: Error Boundary with Fallback UI

**Objective**: Add a React error boundary that catches render errors and shows a user-friendly fallback UI instead of a white screen.

**What You Can Test**:

- Storybook story shows the error fallback UI
- Trigger a render error and see the fallback instead of crash
- "Try Again" button resets the error state
- Error still appears in Sentry dashboard

**Tests to Write First**:

- `src/components/ErrorBoundary.test.tsx`:

    ```typescript
    import { describe, it, expect, vi } from "vitest";
    import { render, screen, fireEvent } from "../test/test-utils";
    import { ErrorBoundary } from "./ErrorBoundary";

    const ThrowingComponent = () => {
        throw new Error("Test render error");
    };

    describe("ErrorBoundary", () => {
        it("renders children when no error occurs", () => {
            render(
                <ErrorBoundary>
                    <div>Normal content</div>
                </ErrorBoundary>
            );
            expect(screen.getByText("Normal content")).toBeInTheDocument();
        });

        it("renders fallback UI when error occurs", () => {
            const spy = vi.spyOn(console, "error").mockImplementation(() => {});
            render(
                <ErrorBoundary>
                    <ThrowingComponent />
                </ErrorBoundary>
            );
            expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
            expect(screen.getByRole("button", { name: /Try again/i })).toBeInTheDocument();
            spy.mockRestore();
        });
    });
    ```

**Implementation**:

1. Create `src/components/ErrorBoundary.tsx`:

    ```typescript
    import * as Sentry from "@sentry/react";
    import { Button, Stack, Text, Title, Box } from "@mantine/core";
    import { AlertTriangle, RefreshCw } from "lucide-react";

    interface FallbackProps {
        error: Error;
        resetError: () => void;
    }

    function ErrorFallback({ error, resetError }: FallbackProps) {
        return (
            <Box style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                backgroundColor: "var(--mantine-color-dark-8)"
            }}>
                <Stack align="center" gap="lg">
                    <AlertTriangle size={48} color="var(--mantine-color-red-5)" />
                    <Title order={2} c="gray.1">Something went wrong</Title>
                    <Text c="gray.4" size="sm" maw={400} ta="center">
                        An unexpected error occurred. The error has been reported.
                    </Text>
                    <Button
                        leftSection={<RefreshCw size={16} />}
                        onClick={resetError}
                    >
                        Try again
                    </Button>
                </Stack>
            </Box>
        );
    }

    export const ErrorBoundary = Sentry.withErrorBoundary(
        ({ children }) => <>{children}</>,
        { fallback: (props) => <ErrorFallback {...props} /> }
    );
    ```

2. Wrap `<AppLayout />` in `src/App.tsx`:

    ```typescript
    import { ErrorBoundary } from "./components/ErrorBoundary";

    export function App() {
        return (
            <ErrorBoundary>
                <AppLayout />
            </ErrorBoundary>
        );
    }
    ```

3. Create Storybook story `src/stories/ErrorBoundary.stories.tsx`:

    ```typescript
    export const ErrorState: Story = {
        render: () => (
            <ErrorFallback
                error={new Error("Demo error")}
                resetError={() => alert("Reset clicked")}
            />
        ),
    };

    export const TriggerError: Story = {
        render: () => {
            const [shouldError, setShouldError] = useState(false);
            if (shouldError) throw new Error("Triggered error");
            return (
                <Button onClick={() => setShouldError(true)}>
                    Click to Trigger Render Error
                </Button>
            );
        },
    };
    ```

**Dependencies**:

- Internal: Phase 1 (Sentry SDK)

**User Verification**:

1. Run: `npm run storybook`
2. Navigate to ErrorBoundary stories
3. View "ErrorState" story to see the fallback UI design
4. View "TriggerError" story, click the button
5. See the fallback UI appear (not a white screen)
6. Check Sentry dashboard - error should be captured
7. Click "Try again" - component resets

---

### Phase 3: Feedback Menu Item + Basic Modal

**Objective**: Add "Send feedback..." to the hamburger menu and create a basic feedback modal that submits to Sentry.

**What You Can Test**:

- Click hamburger menu → See "Send feedback..." under Help section
- Click it → Modal opens with form fields
- Fill out and submit → Feedback appears in Sentry dashboard
- Storybook story for the modal in isolation

**Tests to Write First**:

- `src/components/FeedbackModal.test.tsx`:

    ```typescript
    describe("FeedbackModal", () => {
        it("renders modal when opened", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            expect(screen.getByText("Send Feedback")).toBeInTheDocument();
        });

        it("disables submit when message is empty", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            expect(screen.getByRole("button", { name: /Send Feedback/i })).toBeDisabled();
        });

        it("enables submit when message is provided", () => {
            render(<FeedbackModal opened onClose={vi.fn()} />);
            fireEvent.change(screen.getByLabelText(/What happened/), {
                target: { value: "Bug report" }
            });
            expect(screen.getByRole("button", { name: /Send Feedback/i })).not.toBeDisabled();
        });

        it("calls onClose when Cancel is clicked", () => {
            const onClose = vi.fn();
            render(<FeedbackModal opened onClose={onClose} />);
            fireEvent.click(screen.getByRole("button", { name: /Cancel/i }));
            expect(onClose).toHaveBeenCalled();
        });
    });
    ```

- `src/components/layout/TopMenuBar.test.tsx`:

    ```typescript
    describe("TopMenuBar feedback menu", () => {
        it("renders Send feedback menu item under Help section", () => {
            render(<TopMenuBar />);
            fireEvent.click(screen.getByLabelText("Main menu"));
            expect(screen.getByText("Help")).toBeInTheDocument();
            expect(screen.getByText("Send feedback...")).toBeInTheDocument();
        });

        it("calls onSendFeedback when clicked", () => {
            const onSendFeedback = vi.fn();
            render(<TopMenuBar onSendFeedback={onSendFeedback} />);
            fireEvent.click(screen.getByLabelText("Main menu"));
            fireEvent.click(screen.getByText("Send feedback..."));
            expect(onSendFeedback).toHaveBeenCalled();
        });
    });
    ```

**Implementation**:

1. Add to `src/lib/sentry.ts`:

    ```typescript
    export interface FeedbackData {
        name?: string;
        email?: string;
        message: string;
    }

    export function captureUserFeedback(feedback: FeedbackData): void {
        Sentry.captureFeedback({
            message: feedback.message,
            name: feedback.name,
            email: feedback.email,
        });
    }
    ```

2. Create `src/components/FeedbackModal.tsx`:

    ```typescript
    interface FeedbackModalProps {
        opened: boolean;
        onClose: () => void;
    }

    export function FeedbackModal({ opened, onClose }: FeedbackModalProps) {
        const [name, setName] = useState("");
        const [email, setEmail] = useState("");
        const [message, setMessage] = useState("");
        const [loading, setLoading] = useState(false);

        const handleSubmit = () => {
            setLoading(true);
            try {
                captureUserFeedback({ name, email, message });
                onClose();
            } finally {
                setLoading(false);
            }
        };

        return (
            <Modal opened={opened} onClose={onClose} title="Send Feedback">
                <Stack gap="md">
                    <TextInput label="Name (optional)" value={name} onChange={...} />
                    <TextInput label="Email (optional)" value={email} onChange={...} />
                    <Textarea
                        label="What happened? *"
                        required
                        value={message}
                        onChange={...}
                    />
                    <Group justify="flex-end">
                        <Button variant="subtle" onClick={onClose}>Cancel</Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={!message.trim()}
                            loading={loading}
                        >
                            Send Feedback
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        );
    }
    ```

3. Update `src/components/layout/TopMenuBar.tsx`:
    - Add `onSendFeedback?: () => void` to props
    - Add Help section with menu item:
        ```typescript
        <MantineMenu.Divider />
        <MantineMenu.Label>Help</MantineMenu.Label>
        <MantineMenu.Item
            leftSection={<MessageSquare size={14} />}
            onClick={onSendFeedback}
        >
            Send feedback...
        </MantineMenu.Item>
        ```

4. Update `src/components/layout/AppLayout.tsx`:
    - Add `feedbackModalOpen` state
    - Add `handleSendFeedback` callback
    - Render `<FeedbackModal />`
    - Pass callback to `<TopMenuBar onSendFeedback={...} />`

5. Remove the temporary "Test Sentry Error" menu item (Phase 1 debug button)

6. Create Storybook story `src/stories/FeedbackModal.stories.tsx`:
    ```typescript
    export const Default: Story = {
        args: { opened: true, onClose: () => {} },
    };
    ```

**Dependencies**:

- Internal: Phase 1 (Sentry SDK, captureUserFeedback)

**User Verification**:

1. Run: `npm run dev`
2. Click hamburger menu → See "Help" section with "Send feedback..."
3. Click "Send feedback..." → Modal opens
4. Fill in message (required), optionally name/email
5. Click "Send Feedback"
6. Open Sentry dashboard → User Feedback section → See your feedback
7. Alternative: `npm run storybook` → FeedbackModal story

---

### Phase 4: File Attachments

**Objective**: Allow users to attach arbitrary files to their feedback submissions.

**What You Can Test**:

- Click "Attachments" field in the feedback modal → File picker opens
- Select one or more files → Files appear in the input
- Submit feedback → Files appear as attachments in Sentry dashboard
- Clear button removes selected files

**Tests to Write First**:

- `src/components/FeedbackModal.test.tsx`:
    ```typescript
    it("renders file attachment field", () => {
        render(<FeedbackModal opened onClose={vi.fn()} />);
        expect(screen.getByText("Attachments (optional)")).toBeInTheDocument();
        const fileInput = document.querySelector("input[type='file']");
        expect(fileInput).toBeInTheDocument();
    });
    ```

**Implementation**:

1. Update `src/lib/sentry.ts` to support attachments:

    ```typescript
    export interface AttachmentData {
        filename: string;
        data: Uint8Array;
        contentType?: string;
    }

    export interface FeedbackData {
        name?: string;
        email?: string;
        message: string;
        attachments?: AttachmentData[];
    }

    function uint8ArrayToBase64(bytes: Uint8Array): string {
        let binary = "";
        for (const byte of bytes) {
            binary += String.fromCharCode(byte);
        }
        return btoa(binary);
    }

    export function captureUserFeedback(feedback: FeedbackData): void {
        const scope = Sentry.getCurrentScope();

        if (feedback.attachments && feedback.attachments.length > 0) {
            for (const attachment of feedback.attachments) {
                scope.addAttachment({
                    filename: attachment.filename,
                    data: uint8ArrayToBase64(attachment.data),
                    contentType: attachment.contentType,
                });
            }
        }

        Sentry.captureFeedback({
            message: feedback.message,
            name: feedback.name,
            email: feedback.email,
        });

        scope.clearAttachments();
    }
    ```

2. Update `src/components/FeedbackModal.tsx` to add FileInput:

    ```typescript
    import { FileInput } from "@mantine/core";
    import { Paperclip } from "lucide-react";

    // Add state for files
    const [files, setFiles] = useState<File[]>([]);

    // Convert File to AttachmentData
    async function fileToAttachment(file: File): Promise<AttachmentData> {
        const arrayBuffer = await file.arrayBuffer();
        return {
            filename: file.name,
            data: new Uint8Array(arrayBuffer),
            contentType: file.type || "application/octet-stream",
        };
    }

    // In the form, add:
    <FileInput
        label="Attachments (optional)"
        placeholder="Click to attach files"
        leftSection={<Paperclip size={16} />}
        multiple
        value={files}
        onChange={setFiles}
        clearable
    />
    ```

3. Update handleSubmit to include attachments in the feedback submission

**Dependencies**:

- Internal: Phase 3 (FeedbackModal)

**User Verification**:

1. Run: `npm run dev`
2. Click hamburger menu → "Send feedback..."
3. Fill in the message field
4. Click "Attachments" → Select one or more files
5. Click "Send Feedback"
6. Open Sentry dashboard → User Feedback section
7. View the feedback → Attachments should be listed

---

### Phase 5: Source Maps + Production Polish

**Objective**: Upload source maps for readable stack traces and finalize CI/CD integration.

**What You Can Test**:

- Trigger error in production build → Sentry shows original TypeScript source (not minified)
- Verify all environment variables work in CI
- Full end-to-end test of the complete feature

**Tests to Write First**:

- No new unit tests (configuration/CI verification)
- Manual verification of source-mapped stack traces

**Implementation**:

1. Install Vite plugin:

    ```bash
    npm install -D @sentry/vite-plugin
    ```

2. Update `vite.config.ts`:

    ```typescript
    import { sentryVitePlugin } from "@sentry/vite-plugin";

    export default defineConfig({
        build: {
            sourcemap: true,
        },
        plugins: [
            react(),
            // Only in CI when auth token is available
            process.env.SENTRY_AUTH_TOKEN &&
                sentryVitePlugin({
                    org: process.env.VITE_SENTRY_ORG,
                    project: process.env.VITE_SENTRY_PROJECT,
                    authToken: process.env.SENTRY_AUTH_TOKEN,
                }),
        ].filter(Boolean),
    });
    ```

3. Update `src/vite-env.d.ts`:

    ```typescript
    interface ImportMetaEnv {
        readonly VITE_SENTRY_DSN: string;
        readonly VITE_SENTRY_ORG: string;
        readonly VITE_SENTRY_PROJECT: string;
    }
    ```

4. Update `.env.example`:

    ```bash
    # Server Configuration
    HOST=true
    PORT=9000

    # Sentry Configuration (get from sentry.io)
    VITE_SENTRY_DSN=
    VITE_SENTRY_ORG=
    VITE_SENTRY_PROJECT=
    # SENTRY_AUTH_TOKEN is only needed in CI for source map upload
    ```

5. Update `.github/workflows/deploy.yml`:

    ```yaml
    - name: Build
      run: npm run build
      env:
          VITE_BASE_PATH: /
          VITE_SENTRY_DSN: ${{ secrets.VITE_SENTRY_DSN }}
          VITE_SENTRY_ORG: ${{ secrets.VITE_SENTRY_ORG }}
          VITE_SENTRY_PROJECT: ${{ secrets.VITE_SENTRY_PROJECT }}
          SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    ```

6. Add GitHub repository secrets (documented in design doc)

7. Final cleanup:
    - Ensure all Storybook stories are complete
    - Add any missing tests
    - Run `npm run lint && npm run build && npm test`

**Dependencies**:

- External: `@sentry/vite-plugin` (^2.x, devDependency)
- Internal: All previous phases

**User Verification**:

1. **Local build test**:
    - Run: `npm run build`
    - Verify `.map` files exist in `dist/assets/`

2. **Production deployment**:
    - Push to main branch → CI deploys to GitHub Pages
    - Check CI logs for "Source maps uploaded successfully"

3. **Verify source maps work**:
    - Open production site
    - Trigger an error (could add a hidden debug trigger)
    - Open Sentry dashboard → View error
    - Stack trace should show original TypeScript source, not minified code

4. **Full end-to-end test**:
    - Load graph data in production
    - Send feedback
    - Verify everything appears correctly in Sentry

---

## Common Utilities

| Utility             | Purpose                          | Phase |
| ------------------- | -------------------------------- | ----- |
| `src/lib/sentry.ts` | Sentry init, feedback submission | 1     |

## External Libraries

| Package               | Purpose              | Phase |
| --------------------- | -------------------- | ----- |
| `@sentry/react`       | Sentry SDK for React | 1     |
| `@sentry/vite-plugin` | Source map upload    | 5     |

## Storybook Stories Summary

| Story                       | Phase | Purpose                              |
| --------------------------- | ----- | ------------------------------------ |
| `SentryTest.stories.tsx`    | 1     | Test error button                    |
| `ErrorBoundary.stories.tsx` | 2     | Error fallback UI                    |
| `FeedbackModal.stories.tsx` | 3-4   | Feedback modal with file attachments |

## Risk Mitigation

| Risk                             | Mitigation                                            |
| -------------------------------- | ----------------------------------------------------- |
| Sentry quota exceeded            | Use appropriate sample rates                          |
| Tests fail due to Sentry mocking | Create `src/test/mocks/sentry.ts` with complete mocks |

## Acceptance Criteria Checklist

- [ ] Phase 1: Test error appears in Sentry dashboard
- [ ] Phase 2: Error boundary shows fallback UI, errors captured
- [ ] Phase 3: Feedback menu item works, feedback appears in Sentry
- [ ] Phase 4: File attachments can be uploaded with feedback
- [ ] Phase 5: Source maps show readable stack traces in production
