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

  // 7-hour window: sessions starting between 6.5h and 7.5h from now
  const sevenHFrom = new Date(easternNow.getTime() + 6.5 * 60 * 60 * 1000);
  const sevenHTo = new Date(easternNow.getTime() + 7.5 * 60 * 60 * 1000);

  // 2-hour window: sessions starting between 1.5h and 2.5h from now
  const twoHFrom = new Date(easternNow.getTime() + 1.5 * 60 * 60 * 1000);
  const twoHTo = new Date(easternNow.getTime() + 2.5 * 60 * 60 * 1000);

  // Query sessions needing 7h notification
  const sessions7h = await db.trainingSession.findMany({
    where: {
      date: { gte: sevenHFrom, lte: sevenHTo },
      status: "BOOKED",
      notified7h: false,
    },
    include: { client: { select: { name: true, email: true } } },
  });

  // Query sessions needing 2h notification
  const sessions2h = await db.trainingSession.findMany({
    where: {
      date: { gte: twoHFrom, lte: twoHTo },
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
