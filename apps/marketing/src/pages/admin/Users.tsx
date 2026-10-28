import { useEffect, useState } from "react";
import Seo from "@/components/Seo";
import RiseIn from "@/components/motion/RiseIn";
import { Card, Badge, DarkErrorBanner, PageHeading } from "@/pages/dashboard/components/DashboardUI";
import { getUserActivity, type AdminUserRow } from "@/lib/adminApi";
import { ApiError } from "@/lib/api";

const SUB_TONE: Record<string, "gold" | "gain" | "loss" | "info"> = {
  awaiting_link: "info",
  active: "gain",
  past_due: "loss",
  canceled: "loss",
};

const MT_TONE: Record<string, "gold" | "gain" | "loss" | "info"> = {
  pending: "info",
  linked: "gain",
  error: "loss",
  closed: "gold",
};

function UserRow({ user }: { user: AdminUserRow }) {
  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-small text-paper">
            {user.fullName}
            {user.role === "admin" && <Badge label="admin" tone="gold" />}
          </p>
          <p className="mt-1 truncate text-caption text-slate-light">{user.email}</p>
          <p className="mt-1 text-caption text-slate-light">
            Member since {new Date(user.memberSince).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          {user.subscription ? (
            <div className="text-right">
              <p className="text-caption text-paper">{user.subscription.botName}</p>
              <Badge label={user.subscription.status} tone={SUB_TONE[user.subscription.status] ?? "gold"} />
            </div>
          ) : (
            <span className="text-caption text-slate-light">No subscription</span>
          )}
          {user.mtAccount && (
            <div className="text-right">
              <p className="text-caption text-paper">{user.mtAccount.broker}</p>
              <Badge label={user.mtAccount.connectionStage} tone={MT_TONE[user.mtAccount.status] ?? "gold"} />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

export default function Users() {
  const [rows, setRows] = useState<AdminUserRow[] | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getUserActivity(page)
      .then((res) => {
        setRows(res.users);
        setTotal(res.total);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't load user activity."));
  }, [page]);

  return (
    <>
      <Seo title="Admin — Users" description="Monitor signups, subscriptions, and linked accounts." path="/admin/users" />
      <PageHeading>Users</PageHeading>
      <p className="mt-2 text-small text-slate-light">
        {total} user{total === 1 ? "" : "s"} total.
      </p>

      {error && (
        <div className="mt-6">
          <DarkErrorBanner message={error} />
        </div>
      )}

      <div className="mt-8 space-y-3">
        {!rows && !error && <p className="text-body text-slate-light">Loading…</p>}
        {rows?.length === 0 && <p className="text-body text-slate-light">No users yet.</p>}
        {rows?.map((u, i) => (
          <RiseIn key={u.userId} index={i}>
            <UserRow user={u} />
          </RiseIn>
        ))}
      </div>

      {total > 50 && (
        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="border border-navy-line/50 px-4 py-2 text-caption text-slate-light disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-caption text-slate-light">Page {page}</span>
          <button
            type="button"
            disabled={page * 50 >= total}
            onClick={() => setPage((p) => p + 1)}
            className="border border-navy-line/50 px-4 py-2 text-caption text-slate-light disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </>
  );
}
