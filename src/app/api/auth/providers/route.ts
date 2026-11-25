import { NextResponse } from "next/server";

export async function GET() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim()
  );
  const aiConfigured = Boolean(process.env.GEMINI_API_KEY?.trim());

  return NextResponse.json({
    googleEnabled,
    aiConfigured,
  });
}
