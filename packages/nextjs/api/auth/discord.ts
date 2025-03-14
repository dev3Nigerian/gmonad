// pages/api/auth/discord.ts
import User from "../../models/User";
import dbConnect from "../../utils/mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

// Discord OAuth2 constants
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { code, address } = req.query;

  if (!code || !address) {
    return res.status(400).json({ success: false, message: "Missing code or address parameter" });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code: code as string,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return res.status(400).json({ success: false, message: "Failed to exchange code for token", error: tokenData });
    }

    // Get user info with the access token
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok) {
      return res.status(400).json({ success: false, message: "Failed to get user info", error: userData });
    }

    // Update user in database
    const user = await User.findOneAndUpdate(
      { address: address as string },
      {
        discordId: userData.id,
        discordUsername: `${userData.username}#${userData.discriminator}`,
      },
      { new: true, upsert: true },
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("Discord auth error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
}
