# Design: Multi-Turn Tool Processing for AI Controller

## Problem Statement

The current AI tool-calling flow is incomplete. When a user asks a question that requires tool execution, the AI calls the appropriate tool, but the tool's raw message is returned directly to the user instead of having the LLM process the results and generate a natural language response.

### Current Behavior

```
User: "What are some sample nodes?"
     ↓
LLM: [Calls sampleData tool]
     ↓
Tool returns: { message: "Returned 3 node samples", data: {nodes: [...]} }
     ↓
User sees: "Returned 3 node samples"  ← Not helpful!
```

The actual data (node IDs, properties, values) is returned in `result.data` but never shown to the user.

### Expected Behavior

```
User: "What are some sample nodes?"
     ↓
LLM: [Calls sampleData tool]
     ↓
Tool returns: { message: "Returned 3 node samples", data: {nodes: [...]} }
     ↓
LLM receives tool result, generates response:
  "Here are 3 sample nodes from your graph:
   1. Node 'Whiskers' (id: cat1) - type: cat, breed: tabby, age: 5
   2. Node 'Mittens' (id: cat2) - type: cat, breed: persian, age: 3
   3. Node 'Shadow' (id: cat3) - type: cat, breed: siamese, age: 7"
     ↓
User sees: Helpful, formatted response with actual data
```

## Background: Standard Tool-Calling Flow

The industry-standard pattern for LLM tool-calling (used by OpenAI, Anthropic, etc.) is a multi-turn conversation:

```
Turn 1 (User → LLM):
  Messages: [user: "What are some sample nodes?"]
  Response: { tool_calls: [{name: "sampleData", args: {...}}] }

Turn 2 (Tool Result → LLM):
  Messages: [
    user: "What are some sample nodes?",
    assistant: {tool_calls: [...]},
    tool: {tool_call_id: "...", content: "{...tool result JSON...}"}
  ]
  Response: { text: "Here are 3 sample nodes..." }

Turn 3 (Final response to user):
  "Here are 3 sample nodes..."
```

The key insight is that after tool execution, **the conversation continues** with the tool result appended to the message history, and the LLM generates a final response.

## Proposed Solution

### Architecture

Implement a **ReAct-style agentic loop** in `AiController` that:

1. Sends user message to LLM
2. If LLM returns tool calls:
   a. Execute the tools
   b. Append tool results to conversation history
   c. Call LLM again with updated history
   d. Repeat until LLM returns a text response (no more tool calls)
3. Return final text response to user

### Key Design Decisions

#### 1. Maximum Iterations

To prevent infinite loops, set a maximum number of tool-calling iterations (e.g., 5). If exceeded, return an error or the last available response.

```typescript
const MAX_TOOL_ITERATIONS = 5;
```

#### 2. Conversation History Management

Maintain conversation history within a single `execute()` call:

```typescript
interface ConversationTurn {
  role: "user" | "assistant" | "tool";
  content?: string;
  toolCalls?: ToolCall[];
  toolCallId?: string;
}
```

#### 3. Tool Result Serialization

Tool results must be serialized to a format the LLM can understand:

```typescript
function serializeToolResult(result: CommandResult): string {
  return JSON.stringify({
    success: result.success,
    message: result.message,
    data: result.data,
  });
}
```

#### 4. Parallel vs Sequential Tool Calls

When LLM returns multiple tool calls:
- **Current**: Execute sequentially, stop on first error
- **Proposed**: Keep sequential execution but collect all results for the follow-up LLM call

### Implementation

#### Modified Execute Flow

```typescript
async execute(input: string): Promise<ExecutionResult> {
  const conversationHistory: Message[] = this.buildInitialMessages(input);
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;

    // Call LLM
    const response = await this.provider.generate(
      conversationHistory,
      this.commandRegistry.toToolDefinitions(),
      { signal: this.abortController.signal }
    );

    // If no tool calls, return the text response
    if (response.toolCalls.length === 0) {
      return {
        success: true,
        message: response.text || "No response",
        llmText: response.text,
      };
    }

    // Add assistant message with tool calls to history
    conversationHistory.push({
      role: "assistant",
      content: response.text || null,
      toolCalls: response.toolCalls,
    });

    // Execute tools and add results to history
    for (const toolCall of response.toolCalls) {
      const result = await this.executeToolCall(toolCall);

      conversationHistory.push({
        role: "tool",
        toolCallId: toolCall.id,
        content: this.serializeToolResult(result),
      });

      // Track affected nodes/edges for final result
      this.accumulateAffectedElements(result);
    }

    // Continue loop - LLM will see tool results and respond
  }

  // Max iterations reached
  return {
    success: false,
    message: "Maximum tool iterations reached",
  };
}
```

#### Tool Result Serialization

```typescript
private serializeToolResult(result: CommandResult): string {
  // Include both message and data for LLM context
  const serialized = {
    success: result.success,
    message: result.message,
    ...(result.data && { data: result.data }),
    ...(result.affectedNodes && { affectedNodes: result.affectedNodes.length }),
    ...(result.affectedEdges && { affectedEdges: result.affectedEdges.length }),
  };

  return JSON.stringify(serialized, null, 2);
}
```

### Status Updates

The status manager needs updates to reflect the multi-turn nature:

```typescript
// New status stages
type AiStage =
  | "idle"
  | "submitted"
  | "streaming"      // LLM generating response
  | "executing"      // Executing tool(s)
  | "processing"     // LLM processing tool results (NEW)
  | "complete"
  | "error";
```

### Events

New events for multi-turn visibility:

```typescript
// Emitted when starting a new LLM turn after tool execution
interface AiTurnStartEvent {
  type: "ai-turn-start";
  turnNumber: number;
  messageCount: number;
}

// Emitted when LLM processes tool results
interface AiProcessingToolResultsEvent {
  type: "ai-processing-tool-results";
  toolResults: { name: string; success: boolean }[];
}
```

## Examples

### Example 1: Simple Query

**Before (current):**
```
User: "How many nodes are there?"
AI calls: queryGraph({ query: "nodeCount" })
Tool returns: { message: "The graph has 20 nodes.", data: { nodeCount: 20 } }
User sees: "The graph has 20 nodes."
```

This case already works well because the tool's `message` is human-readable.

**After (no change needed):**
Same behavior - the LLM may choose to pass through the message or rephrase slightly.

### Example 2: Data Sampling (Currently Broken)

**Before (current):**
```
User: "What are some sample nodes?"
AI calls: sampleData({ target: "nodes", count: 3 })
Tool returns: {
  message: "Returned 3 node samples.",
  data: { nodes: [
    { id: "cat1", data: { name: "Whiskers", type: "cat", breed: "tabby" } },
    { id: "cat2", data: { name: "Mittens", type: "cat", breed: "persian" } },
    { id: "cat3", data: { name: "Shadow", type: "cat", breed: "siamese" } }
  ]}
}
User sees: "Returned 3 node samples."  ← Not helpful!
```

**After (fixed):**
```
User: "What are some sample nodes?"
AI calls: sampleData({ target: "nodes", count: 3 })
Tool returns: { message: "...", data: { nodes: [...] } }
[LLM receives tool result, generates response]
User sees:
  "Here are 3 sample nodes from your graph:

   1. **Whiskers** (cat1) - A tabby cat
   2. **Mittens** (cat2) - A persian cat
   3. **Shadow** (cat3) - A siamese cat

   Each node has properties: name, type, and breed."
```

### Example 3: Multi-Step Task

**User: "Find all cats and make them blue"**

```
Turn 1:
  LLM calls: findNodes({ selector: "type == 'cat'" })
  Tool returns: { data: { nodeIds: ["cat1", "cat2", "cat3"], count: 3 } }

Turn 2:
  LLM sees tool result, calls: styleNodes({ nodeIds: ["cat1", "cat2", "cat3"], color: "#0000ff" })
  Tool returns: { data: { styledCount: 3 } }

Turn 3:
  LLM sees both results, generates:
  "I found 3 cat nodes and styled them blue: Whiskers, Mittens, and Shadow."
```

### Example 4: Error Recovery

**User: "Style all dogs red"**

```
Turn 1:
  LLM calls: findNodes({ selector: "type == 'dog'" })
  Tool returns: { success: true, data: { nodeIds: [], count: 0 } }

Turn 2:
  LLM sees empty result, generates:
  "I couldn't find any nodes with type 'dog' in your graph.
   The available node types are: cat, human. Would you like me to
   style one of those instead?"
```

## Configuration Options

```typescript
interface AiControllerOptions {
  // ... existing options ...

  /** Maximum tool-calling iterations per execute() call (default: 5) */
  maxToolIterations?: number;

  /** Whether to include full data in tool results for LLM (default: true) */
  includeToolDataInContext?: boolean;

  /** Maximum size of tool result data to include (default: 4000 chars) */
  maxToolResultSize?: number;
}
```

## Performance Considerations

### Token Usage

Multi-turn processing increases token usage:
- Each turn includes the full conversation history
- Tool results (especially data-heavy ones like `sampleData`) add tokens

**Mitigations:**
1. Truncate large `data` fields in tool results
2. Summarize previous tool results in subsequent turns
3. Set `maxToolResultSize` configuration option

### Latency

Each additional turn adds LLM API latency (~500ms-2s per turn).

**Mitigations:**
1. Optimize tool execution to minimize turns
2. Consider streaming for long operations
3. Show "Processing results..." status to user

### Cost

More API calls = higher cost for cloud providers.

**Mitigations:**
1. Use smaller/faster models for tool result processing
2. Cache common query patterns
3. Consider local models (WebLLM) for simple follow-ups

## Migration Path

### Phase 1: Basic Multi-Turn (MVP)

1. Implement conversation history tracking
2. Add tool result → LLM → response loop
3. Set `MAX_TOOL_ITERATIONS = 3`
4. Update status manager for new stages

### Phase 2: Optimization

1. Add tool result truncation/summarization
2. Implement conversation memory limits
3. Add configuration options

### Phase 3: Advanced Features

1. Support for multi-step planning
2. Tool result caching
3. Parallel tool execution with batched results

## Testing Strategy

### Unit Tests

```typescript
describe("AiController multi-turn", () => {
  it("should make follow-up LLM call after tool execution", async () => {
    // Mock provider to return tool call, then text
    mockProvider.generate
      .mockResolvedValueOnce({ toolCalls: [{name: "sampleData", ...}], text: "" })
      .mockResolvedValueOnce({ toolCalls: [], text: "Here are the samples..." });

    const result = await controller.execute("show me some nodes");

    expect(mockProvider.generate).toHaveBeenCalledTimes(2);
    expect(result.message).toContain("Here are the samples");
  });

  it("should respect MAX_TOOL_ITERATIONS", async () => {
    // Mock provider to always return tool calls
    mockProvider.generate.mockResolvedValue({ toolCalls: [{...}], text: "" });

    const result = await controller.execute("infinite loop");

    expect(mockProvider.generate).toHaveBeenCalledTimes(MAX_TOOL_ITERATIONS);
    expect(result.success).toBe(false);
  });

  it("should include tool results in conversation history", async () => {
    // Verify second call includes tool result message
  });
});
```

### Integration Tests

1. Test with real OpenAI/Anthropic APIs
2. Test with WebLLM for local model behavior
3. Test complex multi-step workflows

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Infinite tool-calling loops | High | MAX_TOOL_ITERATIONS limit |
| Token limit exceeded | Medium | Truncate tool results, conversation pruning |
| Increased latency | Medium | Status updates, streaming where possible |
| Increased cost | Low-Medium | Configuration options, model selection |
| LLM ignores tool results | Medium | Prompt engineering, explicit instructions |

## Open Questions

1. **Should we support conversation memory across multiple `execute()` calls?**
   - Pro: Enables follow-up questions ("what about the edges?")
   - Con: Complexity, token usage, state management

2. **How should we handle streaming with multi-turn?**
   - Option A: Stream each turn separately
   - Option B: Only stream final response
   - Option C: Stream everything with turn markers

3. **Should tool result format be configurable per command?**
   - Some commands may want full data in LLM context
   - Others may want summarized data only

## Appendix: Message Format Reference

### OpenAI Format

```json
{
  "messages": [
    {"role": "system", "content": "You are an AI assistant..."},
    {"role": "user", "content": "What are some sample nodes?"},
    {
      "role": "assistant",
      "content": null,
      "tool_calls": [{
        "id": "call_abc123",
        "type": "function",
        "function": {
          "name": "sampleData",
          "arguments": "{\"target\": \"nodes\", \"count\": 3}"
        }
      }]
    },
    {
      "role": "tool",
      "tool_call_id": "call_abc123",
      "content": "{\"success\": true, \"data\": {\"nodes\": [...]}}"
    },
    {"role": "assistant", "content": "Here are 3 sample nodes..."}
  ]
}
```

### Anthropic Format

```json
{
  "messages": [
    {"role": "user", "content": "What are some sample nodes?"},
    {
      "role": "assistant",
      "content": [{
        "type": "tool_use",
        "id": "toolu_abc123",
        "name": "sampleData",
        "input": {"target": "nodes", "count": 3}
      }]
    },
    {
      "role": "user",
      "content": [{
        "type": "tool_result",
        "tool_use_id": "toolu_abc123",
        "content": "{\"success\": true, \"data\": {\"nodes\": [...]}}"
      }]
    },
    {"role": "assistant", "content": "Here are 3 sample nodes..."}
  ]
}
```
