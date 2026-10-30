# Mises à jour distantes de Raspberry Pi OS

La commande est désactivée tant que la maintenance n'est pas installée sur le Pi.
Elle est réservée aux comptes DisplayHub **superadmin**, même si un éditeur possède
la permission de contrôle. Le redémarrage reste une commande distincte.

## Fonctionnement

1. Le superadmin demande une préparation depuis Contrôle > Maintenance Raspberry Pi OS.
2. L'agent local émet un challenge aléatoire valable 90 secondes.
3. Après confirmation, le serveur revalide la session et le rôle, puis signe une
   autorisation Ed25519 valable au maximum 60 secondes.
4. Le navigateur relaie l'autorisation ; aucune clé privée n'est envoyée au Pi.
5. Le Pi vérifie la signature, le challenge local et son usage unique. Il ne peut
   déclencher qu'une unité systemd fixe, sans paramètres contrôlés à distance.
6. Le statut est consulté toutes les 10 secondes dans l'interface, tant que l'écran
   est connecté. Un service interrompu est signalé comme un échec.

Le service exécute `apt-get update`, puis `apt-get --with-new-pkgs upgrade` avec
interdiction de supprimer des paquets. Il conserve les fichiers de configuration
locaux et les dépôts existants. Il ne change pas les sources APT, ne demande pas de
migration majeure de l'OS et ne redémarre pas le Pi. Des mainteneurs de paquets
peuvent cependant redémarrer des services ou interrompre le réseau/l'affichage.
Un paquet nécessitant des suppressions peut rester en attente et demander une
maintenance manuelle. Un succès indique la réussite des commandes APT, pas une
garantie que tous les paquets bloqués ont été installés.

## Installation initiale

### 1. Créer la paire de clés sur une machine d'administration de confiance

En dehors du dépôt Git et des répertoires servis par HTTP :

```sh
umask 077
openssl genpkey -algorithm ED25519 -out system-update-private.pem
openssl pkey -in system-update-private.pem -pubout -out system-update-public.pem
```

Conserver la clé privée sur le serveur uniquement. Dans la configuration serveur
(`.env` en Docker Compose), renseigner le PEM complet dans :

```dotenv
PI_SYSTEM_UPDATE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----"
```

Ne jamais préfixer cette variable par `VITE_`. Protéger le `.env` et la clé privée
en lecture (`chmod 600`) et redémarrer le backend après configuration. Déployer
également les versions correspondantes du client, de l'admin et de l'agent Pi.

### 2. Installer la clé publique et le service sur chaque Pi

Transférer seulement `system-update-public.pem` par un canal d'administration
authentifié (par exemple SSH), puis exécuter sur le Pi :

```sh
cd ~/DisplayHub/pi-server
sudo bash ./install-system-update.sh /chemin/system-update-public.pem
sudo systemctl restart pi-server.service
```

Si le compte appelant n'est pas celui qui exécute pi-server :

```sh
sudo bash ./install-system-update.sh /chemin/system-update-public.pem utilisateur-agent
```

L'installation **ne lance aucune mise à jour système**. Elle installe des fichiers
appartenant à root :

- `/etc/displayhub/system-update-public.pem` : clé de confiance ;
- `/usr/local/lib/displayhub/system-update.sh` : commande APT fixe ;
- `/etc/systemd/system/displayhub-system-update.service` : service privilégié ;
- `/etc/sudoers.d/displayhub-system-update` : seul le démarrage exact de cette
  unité est ajouté aux droits sudo de l'agent ; aucun joker, shell ou `apt *`.

Le script et la clé ne sont pas chargés depuis le clone Git modifiable par l'agent.
Pour modifier ces fichiers ou changer la clé de confiance, refaire cette étape
locale privilégiée. Pour une installation initiale complète, `install.sh` accepte
aussi la variable `DISPLAYHUB_SYSTEM_UPDATE_PUBLIC_KEY` pointant vers la clé publique.

### 3. Valider sur un Pi pilote

- Vérifier que les fichiers ci-dessus sont bien root:root et non modifiables par
  l'utilisateur de l'agent ; vérifier les droits préexistants avec `sudo -l`.
  Cette fonction ne supprime pas les éventuels droits sudo illimités déjà accordés
  à un compte Raspberry Pi. Utiliser un compte d'agent dédié à droits limités pour
  une séparation complète des privilèges.
- Garder SSH ou un accès physique de secours ; choisir une fenêtre de maintenance.
- Depuis un compte superadmin, préparer puis confirmer l'opération et vérifier le
  passage de « en cours » à « terminée » ou « échec ».
- Vérifier qu'un compte éditeur est refusé et qu'un redémarrage n'est pas déclenché.
- Consulter localement les détails avec :

```sh
journalctl -u displayhub-system-update.service
cat /var/lib/displayhub-system-update/status.json
```

Un verrou empêche les mises à jour concurrentes. Le Pi et le script root imposent
au minimum 15 minutes entre deux lancements. Les erreurs APT restent dans le journal
local ; elles ne sont pas exposées comme une sortie de commande arbitraire à distance.
Le signal « redémarrage nécessaire » vient de `/var/run/reboot-required` : son absence
ne garantit pas qu'aucun composant ne bénéficierait d'un redémarrage.

## Limites de sécurité et d'exploitation

- La signature protège le déclenchement HTTP, y compris depuis localhost. Le compte
  de l'agent peut démarrer directement l'unité fixe autorisée par sudo ; il ne peut
  pas en choisir la commande ou les paramètres avec cette règle.
- La sécurité des paquets dépend aussi des dépôts et clés APT installés par root.
  Les dépôts non authentifiés ne sont pas autorisés par cette commande.
- Une mise à jour interrompue (coupure d'alimentation, disque plein, paquet défectueux)
  peut nécessiter une réparation locale. Aucun rollback automatique de l'OS n'est fourni.
- Maintenir l'horloge du Pi à l'heure ; une autorisation expirée est refusée.
- Prévoir une rotation de clé en cas de compromission du serveur, avec remplacement
  authentifié de la clé publique sur les Pi. Ne pas exposer le port local 3002 via
  un reverse proxy public.

## Tests sans toucher au système

À la racine du dépôt, sous Node 24 :

```sh
node --test server/tests/*.test.js pi-server/tests/*.test.js
```

Les appels privilégiés sont simulés : les tests ne lancent ni APT, ni sudo, ni reboot.
L'exécution réelle du service doit être validée sur Raspberry Pi OS avant un
déploiement du parc entier.
