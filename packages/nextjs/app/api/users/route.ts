// app/api/users/route.ts
import { NextRequest, NextResponse } from "next/server";
import User from "../../../models/User";
import dbConnect from "../../../utils/mongodb";

// GET handler to fetch all users
export async function GET() {
  await dbConnect();

  try {
    const users = await User.find({});
    return NextResponse.json({ success: true, data: users });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }
}

// POST handler to create a new user
export async function POST(request: NextRequest) {
  await dbConnect();

  try {
    const body = await request.json();
    const user = await User.create(body);
    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error }, { status: 400 });
  }
}
