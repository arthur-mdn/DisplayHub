#!/bin/bash
set -euo pipefail
[[ "$EUID" -eq 0 ]] || { echo 'À lancer avec sudo'; exit 1; }
PUBLIC_KEY=${1:-}
AGENT_USER=${2:-${SUDO_USER:-}}
[[ -f "$PUBLIC_KEY" && "$AGENT_USER" =~ ^[a-z_][a-z0-9_-]*$ && "$AGENT_USER" != root ]] || {
    echo 'Usage: sudo ./install-system-update.sh /chemin/cle-publique.pem [utilisateur-agent]'; exit 1;
}
id "$AGENT_USER" >/dev/null
[[ -x /usr/bin/systemctl && -x /usr/bin/apt-get && -x /usr/sbin/visudo ]] || exit 1
command -v flock >/dev/null
openssl pkey -pubin -in "$PUBLIC_KEY" -text -noout | grep -q ED25519 || {
    echo 'Clé publique Ed25519 requise'; exit 1;
}
SCRIPT_DIR=$(cd -- "$(dirname -- "$0")" && pwd)
install -d -o root -g root -m 0755 /etc/displayhub /usr/local/lib/displayhub /var/lib/displayhub-system-update
install -o root -g root -m 0644 "$PUBLIC_KEY" /etc/displayhub/system-update-public.pem
install -o root -g root -m 0755 "$SCRIPT_DIR/maintenance/system-update.sh" /usr/local/lib/displayhub/system-update.sh
install -o root -g root -m 0644 "$SCRIPT_DIR/maintenance/displayhub-system-update.service" /etc/systemd/system/displayhub-system-update.service
SUDOERS=$(mktemp)
trap 'rm -f "$SUDOERS"' EXIT
printf '%s ALL=(root) NOPASSWD: /usr/bin/systemctl start --no-block displayhub-system-update.service\n' "$AGENT_USER" > "$SUDOERS"
chmod 0440 "$SUDOERS"
/usr/sbin/visudo -cf "$SUDOERS"
install -o root -g root -m 0440 "$SUDOERS" /etc/sudoers.d/displayhub-system-update
/usr/bin/systemctl daemon-reload
echo 'Maintenance installée. Aucun paquet mis à jour et aucun redémarrage déclenché.'
