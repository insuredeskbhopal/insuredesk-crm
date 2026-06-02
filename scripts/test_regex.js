const formats = [
  "CG-07-4035",
  "MH-12-AB-1234",
  "DL-3C-AY-1234",
  "DL-3C-1234",
  "HR26AB1234",
  "HR-26-AB-1234",
  "UP-16-Z-1234",
  "MH121234",
  "MH-12-1234"
];

const patterns = [
  // Pattern 4
  /\b([A-Z]{2}[-\s]?\d{1,2}[-\s]?[A-Z0-9]{1,3}(?:[-\s]?[A-Z]{1,3})?[-\s]?\d{4})\b/i,
  // Pattern 5 (middle part completely optional)
  /\b([A-Z]{2}[-\s]?\d{1,2}(?:[-\s]?[A-Z0-9]{1,3}(?:[-\s]?[A-Z]{1,3})?)?[-\s]?\d{4})\b/i
];

patterns.forEach((pattern, idx) => {
  console.log(`\nPattern ${idx + 4}: ${pattern.toString()}`);
  formats.forEach(f => {
    const match = f.match(pattern);
    console.log(`  ${f.padEnd(20)} -> ${match ? match[1] : "NO MATCH"}`);
  });
});
