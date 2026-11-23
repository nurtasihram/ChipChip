#!/usr/bin/env bash
set -eu
root=$(cd "$(dirname "$0")/.." && pwd)
build="$root/.qt-build/linux"
action=${1:-run}
app=${2:-chipchip}
case "$action" in setup|run|test) ;; *) echo 'Expected setup, run or test' >&2; exit 2;; esac
cmake -S "$root/desktop/qt" -B "$build"
cmake --build "$build" --parallel 2
case "$action" in
  test) exec ctest --test-dir "$build" --output-on-failure ;;
  run) shift "$(( $# >= 2 ? 2 : $# ))"; exec "$build/chipchip" --app "$app" "$@" ;;
esac
