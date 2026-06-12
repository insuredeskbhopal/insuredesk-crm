import EndorsementFormPage from "@/app/components/operations/EndorsementFormPage";

export default async function EndorsementDetailPage({ params }) {
  const { id } = await params;
  return <EndorsementFormPage endorsementId={id} />;
}
