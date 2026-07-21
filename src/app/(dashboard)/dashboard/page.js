import Dashboard from "@/app/ui/dashboard";

export default async function DashboardPage(props) {
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";
  return <Dashboard initialRecords={[]} activePage="dashboard" initialQ={q} />;
}
