import { LmsDashboard } from "@/features/lms/dashboard";

export const dynamic = "force-dynamic";

export default function DashboardPage() {
  return <LmsDashboard view="dashboard" now={new Date().toISOString()} />;
}
