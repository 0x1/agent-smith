# Shared helpers for the demo scripts. Source it; don't run it.
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")/.." && pwd)"
LOGS="$ROOT/demo/logs"
mkdir -p "$LOGS"

SUPPLIER_PORT=7200
ACTORS_PORT=7100
SUPPLIER_URL="http://127.0.0.1:$SUPPLIER_PORT"
ACTORS_URL="http://127.0.0.1:$ACTORS_PORT"
WATCHER_ID="supplier.get-inventory"
WATCH_SKU="WIDGET-1"
WATCH_EVERY_MS=5000
export ACTORS_URL SUPPLIER_URL WATCHER_ID WATCH_SKU WATCH_EVERY_MS

green() { printf '\033[32m● %s\033[0m\n' "$*"; }
red() { printf '\033[31m● %s\033[0m\n' "$*"; }
note() { printf '  %s\n' "$*"; }

listener_pid() { lsof -nP -iTCP:"$1" -sTCP:LISTEN -t 2>/dev/null | head -1; }
pid_cwd() { lsof -a -p "$1" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p'; }

supplier_up() { curl -sf "$SUPPLIER_URL/admin/version" >/dev/null 2>&1; }

# HTTP status of a watcher read. 200 when the actor host is ready, 503 while a
# killed host's lease (about 30 s) is still held.
actors_status() {
  curl -s -o /dev/null -w '%{http_code}' -X POST \
    "$ACTORS_URL/v1/projects/local/actors/EndpointWatcher/$WATCHER_ID/invoke" \
    -H 'content-type: application/json' \
    -d '{"requestId":"health-'"$RANDOM"'","method":"read","args":[]}' 2>/dev/null
}

invoke() { (cd "$ROOT/actors" && bun scripts/invoke.ts "$@"); }

# Prints one field of the watcher state, for example: watcher_field probeCount
watcher_field() {
  invoke EndpointWatcher "$WATCHER_ID" getState | bun -e '
    const s = JSON.parse(await Bun.stdin.text()); const v = s[process.argv[1]];
    console.log(typeof v === "object" ? JSON.stringify(v) : v)' "$1"
}

# PIDs of this checkout's actor server tree only. Other checkouts on the same
# machine keep running.
actors_pids() {
  local pid
  for pid in $(pgrep -f "durable-actors|DURABLE_ACTORS_SDK_HOST" 2>/dev/null); do
    case "$(pid_cwd "$pid")" in "$ROOT/actors"*) echo "$pid" ;; esac
  done
}

kill_actors() {
  local pids; pids="$(actors_pids)"
  [ -n "$pids" ] && echo "$pids" | xargs kill -9 2>/dev/null
  local holder; holder="$(listener_pid "$ACTORS_PORT")"
  if [ -n "$holder" ]; then
    red "port $ACTORS_PORT is still held by pid $holder ($(pid_cwd "$holder")), not this checkout"
    return 1
  fi
}

kill_supplier() {
  local pid; pid="$(listener_pid "$SUPPLIER_PORT")"
  [ -z "$pid" ] && return 0
  case "$(pid_cwd "$pid")" in
    "$ROOT/supplier-mock"*) kill "$pid" 2>/dev/null ;;
    *) red "port $SUPPLIER_PORT is held by pid $pid ($(pid_cwd "$pid")), not this checkout"; return 1 ;;
  esac
}

# Background servers get all three fds redirected and `exec`, so no shell keeps
# the caller's stdout open (otherwise `demo/up.sh | tee` never finishes).
start_actors() {
  [ -d "$ROOT/actors/node_modules" ] || (cd "$ROOT/actors" && bun install >>"$LOGS/actors.log" 2>&1)
  (cd "$ROOT/actors" && exec nohup bunx durable-actors dev) >>"$LOGS/actors.log" 2>&1 </dev/null &
}

start_supplier() {
  (cd "$ROOT/supplier-mock" && SUPPLIER_VERSION=v1 PORT=$SUPPLIER_PORT exec nohup node server.ts) >>"$LOGS/supplier.log" 2>&1 </dev/null &
  for _ in $(seq 1 20); do supplier_up && break; sleep 0.5; done
}

# Waits until the actor host answers 200. Returns 1 after $1 seconds.
wait_actors() {
  local deadline=$((SECONDS + ${1:-90})) code
  while [ $SECONDS -lt $deadline ]; do
    code="$(actors_status)"
    [ "$code" = "200" ] && return 0
    sleep 1
  done
  return 1
}

rearm() { (cd "$ROOT/actors" && bun scripts/rearm.ts); }
