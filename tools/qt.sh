#!/usr/bin/env bash
set -euo pipefail
project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
qt_python="$project_root/.venv-qt-wsl/bin/python"
action="${1:-run}"
target="${2:-chipchip}"
case "$action" in
  setup)
    if [[ ! -x "$qt_python" ]]; then
      python3 -m venv "$project_root/.venv-qt-wsl"
    fi
    exec "$qt_python" -m pip install -r "$project_root/desktop/qt/requirements.txt"
    ;;
  run|test) ;;
  *) echo 'Usage: bash tools/qt.sh {setup|run|test} [chipchip|chipdraw|pinview]' >&2; exit 2 ;;
esac
if [[ ! -x "$qt_python" ]]; then
  echo 'Run bash tools/qt.sh setup first.' >&2
  exit 1
fi
if [[ "$action" == test ]]; then
  for target in chipchip pinview; do
    "$qt_python" "$project_root/desktop/qt/main.py" --app "$target" --smoke-test
  done
else
  exec "$qt_python" "$project_root/desktop/qt/main.py" --app "$target"
fi
