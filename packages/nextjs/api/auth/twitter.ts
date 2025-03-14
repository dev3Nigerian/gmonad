import User from "../../models/User";
import dbConnect from "../../utils/mongodb";
import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import OAuth from "oauth-1.0a";

// Twitter OAuth constants
const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET!;
// const TWITTER_CALLBACK_URL = process.env.TWITTER_CALLBACK_URL!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { oauth_token, oauth_verifier, address } = req.query;

  if (!oauth_token || !oauth_verifier || !address) {
    return res.status(400).json({ success: false, message: "Missing parameters" });
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
      return res.status(400).json({ success: false, message: "Failed to get Twitter user info" });
    }

    // Update user in database
    const user = await User.findOneAndUpdate(
      { address: address as string },
      {
        twitterId: userId,
        twitterUsername: screenName,
      },
      { new: true, upsert: true },
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Twitter auth error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
}
