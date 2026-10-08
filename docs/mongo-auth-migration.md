# Migration MongoDB : authentification (prod existante)

`MONGO_INITDB_ROOT_*` ne s’applique **que** sur un volume vide. Sur une base DisplayHub déjà peuplée sans auth, il faut créer le user root **avant** d’activer `security.authorization`.

Important : le fichier `docker-compose.prod.mongo-bootstrap.yml` est **autonome**. Ne le fusionne pas avec `docker-compose.prod.yml` (sinon la conf auth reste active).

## Prérequis

- Accès SSH à la machine prod
- `.env` valide (`source .env` sans erreur de quote)
- Ne pas supprimer le volume `DisplayHub_mongodb_data`

## Étapes

### 1. Backup si possible

```bash
./scripts/backup-mongo.sh
```

Sinon snapshot disque / volume Docker.

### 2. Mongo sans auth (compose bootstrap seul)

```bash
docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.mongo-bootstrap.yml up -d
docker exec displayhub-mongodb mongosh --quiet --eval 'db.adminCommand("ping").ok'
```

La dernière commande doit renvoyer `1` **sans** `-u` / `-p`.

Vérifier la commande du conteneur :

```bash
docker inspect displayhub-mongodb --format '{{.Config.Cmd}}'
# attendu : [mongod --bind_ip_all]
```

### 3. Créer / aligner le user root

```bash
set -a && source .env && set +a
echo "user=$MONGO_ROOT_USER"
./scripts/bootstrap-existing-mongo-auth.sh
```

Le script crée le user ou réécrit son mot de passe pour coller à `.env`.

### 4. Prod avec auth

```bash
docker compose -f docker-compose.prod.mongo-bootstrap.yml down
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml ps
```

`displayhub-mongodb` doit être `healthy`.

### 5. Rollback

1. `docker compose -f docker-compose.prod.mongo-bootstrap.yml up -d`
2. Restaurer un dump si besoin
3. Refaire les étapes 3–4

## Rappels

- Ne pas supprimer le volume Mongo
- Local (`docker-compose.yml`) : `mongo/mongod.conf` sans auth
- Prod (`docker-compose.prod.yml`) : `mongo/mongod.prod.conf` avec `authorization: enabled`
