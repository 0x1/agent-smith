#!/usr/bin/env bash
# Clean slate before every rehearsal and before the live demo. Case IDs are
# deterministic, so without this a rehearsal case comes back already approved
# and agent/ (which only acts on `detected`) never repairs.
#
# Order matters: the supplier is set to v1 BEFORE any watcher reset or rearm,
# so the watcher's new baseline is v1. If the first probe saw v2, v2 would be
# the baseline and the "API just changed" moment would be lost.
#   1. Supplier to v1 (if it is up), then EndpointWatcher.reset() -> Case.reset().
#   2. Stop this checkout's actor server.
#   3. Delete all local actor state (actors/.durable-actors/).
#   4. Start the supplier if it is down, set v1, confirm with GET /admin/version.
#   5. demo/up.sh: start the actors and rearm (watch). Baseline is v1.
#   6. Check that the first probe's shape contains `stock`.
# It does not touch GitHub or 0x1/agent-smith-demo PRs.
set -uo pipefail
source "$(dirname "$0")/lib.sh"

supplier_version() { curl -s "$SUPPLIER_URL/admin/version" | sed 's/.*"version":"\([^"]*\)".*/\1/'; }
set_v1() { curl -s -X POST "$SUPPLIER_URL/admin/version" -d '{"version":"v1"}' >/dev/null; }

# 1. v1 first, then reset the cases through the watcher.
supplier_up && set_v1
if [ "$(actors_status)" = "200" ]; then
  if invoke EndpointWatcher "$WATCHER_ID" reset >"$LOGS/reset.json" 2>&1; then
    note "reset cases: $(bun -e 'const s=await Bun.file(process.argv[1]).json(); console.log(s.resetCases.map(c=>`${c.caseId.split(".").pop()} (was ${c.wasStatus})`).join(", ") || "none")' "$LOGS/reset.json")"
  else
    note "watcher reset failed (see demo/logs/reset.json); wiping state anyway"
  fi
fi

# 2-3. Stop the actor server and wipe its state.
kill_actors || exit 1
rm -rf "$ROOT/actors/.durable-actors"
note "stopped the actor server and deleted actors/.durable-actors"

# 4. Supplier up and on v1 before the actors start.
if ! supplier_up; then
  start_supplier
fi
set_v1
if [ "$(supplier_version)" != "v1" ]; then
  red "supplier is not on v1 (GET /admin/version: $(curl -s "$SUPPLIER_URL/admin/version")); stopping before the watcher starts"
  exit 1
fi
note "supplier confirmed v1 (GET /admin/version)"

# 5. Actors and watcher. up.sh keeps the running supplier.
"$ROOT/demo/up.sh" || exit 1

# 6. The baseline must be v1: wait for the first probe and look for `stock`.
invoke EndpointWatcher "$WATCHER_ID" probeNow >/dev/null
baseline="$(watcher_field shape)"
case "$baseline" in
  *'"stock"'*) green "reset done     baseline is v1 (has stock), cases=$(watcher_field caseIds)" ;;
  *) red "baseline is not v1: $baseline"; exit 1 ;;
esac
