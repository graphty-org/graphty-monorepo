#!/bin/bash
# Spike: how long one MCP tool call can hold an interactive turn, under three settings.
cd "$(dirname "$0")"; rm -f *.log
T="tmux -L githerd-spike"
start() { # name envs seconds
  echo "{\"mcpServers\":{\"spike\":{\"command\":\"node\",\"args\":[\"$PWD/block-server.mjs\"],\"env\":{\"LOG\":\"$PWD/$1.log\",\"PROGRESS\":\"$4\"}}}}" > $1.json
  $T new-session -d -s $1 -x 200 -y 50 -c "$PWD" "env $2 claude --model haiku --setting-sources project,local --strict-mcp-config --mcp-config $PWD/$1.json --allowedTools mcp__spike__block -n githerd-spike-$1 'Call the block tool of the spike server with seconds=$3, wait for its result, then reply with the result text only.'"
}
start default "X=1" 200 ""
start nobg "CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS=0" 420 ""
start nobgprog "CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS=0" 420 1
start nobgidle "CLAUDE_CODE_MCP_AUTO_BACKGROUND_MS=0 CLAUDE_CODE_MCP_TOOL_IDLE_TIMEOUT=0" 420 ""
date
