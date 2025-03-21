// pages/api/users/batch.ts
import { NextRequest, NextResponse } from "next/server";
import User from "../../../../models/User";
import dbConnect from "../../../../utils/mongodb";

export async function GET(request: NextRequest) {
  await dbConnect();

  const searchParams = request.nextUrl.searchParams;
  const addresses = searchParams.get("addresses");

  if (!addresses) {
    return NextResponse.json({ success: false, message: "Addresses parameter is required" }, { status: 400 });
  }

  try {
    const addressList = addresses.split(",");

    // Find all users with the provided addresses
    const users = await User.find({
      address: { $in: addressList },
    });

    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    console.error("Error fetching users batch:", error);
    return NextResponse.json({ success: false, message: "Server error", error }, { status: 500 });
  }
}
