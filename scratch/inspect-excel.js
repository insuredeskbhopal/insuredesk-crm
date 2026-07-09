const XLSX = require("xlsx");
const path = require("path");

const file = path.join(process.cwd(), "storage", "Non_Motor_July_2026_Renewal_Data (1).xlsx");
console.log("Reading file:", file);

try {
  const workbook = XLSX.readFile(file);
  console.log("Sheets in workbook:", workbook.SheetNames);

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    console.log(`\nSheet: "${sheetName}"`);
    console.log("Total rows:", data.length);
    if (data.length > 0) {
      console.log("Keys on first row:", Object.keys(data[0]));
      console.log("First row data sample:", data[0]);

      // Check unique values of Status column (case insensitive)
      const statuses = new Set();
      data.forEach(row => {
        // Find key that matches 'status'
        const statusKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'status');
        if (statusKey) {
          statuses.add(row[statusKey]);
        }
      });
      console.log("Unique values in 'Status' column:", Array.from(statuses));
    }
  }
} catch (e) {
  console.error("Error reading file:", e);
}
