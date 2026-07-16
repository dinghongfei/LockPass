import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { findUserByUsername, verifyPassword } from "@/lib/auth/users";
import { checkRateLimit, badRequest } from "@/lib/api-utils";
import { z } from "zod";

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  if (!checkRateLimit(`login:${ip}`)) {
    return badRequest("登录尝试过于频繁，请稍后再试");
  }

  try {
    const body = await request.json();
    const { username, password } = loginSchema.parse(body);
    const user = findUserByUsername(username);
    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      return badRequest("用户名或密码错误");
    }

    const session = await getSession();
    session.userId = user.id;
    session.username = user.username;
    session.isLoggedIn = true;
    await session.save();

    return NextResponse.json({ username: user.username });
  } catch {
    return badRequest("无效的请求");
  }
}
