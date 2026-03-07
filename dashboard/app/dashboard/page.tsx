import { Suspense } from "react";
import { getOverviewStats } from "@/lib/queries/overview";
import { getUserStats } from "@/lib/queries/byUser";
import { getModelStats, getModelUsersOverTime } from "@/lib/queries/byModel";
import { getRecentSessions } from "@/lib/queries/sessions";
import { getClientInfo, getVersionOverTime } from "@/lib/queries/clientInfo";
import { getToolStats, getMcpStats } from "@/lib/queries/tools";
import OverviewCards from "@/components/OverviewCards";
import AdoptionChart from "@/components/AdoptionChart";
import ModelUsageChart from "@/components/ModelUsageChart";
import UserBreakdownTable from "@/components/UserBreakdownTable";
import ClientInfoTabs from "@/components/ClientInfoTabs";
import ToolsPanel from "@/components/ToolsPanel";
import SessionsTable from "@/components/SessionsTable";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [
    overview, users, models, modelUsersOverTime,
    sessions, clientInfo, versionOverTime, tools, mcpTools,
  ] = await Promise.allSettled([
    getOverviewStats(),
    getUserStats(30),
    getModelStats(30),
    getModelUsersOverTime(30),
    getRecentSessions(20),
    getClientInfo(30),
    getVersionOverTime(30),
    getToolStats(30),
    getMcpStats(30),
  ]);

  const overviewData = overview.status === "fulfilled" ? overview.value
    : { costThisMonth: 0, costLastMonth: 0, totalTokens: 0, activeUsers: 0, sessionCount: 0 };
  const usersData          = users.status === "fulfilled" ? users.value : [];
  const modelsData         = models.status === "fulfilled" ? models.value : [];
  const modelUsersData     = modelUsersOverTime.status === "fulfilled" ? modelUsersOverTime.value : [];
  const sessionsData       = sessions.status === "fulfilled" ? sessions.value : [];
  const clientInfoData     = clientInfo.status === "fulfilled" ? clientInfo.value : [];
  const versionOverTimeData= versionOverTime.status === "fulfilled" ? versionOverTime.value : [];
  const toolsData          = tools.status === "fulfilled" ? tools.value : [];
  const mcpToolsData       = mcpTools.status === "fulfilled" ? mcpTools.value : [];

  const Skeleton = ({ h }: { h: string }) => (
    <div className={`${h} animate-pulse rounded-xl bg-zinc-100`} />
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">CC Teams Analytics</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Claude Code usage telemetry — last 30 days</p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<Skeleton h="h-28" />}>
          <OverviewCards data={overviewData} />
        </Suspense>

        {/* Adoption charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Suspense fallback={<Skeleton h="h-64" />}>
            <AdoptionChart title="Daily active users by CC version" data={versionOverTimeData} />
          </Suspense>
          <Suspense fallback={<Skeleton h="h-64" />}>
            <AdoptionChart title="Daily active users by model" data={modelUsersData} />
          </Suspense>
        </div>

        {/* Model cost breakdown */}
        <Suspense fallback={<Skeleton h="h-64" />}>
          <ModelUsageChart data={modelsData} />
        </Suspense>

        {/* Tools */}
        <Suspense fallback={<Skeleton h="h-64" />}>
          <ToolsPanel tools={toolsData} mcpTools={mcpToolsData} />
        </Suspense>

        {/* Client environment */}
        <Suspense fallback={<Skeleton h="h-64" />}>
          <ClientInfoTabs data={clientInfoData} versionOverTime={versionOverTimeData} />
        </Suspense>

        {/* Users */}
        <Suspense fallback={<Skeleton h="h-64" />}>
          <UserBreakdownTable data={usersData} />
        </Suspense>

        {/* Sessions */}
        <Suspense fallback={<Skeleton h="h-64" />}>
          <SessionsTable data={sessionsData} />
        </Suspense>
      </main>
    </div>
  );
}
