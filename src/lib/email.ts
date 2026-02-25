import { Resend } from "resend";

function getResend() {
  return new Resend(process.env.RESEND_API_KEY);
}


export async function sendSessionReminder(
  to: string,
  name: string,
  date: Date,
  hours: number
) {
  const timeStr = date.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/New_York",
  });

  const from = process.env.NOTIFICATION_FROM_EMAIL || "noreply@bodybybucu.com";
  await getResend().emails.send({
    from,
    to,
    subject: `Reminder: Training session in ${hours} hours`,
    html: `
      <p>Hi ${name || "there"},</p>
      <p>This is a reminder that you have a training session in <strong>${hours} hours</strong>.</p>
      <p><strong>When:</strong> ${timeStr}</p>
      <p>See you soon!</p>
      <p>— Body by Bucu</p>
    `,
  });
}
