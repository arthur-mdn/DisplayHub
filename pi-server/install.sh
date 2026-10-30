#!/bin/bash
# Raspberry Pi OS Desktop 64-bit / Trixie / labwc.
set -euo pipefail
export PATH=/usr/sbin:/usr/bin:/sbin:/bin
export DEBIAN_FRONTEND=noninteractive
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
KIOSK_USER=${SUDO_USER:-}
CLIENT_URL=https://client.displayhub.fr
PUBLIC_KEY=
REBOOT=false
while (( $# )); do
    case "$1" in
        --user) KIOSK_USER=${2:?}; shift 2 ;;
        --client-url) CLIENT_URL=${2:?}; shift 2 ;;
        --public-key) PUBLIC_KEY=${2:?}; shift 2 ;;
        --reboot) REBOOT=true; shift ;;
        --help) echo 'sudo bash install.sh --user utilisateur [--client-url https://client.domaine.fr] [--public-key fichier.pem] [--reboot]'; exit 0 ;;
        *) echo "Option inconnue : $1" >&2; exit 2 ;;
    esac
done
[[ "$EUID" -eq 0 ]] || { echo 'Utiliser sudo' >&2; exit 1; }
[[ "$KIOSK_USER" =~ ^[a-z_][a-z0-9_-]*$ && "$KIOSK_USER" != root && "$KIOSK_USER" != displayhub-agent ]] || { echo 'Compte kiosque non-root requis (--user)' >&2; exit 1; }
id "$KIOSK_USER" >/dev/null
[[ "$CLIENT_URL" =~ ^https://[a-zA-Z0-9.-]+(:[0-9]+)?$ ]] || { echo 'Une origine HTTPS sans chemin est requise' >&2; exit 1; }
[[ $(dpkg --print-architecture) == arm64 ]] || { echo 'Raspberry Pi OS 64 bits requis' >&2; exit 1; }
# os-release is an OS-owned configuration, never a repository/user env file.
. /etc/os-release
[[ "${VERSION_CODENAME:-}" == trixie && -f /etc/rpi-issue ]] || { echo 'Raspberry Pi OS Trixie requis (image Desktop)' >&2; exit 1; }
grep -aq 'Raspberry Pi 5' /proc/device-tree/model || { echo 'Raspberry Pi 5 requis' >&2; exit 1; }
command -v labwc >/dev/null || { echo 'Installer l’image Desktop, pas Lite' >&2; exit 1; }
[[ -z "$PUBLIC_KEY" ]] || openssl pkey -pubin -in "$PUBLIC_KEY" -text -noout | grep -q ED25519
KIOSK_HOME=$(getent passwd "$KIOSK_USER" | cut -d: -f6)
[[ -d "$KIOSK_HOME" ]] || exit 1
AGENT_USER=displayhub-agent
APP_DIR=/opt/displayhub/pi-server
apt-get -o APT::Update::Error-Mode=any update
apt-get install -y --no-install-recommends chromium nodejs npm ddcutil curl openssl ca-certificates sudo
/usr/bin/node -e 'if(Number(process.versions.node.split(".")[0]) < 20) process.exit(1)'
id "$AGENT_USER" >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/displayhub-agent --shell /usr/sbin/nologin "$AGENT_USER"
# No application code is executed as root by npm lifecycle scripts.
systemctl stop pi-server.service 2>/dev/null || true
install -d -o root -g root -m 0755 "$APP_DIR" "$APP_DIR/others" /etc/displayhub /usr/local/lib/displayhub
install -o root -g root -m 0644 "$SCRIPT_DIR/package.json" "$SCRIPT_DIR/package-lock.json" "$SCRIPT_DIR/pi-server.js" "$APP_DIR/"
install -o root -g root -m 0644 "$SCRIPT_DIR/others/"*.js "$APP_DIR/others/"
(cd "$APP_DIR" && npm ci --omit=dev --ignore-scripts)
ENV_FILE=/etc/displayhub/pi-server.env
TOKEN=
if [[ -f "$ENV_FILE" ]]; then TOKEN=$(sed -n 's/^PI_API_TOKEN=\([a-f0-9]\{64\}\)$/\1/p' "$ENV_FILE"); fi
[[ "$TOKEN" =~ ^[a-f0-9]{64}$ ]] || TOKEN=$(openssl rand -hex 32)
TEMP_ENV=$(mktemp)
trap 'rm -f "$TEMP_ENV"' EXIT
printf 'CLIENT_URL=%s\nPORT=3002\nPI_API_TOKEN=%s\nAGENT_UPDATES_ENABLED=false\n' "$CLIENT_URL" "$TOKEN" > "$TEMP_ENV"
install -o root -g "$AGENT_USER" -m 0640 "$TEMP_ENV" "$ENV_FILE"
cat > /etc/systemd/system/pi-server.service <<EOF
[Unit]
Description=DisplayHub local Pi agent
After=network.target
[Service]
User=$AGENT_USER
WorkingDirectory=$APP_DIR
EnvironmentFile=$ENV_FILE
Environment=NODE_ENV=production
Environment=PATH=/usr/sbin:/usr/bin:/sbin:/bin
ExecStart=/usr/bin/node $APP_DIR/pi-server.js
Restart=on-failure
RestartSec=5
PrivateTmp=true
ProtectHome=true
ProtectSystem=full
[Install]
WantedBy=multi-user.target
EOF
# Fixed power commands only. Keep sudo available for the separately enrolled update unit.
POWER_RULE=$(mktemp)
printf '%s ALL=(root) NOPASSWD: /usr/sbin/shutdown now, /usr/sbin/reboot\n' "$AGENT_USER" > "$POWER_RULE"
chmod 0440 "$POWER_RULE"
visudo -cf "$POWER_RULE"
install -o root -g root -m 0440 "$POWER_RULE" /etc/sudoers.d/displayhub-power
rm -f "$POWER_RULE"
# Permit DDC access if the kernel exposes i2c devices; unsupported monitors stay optional.
if getent group i2c >/dev/null; then usermod -aG i2c "$AGENT_USER"; fi
cat > /usr/local/lib/displayhub/kiosk.sh <<EOF
#!/bin/bash
set -u
exec 9>"\${XDG_RUNTIME_DIR:?}/displayhub-kiosk.lock"
flock -n 9 || exit 0
# Dedicated persistent profile: preserve pairing and IndexedDB across restarts.
while true; do
    /usr/bin/chromium --ozone-platform=wayland --kiosk --noerrdialogs --no-first-run \\
        --disable-session-crashed-bubble --autoplay-policy=no-user-gesture-required \\
        --user-data-dir="\$HOME/.local/share/displayhub/chromium" '$CLIENT_URL'
    sleep 5
done
EOF
chmod 0755 /usr/local/lib/displayhub/kiosk.sh
# Append our block once; preserve desktop defaults and existing local customisation.
/usr/sbin/runuser -u "$KIOSK_USER" -- /bin/bash -s -- "$KIOSK_HOME" <<'KIOSK_CONFIG'
set -euo pipefail
LABWC_DIR="$1/.config/labwc"
mkdir -p "$LABWC_DIR"
AUTOSTART="$LABWC_DIR/autostart"
if [[ ! -e "$AUTOSTART" ]]; then
    if [[ -f /etc/xdg/labwc/autostart ]]; then cp /etc/xdg/labwc/autostart "$AUTOSTART"; else printf '#!/bin/sh\n' > "$AUTOSTART"; fi
fi
if ! grep -q '^# BEGIN DISPLAYHUB$' "$AUTOSTART"; then
    printf '\n# BEGIN DISPLAYHUB\n/usr/local/lib/displayhub/kiosk.sh &\n# END DISPLAYHUB\n' >> "$AUTOSTART"
fi
chmod 0755 "$AUTOSTART"
KIOSK_CONFIG
# Desktop autologin is intentionally a physical-access kiosk setting.
raspi-config nonint do_boot_behaviour B4
install -d -m 0755 /etc/lightdm/lightdm.conf.d
printf '[Seat:*]\nautologin-user=%s\nautologin-user-timeout=0\n' "$KIOSK_USER" > /etc/lightdm/lightdm.conf.d/90-displayhub.conf
raspi-config nonint do_blanking 1
if [[ -n "$PUBLIC_KEY" ]]; then bash "$SCRIPT_DIR/install-system-update.sh" "$PUBLIC_KEY" "$AGENT_USER"; fi
systemctl daemon-reload
systemctl enable --now pi-server.service
READY=false
for attempt in {1..20}; do
    if systemctl is-active --quiet pi-server.service && curl --fail --silent --max-time 5 http://127.0.0.1:3002/health >/dev/null; then READY=true; break; fi
    sleep 1
done
[[ "$READY" == true ]] || { echo 'Agent indisponible : journalctl -u pi-server.service' >&2; exit 1; }
install -d -m 0755 /var/lib/displayhub
printf 'Installed %s\n' "$(date -u +%FT%TZ)" > /var/lib/displayhub/installed
printf 'Installation terminée. Redémarrer pour ouvrir le kiosque. Journaux : journalctl -u pi-server.service\n'
[[ "$REBOOT" != true ]] || systemctl reboot
