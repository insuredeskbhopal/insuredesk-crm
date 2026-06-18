/* global __dirname */
const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const prisma = new PrismaClient();
const localStorageDir = path.join(__dirname, "..", "storage", "uploads");

// Ensure base storage directory exists
if (!fs.existsSync(localStorageDir)) {
  fs.mkdirSync(localStorageDir, { recursive: true });
}

async function main() {
  console.log("Starting SaaS CRM database migration...");

  // 1. Establish Fallback Tenant Organization
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: {
        name: "Default Organization",
      },
    });
    console.log(`Created default fallback organization with ID: ${org.id}`);
  } else {
    console.log(`Using existing organization: ${org.name} (${org.id})`);
  }

  // 2. Link Orphaned Users and Assign Default Roles
  const users = await prisma.user.findMany();
  console.log(`Found ${users.length} users to inspect.`);
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const dataToUpdate = {};

    if (!user.organizationId) {
      dataToUpdate.organizationId = org.id;
    }

    // Assign ADMIN role to first user, others AGENT
    if (!user.role) {
      dataToUpdate.role = i === 0 ? "ADMIN" : "AGENT";
    }

    if (Object.keys(dataToUpdate).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: dataToUpdate,
      });
      console.log(`Updated user ${user.email} (Tenant: ${org.id}, Role: ${dataToUpdate.role || user.role})`);
    }
  }

  // 3. Link Orphaned Uploaded Files to default organization
  const orphanUploads = await prisma.uploadedFile.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  console.log(`Linked ${orphanUploads.count} orphaned uploaded files to default organization.`);

  // 4. Link Orphaned Policy Records to default organization
  const orphanPolicies = await prisma.policyRecord.updateMany({
    where: { organizationId: null },
    data: { organizationId: org.id },
  });
  console.log(`Linked ${orphanPolicies.count} orphaned policy records to default organization.`);

  // 5. Extract PDF Blobs from Uploaded Files to disk
  const filesWithBytes = await prisma.uploadedFile.findMany({
    where: { pdfBytes: { not: null } },
  });
  console.log(`Found ${filesWithBytes.length} files with inline binary PDF bytes to extract.`);

  for (const file of filesWithBytes) {
    const buffer = file.pdfBytes;
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const fileSize = buffer.length;
    const ext = path.extname(file.sourceFile) || ".pdf";
    const uniqueName = `${crypto.randomUUID()}${ext}`;

    const fileDate = file.createdAt || new Date();
    const dateSubdir = path.join(
      fileDate.getFullYear().toString(),
      (fileDate.getMonth() + 1).toString().padStart(2, "0"),
    );

    const targetDir = path.join(localStorageDir, dateSubdir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const relativePath = path.join(dateSubdir, uniqueName).replace(/\\/g, "/");
    const fullPath = path.join(localStorageDir, relativePath);

    // Write binary file to storage
    fs.writeFileSync(fullPath, buffer);

    // Update DB record
    await prisma.uploadedFile.update({
      where: { id: file.id },
      data: {
        storageProvider: "local",
        storagePath: relativePath,
        fileHash: fileHash,
        fileSize: fileSize,
        pdfBytes: null, // Reclaim space
      },
    });
    console.log(`Successfully migrated UploadedFile ${file.id} to storage path: ${relativePath}`);
  }

  // 6. Extract PDF Blobs from Policy Records to disk
  const policiesWithBytes = await prisma.policyRecord.findMany({
    where: { pdfBytes: { not: null } },
  });
  console.log(`Found ${policiesWithBytes.length} policy records with inline binary PDF bytes to extract.`);

  for (const policy of policiesWithBytes) {
    const buffer = policy.pdfBytes;
    const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
    const fileSize = buffer.length;
    const uniqueName = `${crypto.randomUUID()}.pdf`;

    const policyDate = policy.createdAt || new Date();
    const dateSubdir = path.join(
      policyDate.getFullYear().toString(),
      (policyDate.getMonth() + 1).toString().padStart(2, "0"),
    );

    const targetDir = path.join(localStorageDir, dateSubdir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const relativePath = path.join(dateSubdir, uniqueName).replace(/\\/g, "/");
    const fullPath = path.join(localStorageDir, relativePath);

    // Write binary file to storage
    fs.writeFileSync(fullPath, buffer);

    let fileId = policy.uploadedFileId;
    if (!fileId) {
      // Create UploadedFile record representing this document
      const newFile = await prisma.uploadedFile.create({
        data: {
          sourceFile: policy.pdfFileName || policy.sourceFile || "legacy_policy.pdf",
          mimeType: policy.pdfMimeType || "application/pdf",
          sizeBytes: fileSize,
          status: "APPROVED",
          storageProvider: "local",
          storagePath: relativePath,
          fileHash: fileHash,
          fileSize: fileSize,
          organizationId: policy.organizationId || org.id,
          createdById: policy.createdById,
        },
      });
      fileId = newFile.id;
    } else {
      // Update existing linked UploadedFile with storage metadata
      await prisma.uploadedFile.update({
        where: { id: fileId },
        data: {
          storageProvider: "local",
          storagePath: relativePath,
          fileHash: fileHash,
          fileSize: fileSize,
        },
      });
    }

    // Link and nullify blob on PolicyRecord
    await prisma.policyRecord.update({
      where: { id: policy.id },
      data: {
        uploadedFileId: fileId,
        pdfBytes: null, // Reclaim space
      },
    });
    console.log(
      `Successfully migrated PolicyRecord ${policy.id} to storage path: ${relativePath} (Linked File ID: ${fileId})`,
    );
  }

  console.log("Database migration and file extraction completed successfully!");
}

main()
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
