// app/api/users/[address]/route.ts
import { NextRequest, NextResponse } from "next/server";
import User from "../../../../models/User";
import dbConnect from "../../../../utils/mongodb";

// Handle GET request
export async function GET(request: NextRequest, { params }: { params: { address: string } }) {
  await dbConnect();
  const { address } = params;

  try {
    const user = await User.findOne({ address });

    if (!user) {
      return NextResponse.json({ success: false, message: "User not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error getting user:", error);
    return NextResponse.json({ success: false, message: "Server error" }, { status: 500 });
  }
}

// Handle PUT request
export async function PUT(request: NextRequest, { params }: { params: { address: string } }) {
  await dbConnect();
  const { address } = params;
  const userData = await request.json();

  try {
    const user = await User.findOneAndUpdate({ address }, userData, { new: true, upsert: true });

    return NextResponse.json({ success: true, data: user });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json({ success: false, message: "Error updating user" }, { status: 500 });
  }
}
