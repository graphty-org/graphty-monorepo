# Feature Design: Sentry.io Integration

## Overview

- **User Value**: Users gain the ability to easily report feedback, bugs, and issues directly from within the application through a familiar modal interface. When errors occur, users receive better support as developers have full context about what went wrong, leading to faster bug fixes and improved user experience.

- **Technical Value**: Developers gain comprehensive error tracking and user feedback collection in a centralized platform. The integration provides automatic error capture with full stack traces and direct correlation between user feedback and error events. This enables faster issue resolution and proactive monitoring of application health.

## Requirements

### Core Functionality

1. **User Feedback Menu Item**
   - Add a "Send feedback..." menu item under the hamburger menu (alongside existing options like "Load Data...")
   - When clicked, display a modal dialog styled consistently with existing modals (e.g., LoadDataModal)
   - The modal should allow users to enter feedback and submit it to Sentry.io

2. **Error Tracking**
   - Automatically capture and report JavaScript errors to Sentry.io
   - Include relevant context (user actions, application state, browser info)
   - Provide source-mapped stack traces for easier debugging

3. **Additional Sentry Features (Recommended)**
   - **Performance Monitoring**: Track page load times, API call durations, and interaction responsiveness
   - **Logs Integration**: Correlate console logs with errors for better debugging context
   - **Error Boundaries**: React-specific error boundary integration for graceful error handling
   - **Screenshot Capture**: Optional screenshot attachment with user feedback

4. **Privacy-First Approach**
   - Session Replay is **disabled by default** to protect user privacy
   - No automatic PII collection
   - Screenshots are opt-in per feedback submission

## Proposed Solution

### User Interface/API

#### Hamburger Menu Addition
```
┌─────────────────────────────────┐
│ File                            │
├─────────────────────────────────┤
│   📂 Load Data...               │
│   📤 Export                     │
├─────────────────────────────────┤
│ Help                            │
├─────────────────────────────────┤
│   💬 Send feedback...           │  ← NEW
└─────────────────────────────────┘
```

#### Feedback Modal
```
┌─────────────────────────────────────────────────┐
│ Send Feedback                              [×]  │
├─────────────────────────────────────────────────┤
│                                                 │
│ Name (optional)                                 │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Email (optional)                                │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ What happened? *                                │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ │                                             │ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ☑ Include screenshot of current view            │
│                                                 │
│ Attachments (optional)                          │
│ ┌─────────────────────────────────────────────┐ │
│ │  [+ Add files]                              │ │
│ │  screenshot.png (2.1 MB)              [×]   │ │
│ │  console-log.txt (4 KB)               [×]   │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ ┌──────────────────┐  ┌─────────────────────┐   │
│ │     Cancel       │  │   Send Feedback     │   │
│ └──────────────────┘  └─────────────────────┘   │
└─────────────────────────────────────────────────┘
```

**Form Fields:**
- **Name**: Optional text input for user's name
- **Email**: Optional text input for contact email
- **Message**: Required textarea for feedback description
- **Include Screenshot**: Checkbox (default checked) to auto-capture the view before the modal opened
- **Attachments**: Optional multi-file upload for additional screenshots, logs, or other files

#### Automatic Error Logging
When JavaScript errors occur (thrown errors, unhandled promise rejections), they are automatically captured and sent to Sentry with:
- Full stack trace (source-mapped for readability)
- Browser and device information
- User's current URL and navigation path
- Console log breadcrumbs leading up to the error

### Technical Architecture

#### File Structure
```
src/
├── lib/
│   └── sentry.ts                    # Sentry initialization and configuration
├── components/
│   ├── FeedbackModal.tsx            # User feedback modal component
│   └── ErrorBoundary.tsx            # React error boundary with Sentry integration
└── hooks/
    └── useSentryFeedback.ts         # Hook for programmatic feedback submission
```

#### Components

**1. Sentry Initialization (`src/lib/sentry.ts`)**
```typescript
import * as Sentry from "@sentry/react";

export function initSentry(): void {
    const dsn = import.meta.env.VITE_SENTRY_DSN;

    // Skip initialization if no DSN configured
    if (!dsn) {
        console.warn("Sentry DSN not configured, error tracking disabled");
        return;
    }

    Sentry.init({
        dsn,
        environment: import.meta.env.MODE, // "development" or "production"

        // Performance Monitoring
        tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0, // 10% prod, 100% dev

        // Session Replay - DISABLED for privacy
        // Can be enabled later if needed with user consent
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,

        integrations: [
            Sentry.browserTracingIntegration(),
            Sentry.feedbackIntegration({
                autoInject: false, // We use custom modal
                colorScheme: "dark",
            }),
        ],

        // Only send errors in production, or all events in development
        beforeSend(event) {
            // Could add PII scrubbing here if needed
            return event;
        },
    });
}

export interface FeedbackAttachment {
    filename: string;
    data: Uint8Array;
    contentType: string;
}

export async function captureUserFeedback(feedback: {
    name?: string;
    email?: string;
    message: string;
    screenshot?: Uint8Array;        // Auto-captured screenshot
    attachments?: File[];           // User-uploaded files
}): Promise<void> {
    // Convert user files to Sentry attachment format
    const attachments: FeedbackAttachment[] = [];

    // Add auto-captured screenshot if provided
    if (feedback.screenshot) {
        attachments.push({
            filename: "screenshot.png",
            data: feedback.screenshot,
            contentType: "image/png",
        });
    }

    // Convert user-uploaded files to attachments
    if (feedback.attachments) {
        for (const file of feedback.attachments) {
            const buffer = await file.arrayBuffer();
            attachments.push({
                filename: file.name,
                data: new Uint8Array(buffer),
                contentType: file.type || "application/octet-stream",
            });
        }
    }

    Sentry.captureFeedback(
        {
            message: feedback.message,
            name: feedback.name,
            email: feedback.email,
        },
        { attachments }
    );
}
```

**2. Feedback Modal (`src/components/FeedbackModal.tsx`)**
```typescript
interface FeedbackModalProps {
    opened: boolean;
    onClose: () => void;
    screenshot?: Uint8Array;  // Captured before modal opened
}

// Modal with:
// - TextInput for name (optional)
// - TextInput for email (optional)
// - Textarea for message (required)
// - Checkbox for auto-screenshot inclusion (default checked)
// - FileInput for additional attachments (multiple files)
// - List of attached files with remove buttons
// - Cancel/Submit buttons
// - Loading state during submission
// - Success/error feedback
```

**3. Error Boundary (`src/components/ErrorBoundary.tsx`)**
```typescript
// React error boundary that:
// - Catches render errors
// - Reports to Sentry
// - Shows fallback UI with "Report" option
// - Allows error recovery
```

#### Data Flow
```
User clicks "Send feedback..."
         ↓
   FeedbackModal opens
         ↓
   User fills form
         ↓
   Submit → captureUserFeedback()
         ↓
   Sentry.captureFeedback() API
         ↓
   Success notification → close modal
```

#### Integration Points

| Component | Integration Type | Description |
|-----------|-----------------|-------------|
| `main.tsx` | Initialization | Call `initSentry()` before React render |
| `TopMenuBar.tsx` | Menu item | Add "Send feedback..." option with callback |
| `AppLayout.tsx` | Modal state | Manage `feedbackModalOpen` state |
| `App.tsx` | Error boundary | Wrap app in Sentry error boundary |
| `FeedbackModal.tsx` | New component | Custom feedback form modal |

### Implementation Approach

1. **Phase 1: Core Sentry Setup**
   - Install `@sentry/react` package
   - Create `src/lib/sentry.ts` with initialization logic
   - Add environment variables for DSN configuration
   - Initialize Sentry in `main.tsx` (before React render)

2. **Phase 2: Error Tracking**
   - Add Sentry error boundary wrapper around `<App />`
   - Configure source map uploads in Vite build
   - Test error capture with intentional throw

3. **Phase 3: User Feedback Modal**
   - Create `FeedbackModal.tsx` following LoadDataModal patterns
   - Add menu item to TopMenuBar with "Send feedback..." option
   - Add modal state management in AppLayout
   - Implement feedback submission via Sentry API

4. **Phase 4: Enhanced Features (Optional)**
   - Enable Session Replay for error reproduction
   - Add performance monitoring for key interactions
   - Configure crash-report modal for error context collection

## Acceptance Criteria

- [ ] "Send feedback..." menu item appears in hamburger menu under a "Help" section
- [ ] Clicking the menu item opens a modal dialog
- [ ] Modal includes name, email, message fields, screenshot checkbox, and file upload
- [ ] Message field is required; form cannot submit without it
- [ ] Screenshot checkbox auto-captures the view before the modal opened
- [ ] Users can attach multiple files (screenshots, logs, etc.)
- [ ] Attached files can be removed before submission
- [ ] Modal styling matches existing LoadDataModal appearance
- [ ] Feedback submissions with attachments appear in Sentry dashboard
- [ ] JavaScript errors are automatically captured and reported to Sentry
- [ ] Source maps enable readable stack traces in Sentry
- [ ] Error boundary prevents full app crashes, shows recovery UI
- [ ] Development errors go to dev Sentry project, production to prod project
- [ ] No Sentry code runs if DSN environment variable is not set
- [ ] Session replay is disabled (privacy-first approach)

## Technical Considerations

### Performance
- **Impact**: Minimal. Sentry SDK is ~30KB gzipped and loads asynchronously
- **Mitigation**:
  - Lazy load feedback modal
  - Use sampling for performance traces (10% in prod, 100% in dev for testing)
  - Session replay disabled (0% sampling)
  - Configure `ignoreErrors` to filter noise
- **Attachment Quota**: All Sentry plans include 1GB of attachments (~2500 screenshots). Consider adding a max file size limit (e.g., 5MB per file) in the UI.

### Security
- **DSN Exposure**: The DSN is public (client-side) but only allows event submission, not read access
- **PII Handling**:
  - Name and email are optional and user-provided
  - Session replay can mask sensitive content if needed
  - Configure `beforeSend` to scrub sensitive data if necessary
- **Rate Limiting**: Sentry has built-in rate limiting to prevent abuse

### Compatibility
- **Browser Support**: Requires Shadow DOM and Dialog element (modern browsers)
- **React Version**: @sentry/react supports React 16.8+, we're on React 19
- **Backward Compatibility**: No breaking changes to existing functionality
- **Graceful Degradation**: If Sentry fails to load, app continues to work normally

### Testing
- **Unit Tests**:
  - Mock Sentry SDK in tests
  - Test FeedbackModal form validation and submission
  - Test error boundary render fallback
- **Integration Tests**:
  - Verify menu item triggers modal
  - Verify modal submission calls Sentry API
- **Manual Testing**:
  - Verify events appear in Sentry dashboard (both dev and prod projects)
  - Test error capture with intentional errors
  - Verify feedback submissions include screenshot when checked
  - Test that errors in dev go to dev project, prod to prod project

### Configuration

**Environment Variables:**

| Variable | Local Dev | GitHub Actions | Purpose |
|----------|-----------|----------------|---------|
| `VITE_SENTRY_DSN` | `.env.development` | Secret | Sentry project DSN |
| `VITE_SENTRY_ORG` | Not needed | Secret | Org slug for source maps |
| `VITE_SENTRY_PROJECT` | Not needed | Secret | Project name for source maps |
| `SENTRY_AUTH_TOKEN` | Not needed | Secret | Auth for source map upload |

**Vite Source Map Upload (vite.config.ts):**
```typescript
import { sentryVitePlugin } from "@sentry/vite-plugin";

export default defineConfig({
  build: {
    sourcemap: true, // Required for Sentry
  },
  plugins: [
    // Only upload source maps in CI (when auth token is present)
    process.env.SENTRY_AUTH_TOKEN && sentryVitePlugin({
      org: process.env.VITE_SENTRY_ORG,
      project: process.env.VITE_SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    }),
  ].filter(Boolean),
});
```

## Risks and Mitigation

- **Risk**: Sentry SDK increases bundle size
  **Mitigation**: The SDK is ~30KB gzipped, which is acceptable. Can also use `@sentry/browser` for smaller footprint if needed.

- **Risk**: Privacy concerns with user data collection
  **Mitigation**: Session replay is disabled by default. Screenshots are opt-in. No automatic PII collection. Name/email fields are optional.

- **Risk**: Too many errors overwhelm Sentry quota
  **Mitigation**: Configure sampling rates, use `ignoreErrors` for known/unimportant errors, set up quota alerts in Sentry dashboard.

- **Risk**: Source maps expose source code
  **Mitigation**: Upload source maps to Sentry privately (not served publicly). Configure `hidden-source-map` in Vite if concerned.

- **Risk**: Feedback modal UX doesn't match existing patterns
  **Mitigation**: Follow LoadDataModal implementation exactly for consistent styling and behavior.

## Sentry Project Setup Instructions

### Step 1: Create Sentry Projects

1. Log in to [sentry.io](https://sentry.io)
2. Click **Projects** in the left sidebar, then **Create Project**
3. Select **React** as the platform
4. Set project name to `graphty-prod` (for production)
5. Click **Create Project**
6. Repeat steps 2-5 to create `graphty-dev` (for development)

### Step 2: Get Your DSN

1. Go to **Settings** → **Projects** → select your project
2. Click **Client Keys (DSN)** in the left sidebar
3. Copy the DSN (looks like `https://xxx@xxx.ingest.sentry.io/xxx`)
4. Save the DSN for each project (dev and prod)

### Step 3: Configure Environment Variables

**For Local Development:**

Create `.env.development` (this file is gitignored):
```bash
VITE_SENTRY_DSN=https://your-dev-dsn@xxx.ingest.sentry.io/xxx
```

**For Production (GitHub Pages):**

Since GitHub Pages serves static files, environment variables must be injected at **build time** via GitHub Actions secrets. Do NOT create a `.env.production` file.

1. Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add:
   - `VITE_SENTRY_DSN` = `https://your-prod-dsn@xxx.ingest.sentry.io/xxx`
   - `VITE_SENTRY_ORG` = `your-sentry-org-slug`
   - `VITE_SENTRY_PROJECT` = `graphty-prod`
   - `SENTRY_AUTH_TOKEN` = (from Step 4)

3. Update `.github/workflows/deploy.yml` build step:
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

> **How it works**: Vite replaces `import.meta.env.VITE_*` with the actual values during build, so they're embedded in the JavaScript bundle.

### Step 4: Create Auth Token (for Source Maps)

Source maps allow Sentry to show readable stack traces instead of minified code.

1. Go to **Settings** → **Auth Tokens** in Sentry
2. Click **Create New Token**
3. Name it `graphty-source-maps`
4. Select scopes: `project:releases`, `org:read`
5. Click **Create Token** and copy it immediately (shown only once)
6. Add to GitHub as `SENTRY_AUTH_TOKEN` secret (see Step 3)

> **Security Note**: The auth token is never exposed in the browser bundle. It's only used during the build step to upload source maps to Sentry's servers.

### Step 5: Configure Alerts (Optional)

1. Go to **Alerts** → **Create Alert**
2. Set up alerts for:
   - **Issue Alerts**: Notify when new errors occur
   - **Metric Alerts**: Notify when error rate exceeds threshold
3. Configure notification channels (email, Slack, etc.)

### Project Settings Recommendations

**For Production Project (`graphty-prod`):**

| Setting | Recommended Value | Location |
|---------|------------------|----------|
| Rate Limiting | 100 events/minute | Settings → Client Keys → Rate Limiting |
| Data Scrubbing | Enable | Settings → Security & Privacy |
| Issue Grouping | Default | Settings → Issue Grouping |
| Inbound Filters | Filter localhost | Settings → Inbound Filters |

**For Development Project (`graphty-dev`):**

| Setting | Recommended Value | Location |
|---------|------------------|----------|
| Rate Limiting | 1000 events/minute | Settings → Client Keys → Rate Limiting |
| Data Scrubbing | Enable | Settings → Security & Privacy |
| Inbound Filters | Allow localhost | Settings → Inbound Filters |

## Future Enhancements

- **Session Replay (Opt-in)**: Add user consent flow to enable session replay for enhanced debugging (currently disabled for privacy)
- **Crash-Report Modal**: Prompt users for feedback immediately after an error occurs, correlating feedback with the specific error event
- **Custom Tags**: Add graph-specific context (layout type, node count, active features) to error reports
- **Feature Flags**: Integrate with Sentry feature flags for gradual rollouts
- **Profiling**: Add JavaScript profiling for performance deep-dives
- **Alerts**: Configure Sentry alerts for error spikes or new issues
- **Release Tracking**: Tag releases with git commit info for regression tracking

## Dependencies

**New Package:**
```json
{
  "dependencies": {
    "@sentry/react": "^8.x"
  },
  "devDependencies": {
    "@sentry/vite-plugin": "^2.x"
  }
}
```

**Package Size Impact:**
- `@sentry/react`: ~30KB gzipped (runtime)
- `@sentry/vite-plugin`: Build-time only, no runtime impact

## References

- [Sentry React SDK Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry User Feedback Setup](https://docs.sentry.io/platforms/javascript/guides/react/user-feedback/)
- [Sentry Feedback Configuration](https://docs.sentry.io/platforms/javascript/guides/react/user-feedback/configuration/)
- [Sentry User Feedback Product](https://sentry.io/for/user-feedback/)
