# Keycloak with the BudgetWise login theme (realm bank uses loginTheme "bank").
# Bump N on every change (k3s caches by tag); on CSS changes also bump ?v= in template.ftl (Cloudflare caches /resources 30 days). Build on the Pi: docker build -t localhost:30500/keycloak:26.5.7-bank.N keycloak && docker push localhost:30500/keycloak:26.5.7-bank.N
FROM quay.io/keycloak/keycloak:26.5.7
COPY themes/bank /opt/keycloak/themes/bank
