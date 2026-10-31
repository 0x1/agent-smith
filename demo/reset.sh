#!/usr/bin/env bash
# Clean slate before every rehearsal and before the live demo. Case IDs are
# deterministic, so without this a rehearsal case comes back already approved
# and agent/ (which only acts on `detected`) never repairs.
#   1. EndpointWatcher.reset(): resets every case it opened (Case.reset).
#   2. Stops this checkout's supplier and actor server.
#   3. Deletes all local actor state (actors/.durable-actors/).
#   4. Starts everything again (demo/up.sh) and sets the supplier to v1.
# It does not touch GitHub or 0x1/agent-smith-demo PRs.
set -uo pipefail
source "$(dirname "$0")/lib.sh"

if [ "$(actors_status)" = "200" ]; then
  if invoke EndpointWatcher "$WATCHER_ID" reset >"$LOGS/reset.json" 2>&1; then
    note "reset cases: $(bun -e 'const s=await Bun.file(process.argv[1]).json(); console.log(s.resetCases.map(c=>`${c.caseId.split(".").pop()} (was ${c.wasStatus})`).join(", ") || "none")' "$LOGS/reset.json")"
  else
    note "watcher reset failed (see demo/logs/reset.json); wiping state anyway"
  fi
fi

kill_actors || exit 1
kill_supplier || exit 1
rm -rf "$ROOT/actors/.durable-actors"
note "stopped services and deleted actors/.durable-actors"

"$ROOT/demo/up.sh" || exit 1
curl -s -X POST "$SUPPLIER_URL/admin/version" -d '{"version":"v1"}' >/dev/null
green "reset done     supplier $(curl -s "$SUPPLIER_URL/admin/version" | sed 's/.*"version":"\([^"]*\)".*/\1/'), cases=$(watcher_field caseIds)"
