"use client";

import { useState, useRef, useCallback } from "react";

interface Stats {
  totalUsers: number;
  totalReports: number;
  reportsToday: number;
  reportsThisWeek: number;
  activeSubscriptions: number;
  rateLimitHitsToday: number;
  reportsByTemplate: Record<string, number>;
  topUsers: { userId: string; reportCount: number }[];
}

interface AbuseFlag {
  type: string;
  identifier: string;
  reason: string;
  count: number;
}

interface AbuseResponse {
  flags: AbuseFlag[];
  flagCount: number;
  checkedAt: string;
}

interface ActivityEntry {
  id: string;
  userId: string | null;
  action: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  createdAt: string;
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-bold text-foreground">{value}</p>
    </div>
  );
}

export default function AdminPage() {
  const [authenticated, setAuthenticated] = useState(false);
  const [stats, setStats] = useState<Stats | null>(null);
  const [abuse, setAbuse] = useState<AbuseResponse | null>(null);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fetching, setFetching] = useState(false);
  const [secretInput, setSecretInput] = useState("");

  const secretRef = useRef("");
  const fetchingRef = useRef(false);

  const resetToLocked = useCallback(() => {
    secretRef.current = "";
    setAuthenticated(false);
    setStats(null);
    setAbuse(null);
    setActivity([]);
    setError(null);
    setFetching(false);
    fetchingRef.current = false;
  }, []);

  const fetchAllData = useCallback(async () => {
    if (fetchingRef.current) return;
    fetchingRef.current = true;
    setFetching(true);
    setError(null);

    const headers = { "x-admin-secret": secretRef.current };

    try {
      const [statsRes, abuseRes, activityRes] = await Promise.all([
        fetch("/api/admin/stats", { headers }),
        fetch("/api/admin/abuse", { headers }),
        fetch("/api/admin/activity?limit=50", { headers }),
      ]);

      if (statsRes.status === 401 || abuseRes.status === 401 || activityRes.status === 401) {
        resetToLocked();
        setError("Session expired or invalid secret. Please re-authenticate.");
        return;
      }

      if (!statsRes.ok || !abuseRes.ok || !activityRes.ok) {
        setError("Failed to load admin data.");
        setFetching(false);
        fetchingRef.current = false;
        return;
      }

      const [statsData, abuseData, activityData] = await Promise.all([
        statsRes.json() as Promise<Stats>,
        abuseRes.json() as Promise<AbuseResponse>,
        activityRes.json() as Promise<{ logs: ActivityEntry[] }>,
      ]);

      setStats(statsData);
      setAbuse(abuseData);
      setActivity(activityData.logs);
    } catch {
      setError("Network error fetching admin data.");
    }
    setFetching(false);
    fetchingRef.current = false;
  }, [resetToLocked]);

  const handleLogin = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (fetchingRef.current || !secretInput.trim()) return;
    fetchingRef.current = true;
    setFetching(true);
    setError(null);

    try {
      const res = await fetch("/api/admin/stats", {
        headers: { "x-admin-secret": secretInput.trim() },
      });

      if (res.status === 401) {
        setError("Invalid secret.");
        setFetching(false);
        fetchingRef.current = false;
        return;
      }

      if (!res.ok) {
        setError("Server error. Try again.");
        setFetching(false);
        fetchingRef.current = false;
        return;
      }

      //secret is valid -- store in ref and load the rest
      secretRef.current = secretInput.trim();
      const statsData = await res.json() as Stats;
      setStats(statsData);
      setAuthenticated(true);
      setSecretInput("");

      //fetch remaining endpoints (abuse + activity)
      const [abuseRes, activityRes] = await Promise.all([
        fetch("/api/admin/abuse", { headers: { "x-admin-secret": secretRef.current } }),
        fetch("/api/admin/activity?limit=50", { headers: { "x-admin-secret": secretRef.current } }),
      ]);

      if (abuseRes.ok) {
        const abuseData = await abuseRes.json() as AbuseResponse;
        setAbuse(abuseData);
      }
      if (activityRes.ok) {
        const activityData = await activityRes.json() as { logs: ActivityEntry[] };
        setActivity(activityData.logs);
      }
    } catch {
      setError("Network error.");
    }
    setFetching(false);
    fetchingRef.current = false;
  }, [secretInput]);

  if (!authenticated) {
    return (
      <div className="mx-auto max-w-md px-4 py-16">
        <h1 className="mb-4 text-xl font-bold text-foreground">Admin Access</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter the ADMIN_SECRET to access the admin dashboard.
        </p>
        {error && (
          <div className="mb-4 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        <form onSubmit={handleLogin} className="flex gap-2">
          <input
            type="password"
            value={secretInput}
            onChange={(e) => setSecretInput(e.target.value)}
            placeholder="Admin secret"
            className="flex-1 rounded-md border border-border bg-muted px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={fetching}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {fetching ? "Checking..." : "Submit"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
        <button
          onClick={fetchAllData}
          disabled={fetching}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {fetching ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {stats && (
        <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Users" value={stats.totalUsers} />
          <StatCard label="Reports Today" value={stats.reportsToday} />
          <StatCard label="Reports This Week" value={stats.reportsThisWeek} />
          <StatCard label="Total Reports" value={stats.totalReports} />
          <StatCard label="Active Subs" value={stats.activeSubscriptions} />
          <StatCard label="Rate Limits Today" value={stats.rateLimitHitsToday} />
        </div>
      )}

      {abuse && abuse.flagCount > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-destructive">
            Abuse Flags ({abuse.flagCount})
          </h2>
          <div className="overflow-x-auto rounded-lg border border-destructive/50">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-card">
                <tr>
                  <th className="px-4 py-2 text-muted-foreground">Type</th>
                  <th className="px-4 py-2 text-muted-foreground">Identifier</th>
                  <th className="px-4 py-2 text-muted-foreground">Reason</th>
                  <th className="px-4 py-2 text-muted-foreground">Count</th>
                </tr>
              </thead>
              <tbody>
                {abuse.flags.map((flag, i) => (
                  <tr key={i} className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-xs text-destructive">
                      {flag.type}
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-foreground">
                      {flag.identifier}
                    </td>
                    <td className="px-4 py-2 text-foreground/80">{flag.reason}</td>
                    <td className="px-4 py-2 text-foreground">{flag.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {abuse && abuse.flagCount === 0 && (
        <div className="mb-8 rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">No abuse flags detected.</p>
        </div>
      )}

      {stats && Object.keys(stats.reportsByTemplate).length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Reports by Template
          </h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(stats.reportsByTemplate)
              .sort((a, b) => b[1] - a[1])
              .map(([tid, count]) => (
                <div
                  key={tid}
                  className="rounded-md border border-border bg-card px-3 py-2"
                >
                  <span className="font-mono text-xs text-muted-foreground">{tid}</span>
                  <span className="ml-2 font-bold text-foreground">{count}</span>
                </div>
              ))}
          </div>
        </div>
      )}

      {stats && stats.topUsers.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 text-lg font-semibold text-foreground">
            Top Users by Reports
          </h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-card">
                <tr>
                  <th className="px-4 py-2 text-muted-foreground">User ID</th>
                  <th className="px-4 py-2 text-muted-foreground">Report Count</th>
                </tr>
              </thead>
              <tbody>
                {stats.topUsers.map((u) => (
                  <tr key={u.userId} className="border-b border-border">
                    <td className="px-4 py-2 font-mono text-xs text-foreground">
                      {u.userId}
                    </td>
                    <td className="px-4 py-2 text-foreground">{u.reportCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-3 text-lg font-semibold text-foreground">
          Recent Activity (last 50)
        </h2>
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-card">
              <tr>
                <th className="px-4 py-2 text-muted-foreground">Time</th>
                <th className="px-4 py-2 text-muted-foreground">Action</th>
                <th className="px-4 py-2 text-muted-foreground">User ID</th>
                <th className="px-4 py-2 text-muted-foreground">IP</th>
                <th className="px-4 py-2 text-muted-foreground">Metadata</th>
              </tr>
            </thead>
            <tbody>
              {activity.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">
                    No activity recorded yet.
                  </td>
                </tr>
              )}
              {activity.map((entry) => (
                <tr key={entry.id} className="border-b border-border">
                  <td className="whitespace-nowrap px-4 py-2 text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-foreground">
                    {entry.action}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {entry.userId ? entry.userId.slice(0, 8) + "..." : "-"}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted-foreground">
                    {entry.ip ?? "-"}
                  </td>
                  <td className="max-w-xs truncate px-4 py-2 font-mono text-xs text-muted-foreground">
                    {entry.metadata ? JSON.stringify(entry.metadata) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
