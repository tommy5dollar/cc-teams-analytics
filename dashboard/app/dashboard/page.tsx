import { Suspense } from "react";
import { parseDateRange } from "@/lib/queries/dateRange";
import { getOverviewStats } from "@/lib/queries/overview";
import { getUserStats } from "@/lib/queries/byUser";
import { getModelUsersOverTime } from "@/lib/queries/byModel";
import { getClientInfo, getVersionOverTime } from "@/lib/queries/clientInfo";
import { getToolStats, getMcpStats } from "@/lib/queries/tools";
import OverviewCards from "@/components/OverviewCards";
import SpendByUserChart from "@/components/SpendByUserChart";
import UserBreakdownTable from "@/components/UserBreakdownTable";
import ClientInfoTabs from "@/components/ClientInfoTabs";
import ToolsPanel from "@/components/ToolsPanel";
import TimeRangePicker from "@/components/TimeRangePicker";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const dr = parseDateRange(sp);

  const [
    overview, users, modelUsersOverTime,
    clientInfo, versionOverTime, tools, mcpTools,
  ] = await Promise.allSettled([
    getOverviewStats(dr),
    getUserStats(dr),
    getModelUsersOverTime(dr),
    getClientInfo(dr),
    getVersionOverTime(dr),
    getToolStats(dr),
    getMcpStats(dr),
  ]);

  const overviewData        = overview.status === "fulfilled" ? overview.value
    : { costInRange: 0, costPriorRange: 0, totalTokens: 0, activeUsers: 0, sessionCount: 0 };
  const usersData           = users.status === "fulfilled" ? users.value : [];
  const modelUsersData      = modelUsersOverTime.status === "fulfilled" ? modelUsersOverTime.value : [];
  const clientInfoData      = clientInfo.status === "fulfilled" ? clientInfo.value : [];
  const versionOverTimeData = versionOverTime.status === "fulfilled" ? versionOverTime.value : [];
  const toolsData           = tools.status === "fulfilled" ? tools.value : [];
  const mcpToolsData        = mcpTools.status === "fulfilled" ? mcpTools.value : [];

  const Skeleton = ({ h }: { h: string }) => (
    <div className={`${h} animate-pulse rounded-xl bg-zinc-100`} />
  );

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">CC Teams Analytics</h1>
              <p className="mt-0.5 text-sm text-zinc-500">Claude Code usage telemetry</p>
            </div>
            <Suspense>
              <TimeRangePicker current={dr} />
            </Suspense>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        <Suspense fallback={<Skeleton h="h-28" />}>
          <OverviewCards data={overviewData} />
        </Suspense>

        <Suspense fallback={<Skeleton h="h-80" />}>
          <SpendByUserChart data={usersData} />
        </Suspense>

        <Suspense fallback={<Skeleton h="h-64" />}>
          <ToolsPanel tools={toolsData} mcpTools={mcpToolsData} />
        </Suspense>

        <Suspense fallback={<Skeleton h="h-64" />}>
          <ClientInfoTabs data={clientInfoData} versionOverTime={versionOverTimeData} modelUsersOverTime={modelUsersData} />
        </Suspense>

        <Suspense fallback={<Skeleton h="h-64" />}>
          <UserBreakdownTable data={usersData} />
        </Suspense>
      </main>
    </div>
  );
}
