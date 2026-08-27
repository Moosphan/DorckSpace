#!/usr/bin/env bash

stop_project_electron_processes() {
  local root_dir="$1"
  local -a pids=()
  local pid command

  while read -r pid command; do
    [[ -z "${pid}" ]] && continue
    case "${command}" in
      "${root_dir}"/node_modules/.pnpm/electron@*/node_modules/electron/dist/Electron.app/Contents/MacOS/Electron\ .*)
        pids+=("${pid}")
        ;;
    esac
  done < <(ps -axo pid=,command=)

  if ((${#pids[@]} == 0)); then
    return 0
  fi

  kill "${pids[@]}" 2>/dev/null || true

  for _ in {1..20}; do
    local remaining=0
    for pid in "${pids[@]}"; do
      if kill -0 "${pid}" 2>/dev/null; then
        remaining=1
        break
      fi
    done
    ((remaining == 0)) && return 0
    sleep 0.1
  done

  kill -KILL "${pids[@]}" 2>/dev/null || true
}
