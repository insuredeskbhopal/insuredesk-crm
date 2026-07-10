import ClientManagementPage from "@/app/components/operations/ClientManagementPage";

export const metadata = {
  title: "Client Management | Operations Hub",
  description: "Generate and manage client portal access credentials, view Client IDs, and configure login MPINs.",
};

export default function OperationsClientManagementPage() {
  return <ClientManagementPage />;
}
