# Installation Raspberry Pi 5

Cible : **Raspberry Pi OS Desktop 64-bit, Debian 13 Trixie / labwc**, image stable
publiée le **6 octobre 2026** lors de la vérification du 30 octobre 2026. Compatible
avec le Pi 5 8 Go ; aucun réglage RAM particulier nécessaire. Ne pas choisir Lite
ou Legacy. Image officielle : https://www.raspberrypi.com/software/operating-systems/

## Parcours recommandé : flash puis une commande d'installation

1. Dans Raspberry Pi Imager : Raspberry Pi 5 → Raspberry Pi OS (64-bit), avec Desktop.
2. Préconfigurer nom de machine unique, compte kiosque (ex. `displayhub`), Wi-Fi/pays,
   fuseau Europe/Paris et SSH **par clé publique** pour garder un accès de secours.
3. Démarrer le Pi, attendre la fin de sa préparation, puis se connecter en SSH.
4. Copier la **clé publique** Ed25519 du serveur sur le Pi si la maintenance système
   distante doit être activée. Ne jamais copier la clé privée. Voir [SYSTEM_UPDATES.md](SYSTEM_UPDATES.md).
5. Exécuter :

```sh
sudo apt-get update
sudo apt-get install -y git
git clone https://github.com/arthur-mdn/DisplayHub.git
cd DisplayHub
# Recommandé : sélectionner le SHA d'une version validée qui contient cet installateur.
git checkout SHA_COMPLET_DE_LA_VERSION_VALIDEE
sudo bash pi-server/install.sh --user displayhub \
  --public-key /home/displayhub/system-update-public.pem --reboot
```

Sans maintenance système distante, omettre `--public-key`. Pour un autre domaine,
utiliser `--client-url https://client.exemple.fr`. Sans `--reboot`, le script laisse
le Pi allumé pour vérifier les journaux et redémarrer manuellement.

## Ce que fait l'installateur

- Vérifie Pi 5, architecture arm64, Raspberry Pi OS Trixie et bureau labwc.
- Installe les paquets nécessaires, Chromium et Node depuis les dépôts OS configurés.
- Installe l'agent sous `/opt/displayhub/pi-server`, appartenant à root, avec `npm ci`
  et sans scripts npm d'installation. Il s'exécute sous **displayhub-agent**, compte
  système non interactif distinct du kiosque, sans ajout au groupe sudo.
- Génère le jeton local une seule fois ; le conserve lors des réinstallations dans
  `/etc/displayhub/pi-server.env` (root:displayhub-agent, 0640).
- Installe et démarre le service agent ; vérifie sa réponse avant d'annoncer le succès.
- Configure l'ouverture automatique du bureau, désactive l'extinction automatique
  de l'écran via raspi-config et ajoute le kiosque dans l'autostart labwc.
- Lance Chromium avec un profil persistant dédié et le relance après fermeture/crash.
  Le navigateur conserve son sandbox. Le QR code d'association s'affiche au premier lancement.
- Installe la maintenance système signée si une clé publique est fournie.

Le script ne migre pas un ancien OS Bookworm/Wayfire/LXDE et ne flashe aucune carte.
Sur une nouvelle image, préférer le compte kiosque à un compte d'administration.
L'autologin implique qu'une personne ayant accès physiquement au Pi peut accéder à
sa session. Les droits sudo déjà accordés au compte kiosque par Imager/Raspberry Pi OS
ne sont pas supprimés automatiquement : les revoir avant une installation publique.

Relancer la même commande remplace les fichiers gérés et réinstalle les dépendances,
sans effacer le profil Chromium ni son association. Une installation ancienne qui
utilisait le profil Chromium par défaut demandera une nouvelle association au passage
au profil dédié. Une installation échouée s'arrête et n'annonce pas de succès.

Le code agent installé n'est plus modifiable par son compte système : son ancien
bouton `git pull` est désactivé. Pour mettre à jour **l'agent**, sélectionner une
nouvelle version validée dans le clone, puis relancer l'installateur pendant une
fenêtre de maintenance. Les mises à jour **OS** restent déclenchables séparément
avec le mécanisme signé. Ne pas relancer l'installateur pendant une opération APT.

## Sans git clone manuel

Copier sur le Pi le script `bootstrap.sh` issu d'une version validée, puis :

```sh
sudo bash bootstrap.sh --ref SHA_GIT_COMPLET_40_CARACTERES --user displayhub \
  --public-key /home/displayhub/system-update-public.pem --reboot
```

Il récupère lui-même le dépôt officiel, vérifie le SHA demandé et appelle
l'installateur. Il n'exécute pas automatiquement la dernière branche de développement.
Les changements doivent d'abord être commités et publiés pour que le Pi puisse les récupérer.

## Automatiser dès le flash

`FIRST_BOOT.example.sh` fournit la préparation sans clone manuel. Renseigner le SHA
complet validé et le nom du compte créé dans Imager. Installer ce script via le hook
premier démarrage réellement pris en charge par la version d'Imager/l'image choisie,
**après** création du compte et configuration réseau. Certaines versions d'Imager
proposent `--first-run-script` en CLI ; vérifier `rpi-imager --help` et la compatibilité
de l'image. Les images récentes peuvent utiliser rpi-preseed plutôt que firstrun.sh.
Ne pas simplement copier ce fichier sur la partition boot en supposant son exécution.

La clé publique peut être placée sur la partition FAT de démarrage sous le nom
`system-update-public.pem` ; elle apparaît alors dans `/boot/firmware/`. Ne jamais
placer de clé privée serveur sur la carte. Le script ne marque l'installation terminée
qu'après vérification de l'agent. Selon le hook choisi, un échec du premier démarrage
peut nécessiter de relancer le script par SSH.

Le parcours flash entièrement automatisé est fourni comme **modèle à valider avec
Imager et une carte pilote**, pas comme une image SD déjà construite et testée.
Le parcours Imager standard + SSH + install.sh est la voie recommandée initialement.

## Vérification après redémarrage

```sh
systemctl status pi-server.service
journalctl -u pi-server.service -n 50 --no-pager
curl --fail http://127.0.0.1:3002/
```

Vérifier le kiosque sur HDMI, son association, le retour après coupure réseau et
un nouveau redémarrage. Le script ne masque pas le pointeur avec des modules externes
et ne modifie pas l'image de fond système. Les installations APT/systemd/labwc réelles
doivent être validées sur un Pi 5 : les tests de développement ne remplacent pas cet essai.
