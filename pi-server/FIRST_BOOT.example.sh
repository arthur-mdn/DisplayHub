#!/bin/bash
# Template to embed using the first-boot hook supported by your image/Imager.
# Configure network, SSH key and the kiosk user in Imager beforehand.
set -euo pipefail
REF=REPLACE_WITH_REVIEWED_40_CHARACTER_COMMIT
KIOSK_USER=displayhub
[[ "$REF" =~ ^[a-f0-9]{40}$ ]] || { echo 'Configurer REF avant le flash' >&2; exit 1; }
# This script must run as root AFTER OS/user/network provisioning has completed.
[[ "$EUID" -eq 0 ]] || exit 1
[[ ! -f /var/lib/displayhub/installed ]] || exit 0
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
apt-get -o APT::Update::Error-Mode=any update
apt-get install -y --no-install-recommends git ca-certificates
SOURCE=/opt/displayhub/first-boot-source
install -d -o root -g root -m 0755 "$SOURCE"
if [[ ! -d "$SOURCE/.git" ]]; then git -C "$SOURCE" init; fi
git -C "$SOURCE" fetch --depth 1 https://github.com/arthur-mdn/DisplayHub.git "$REF"
[[ $(git -C "$SOURCE" rev-parse FETCH_HEAD) == "$REF" ]] || exit 1
git -C "$SOURCE" checkout --detach "$REF"
ARGS=(--user "$KIOSK_USER" --client-url https://client.displayhub.fr --reboot)
if [[ -f /boot/firmware/system-update-public.pem ]]; then
    ARGS+=(--public-key /boot/firmware/system-update-public.pem)
fi
exec bash "$SOURCE/pi-server/install.sh" "${ARGS[@]}"
