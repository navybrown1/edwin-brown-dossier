const TOKEN_ENDPOINT = "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token";
const DEFAULT_AUDIENCE = "https://fleet-api.prd.na.vn.cloud.tesla.com";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function page(title, body, status = 200) {
  return new Response(
    `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: dark; }
    body { margin: 0; font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0b0d10; color: #f5f7fa; }
    main { max-width: 760px; margin: 10vh auto; padding: 32px; }
    section { background: #151920; border: 1px solid #2c333d; border-radius: 18px; padding: 28px; box-shadow: 0 18px 60px rgba(0,0,0,.35); }
    h1 { margin-top: 0; font-size: clamp(1.8rem, 4vw, 2.7rem); }
    p { line-height: 1.6; color: #c9d1d9; }
    pre { overflow-wrap: anywhere; white-space: pre-wrap; background: #080a0d; border: 1px solid #30363d; border-radius: 12px; padding: 16px; color: #d2e8ff; }
    .ok { color: #7ee787; }
    .warn { color: #f2cc60; }
    .error { color: #ff7b72; }
  </style>
</head>
<body><main><section>${body}</section></main></body>
</html>`,
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'"
      }
    }
  );
}

export default {
  async fetch(request) {
    if (request.method !== "GET") {
      return new Response("Method not allowed", {
        status: 405,
        headers: { Allow: "GET", "Cache-Control": "no-store" }
      });
    }

    const url = new URL(request.url);
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (error) {
      return page(
        "Tesla authorization failed",
        `<h1 class="error">Tesla authorization failed</h1>
         <p>${escapeHtml(errorDescription || error)}</p>`,
        400
      );
    }

    if (!code) {
      return page(
        "Hermes Tesla OAuth callback",
        `<h1>Hermes Tesla OAuth callback</h1>
         <p class="ok">This callback endpoint is online and ready.</p>
         <p>Tesla will return here after the account authorization step.</p>`
      );
    }

    const expectedState = process.env.TESLA_OAUTH_STATE;
    if (expectedState && state !== expectedState) {
      return page(
        "OAuth state mismatch",
        `<h1 class="error">OAuth state validation failed</h1>
         <p>The authorization response could not be verified. Start the Tesla authorization flow again.</p>`,
        400
      );
    }

    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return page(
        "Tesla callback received",
        `<h1 class="warn">Tesla returned an authorization code</h1>
         <p>The callback works, but the Vercel project does not yet have <code>TESLA_CLIENT_ID</code> and <code>TESLA_CLIENT_SECRET</code> configured, so the code was not exchanged.</p>
         <p>Configure those encrypted environment variables, then restart the Tesla authorization flow. OAuth codes are short-lived and single-use.</p>`,
        503
      );
    }

    const redirectUri = process.env.TESLA_REDIRECT_URI || `${url.origin}${url.pathname}`;
    const audience = process.env.TESLA_FLEET_AUDIENCE || DEFAULT_AUDIENCE;
    const body = new URLSearchParams({
      grant_type: "authorization_code",
      client_id: clientId,
      client_secret: clientSecret,
      code,
      audience,
      redirect_uri: redirectUri
    });

    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body
    });

    const tokenText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      tokenData = { error: "invalid_token_response", error_description: tokenText };
    }

    if (!tokenResponse.ok) {
      return page(
        "Tesla token exchange failed",
        `<h1 class="error">Tesla token exchange failed</h1>
         <p>${escapeHtml(tokenData.error_description || tokenData.error || `HTTP ${tokenResponse.status}`)}</p>
         <p>Restart the Tesla authorization flow after correcting the application settings.</p>`,
        502
      );
    }

    return page(
      "Tesla connected",
      `<h1 class="ok">Tesla authorization completed</h1>
       <p>The access and refresh tokens were created successfully. Copy this response into the secure Hermes setup process, then close this page. Do not share it or commit it to GitHub.</p>
       <pre>${escapeHtml(JSON.stringify(tokenData, null, 2))}</pre>`
    );
  }
};
