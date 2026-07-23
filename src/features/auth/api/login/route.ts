import { NextResponse } from "next/server";
import { authService } from "@/core/container";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const result = await authService.login(body);
    const { token, ...user } = result;

    const response = NextResponse.json({ user }, { status: 200 });
    response.cookies.set({
      name: "auth_token",
      value: token ?? "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7200, // 2h
    });

    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}