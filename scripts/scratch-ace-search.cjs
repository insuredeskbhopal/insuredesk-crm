const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

p.policyRecord.findMany({
  where: {
    deletedAt: null,
    clientIdPending: false,
    OR: [
      { data: { path: ["insuredName"], string_contains: "ACE" } },
      { reviewedData: { path: ["insuredName"], string_contains: "ACE" } },
      { data: { path: ["customerName"], string_contains: "ACE" } },
      { reviewedData: { path: ["customerName"], string_contains: "ACE" } },
    ],
  },
  take: 10,
  select: { id: true, data: true, reviewedData: true },
}).then((r) => {
  r.forEach((x) => {
    const d = { ...x.data, ...x.reviewedData };
    console.log(
      x.id, "|",
      d.insuredName || d.customerName, "|",
      d.policyCategory || d.category || d.documentCategory, "|",
      d.policyNumber, "|",
      d.expiryDate || d.policyEndDate
    );
  });
  p.$disconnect();
}).catch((e) => {
  console.error(e.message);
  p.$disconnect();
});
