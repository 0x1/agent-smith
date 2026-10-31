#!/usr/bin/env bash
# Live proof that the watcher survives a hard crash: kill -9 the actor server,
# start it again, re-arm, and show probeCount still rising with state intact.
set -uo pipefail
source "$(dirname "$0")/lib.sh"

before_count="$(watcher_field probeCount)"; before_pid="$(watcher_field pid)"; before_cases="$(watcher_field caseIds)"
echo "before   probeCount=$before_count  pid=$before_pid  cases=$before_cases"

kill_actors || exit 1
echo "kill -9  actor server stopped at $(date -u +%T) UTC"
start_actors
echo "restart  waiting for the old host's lease to expire (about 30 s)..."
if ! wait_actors 90; then red "actor server not ready after 90 s, see demo/logs/actors.log"; exit 1; fi
rearm | sed 's/^/rearm    /'

sleep $((WATCH_EVERY_MS / 1000 * 2 + 1))
after_count="$(watcher_field probeCount)"; after_pid="$(watcher_field pid)"; after_cases="$(watcher_field caseIds)"
echo "after    probeCount=$after_count  pid=$after_pid  cases=$after_cases"

if [ "$after_count" -gt "$before_count" ] && [ "$after_cases" = "$before_cases" ]; then
  green "probeCount $before_count -> $after_count, new pid $before_pid -> $after_pid, cases kept"
else
  red "probeCount $before_count -> $after_count, cases $before_cases -> $after_cases"; exit 1
fi
