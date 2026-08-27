#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/dev-process-utils.sh"
LOG_DIR="${ROOT_DIR}/.dev-logs"
PID_FILE="${LOG_DIR}/app.pid"
WRAPPER_PID_FILE="${LOG_DIR}/wrapper.pid"
LOG_FILE="${LOG_DIR}/app.log"
STOP_FILE="${LOG_DIR}/stop"

mkdir -p "${LOG_DIR}"

stop_pid_file() {
  local file="$1"
  if [[ -f "${file}" ]]; then
    local pid
    pid="$(cat "${file}" || true)"
    if [[ -n "${pid}" ]] && kill -0 "${pid}" 2>/dev/null; then
      kill "${pid}" 2>/dev/null || true
    fi
    rm -f "${file}"
  fi
}

if [[ "${1:-}" == "--stop" ]]; then
  touch "${STOP_FILE}"
  stop_pid_file "${PID_FILE}"
  stop_pid_file "${WRAPPER_PID_FILE}"
  stop_project_electron_processes "${ROOT_DIR}"
  rm -f "${STOP_FILE}"
  echo "Stopped detached dev app"
  exit 0
fi

if [[ "${1:-}" == "--run" ]]; then
  cd "${ROOT_DIR}"
  rm -f "${STOP_FILE}"
  export TRENDING_ALLOW_FIXTURES="${TRENDING_ALLOW_FIXTURES:-1}"

  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] detached wrapper started pid=$$" >>"${LOG_FILE}"

  while true; do
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] starting electron-vite dev" >>"${LOG_FILE}"
    node_modules/.bin/electron-vite dev >>"${LOG_FILE}" 2>&1 &
    child_pid="$!"
    echo "${child_pid}" >"${PID_FILE}"
    set +e
    wait "${child_pid}"
    status="$?"
    set -e
    rm -f "${PID_FILE}"

    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] electron-vite exited status=${status}" >>"${LOG_FILE}"
    if [[ -f "${STOP_FILE}" ]]; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] stop requested; wrapper exiting" >>"${LOG_FILE}"
      rm -f "${STOP_FILE}" "${WRAPPER_PID_FILE}"
      exit 0
    fi

    if [[ "${status}" == "0" ]]; then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] clean exit; wrapper exiting" >>"${LOG_FILE}"
      rm -f "${WRAPPER_PID_FILE}"
      exit 0
    fi

    if (( status >= 128 )); then
      echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] possible signal=$((status - 128))" >>"${LOG_FILE}"
    fi
    echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] restarting in 2s" >>"${LOG_FILE}"
    sleep 2
  done
fi

touch "${LOG_FILE}"
touch "${STOP_FILE}"
stop_pid_file "${PID_FILE}"
stop_pid_file "${WRAPPER_PID_FILE}"
rm -f "${STOP_FILE}"

nohup bash "$0" --run >>"${LOG_FILE}" 2>&1 </dev/null &
wrapper_pid="$!"
echo "${wrapper_pid}" >"${WRAPPER_PID_FILE}"

echo "Started detached dev wrapper: pid=${wrapper_pid}"
echo "Log: ${LOG_FILE}"
