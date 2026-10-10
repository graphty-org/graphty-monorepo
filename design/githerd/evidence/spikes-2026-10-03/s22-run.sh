#!/bin/bash
# S22: does tmux list-clients show which window an attached client views, on a named socket?
. "$(dirname "$0")/lib.sh"
$T new-session -d -s githerd -n board -x 160 -y 40 'sleep 600'
$T new-window -t githerd -n w1 'sleep 600'; $T new-window -t githerd -n w2 'sleep 600'
F='#{client_name} tty=#{client_tty} session=#{client_session} window=#{window_index}:#{window_name} active_pane=#{pane_id} activity=#{client_activity}'
echo "== no client attached"; $T list-clients -F "$F"; echo "exit=$?"
# A real attached client: a second private tmux server whose pane attaches to the first.
tmux -L githerd-spike-b-viewer new-session -d -s viewer -x 160 -y 40 "$T attach -t githerd"
sleep 1; $T select-window -t githerd:w1; sleep 1
echo "== client attached, viewing w1"; $T list-clients -F "$F"
$T select-window -t githerd:w2; sleep 1
echo "== after select-window w2"; $T list-clients -F "$F"
echo "== per-window: window_active and window_active_clients"
$T list-windows -t githerd -F '#{window_index}:#{window_name} active=#{window_active} active_clients=#{window_active_clients} active_sessions=#{window_active_sessions}'
tmux -L githerd-spike-b-viewer kill-server; sleep 1
echo "== after the client detached"; $T list-clients -F "$F"; echo "(clients: $($T list-clients | wc -l))"
$T list-windows -t githerd -F '#{window_index}:#{window_name} active=#{window_active} active_clients=#{window_active_clients}'
$T kill-server; tmux -L githerd-spike-b ls 2>&1; tmux -L githerd-spike-b-viewer ls 2>&1
