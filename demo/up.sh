#!/usr/bin/env bash
# Starts the local demo stack: supplier-mock (:7200, v1), the actor server
# (:7100) and the endpoint watcher. Safe to run twice: running services are kept.
set -uo pipefail
source "$(dirname "$0")/lib.sh"
ok=0

# 1. Mock supplier
if supplier_up; then
  note "supplier-mock already running (pid $(listener_pid $SUPPLIER_PORT))"
else
  (cd "$ROOT/supplier-mock" && SUPPLIER_VERSION=v1 PORT=$SUPPLIER_PORT nohup node server.ts >>"$LOGS/supplier.log" 2>&1 &)
  for _ in $(seq 1 20); do supplier_up && break; sleep 0.5; done
fi
if supplier_up; then
  green "supplier-mock  $SUPPLIER_URL  version $(curl -s "$SUPPLIER_URL/admin/version" | sed 's/.*"version":"\([^"]*\)".*/\1/')"
else
  red "supplier-mock  did not start, see demo/logs/supplier.log"; ok=1
fi

# 2. Actor server
if [ -n "$(listener_pid $ACTORS_PORT)" ]; then
  holder="$(listener_pid $ACTORS_PORT)"
  note "actor server already running (pid $holder, $(pid_cwd "$holder"))"
else
  start_actors
fi
if wait_actors 90; then
  green "actors         $ACTORS_URL"
else
  red "actors         not ready after 90 s (last HTTP $(actors_status)), see demo/logs/actors.log"; ok=1
fi

# 3. Watcher: rearm reads every known actor and calls watch() from saved config,
# or from the defaults above on a fresh state.
if [ $ok -eq 0 ] && rearm >>"$LOGS/rearm.log" 2>&1; then
  sleep 1
  green "watcher        EndpointWatcher/$WATCHER_ID  probes=$(watcher_field probeCount)  cases=$(watcher_field caseIds)  every ${WATCH_EVERY_MS}ms"
else
  red "watcher        not armed, see demo/logs/rearm.log"; ok=1
fi

note "logs: demo/logs/   web/ and agent/ are started separately"
exit $ok
