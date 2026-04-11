import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
  let body: {
    smtp: { host: string; port: string; email: string; password: string };
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid request body." },
      { status: 400 }
    );
  }

  const { smtp } = body;

  if (!smtp?.host || !smtp?.port || !smtp?.email || !smtp?.password) {
    return NextResponse.json(
      { success: false, error: "Missing SMTP configuration fields." },
      { status: 400 }
    );
  }

  const port = Number(smtp.port);

  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port,
    secure: port === 465,
    auth: { user: smtp.email, pass: smtp.password },
    connectionTimeout: 8000,
    greetingTimeout: 5000,
    socketTimeout: 8000,
  });

  try {
    await transporter.verify();
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 400 }
    );
  }
}
