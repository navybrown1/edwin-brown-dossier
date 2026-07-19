const TOKEN_ENDPOINT = "https://fleet-auth.prd.vn.cloud.tesla.com/oauth2/v3/token";
const DEFAULT_AUDIENCE = "https://fleet-api.prd.na.vn.cloud.tesla.com";
const APP_DOMAIN = "edwin-brown-dossier.vercel.app";

function json(payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export default {
  async fetch(request) {
    if (request.method !== "POST") {
      return json({
        ready: true,
        message: "Send a POST request to register the Tesla partner account.",
        domain: APP_DOMAIN
      });
    }

    const clientId = process.env.TESLA_CLIENT_ID;
    const clientSecret = process.env.TESLA_CLIENT_SECRET;
    const audience = process.env.TESLA_FLEET_AUDIENCE || DEFAULT_AUDIENCE;

    if (!clientId || !clientSecret) {
      return json({
        ok: false,
        stage: "configuration",
        error: "TESLA_CLIENT_ID and TESLA_CLIENT_SECRET must be configured."
      }, 503);
    }

    const tokenBody = new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
      audience,
      scope: "openid vehicle_device_data vehicle_location vehicle_cmds vehicle_charging_cmds"
    });

    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: tokenBody
    });

    const tokenText = await tokenResponse.text();
    let tokenData;
    try {
      tokenData = JSON.parse(tokenText);
    } catch {
      tokenData = { error_description: tokenText };
    }

    if (!tokenResponse.ok || !tokenData.access_token) {
      return json({
        ok: false,
        stage: "partner_token",
        status: tokenResponse.status,
        error: tokenData.error || "partner_token_failed",
        error_description: tokenData.error_description || "Tesla did not return a partner access token."
      }, 502);
    }

    const registerResponse = await fetch(`${audience}/api/1/partner_accounts`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ domain: APP_DOMAIN })
    });

    const registerText = await registerResponse.text();
    let registerData;
    try {
      registerData = registerText ? JSON.parse(registerText) : {};
    } catch {
      registerData = { response_text: registerText };
    }

    if (!registerResponse.ok) {
      return json({
        ok: false,
        stage: "partner_registration",
        status: registerResponse.status,
        response: registerData
      }, registerResponse.status);
    }

    return json({
      ok: true,
      stage: "partner_registration",
      status: registerResponse.status,
      domain: APP_DOMAIN,
      response: registerData
    });
  }
};
