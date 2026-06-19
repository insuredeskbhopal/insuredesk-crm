import { ICICIEndorsementTemplate } from "./ICICIEndorsementTemplate";

export function EndorsementTemplatePreview({ templateId, data, previewRef }) {
  if (templateId === "tata-aig") {
    return <TataEndorsementTemplate data={data} previewRef={previewRef} />;
  }
  return <ICICIEndorsementTemplate data={data} previewRef={previewRef} />;
}

function TataEndorsementTemplate({ data, previewRef }) {
  return (
    <div ref={previewRef} className="endorsement-template-placeholder">
      <strong>Tata AIG template pending</strong>
      <span>{data.insuredName || "Select/upload policy data to preview."}</span>
    </div>
  );
}
