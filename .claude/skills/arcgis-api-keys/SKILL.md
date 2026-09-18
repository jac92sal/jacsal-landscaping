---
name: arcgis-api-keys
description: Create, rotate, inspect, and revoke ArcGIS Location Platform API key credentials programmatically (ArcGIS REST JS @esri/arcgis-rest-developer-credentials or the raw portal REST calls), set privileges, HTTP referrers, and expiration. Use when an app needs a long-lived ArcGIS API key, a temporary token from the dashboard has expired, a key must be rotated before expiry, or you need to know which privilege string a service requires.
---

# ArcGIS API key credentials (programmatic)

An **API key credential** is a portal item (type `Application`) registered as an app with a set of privileges and HTTP referrers. It holds up to two API keys (slot 1 and slot 2) so a key can be rotated with no downtime. Dashboard "temporary tokens" expire in hours; keys created this way live up to **one year**.

## Requirements
- ArcGIS Location Platform, ArcGIS Online, or Enterprise account with a **Creator/Developer user type** and the `portal:user:createItem` privilege. App (client_credentials) tokens cannot create keys; a **user** token is required.
- Accounts with multi-factor sign-in cannot use username/password `generateToken`; use OAuth user sign-in to obtain the user token instead.

## Node / REST JS (the documented path)
```bash
npm i @esri/arcgis-rest-developer-credentials @esri/arcgis-rest-request @esri/arcgis-rest-portal
```
```js
import "dotenv/config";                                   // ARCGIS_USERNAME / ARCGIS_PASSWORD, never committed
import { createApiKey, updateApiKey, getApiKey, invalidateApiKey } from "@esri/arcgis-rest-developer-credentials";
import { ArcGISIdentityManager } from "@esri/arcgis-rest-request";
import { getSelf, moveItem } from "@esri/arcgis-rest-portal";

const authentication = await ArcGISIdentityManager.signIn({ username: process.env.ARCGIS_USERNAME, password: process.env.ARCGIS_PASSWORD /*, portal: "https://host/webadaptor/sharing/rest" */ });
const org = await getSelf({ authentication });

const key = await createApiKey({
  title: `sync ${new Date().toISOString().slice(0, 10)}`,
  description: "Server key for sync.jacsalservices.com",
  tags: ["api key", "basemaps", "elevation"],
  privileges: ["premium:user:basemaps", "premium:user:elevation"],
  httpReferrers: ["https://sync.jacsalservices.com"],        // browsers send Referer; servers must set it explicitly
  generateToken1: true,
  apiToken1ExpirationDate: new Date(Date.now() + 365 * 86_400_000),   // max 1 year
  authentication,
});
console.log(key.accessToken1);                                   // the key — store it, it is shown once
console.log(`https://${org.urlKey}.maps.arcgis.com/home/item.html?id=${key.itemId}`);

// Rotate: mint slot 2, switch the app, then regenerate slot 1 later.
await updateApiKey({ itemId: key.itemId, generateToken2: true, apiToken2ExpirationDate: new Date(Date.now() + 365 * 86_400_000), authentication });
// Change privileges / referrers (arrays replace the previous values):
await updateApiKey({ itemId: key.itemId, privileges: [...], httpReferrers: [...], authentication });
// Revoke a slot immediately:
await invalidateApiKey({ itemId: key.itemId, apiKey: 1, authentication });
// Tidy: move the item into a credentials folder.
await moveItem({ itemId: key.itemId, folderId: "FOLDER_ID", authentication });
```

## Raw REST (what the library does; use from a Worker or curl)
Base `https://www.arcgis.com/sharing/rest`, all `POST` form-encoded with `f=json`. Bind the user token to a referer and send that exact `Referer` header on every call.

| Step | Call | Params | Returns |
|---|---|---|---|
| 1 | `/generateToken` | `username`, `password`, `client=referer`, `referer=https://app.example.com`, `expiration=20` (min) | `token` |
| 2 | `/community/self` | `token` | `user.username`, `urlKey`, `user.privileges` |
| 3 | `/content/users/{user}/addItem` | `token`, `type=Application`, `title`, `tags`, `description` | `id` (item) |
| 4 | `/oauth2/registerApp` | `token`, `itemId`, `appType=multiple`, `redirect_uris=["urn:ietf:wg:oauth:2.0:oob"]`, `httpReferrers=[...]`, `privileges=[...]` (JSON strings) | `client_id`, `client_secret` |
| 5 | `/content/users/{user}/items/{id}/update` | `token`, `apiToken1ExpirationDate=<ms epoch>`, `apiToken2ExpirationDate=-1` | `success` |
| 6 | `/oauth2/token` | `client_id`, `client_secret`, `apiToken=1`, `regenerateApiToken=true`, `grant_type=client_credentials` | `access_token` = the API key |
| 7 | `/content/users/{user}/items/{id}/registeredAppInfo` | `token` | `privileges`, `httpReferrers`, `apiToken1ExpirationDate`, `isApiKey1Active` |

Expiration must be set **after** registerApp (step 5), and the key is minted from the app's `client_id`/`client_secret` (step 6), not from the user token. Delete the item (`/content/users/{user}/items/{id}/delete`) to revoke everything.

## Privilege identifiers (Location services)
| Service | Privilege |
|---|---|
| Basemaps (tiles, static basemap tiles) | `premium:user:basemaps` |
| Elevation | `premium:user:elevation` |
| Static maps | `premium:user:staticMaps` |
| Geocoding | `premium:user:geocode:temporary` (no storage) / `premium:user:geocode:stored` |
| Places | `premium:user:places` |
| Routing | `premium:user:networkanalysis:routing` |
| Spatial analysis | `premium:user:spatialanalysis` |
| Access to a private item | `portal:app:access:item:{ITEM_ID}` |
`registerApp` rejects unknown privileges or ones the account lacks and names them in `error.details`. Full list: https://developers.arcgis.com/documentation/security-and-authentication/reference/privileges/

## Using the key
- Query string `token=` or header `Authorization: Bearer <key>` (see `arcgis-elevation`, `arcgis-static-maps`, `arcgis-feature-query`).
- Referrer-restricted keys answer `498 Token Invalid` unless the request carries a matching `Referer` header. Browsers do this automatically; servers/Workers must set it.
- Wrong or expired key: `498 Token Invalid`. Missing key on a paid service: `499 Token Required`. Wrong privilege: `403`/`498` with `The token does not have the required privileges`.

## Handling credentials safely
- Never commit `.env`; never paste passwords into chat, tickets, or shell history (`--value` flags, inline `AG_PASS=` exports).
- Prefer a one-shot form or script where the password is used for step 1 only, then discarded; store the resulting key in a secrets manager (Cloudflare Secrets Store, sealed D1 row), not in code.
- Rotate with slot 2 ~30 days before `apiToken1ExpirationDate`; the credential item's page shows both slots.

## Reference
- Tutorial: https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/tutorials/create-an-api-key-with-arcgis-rest-js/
- REST JS reference: https://developers.arcgis.com/arcgis-rest-js/api-reference/arcgis-rest-developer-credentials/
- Concepts: https://developers.arcgis.com/documentation/security-and-authentication/api-key-authentication/
