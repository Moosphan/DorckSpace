#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source "${ROOT_DIR}/scripts/dev-process-utils.sh"
LABEL="com.dorck.hulkdash.dev"
PLIST="${ROOT_DIR}/.dev-logs/${LABEL}.plist"
LOG_DIR="${ROOT_DIR}/.dev-logs"
NODE_BIN="$(command -v node)"

mkdir -p "${LOG_DIR}"

if [[ "${1:-}" == "stop" ]]; then
  launchctl bootout "gui/$(id -u)" "${PLIST}" 2>/dev/null || true
  stop_project_electron_processes "${ROOT_DIR}"
  rm -f "${PLIST}"
  echo "Stopped launchd dev app"
  exit 0
fi

cat >"${PLIST}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>${LABEL}</string>
  <key>WorkingDirectory</key>
  <string>${ROOT_DIR}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${NODE_BIN}</string>
    <string>${ROOT_DIR}/node_modules/.pnpm/electron-vite@2.3.0_vite@6.4.2_@types+node@22.19.19_jiti@1.21.7_tsx@4.22.4_/node_modules/electron-vite/bin/electron-vite.js</string>
    <string>dev</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>TRENDING_ALLOW_FIXTURES</key>
    <string>1</string>
    <key>PATH</key>
    <string>${PATH}</string>
  </dict>
  <key>StandardOutPath</key>
  <string>${LOG_DIR}/launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${LOG_DIR}/launchd.err.log</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <dict>
    <key>SuccessfulExit</key>
    <false/>
  </dict>
</dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "${PLIST}" 2>/dev/null || true
stop_project_electron_processes "${ROOT_DIR}"
launchctl bootstrap "gui/$(id -u)" "${PLIST}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

echo "Started launchd dev app: ${LABEL}"
echo "Plist: ${PLIST}"
echo "Logs: ${LOG_DIR}/launchd.out.log / ${LOG_DIR}/launchd.err.log"
