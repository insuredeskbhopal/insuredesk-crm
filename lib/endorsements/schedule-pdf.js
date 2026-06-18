import { getMissingScheduleFields as getMissingFields } from "./template-data";

export async function generateEndorsementSchedulePdf(form, scheduleData, previewElementOrOptions) {
  const missing = getMissingFields(scheduleData);
  if (missing.length) {
    throw new Error(`Enter required schedule fields before generating PDF: ${missing.join(", ")}.`);
  }

  const previewElement =
    previewElementOrOptions && previewElementOrOptions.nodeType
      ? previewElementOrOptions
      : previewElementOrOptions && previewElementOrOptions.previewElement;

  if (!previewElement) {
    throw new Error("Schedule preview is not ready. Open the preview before generating the PDF.");
  }

  const captureElement = createPdfCaptureClone(previewElement);

  try {
    await waitForImages(captureElement);

    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const canvas = await html2canvas(captureElement, {
      backgroundColor: "#ffffff",
      scale: 2,
      useCORS: true,
      width: 794,
      height: 1123,
      windowWidth: 794,
      windowHeight: 1123,
      scrollX: 0,
      scrollY: 0,
    });

    const doc = new jsPDF({ unit: "pt", format: "a4", compress: true });
    doc.setProperties({
      title: `Endorsement Schedule - ${form.endorsementNo || form.policyNo}`,
      subject: "Endorsement schedule",
      creator: "InsureDesk CRM",
    });
    doc.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 595.28, 841.89, undefined, "FAST");

    return {
      dataUrl: doc.output("datauristring"),
      fileName: `${form.endorsementNo || "endorsement"}-schedule.pdf`,
    };
  } finally {
    captureElement.parentNode?.removeChild(captureElement);
  }
}

export function getMissingScheduleFields(form) {
  return getMissingFields(form);
}

async function waitForImages(element) {
  const images = Array.from(element.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete && image.naturalWidth) return Promise.resolve();
      return new Promise((resolve) => {
        image.onload = resolve;
        image.onerror = resolve;
        if (image.decode) image.decode().then(resolve).catch(resolve);
      });
    }),
  );
}

function createPdfCaptureClone(element) {
  const clone = element.cloneNode(true);
  clone.removeAttribute("style");
  clone.classList.add("icici-pdf-capture");
  Object.assign(clone.style, {
    position: "fixed",
    left: "0",
    top: "0",
    zIndex: "2147483647",
    width: "794px",
    height: "1123px",
    transform: "none",
    opacity: "1",
    background: "#ffffff",
    pointerEvents: "none",
  });
  document.body.appendChild(clone);
  return clone;
}
