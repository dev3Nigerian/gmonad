// pages/api/leaderboard.ts
import { NextRequest, NextResponse } from "next/server";
import GMEvent from "../../../../models/GMEvent";
// New model for GM events
import User from "../../../../models/User";
import dbConnect from "../../../../utils/mongodb";

export async function GET(request: NextRequest) {
  await dbConnect();

  const { searchParams } = request.nextUrl;
  const timeframe = searchParams.get("timeframe") || "allTime";

  try {
    // Build query based on timeframe
    const now = Math.floor(Date.now() / 1000);
    const query: any = {};

    switch (timeframe) {
      case "daily":
        query.timestamp = { $gte: now - 24 * 60 * 60 }; // Last 24 hours
        break;
      case "weekly":
        query.timestamp = { $gte: now - 7 * 24 * 60 * 60 }; // Last 7 days
        break;
      case "allTime":
        // No filter for all time
        break;
      default:
        return NextResponse.json({ success: false, message: "Invalid timeframe" }, { status: 400 });
    }

    // Aggregate GM events
    const gmEvents = await GMEvent.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$user",
          count: { $sum: 1 },
          lastGM: { $max: "$blockNumber" },
          timestamps: { $push: "$timestamp" }, // For streak calculation
        },
      },
      { $sort: { count: -1 } },
      { $limit: 50 }, // Get more than 10 for flexibility
    ]);

    if (!gmEvents.length) {
      return NextResponse.json({ success: true, entries: [] });
    }

    // Calculate streaks (simplified: consecutive days)
    const entries = gmEvents.map(event => {
      const timestamps = event.timestamps.sort((a: number, b: number) => a - b);
      let streak = 1;
      for (let i = 1; i < timestamps.length; i++) {
        const prevDay = new Date(timestamps[i - 1] * 1000).setHours(0, 0, 0, 0);
        const currDay = new Date(timestamps[i] * 1000).setHours(0, 0, 0, 0);
        if ((currDay - prevDay) / (1000 * 60 * 60 * 24) === 1) {
          streak++;
        } else if ((currDay - prevDay) / (1000 * 60 * 60 * 24) > 1) {
          streak = 1;
        }
      }
      return {
        address: event._id,
        count: event.count,
        streak,
        lastGM: event.lastGM,
      };
    });

    // Fetch user data
    const addresses = entries.map(entry => entry.address);
    const users = await User.find({ address: { $in: addresses } });

    const enrichedEntries = entries.map(entry => {
      const user = users.find(u => u.address.toLowerCase() === entry.address.toLowerCase());
      return {
        ...entry,
        username: user?.username || null,
        twitterUsername: user?.twitterUsername || null,
        discordUsername: user?.discordUsername || null,
      };
    });

    return NextResponse.json({ success: true, entries: enrichedEntries });
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}
