import Keycloak from 'keycloak-js'

let _keycloak: Keycloak | null = null

export async function initKeycloak(): Promise<Keycloak> {
  // Fetch runtime config from the API so the Keycloak URL doesn't need
  // to be baked into the JS bundle at build time.
  const resp = await fetch('/api/config')
  if (!resp.ok) throw new Error('Failed to fetch app config')
  const config = await resp.json()

  _keycloak = new Keycloak({
    url: config.keycloakUrl,
    realm: config.realm,
    clientId: config.clientId,
  })

  await _keycloak.init({
    onLoad: 'login-required',
    pkceMethod: 'S256',
  })

  return _keycloak
}

export function getKeycloak(): Keycloak {
  if (!_keycloak) throw new Error('Keycloak not initialised')
  return _keycloak
}
