# Feature Design: AI Tools Integration for Graphty

## Overview

- **User Value**: Users can interact with graph visualizations using natural language commands, enabling intuitive graph exploration, styling, and layout changes without needing to understand the underlying API. AI-assisted workflows lower the barrier to entry for complex graph operations.

- **Technical Value**: Leverages the existing `graphty-element` AI tools infrastructure (AiManager, ApiKeyManager, providers) to add intelligent natural language capabilities to the React application. Establishes patterns for AI integration that can be extended with future capabilities.

## Requirements

### Core Requirements

1. **Settings Modal in Hamburger Menu**
    - Configure API keys for AI providers (OpenAI, Anthropic, Google, WebLLM)
    - Encrypted key storage using `ApiKeyManager` from graphty-element
    - Select default provider when multiple are configured
    - Enable/disable persistence (localStorage vs session-only)

2. **Sparkle Icon (AI Action Button)**
    - Visible in the UI (TopMenuBar or floating)
    - If no AI provider is configured, opens Settings dialog
    - If configured, opens AI Chat dialog

3. **AI Chat Dialog**
    - Text input for natural language commands
    - Provider selector if multiple providers configured
    - Repositionable/draggable dialog
    - Submit button for executing commands
    - Real-time status feedback during command execution
    - Display of AI responses and tool call results

### Research Findings: AI Input Dialog Best Practices (2025)

Based on research from [Parallelhq](https://www.parallelhq.com/blog/chatbot-ux-design), [Groto](https://www.letsgroto.com/blog/ux-best-practices-for-ai-chatbots), [OpenAI Apps SDK](https://developers.openai.com/apps-sdk/concepts/ui-guidelines/), [Rehance AI](https://rehance.ai/blog/ai-copilot-design), and [assistant-ui](https://www.assistant-ui.com/examples):

**Key UX Patterns:**

- **Typing indicators**: Visual feedback that the AI is processing
- **Streaming responses**: Show text as it's generated for perceived responsiveness
- **Tool call visualization**: Display which actions the AI is taking
- **Error handling**: Plain-spoken, instructive error messages
- **Fallibility notices**: Set expectations about AI limitations
- **Quick reply suggestions**: Provide prompt examples to guide users
- **Hybrid inputs**: Combine free text with suggested actions

**Copilot Design Patterns:**

- **Side-by-side collaboration**: AI offers suggestions while humans maintain control
- **Contextual embedding**: Align with common interaction patterns
- **Human-in-the-loop**: Governor mechanisms for reviewing AI actions
- **Transparent AI**: Show why/what the chatbot is doing

**Floating Dialog Patterns:**

- Draggable by title bar for user repositioning
- Resizable for content flexibility
- Persistent state (remember position across sessions)
- Minimize/collapse capability

## Proposed Solution

### User Interface/API

#### 1. AI Settings Modal

Accessed via hamburger menu under a new "AI" section:

```
[Hamburger Menu]
├── File
│   └── ...
├── View
│   └── ...
├── AI ← NEW
│   └── AI Settings...
└── Help
    └── ...
```

**Modal Contents:**

- Provider configuration tabs (OpenAI, Anthropic, Google, WebLLM)
- API key input fields (masked PasswordInput)
- "Test Connection" button per provider
- Default provider selection dropdown
- Persistence toggle (localStorage vs session)
- Encryption key input for persistent storage (with validation)

#### 2. AI Action Button (Sparkle Icon)

**Placement Options:**

- **Option A (Recommended)**: TopMenuBar right section, next to Settings icon
- **Option B**: BottomToolbar alongside view mode controls
- **Option C**: Floating action button in bottom-right corner

**Behavior:**

- Visual indicator when AI is configured (filled icon) vs unconfigured (outline)
- Badge/dot indicator when AI is processing
- Click action:
    - If no provider configured → Open AI Settings Modal
    - If provider configured → Open/toggle AI Chat Dialog

#### 3. AI Chat Dialog

**Design: Floating Draggable Panel**

```
┌─────────────────────────────────────────┐
│ [Drag Handle]  AI Assistant    [─] [×] │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │                                     │ │
│ │  [Message History Area]             │ │
│ │  - User prompts                     │ │
│ │  - AI responses                     │ │
│ │  - Tool call visualizations         │ │
│ │                                     │ │
│ └─────────────────────────────────────┘ │
├─────────────────────────────────────────┤
│ [Provider: ▼ OpenAI] (if multiple)     │
│ ┌─────────────────────────────────────┐ │
│ │ Ask me to style or analyze your     │ │
│ │ graph...                         [→]│ │
│ └─────────────────────────────────────┘ │
│ [Quick Actions: Style nodes | Layout]  │
└─────────────────────────────────────────┘
```

**Features:**

- Draggable by title bar (using `@dnd-kit` or CSS transforms)
- Minimize to icon state
- Remember position in localStorage
- Real-time status during execution:
    - "Processing..." with spinner
    - "Executing: setLayout" (tool call indicator)
    - Streaming text display
- Tool call results with affected node/edge counts
- Error states with retry option
- Cancel button during execution

### Technical Architecture

#### Components (New)

1. **`AiSettingsModal.tsx`** (`src/components/ai/`)
    - Modal for configuring AI providers and keys
    - Uses `ApiKeyManager` from graphty-element
    - Provider validation and testing
    - Persistence configuration

2. **`AiChatDialog.tsx`** (`src/components/ai/`)
    - Floating, draggable chat interface
    - Message history display
    - Input with submit
    - Status indicators
    - Quick action suggestions

3. **`AiStatusIndicator.tsx`** (`src/components/ai/`)
    - Visual feedback component for AI state
    - Processing, streaming, executing, error states
    - Tool call progress display

4. **`AiActionButton.tsx`** (`src/components/ai/`)
    - Sparkle icon button for TopMenuBar
    - Configuration state indicator
    - Processing state animation

5. **`useAiManager.ts`** (`src/hooks/`)
    - React hook wrapping `AiManager` from graphty-element
    - Manages AI lifecycle with Graph instance
    - Status subscription and state management
    - Key management integration

6. **`useAiKeyStorage.ts`** (`src/hooks/`)
    - React hook wrapping `ApiKeyManager`
    - Persistence configuration
    - Key CRUD operations

#### Data Model

**AI State in AppLayout:**

```typescript
interface AiState {
    isConfigured: boolean; // Has at least one provider key
    defaultProvider: ProviderType | null;
    configuredProviders: ProviderType[];
    chatDialogOpen: boolean;
    chatDialogPosition: { x: number; y: number };
    settingsModalOpen: boolean;
}
```

**Message History (local state in AiChatDialog):**

```typescript
interface ChatMessage {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    status?: AiStatus;
    toolCalls?: ToolCallStatus[];
}
```

#### Integration Points

1. **graphty-element AI API** (existing)
    - `createAiManager()` - Factory function
    - `AiManager.init(graph, config)` - Initialize with graph
    - `AiManager.execute(input)` - Run natural language command
    - `AiManager.onStatusChange()` - Subscribe to status updates
    - `ApiKeyManager` - Encrypted key storage
    - `createProvider()` - Provider factory

2. **Graph Instance** (existing)
    - Access via `GraphtyHandle.getGraph()` (new method needed)
    - Required for `AiManager.init()`

3. **Mantine Components** (existing patterns)
    - `Modal` for settings
    - `Box` with CSS transforms for draggable dialog
    - `ActionIcon` for sparkle button
    - `PasswordInput` for API keys
    - `Select` for provider selection
    - `TextInput`/`Textarea` for chat input
    - `Paper` for message bubbles
    - `Loader` for processing state

### Implementation Approach

#### Phase 1: Foundation (Settings & Key Management)

1. Create `useAiKeyStorage` hook wrapping `ApiKeyManager`
2. Implement `AiSettingsModal` component
    - Provider key inputs (OpenAI, Anthropic, Google)
    - Connection testing via `provider.validateApiKey()`
    - Default provider selection
    - Persistence toggle and encryption key
3. Add "AI Settings" menu item to hamburger menu
4. Store AI configuration state in AppLayout

#### Phase 2: AI Action Button

1. Create `AiActionButton` component with sparkle icon
2. Add to TopMenuBar right section
3. Implement configuration-aware behavior
    - Opens settings if unconfigured
    - Opens chat dialog if configured
4. Add visual state indicators (configured/processing)

#### Phase 3: AI Manager Integration

1. Add `getGraph()` method to `GraphtyHandle` interface
2. Create `useAiManager` hook
    - Initialize AiManager with graph instance
    - Manage provider configuration
    - Handle status subscriptions
    - Cleanup on unmount
3. Connect hook to AppLayout state

#### Phase 4: Chat Dialog

1. Create `AiChatDialog` component
    - Floating `Paper` with absolute positioning
    - Draggable header (mouse events + state)
    - Message history with ScrollArea
    - Input area with submit button
2. Implement `AiStatusIndicator` for real-time feedback
    - Processing spinner
    - Tool call display
    - Error states with retry
3. Add provider selector (when multiple configured)
4. Add quick action suggestions based on graph schema
5. Position persistence in localStorage

#### Phase 5: Polish & Enhancements

1. Add minimize/expand toggle
2. Implement keyboard shortcuts (Escape to close, Enter to submit)
3. Add message history persistence (optional)
4. Mobile-responsive positioning
5. Add sample prompts based on loaded data schema

## Acceptance Criteria

### Settings Modal

- [ ] Can set API keys for OpenAI, Anthropic, and Google providers
- [ ] API keys are stored encrypted when persistence is enabled
- [ ] Can test connection for each provider
- [ ] Can select default provider from configured options
- [ ] Settings persist across page reloads (when enabled)
- [ ] Keys remain in session-only storage by default (security)

### AI Action Button

- [ ] Sparkle icon visible in TopMenuBar
- [ ] Opens settings modal when no providers configured
- [ ] Opens chat dialog when at least one provider configured
- [ ] Visual indicator distinguishes configured vs unconfigured state
- [ ] Processing state shows animated indicator

### AI Chat Dialog

- [ ] Dialog is draggable by title bar
- [ ] Can submit natural language commands
- [ ] Shows real-time status during execution
- [ ] Displays tool calls as they execute
- [ ] Shows AI response text (streaming or complete)
- [ ] Can select different provider if multiple configured
- [ ] Has close button that hides dialog
- [ ] Dialog position remembered after drag
- [ ] Error states display clearly with retry option
- [ ] Can cancel in-progress commands

### Integration

- [ ] AI commands successfully modify graph (layout, styling)
- [ ] Graph schema automatically extracted for context
- [ ] Built-in commands work (setLayout, findAndStyleNodes, etc.)
- [ ] No regressions in existing functionality

## Technical Considerations

### Performance

- **Impact**: AI operations are async and network-dependent; should not block UI
- **Mitigation**:
    - Use streaming for responsive feedback
    - Show processing indicators during LLM calls
    - Debounce rapid command submissions
    - Lazy-load AI-related code (dynamic imports)

### Security

#### Important Disclaimers

**Nothing stored in browser storage is fully secure.** The `encrypt-storage` package we use explicitly states:

> "Nothing on the front end is entirely secure. The library's proposal is to make it difficult for the user to see the data through the console, but as the secret key is on the front end, if the user searches hard enough, he will end up finding it."

This is a fundamental limitation of any client-side encryption scheme.

#### Threat Model

| Threat                          | Protection Level | Notes                                          |
| ------------------------------- | ---------------- | ---------------------------------------------- |
| Casual observation via DevTools | ✅ Protected     | Encrypted data not human-readable              |
| Browser extensions              | ⚠️ Limited       | Malicious extensions can access storage        |
| XSS attacks                     | ❌ Not protected | Attacker scripts can read storage              |
| Physical device access          | ⚠️ Limited       | Depends on password usage                      |
| Network interception            | ✅ Protected     | Keys never transmitted (except to AI provider) |

#### Storage Options

1. **Session-only (Default - Most Secure)**
    - Keys stored only in memory
    - Lost when browser tab closes
    - No persistence, must re-enter each session
    - Recommended for high-security environments

2. **Encrypted localStorage with Default Password**
    - Uses built-in default encryption key (`"graphty-default-key"`)
    - Convenient: keys persist across sessions automatically
    - Lower security: default key is known/discoverable
    - Suitable for: personal devices, low-risk API keys

3. **Encrypted localStorage with Custom Password**
    - User provides their own encryption password
    - Password stored in sessionStorage (survives reloads, cleared on browser close)
    - Moderate security: requires password each browser session
    - Suitable for: shared devices, higher-value API keys

#### Encryption Details

- **Library**: `encrypt-storage` v2.14.7
- **Algorithm**: AES encryption via `crypto-js`
- **Storage**: localStorage (encrypted) or sessionStorage (for encryption password)
- **Key Derivation**: Direct use of password as encryption key (no PBKDF2)

#### Security Measures Implemented

- **UI Protection**:
    - `PasswordInput` components for all key fields
    - Keys masked by default, toggle to reveal
    - Security warning Alert shown when enabling persistence

- **Code Protection**:
    - API keys have custom `toString()` returning `"[REDACTED]"`
    - Keys excluded from error messages and telemetry
    - Keys not logged to console

- **User Control**:
    - Clear all keys functionality
    - Disable persistence option
    - Choice between default and custom password

#### Recommendations for Users

1. **For personal development**: Default password persistence is acceptable
2. **For shared computers**: Use custom password or session-only storage
3. **For production/sensitive keys**: Use session-only storage, or better yet, use environment variables in a proper backend
4. **Consider WebLLM**: For maximum privacy, use local AI models that require no API keys

### Compatibility

- **Backward Compatibility**: Feature is additive; no breaking changes to existing UI
- **Browser Support**: Uses existing Mantine components; no new browser requirements
- **graphty-element**: Requires graphty-element version with AI module exported (verify exports in package)

### Testing

- **Unit Tests**:
    - `useAiKeyStorage` hook operations
    - `useAiManager` initialization and cleanup
    - Modal open/close states
    - Dialog drag behavior
- **Integration Tests**:
    - Full flow: configure key → open chat → submit command
    - Key persistence and retrieval
    - Provider switching
- **Visual Tests**:
    - Dialog positioning and drag
    - Status indicator states
    - Mobile responsiveness
- **Manual Testing**:
    - Actual AI command execution
    - Different providers
    - Error scenarios

## Risks and Mitigation

### Risk: graphty-element AI exports not available

**Mitigation**: Verify AI module is exported in graphty-element's public API. If not, coordinate with graphty-element to add exports or use internal imports temporarily.

### Risk: API key security concerns from users

**Mitigation**: Default to session-only storage. Clearly communicate storage options. Provide "clear all keys" functionality. Document security model.

### Risk: Complex drag behavior across browsers

**Mitigation**: Start with simple CSS transform-based dragging. Fall back to fixed positioning if drag proves problematic. Consider using established library like react-draggable if needed.

### Risk: AI response latency creates poor UX

**Mitigation**: Implement streaming display from day one. Show intermediate states clearly. Allow cancellation. Add timeout handling with user-friendly messages.

### Risk: Mobile usability challenges

**Mitigation**: Design dialog to work at smaller sizes. Consider alternative layouts for mobile (bottom sheet). Test early on mobile devices.

## Future Enhancements

1. **Voice Input**: Add microphone button using `VoiceInputAdapter` from graphty-element
2. **Command History**: Persist and display previous commands with re-run capability
3. **Custom Commands**: Allow users to register custom commands via UI
4. **Prompt Templates**: Pre-defined prompts for common operations
5. **Multi-turn Conversations**: Maintain context across multiple prompts
6. **WebLLM Support**: Enable fully local AI processing without API keys
7. **AI Suggestions**: Proactive suggestions based on graph analysis
8. **Keyboard Shortcuts**: Cmd/Ctrl+K to open AI dialog
9. **Inline Responses**: Option to display AI output directly on graph
10. **Export/Share**: Save AI conversation as documentation

## Dependencies

### Required from graphty-element

```typescript
// All AI types are now exported from the main package
import {
    ApiKeyManager,
    Graph,
    type AiManagerConfig,
    type AiStatus,
    type KeyPersistenceConfig,
    type ProviderType,
} from "@graphty/graphty-element";
```

### Key API Usage Patterns

```typescript
// Create standalone key manager for settings UI (before AI is enabled)
const keyManager = Graph.createApiKeyManager();
keyManager.enablePersistence({
    encryptionKey: userSecret,
    storage: "localStorage",
});
keyManager.setKey("openai", apiKey);

// Enable AI on graph with persistence
await graph.enableAiControl({
    provider: "openai",
    apiKey: storedKey,
    keyPersistence: {
        enabled: true,
        encryptionKey: userSecret,
    },
});

// Access key manager after AI is enabled
const keyManager = graph.getApiKeyManager();
const providers = keyManager?.getConfiguredProviders();
```

### New npm Dependencies

None required - all functionality uses existing Mantine components and graphty-element.

### Internal Dependencies

- Access to `Graph` instance via `GraphtyHandle.graph` property (now implemented)

## File Structure

```
src/
├── components/
│   └── ai/
│       ├── index.ts
│       ├── AiSettingsModal.tsx
│       ├── AiChatDialog.tsx
│       ├── AiStatusIndicator.tsx
│       ├── AiActionButton.tsx
│       ├── AiMessageBubble.tsx
│       └── __tests__/
│           ├── AiSettingsModal.test.tsx
│           ├── AiChatDialog.test.tsx
│           └── AiActionButton.test.tsx
├── hooks/
│   ├── useAiManager.ts
│   └── useAiKeyStorage.ts
└── utils/
    └── ai-storage.ts  (localStorage keys, defaults)
```

## Implementation Notes

### Graph Access

`GraphtyHandle` now exposes the Graph instance directly via the `graph` property. This provides an escape hatch for advanced operations (like AI integration) while keeping convenience methods for common operations.

```typescript
// In React components with a ref to Graphty
const graphtyRef = useRef<GraphtyHandle>(null);

// Access graph for AI initialization
const graph = graphtyRef.current?.graph;
if (graph) {
    aiManager.init(graph, config);
}

// Convenience methods still available
graphtyRef.current?.loadData("json", { data });
graphtyRef.current?.clearData();
```

The `Graph` type is exported from `Graphty.tsx` and includes known properties with an index signature for additional capabilities:

```typescript
export interface Graph {
    dataManager: { ... };
    // Additional Graph methods accessible via the instance
    [key: string]: unknown;
}
```

### Dialog Positioning Logic

```typescript
// Initial position: centered horizontally, bottom-right quadrant
const getInitialPosition = () => {
    const savedPosition = localStorage.getItem("ai-dialog-position");
    if (savedPosition) return JSON.parse(savedPosition);

    return {
        x: window.innerWidth - 400 - 20, // 400px dialog width + 20px margin
        y: window.innerHeight - 500 - 20, // 500px dialog height + 20px margin
    };
};
```

### Provider Configuration UI

Tab-based interface matching provider types:

```typescript
const providers: ProviderConfig[] = [
    { type: "openai", name: "OpenAI", placeholder: "sk-..." },
    { type: "anthropic", name: "Anthropic", placeholder: "sk-ant-..." },
    { type: "google", name: "Google", placeholder: "AI..." },
    { type: "webllm", name: "Local (WebLLM)", requiresKey: false },
];
```
