require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Applying targeted corrections for Vivek Chourasia and MP Board...');

  // 1. Vivek Chourasia
  const vivek = await prisma.policyRecord.findFirst({
    where: {
      sourceFile: { contains: 'YDT4H78312' }
    }
  });

  if (vivek) {
    const updatedReviewed = {
      ...(vivek.reviewedData || {}),
      registrationNumber: 'NEW',
      vehicleNumber: 'NEW',
      makeModel: 'M & M SCORPIO N Z8 SELECT 2WD DIESEL 7 STR SUV',
      chassisNumber: 'MA1TJ2YD6T6H64842',
      engineNumber: 'YDT4H78312',
      manufacturingYear: '2026',
      seatingCapacity: '7',
      cubicCapacity: '2184',
    };
    const updatedData = {
      ...(vivek.data || {}),
      ...updatedReviewed,
    };

    await prisma.policyRecord.update({
      where: { id: vivek.id },
      data: {
        reviewedData: updatedReviewed,
        data: updatedData,
      }
    });
    console.log('✓ Corrected Vivek Chourasia:', {
      vehicleNumber: 'NEW',
      makeModel: 'M & M SCORPIO N Z8 SELECT 2WD DIESEL 7 STR SUV',
      chassisNumber: 'MA1TJ2YD6T6H64842',
      engineNumber: 'YDT4H78312'
    });
  }

  // 2. MP Board
  const mpBoard = await prisma.policyRecord.findFirst({
    where: {
      sourceFile: { contains: 'NSD4WXE0247' }
    }
  });

  if (mpBoard) {
    const updatedReviewed = {
      ...(mpBoard.reviewedData || {}),
      registrationNumber: 'MP40',
      vehicleNumber: 'MP40',
    };
    const updatedData = {
      ...(mpBoard.data || {}),
      ...updatedReviewed,
    };

    await prisma.policyRecord.update({
      where: { id: mpBoard.id },
      data: {
        reviewedData: updatedReviewed,
        data: updatedData,
      }
    });
    console.log('✓ Corrected MP Board:', {
      vehicleNumber: 'MP40',
      registrationNumber: 'MP40'
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
