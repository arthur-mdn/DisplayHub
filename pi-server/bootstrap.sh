#!/bin/bash
# Optional: run a reviewed local copy once; fetch one explicitly pinned revision.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
REF=
ARGS=()
while (( $# )); do
    case "$1" in
        --ref) REF=${2:?}; shift 2 ;;
        --user|--client-url|--public-key) ARGS+=("$1" "${2:?}"); shift 2 ;;
        --reboot) ARGS+=("$1"); shift ;;
        --help) echo 'sudo bash bootstrap.sh --ref SHA_COMPLET --user utilisateur [--public-key fichier.pem] [--reboot]'; exit 0 ;;
        *) echo "Option inconnue : $1" >&2; exit 2 ;;
    esac
done
[[ "$EUID" -eq 0 && "$REF" =~ ^[a-f0-9]{40}$ ]] || { echo 'Root et SHA Git complet requis (--ref)' >&2; exit 1; }
apt-get -o APT::Update::Error-Mode=any update
apt-get install -y --no-install-recommends git ca-certificates
SOURCE=/opt/displayhub/source
install -d -o root -g root -m 0755 "$SOURCE"
if [[ ! -d "$SOURCE/.git" ]]; then
    git -C "$SOURCE" init
    git -C "$SOURCE" remote add origin https://github.com/arthur-mdn/DisplayHub.git
fi
[[ $(git -C "$SOURCE" remote get-url origin) == https://github.com/arthur-mdn/DisplayHub.git ]] || exit 1
git -C "$SOURCE" diff --quiet
git -C "$SOURCE" diff --cached --quiet
git -C "$SOURCE" fetch --depth 1 origin "$REF"
[[ $(git -C "$SOURCE" rev-parse FETCH_HEAD) == "$REF" ]] || exit 1
git -C "$SOURCE" checkout --detach "$REF"
exec bash "$SOURCE/pi-server/install.sh" "${ARGS[@]}"
