const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// Helper to recursively copy directories while ignoring folders
function copyDirSync(src, dest, ignoreList) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();

  if (isDirectory) {
    const baseName = path.basename(src);
    if (ignoreList.some(ignore => baseName === ignore)) {
      return;
    }
    if (!fs.existsSync(dest)) {
      fs.mkdirSync(dest, { recursive: true });
    }
    fs.readdirSync(src).forEach((childItemName) => {
      copyDirSync(
        path.join(src, childItemName),
        path.join(dest, childItemName),
        ignoreList
      );
    });
  } else {
    const baseName = path.basename(src);
    if (ignoreList.some(ignore => baseName === ignore)) {
      return;
    }
    fs.copyFileSync(src, dest);
  }
}

async function backupDatabase(backupDir, timestamp) {
  console.log("--- Starting Database Backup ---");
  const backupData = {};
  
  // Find all keys on prisma client that represent models
  const keys = Object.keys(prisma);
  const models = keys.filter(key => !key.startsWith('$') && !key.startsWith('_'));
  
  console.log(`Found ${models.length} models in Prisma schema.`);
  
  for (const model of models) {
    try {
      if (typeof prisma[model]?.findMany === 'function') {
        console.log(`Fetching records for model: ${model}...`);
        const data = await prisma[model].findMany();
        backupData[model] = data;
        console.log(`- Saved ${data.length} records.`);
      }
    } catch (err) {
      console.error(`Error backing up model ${model}:`, err.message);
    }
  }

  const dbBackupFile = path.join(backupDir, `db_backup_${timestamp}.json`);
  fs.writeFileSync(dbBackupFile, JSON.stringify(backupData, null, 2));
  console.log(`Database backup saved successfully to: ${dbBackupFile}`);
  return dbBackupFile;
}

function backupCode(projectRoot, backupDir, timestamp) {
  console.log("--- Starting Codebase Backup ---");
  const codeBackupDir = path.join(backupDir, `code_backup_${timestamp}`);
  
  const ignoreList = [
    'node_modules',
    '.next',
    '.git',
    'archive',
    'artifacts',
    'tsconfig.tsbuildinfo',
    '.vercel'
  ];

  console.log(`Copying code files (ignoring: ${ignoreList.join(', ')})...`);
  copyDirSync(projectRoot, codeBackupDir, ignoreList);
  console.log(`Codebase backup copied successfully to: ${codeBackupDir}`);
  return codeBackupDir;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const projectRoot = path.resolve(__dirname, '..');
  const backupRoot = path.join(projectRoot, 'archive');

  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true });
  }

  const sessionBackupDir = path.join(backupRoot, `backup_${timestamp}`);
  fs.mkdirSync(sessionBackupDir, { recursive: true });

  console.log(`Creating backups in: ${sessionBackupDir}`);

  let dbFile = "";
  try {
    dbFile = await backupDatabase(sessionBackupDir, timestamp);
  } catch (err) {
    console.error("Database backup failed:", err);
  }

  let codeDir = "";
  try {
    codeDir = backupCode(projectRoot, sessionBackupDir, timestamp);
  } catch (err) {
    console.error("Codebase backup failed:", err);
  }

  console.log("\n==========================================");
  console.log("Backup Complete!");
  if (dbFile) console.log(`- Database backup: ${dbFile}`);
  if (codeDir) console.log(`- Code backup folder: ${codeDir}`);
  console.log("==========================================");
}

main()
  .catch(err => console.error("Unhandled backup error:", err))
  .finally(() => prisma.$disconnect());
