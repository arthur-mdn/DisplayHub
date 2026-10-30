#!/bin/bash
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
export NEEDRESTART_MODE=l
export LC_ALL=C
unset APT_CONFIG BASH_ENV ENV CDPATH

# This file is copied to a root-owned location by install-system-update.sh.
# No argument, user configuration, application code or remote input is executed.
[[ "$EUID" -eq 0 && "$#" -eq 0 ]] || exit 64
STATE_DIR=/var/lib/displayhub-system-update
install -d -o root -g root -m 0755 "$STATE_DIR"
exec 9>"$STATE_DIR/update.lock"
flock -n 9 || exit 75
NOW=$(date +%s)
if [[ -f "$STATE_DIR/last-start" ]]; then
    read -r PREVIOUS < "$STATE_DIR/last-start"
    if [[ "$PREVIOUS" =~ ^[0-9]+$ ]] && (( NOW - PREVIOUS < 900 )); then exit 75; fi
fi
printf '%s\n' "$NOW" > "$STATE_DIR/last-start"
STARTED_AT=$((NOW * 1000))
PHASE=refreshing

write_status() {
    local state="$1" finished="$2" reboot=false temporary
    [[ ! -e /var/run/reboot-required ]] || reboot=true
    temporary=$(mktemp "$STATE_DIR/status.XXXXXX")
    printf '{"state":"%s","phase":"%s","startedAt":%s,"finishedAt":%s,"rebootRequired":%s}\n' \
        "$state" "$PHASE" "$STARTED_AT" "$finished" "$reboot" > "$temporary"
    chmod 0644 "$temporary"
    mv -f "$temporary" "$STATE_DIR/status.json"
}

finish() {
    local result=$?
    trap - EXIT
    PHASE=finished
    if (( result == 0 )); then write_status succeeded "$(( $(date +%s) * 1000 ))";
    else write_status failed "$(( $(date +%s) * 1000 ))"; fi
    exit "$result"
}
trap finish EXIT
write_status running null
/usr/bin/apt-get -o DPkg::Lock::Timeout=120 -o APT::Update::Error-Mode=any \
    -o Acquire::AllowInsecureRepositories=false -o Acquire::AllowDowngradeToInsecureRepositories=false update
PHASE=installing
write_status running null
# Keep the current OS release and refuse removals, downgrades, unauthenticated
# packages and changes to held packages. Preserve local configuration files.
/usr/bin/apt-get -y --no-remove --with-new-pkgs \
    -o APT::Get::AllowUnauthenticated=false \
    -o DPkg::Lock::Timeout=120 -o Dpkg::Options::=--force-confdef \
    -o Dpkg::Options::=--force-confold upgrade
