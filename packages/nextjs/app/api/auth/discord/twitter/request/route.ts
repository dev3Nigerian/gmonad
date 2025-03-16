// app/api/auth/twitter/request/route.ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL!;

export async function GET(request: NextRequest) {
  // Get URL parameters
  const url = new URL(request.url);
  const address = url.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ success: false, message: "Missing address parameter" }, { status: 400 });
  }

  try {
    const oauth = new OAuth({
      consumer: {
        key: TWITTER_API_KEY,
        secret: TWITTER_API_SECRET,
      },
      signature_method: "HMAC-SHA1",
      hash_function(base_string: string, key: string) {
        return crypto.createHmac("sha1", key).update(base_string).digest("base64");
      },
    });

    const requestTokenUrl = "https://api.twitter.com/oauth/request_token";
    const callbackUrl = `${TWITTER_CALLBACK_URL}?address=${address}`;

    const requestData = {
      url: requestTokenUrl,
      method: "POST",
      data: { oauth_callback: callbackUrl },
    };

    const response = await fetch(requestTokenUrl, {
      method: "POST",
      headers: {
        ...oauth.toHeader(oauth.authorize(requestData)),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ oauth_callback: callbackUrl }).toString(),
    });

    const responseText = await response.text();
    const responseParams = new URLSearchParams(responseText);
    const oauth_token = responseParams.get("oauth_token");

    if (!oauth_token) {
      return NextResponse.json({ success: false, message: "Failed to get request token" }, { status: 500 });
    }

    const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`;

    // Return a redirect response
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Twitter request token error:", error);
    return NextResponse.json({ success: false, message: "Server error", error }, { status: 500 });
  }
}
