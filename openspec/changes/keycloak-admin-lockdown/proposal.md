# Lock down the Keycloak admin console and run Keycloak in prod mode

## Why
A security review (2026-11-27) found `https://auth.madpro.dk/admin/master/console/` answering 200 publicly, and Keycloak running `start-dev` on H2.

## What changes
- Apps tunnel (`~/Git/cloudflare-tunnel/k8s/apps-tunnel.yaml`): `auth.madpro.dk` + path `^/(admin|realms/master)(/|$)` → 404.
- `k8s/keycloak.yaml`: `start` instead of `start-dev`, `KC_DB=postgres` (DB `keycloak` in the shared Postgres), `KC_HOSTNAME=https://auth.madpro.dk`, `KC_HOSTNAME_ADMIN=http://localhost:8080`.
- `k8s/keycloak.yaml`: image `localhost:30500/keycloak:26.5.7-bank.N` (built from `keycloak/Dockerfile`, includes the `bank` login theme), `KC_CACHE=local`.
- `keycloak/themes/bank/login/template.ftl`: null-safe `locale`, `<#nested "">`.
- `k8s/keycloak.yaml`: Traefik Ingress for auth.madpro.dk removed (unused; exposed admin on the LAN).
- Data migrated with a live `kc.sh export` → `kc.sh import`.

## Requirements
- Publicly, `/admin/*` and `/realms/master/*` on auth.madpro.dk return 404.
- Realm `bank` login for client `bank-web` (PKCE, redirect `https://bank.madpro.dk/`) still works; issuer stays `https://auth.madpro.dk/realms/bank`.
- The bank login page uses the `bank` theme (no 500s).
- The admin console works via port-forward on `localhost:8080`.

Verified by `k8s/keycloak-smoke-test.sh`.
