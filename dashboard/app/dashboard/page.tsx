import { Suspense } from "react";
import { getOverviewStats } from "@/lib/queries/overview";
import { getDailyStats } from "@/lib/queries/byDay";
import { getUserStats } from "@/lib/queries/byUser";
import { getModelStats } from "@/lib/queries/byModel";
import { getRecentSessions } from "@/lib/queries/sessions";
import OverviewCards from "@/components/OverviewCards";
import CostTimelineChart from "@/components/CostTimelineChart";
import UserBreakdownTable from "@/components/UserBreakdownTable";
import ModelUsageChart from "@/components/ModelUsageChart";
import SessionsTable from "@/components/SessionsTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [overview, daily, users, models, sessions] = await Promise.allSettled([
    getOverviewStats(),
    getDailyStats(30),
    getUserStats(30),
    getModelStats(30),
    getRecentSessions(20),
  ]);

  const overviewData =
    overview.status === "fulfilled"
      ? overview.value
      : { costThisMonth: 0, costLastMonth: 0, totalTokens: 0, activeUsers: 0, sessionCount: 0 };
  const dailyData = daily.status === "fulfilled" ? daily.value : [];
  const usersData = users.status === "fulfilled" ? users.value : [];
  const modelsData = models.status === "fulfilled" ? models.value : [];
  const sessionsData = sessions.status === "fulfilled" ? sessions.value : [];

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
            CC Teams Analytics
          </h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            Claude Code usage telemetry — last 30 days
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<div className="h-28 animate-pulse rounded-xl bg-zinc-100" />}>
          <OverviewCards data={overviewData} />
        </Suspense>

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" />}>
              <CostTimelineChart data={dailyData} />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" />}>
              <ModelUsageChart data={modelsData} />
            </Suspense>
          </div>
        </div>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" />}>
          <UserBreakdownTable data={usersData} />
        </Suspense>

        <Suspense fallback={<div className="h-64 animate-pulse rounded-xl bg-zinc-100" />}>
          <SessionsTable data={sessionsData} />
        </Suspense>
      </main>
    </div>
  );
}
