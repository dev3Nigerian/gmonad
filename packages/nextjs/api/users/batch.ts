// pages/api/users/batch.ts
import User from "../../models/User";
import dbConnect from "../../utils/mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  await dbConnect();

  const { addresses } = req.query;

  if (!addresses) {
    return res.status(400).json({ success: false, message: "Addresses parameter is required" });
  }

  try {
    const addressList = Array.isArray(addresses) ? addresses : addresses.split(",");

    // Find all users with the provided addresses
    const users = await User.find({
      address: { $in: addressList },
    });

    res.status(200).json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users batch:", error);
    res.status(500).json({ success: false, message: "Server error", error });
  }
}
