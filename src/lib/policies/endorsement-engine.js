/**
 * Endorsement Calculation Engine & Financial History Processor
 * Single Source of Truth for Policy Financials as of any Date.
 */

export function parseNumber(val) {
  if (typeof val === "number") return val;
  const str = String(val || "").replace(/[^0-9.-]/g, "");
  const num = parseFloat(str);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Calculates current live policy state as of a given target date.
 * Base policy values remain immutable. Current values are derived from endorsement history.
 */
export function getPolicyFinancialsAsOf(policy, endorsements = [], asOfDate = new Date()) {
  const targetDate = new Date(asOfDate);
  const data = policy?.data || policy?.extractedData || policy || {};

  const basePremium = parseNumber(data.basePremium || data.netPremium || data.basicPremium || data.premium);
  const baseGrossPremium = parseNumber(data.baseGrossPremium || data.totalPremium || data.grossPremium);
  const baseSumInsured = parseNumber(data.baseSumInsured || data.sumInsured || data.totalIdv);

  let netPremiumDelta = 0;
  let grossPremiumDelta = 0;
  let sumInsuredDelta = 0;
  const activeImpacts = [];
  const activeLocations = [];
  const activeBankClauses = [];
  const activeCommodities = [];

  // Filter completed or active endorsements with effectiveDate <= targetDate
  const effectiveEndorsements = endorsements.filter((e) => {
    if (e.status === "CANCELLED" || e.status === "REJECTED") return false;
    const effDate = e.effectiveDate ? new Date(e.effectiveDate) : e.createdAt ? new Date(e.createdAt) : null;
    return effDate && effDate <= targetDate;
  });

  effectiveEndorsements.forEach((e) => {
    // Process Premium Deltas
    const premAmount = parseNumber(e.premiumChangeAmount || e.premiumDelta || e.premium);
    if (e.premiumChangeType === "INCREASE" || String(e.endorsementType).toLowerCase().includes("addition in premium")) {
      netPremiumDelta += Math.abs(premAmount);
      grossPremiumDelta += Math.abs(premAmount) + parseNumber(e.gstPart);
    } else if (e.premiumChangeType === "DECREASE" || String(e.endorsementType).toLowerCase().includes("deletion in premium")) {
      netPremiumDelta -= Math.abs(premAmount);
      grossPremiumDelta -= Math.abs(premAmount) + parseNumber(e.gstPart);
    }

    // Process Sum Insured Deltas
    const siAmount = parseNumber(e.sumInsuredChangeAmount || e.sumInsuredDelta || e.sumInsured);
    if (e.sumInsuredChangeType === "INCREASE" || String(e.endorsementType).toLowerCase().includes("addition in sum insured")) {
      sumInsuredDelta += Math.abs(siAmount);
    } else if (e.sumInsuredChangeType === "DECREASE" || String(e.endorsementType).toLowerCase().includes("deletion in sum insured")) {
      sumInsuredDelta -= Math.abs(siAmount);
    }

    // Process Structured Multi-Impacts
    const impacts = Array.isArray(e.impacts) ? e.impacts : [];
    impacts.forEach((imp) => {
      activeImpacts.push(imp);
      if (imp.impactCategory === "LOCATION") {
        if (imp.changeType === "ADDITION") activeLocations.push(imp.details);
        else if (imp.changeType === "REMOVAL") {
          const idx = activeLocations.indexOf(imp.details);
          if (idx !== -1) activeLocations.splice(idx, 1);
        }
      } else if (imp.impactCategory === "BANK_CLAUSE") {
        if (imp.changeType === "ADDITION") activeBankClauses.push(imp.details);
        else if (imp.changeType === "REMOVAL") {
          const idx = activeBankClauses.indexOf(imp.details);
          if (idx !== -1) activeBankClauses.splice(idx, 1);
        }
      } else if (imp.impactCategory === "COMMODITY") {
        if (imp.changeType === "ADDITION") activeCommodities.push(imp.details);
        else if (imp.changeType === "REMOVAL") {
          const idx = activeCommodities.indexOf(imp.details);
          if (idx !== -1) activeCommodities.splice(idx, 1);
        }
      }
    });
  });

  const currentNetPremium = Math.max(0, basePremium + netPremiumDelta);
  const currentGrossPremium = Math.max(0, baseGrossPremium + grossPremiumDelta);
  const currentSumInsured = Math.max(0, baseSumInsured + sumInsuredDelta);

  return {
    basePremium,
    baseGrossPremium,
    baseSumInsured,
    currentNetPremium,
    currentGrossPremium,
    currentSumInsured,
    netPremiumDelta,
    grossPremiumDelta,
    sumInsuredDelta,
    effectiveEndorsementsCount: effectiveEndorsements.length,
    totalEndorsementsCount: endorsements.length,
    activeImpacts,
    activeLocations,
    activeBankClauses,
    activeCommodities,
  };
}

/**
 * Derives pending document aging status.
 */
export function getEndorsementAging(endorsement) {
  if (endorsement.documentStatus === "VERIFIED" || endorsement.status === "COMPLETED") {
    return { days: 0, statusLabel: "Completed", isEscalated: false, color: "#10b981" };
  }

  const created = endorsement.createdAt ? new Date(endorsement.createdAt) : new Date();
  const now = new Date();
  const diffTime = Math.abs(now - created);
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (days >= 21) {
    return { days, statusLabel: `Waiting ${days} Days ⚠️ Escalate`, isEscalated: true, color: "#ef4444" };
  } else if (days >= 7) {
    return { days, statusLabel: `Waiting ${days} Days`, isEscalated: false, color: "#f59e0b" };
  }
  return { days, statusLabel: `Waiting ${days} Days`, isEscalated: false, color: "#3b82f6" };
}
