#!/usr/bin/env bash
# Public checks for auth.madpro.dk: admin surface is closed, bank login still works.
set -u
BASE="${BASE:-https://auth.madpro.dk}"
fail=0

expect() { # expect <status> <path>
  local got
  got=$(curl -s -m 15 -o /dev/null -w '%{http_code}' "$BASE$2")
  if [ "$got" = "$1" ]; then echo "ok   $1 $2"; else echo "FAIL $2: want $1, got $got"; fail=1; fi
}

expect 404 /admin/master/console/
expect 404 /admin/realms/bank/users
expect 404 /realms/master/.well-known/openid-configuration
expect 404 /realms/master/protocol/openid-connect/token
expect 200 /realms/bank/.well-known/openid-configuration
expect 200 "/realms/bank/protocol/openid-connect/auth?client_id=bank-web&redirect_uri=https%3A%2F%2Fbank.madpro.dk%2F&response_type=code&scope=openid&code_challenge_method=S256&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM"

login=$(curl -s -m 15 "$BASE/realms/bank/protocol/openid-connect/auth?client_id=bank-web&redirect_uri=https%3A%2F%2Fbank.madpro.dk%2F&response_type=code&scope=openid&code_challenge_method=S256&code_challenge=E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM")
case "$login" in */login/bank/css/login.css*) echo "ok   bank login theme";; *) echo "FAIL bank login theme missing"; fail=1;; esac
css=$(printf '%s' "$login" | grep -oE '/resources/[^"]*/login/bank/css/login.css[^"]*' | head -1)
if curl -s -m 15 "$BASE$css" | grep -q 'prefers-color-scheme: dark'; then echo "ok   login dark mode"; else echo "FAIL login dark mode missing"; fail=1; fi

issuer=$(curl -s -m 15 "$BASE/realms/bank/.well-known/openid-configuration" | python3 -c 'import sys,json;print(json.load(sys.stdin)["issuer"])' 2>/dev/null)
if [ "$issuer" = "https://auth.madpro.dk/realms/bank" ]; then echo "ok   issuer"; else echo "FAIL issuer: $issuer"; fail=1; fi

# Internal admin: console via port-forward on the Pi must point at localhost:8080, not the public hostname.
admin=$(ssh "${PI:-192.168.0.250}" '(kubectl -n bank-app port-forward svc/keycloak 18080:8080 >/dev/null 2>&1 &); sleep 3
  curl -s -m 15 http://localhost:18080/admin/master/console/ | grep -oE "\"adminBaseUrl\": *\"[^\"]*\""; pkill -f "port-forward svc/keycloak 18080"')
case "$admin" in *'"http://localhost:8080"') echo "ok   internal admin console";; *) echo "FAIL internal admin console: $admin"; fail=1;; esac

# LAN: Traefik on the Pi must not route auth.madpro.dk (Keycloak is reached only via the tunnel).
for scheme in http https; do
  got=$(curl -sk -m 15 -o /dev/null -w '%{http_code}' -H 'Host: auth.madpro.dk' "$scheme://${PI:-192.168.0.250}/admin/master/console/")
  if [ "$got" = "404" ]; then echo "ok   LAN $scheme admin 404"; else echo "FAIL LAN $scheme admin: want 404, got $got"; fail=1; fi
done

exit $fail
