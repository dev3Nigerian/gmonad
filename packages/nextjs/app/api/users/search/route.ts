// app/api/users/search/route.ts
import { NextRequest, NextResponse } from "next/server";
import User from "../../../../models/User";
import dbConnect from "../../../../utils/mongodb";

export async function GET(request: NextRequest) {
  await dbConnect();

  // Get search query from URL
  const url = new URL(request.url);
  const q = url.searchParams.get("q");

  if (!q) {
    return NextResponse.json({ success: false, message: "Search query is required" }, { status: 400 });
  }

  try {
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { discordUsername: { $regex: q, $options: "i" } },
        { twitterUsername: { $regex: q, $options: "i" } },
      ],
    }).limit(10);

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Search error:", error);
    return NextResponse.json({ success: false, message: "Server error", error }, { status: 500 });
  }
}
