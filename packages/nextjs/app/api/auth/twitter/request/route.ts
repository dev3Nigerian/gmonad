import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL!;

if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_CALLBACK_URL) {
  console.error("Missing Twitter API credentials");
  throw new Error("Server configuration error");
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const address = url.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ success: false, message: "Missing address" }, { status: 400 });
  }

  try {
    const oauth = new OAuth({
      consumer: { key: TWITTER_API_KEY, secret: TWITTER_API_SECRET },
      signature_method: "HMAC-SHA1",
      hash_function(base_string: string, key: string) {
        return crypto.createHmac("sha1", key).update(base_string).digest("base64");
      },
    });

    const callbackUrl = `${TWITTER_CALLBACK_URL}?address=${address}`;
    const requestData = {
      url: "https://api.twitter.com/oauth/request_token",
      method: "POST",
      data: { oauth_callback: callbackUrl },
    };

    const authHeader = oauth.toHeader(oauth.authorize(requestData));

    const response = await fetch(requestData.url, {
      method: "POST",
      headers: {
        ...authHeader,
        Accept: "*/*",
      },
    });

    const responseText = await response.text();

    if (!response.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseText);
      } catch {
        errorData = responseText;
      }
      return NextResponse.json(
        {
          success: false,
          message: "Twitter API error",
          error: errorData,
        },
        { status: response.status },
      );
    }

    const responseParams = new URLSearchParams(responseText);
    const oauth_token = responseParams.get("oauth_token");

    if (!oauth_token) {
      return NextResponse.json(
        {
          success: false,
          message: "Failed to get request token",
        },
        { status: 500 },
      );
    }

    const authUrl = `https://api.twitter.com/oauth/authenticate?oauth_token=${oauth_token}`;
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Twitter auth error:", error);
    return NextResponse.json(
      {
        success: false,
        message: "Server error",
        error: String(error),
      },
      { status: 500 },
    );
  }
}
