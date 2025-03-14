// pages/api/users/search.ts
import User from "../../models/User";
import dbConnect from "../../utils/mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();
  const { q } = req.query;

  if (!q) {
    return res.status(400).json({ success: false, message: "Search query is required" });
  }

  try {
    const searchQuery = q as string;
    const users = await User.find({
      $or: [
        { username: { $regex: searchQuery, $options: "i" } },
        { discordUsername: { $regex: searchQuery, $options: "i" } },
        { twitterUsername: { $regex: searchQuery, $options: "i" } },
      ],
    }).limit(10);

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
}
