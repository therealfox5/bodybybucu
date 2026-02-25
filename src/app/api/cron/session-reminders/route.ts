import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendSessionReminder } from "@/lib/email";

export async function GET(req: Request) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // The DB stores dates as Eastern time values in UTC columns,
  // so we need to compute "now" as Eastern-as-UTC to match.
  const realNow = new Date();
  const easternNow = new Date(
    realNow.toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  // Cron runs once daily at 10am UTC (~5-6am Eastern).
  // Send 7h reminders for all sessions today that haven't been notified yet.
  const todayStart = new Date(easternNow);
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(easternNow);
  todayEnd.setHours(23, 59, 59, 999);

  // 7h reminders: all today's sessions not yet notified
  const sessions7h = await db.trainingSession.findMany({
    where: {
      date: { gte: todayStart, lte: todayEnd },
      status: "BOOKED",
      notified7h: false,
    },
    include: { client: { select: { name: true, email: true } } },
  });

  // 2h reminders: sessions starting within 3 hours from now
  const threeHoursOut = new Date(easternNow.getTime() + 3 * 60 * 60 * 1000);
  const sessions2h = await db.trainingSession.findMany({
    where: {
      date: { gte: easternNow, lte: threeHoursOut },
      status: "BOOKED",
      notified2h: false,
    },
    include: { client: { select: { name: true, email: true } } },
  });

  let sent7h = 0;
  let sent2h = 0;

  // Send 7h reminders
  for (const s of sessions7h) {
    try {
      await sendSessionReminder(s.client.email, s.client.name || "", s.date, 7);
      await db.trainingSession.update({
        where: { id: s.id },
        data: { notified7h: true },
      });
      sent7h++;
    } catch (err) {
      console.error(`Failed to send 7h reminder for session ${s.id}:`, err);
    }
  }

  // Send 2h reminders
  for (const s of sessions2h) {
    try {
      await sendSessionReminder(s.client.email, s.client.name || "", s.date, 2);
      await db.trainingSession.update({
        where: { id: s.id },
        data: { notified2h: true },
      });
      sent2h++;
    } catch (err) {
      console.error(`Failed to send 2h reminder for session ${s.id}:`, err);
    }
  }

  return NextResponse.json({ sent7h, sent2h });
}
