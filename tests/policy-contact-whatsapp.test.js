import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const source = (relativePath) => fs.readFileSync(path.join(process.cwd(), relativePath), "utf8");

describe("policy contact and WhatsApp group assistance", () => {
  it("normalizes the Contact Number field and looks up associated WhatsApp groups", () => {
    const preview = source("src/app/components/shared/PreviewField.js");

    expect(preview).toContain('fieldKey === "contactNumber"');
    expect(preview).toContain("normalizeContactNumber(event.target.value)");
    expect(preview).toContain("/api/operations/whatsapp/groups?phone=");
    expect(preview).toContain("Associated WhatsApp groups");
    expect(preview).toContain("onChange(group.name)");
  });

  it("passes stable field keys from every policy form surface", () => {
    for (const file of [
      "src/app/components/upload/FixedPolicyPreview.js",
      "src/app/components/shared/PolicyDetailCard.js",
      "src/app/ui/dashboard.js",
    ]) {
      expect(source(file), file).toContain("fieldKey={key}");
    }
  });
});
