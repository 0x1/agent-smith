#!/bin/sh
# 1920×1080 screenshot of a page. The SSE stream never goes idle, so Chrome is
# given a fixed wait instead of a virtual-time budget, and reduced motion so
# the 200 ms fade-ins are finished when the shot is taken. Usage: ./shoot.sh URL out.png
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-prefers-reduced-motion --window-size=1920,1080 --timeout=6000 --screenshot="$2" "$1" >/dev/null 2>&1 &
pid=$!
( sleep 12; kill $pid 2>/dev/null ) &
wait $pid
