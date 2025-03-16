// app/api/auth/discord/route.ts
import { NextRequest, NextResponse } from "next/server";
import User from "../../../../models/User";
import dbConnect from "../../../../utils/mongodb";

// Discord OAuth2 constants
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID!;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET!;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  await dbConnect();

  // Get URL parameters
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  //   console.log({ code, state });

  if (!code || !state) {
    return NextResponse.json({ success: false, message: "Missing code or address parameter" }, { status: 400 });
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
        code: code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to exchange code for token", error: tokenData },
        { status: 400 },
      );
    }

    // Get user info with the access token
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok) {
      return NextResponse.json(
        { success: false, message: "Failed to get user info", error: userData },
        { status: 400 },
      );
    }

    // Update user in database
    await User.findOneAndUpdate(
      { address: state },
      {
        discordId: userData.id,
        discordUsername: `${userData.username}#${userData.discriminator}`,
      },
      { new: true, upsert: true },
    );

    // return NextResponse.json({ success: true, data: user });
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Discord auth error:", error);
    return NextResponse.json({ success: false, message: "Server error", error }, { status: 500 });
  }
}
