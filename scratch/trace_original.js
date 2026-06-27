const fs = require("fs");
const pdf = require("pdf-parse");

function originalExtract(text) {
  let searchSpace = text;
  const vehicleDetailsIndex = text.search(/B\.VehicleDetails|VehicleDetails|Registration\s+Number/i);
  if (vehicleDetailsIndex !== -1) {
    searchSpace = text.slice(vehicleDetailsIndex);
  }

  const lines = searchSpace
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const knownMakes = [
    "FORCE MOTORS",
    "FORCE",
    "MARUTI",
    "HYUNDAI"
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const upper = line.toUpperCase();

    if (
      upper.includes("INSURANCE") ||
      upper.includes("FORMERLY KNOWN AS") ||
      upper.includes("REGISTERED AND HEAD OFFICE") ||
      upper.includes("CORPORATE IDENTITY NUMBER") ||
      upper.includes("PROPOSAL")
    ) {
      continue;
    }

    const make = knownMakes.find((m) => upper.includes(m));
    if (make) {
      const makeIndex = upper.indexOf(make);
      let firstLine = line.slice(makeIndex);
      const vinMatch = firstLine.match(/M[A-EZ][A-Z0-9]{15}/i);
      if (vinMatch) {
        firstLine = firstLine.slice(0, firstLine.indexOf(vinMatch[0])).replace(/\d+$/, "");
        return firstLine.trim();
      }

      let collected = [firstLine];
      let j = i + 1;
      while (j < lines.length && j < i + 5) {
        const nextLine = lines[j];
        if (/NCB|Premium|Policy|Period|Limit|Address|Customer|Compulsory/i.test(nextLine)) break;
        if (/^\d{3,4}$/.test(nextLine)) break;
        if (/^\d{1,2}$/.test(nextLine)) break;
        if (/^\d{4}$/.test(nextLine)) break;
        if (/^\d+,\d+/.test(nextLine)) break;
        if (/\b(?:Petrol|Diesel|CNG|EV|Electric)\b/i.test(nextLine)) break;

        if (knownMakes.some((m) => nextLine.toUpperCase().startsWith(m))) break;
        if (/^[A-Z]{2}\d{2}/i.test(nextLine)) break;
        if (/^\d+\.\d+/.test(nextLine)) break;

        const lineVinMatch = nextLine.match(/M[A-EZ][A-Z0-9]{15}/i);
        if (lineVinMatch) {
          let cleanedLine = nextLine.slice(0, nextLine.indexOf(lineVinMatch[0])).replace(/\d+$/, "");
          if (cleanedLine.trim()) {
            collected.push(cleanedLine);
          }
          break;
        }

        collected.push(nextLine);
        j++;
      }
      const full = collected
        .join(" ")
        .replace(/\s+/g, " ")
        .replace(/\s*-\s*/g, " - ")
        .trim();
      return full;
    }
  }
  return "";
}

async function run() {
  const file = "tests/fixtures/SHREENATH DAS TANK_MP39C3588_2026-27 (1).pdf";
  const buffer = fs.readFileSync(file);
  const parsed = await pdf(buffer);
  console.log("Original returned makeModel:", originalExtract(parsed.text));
}

run().catch(console.error);
