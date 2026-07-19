const AUTHORIZATION_ENDPOINT = "https://auth.tesla.com/oauth2/v3/authorize";
const DEFAULT_REDIRECT_URI = "https://edwin-brown-dossier.vercel.app/api/tesla/callback";
const SCOPES = [
  "openid",
  "offline_access",
  "vehicle_device_data",
  "vehicle_location",
  "vehicle_cmds",
  "vehicle_charging_cmds"
];

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET", "Cache-Control": "no-store" }
      });
    }

    const clientId = process.env.TESLA_CLIENT_ID;
    const redirectUri = process.env.TESLA_REDIRECT_URI || DEFAULT_REDIRECT_URI;

    if (!clientId) {
      return new Response("TESLA_CLIENT_ID is not configured.", {
        status: 503,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" }
      });
    }

    const state = randomToken();
    const nonce = randomToken();
    const authorizationUrl = new URL(AUTHORIZATION_ENDPOINT);
    authorizationUrl.searchParams.set("response_type", "code");
    authorizationUrl.searchParams.set("client_id", clientId);
    authorizationUrl.searchParams.set("redirect_uri", redirectUri);
    authorizationUrl.searchParams.set("scope", SCOPES.join(" "));
    authorizationUrl.searchParams.set("state", state);
    authorizationUrl.searchParams.set("nonce", nonce);
    authorizationUrl.searchParams.set("locale", "en-US");
    authorizationUrl.searchParams.set("prompt_missing_scopes", "true");
    authorizationUrl.searchParams.set("require_requested_scopes", "true");
    authorizationUrl.searchParams.set("show_keypair_step", "true");

    return new Response(null, {
      status: 302,
      headers: {
        Location: authorizationUrl.toString(),
        "Cache-Control": "no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
        "Set-Cookie": `tesla_oauth_state=${encodeURIComponent(state)}; Path=/api/tesla; HttpOnly; Secure; SameSite=Lax; Max-Age=600`
      }
    });
  }
};
