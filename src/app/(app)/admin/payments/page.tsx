import { requireAdmin } from "@/lib/require-auth";
import { db } from "@/lib/db";
import {
  getPaymentClients,
  findPaymentClientFor,
} from "@/lib/payments-sheet";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export default async function AdminPaymentsPage() {
  await requireAdmin();

  const [clients, users] = await Promise.all([
    getPaymentClients(),
    db.user.findMany({
      where: { role: "CLIENT" },
      select: { id: true, name: true, email: true, phone: true },
    }),
  ]);

  const linkedNames = new Set<string>();
  const unlinkedUsers = users.filter((u) => {
    const match = findPaymentClientFor(clients, u);
    if (match) linkedNames.add(match.name);
    return !match;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-sm text-muted-foreground">
          Live from the BodyByBucu_Payments sheet (refreshes every 5 minutes).
          Clients see their own last payment on their home page when their
          email or phone here matches their app account.
        </p>
      </div>

      {clients.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="py-6 text-sm text-muted-foreground">
            Couldn&apos;t read the sheet. Check that the sheet is shared with the
            service account and that GOOGLE_SERVICE_ACCOUNT_EMAIL and
            GOOGLE_PRIVATE_KEY are set.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {clients.map((c) => (
          <Card key={c.name} className="border-border bg-card">
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-medium">{c.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[c.email, c.phoneDisplay].filter(Boolean).join(" · ") ||
                    "No email or phone on file"}
                </p>
                {c.rate && (
                  <p className="text-xs text-muted-foreground">Rate: {c.rate}</p>
                )}
                {c.status && (
                  <p className="text-xs text-muted-foreground">{c.status}</p>
                )}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {c.lastPaid ? (
                  <Badge variant="secondary">
                    Last: {usd(c.lastPaid.amount)} · {c.lastPaid.label}
                  </Badge>
                ) : (
                  <Badge variant="outline">No payments yet</Badge>
                )}
                <Badge variant="secondary">Total {usd(c.totalPaid)}</Badge>
                {linkedNames.has(c.name) ? (
                  <Badge className="bg-brand text-white">App linked</Badge>
                ) : (
                  <Badge variant="outline">Not linked</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {unlinkedUsers.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            App accounts with no matching sheet row
          </h2>
          <p className="text-xs text-muted-foreground">
            Add their email or phone number to columns P/Q of the sheet and
            they&apos;ll link automatically.
          </p>
          {unlinkedUsers.map((u) => (
            <Card key={u.id} className="border-border bg-card">
              <CardContent className="py-3 text-sm">
                {u.name || "Unnamed"}{" "}
                <span className="text-xs text-muted-foreground">
                  {[u.email, u.phone].filter(Boolean).join(" · ")}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
