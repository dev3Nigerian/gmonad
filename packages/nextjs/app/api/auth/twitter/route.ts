// app/api/auth/twitter/route.ts
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import User from "../../../../models/User";
import dbConnect from "../../../../utils/mongodb";
import crypto from "crypto";
import OAuth from "oauth-1.0a";

// Twitter OAuth constants
const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;

export async function GET(request: NextRequest) {
  await dbConnect();

  // Get URL parameters
  const url = new URL(request.url);
  const oauth_token = url.searchParams.get("oauth_token");
  const oauth_verifier = url.searchParams.get("oauth_verifier");
  const address = url.searchParams.get("address");

  if (!oauth_token || !oauth_verifier || !address) {
    return NextResponse.json({ success: false, message: "Missing parameters" }, { status: 400 });
  }

  try {
    const oauth = new OAuth({
      consumer: {
        key: TWITTER_API_KEY,
        secret: TWITTER_API_SECRET,
      },
      signature_method: "HMAC-SHA1",
      hash_function(base_string, key) {
        return crypto.createHmac("sha1", key).update(base_string).digest("base64");
      },
    });

    // Exchange request token for access token
    const accessTokenUrl = "https://api.twitter.com/oauth/access_token";
    const requestData = {
      url: accessTokenUrl,
      method: "POST",
    };

    // Convert OAuth header object to a standard headers object for fetch
    const oauthHeader = oauth.toHeader(oauth.authorize(requestData));
    const headers = new Headers();

    // Add the Authorization header from the OAuth header
    if (oauthHeader.Authorization) {
      headers.append("Authorization", oauthHeader.Authorization);
    }

    const response = await fetch(`${accessTokenUrl}?oauth_token=${oauth_token}&oauth_verifier=${oauth_verifier}`, {
      method: "POST",
      headers: headers,
    });

    const responseText = await response.text();
    const accessTokenData = new URLSearchParams(responseText);
    const userId = accessTokenData.get("user_id");
    const screenName = accessTokenData.get("screen_name");

    if (!userId || !screenName) {
      return NextResponse.json({ success: false, message: "Failed to get Twitter user info" }, { status: 400 });
    }

    // Check if this Twitter account is already linked to another address
    const existingUser = await User.findOne({
      twitterId: userId,
      address: { $ne: address },
    });

    if (existingUser) {
      // Set an auth error cookie that will be read by the client
      const cookieStore = cookies();
      cookieStore.set("auth_error", "This Twitter account is already linked to another wallet address", {
        maxAge: 30, // 30 seconds
        path: "/",
      });

      return NextResponse.redirect(new URL("/", request.url));
    }

    // Update user in database
    await User.findOneAndUpdate(
      { address: address },
      {
        twitterId: userId,
        twitterUsername: screenName,
      },
      { new: true, upsert: true },
    );

    // Set a success cookie
    const cookieStore = cookies();
    cookieStore.set("auth_success", "Twitter account connected successfully", {
      maxAge: 30,
      path: "/",
    });

    // Redirect back to the homepage
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Twitter auth error:", error);

    // Set an error cookie
    const cookieStore = cookies();
    cookieStore.set("auth_error", "Failed to connect Twitter account", {
      maxAge: 30,
      path: "/",
    });

    return NextResponse.redirect(new URL("/", request.url));
  }
}
