import { prisma } from "@/lib/prisma";
import { DEFAULT_BANK_SOURCES, DEFAULT_CATEGORIES, DEFAULT_COMPANIES, DEFAULT_POLICY_TYPES, FIELD_TYPES } from "@/lib/policy-defaults";

let seeded = false;

export async function ensureDefaultFieldSetup() {
  if (seeded) return;

  for (const source of DEFAULT_BANK_SOURCES) {
    await prisma.bankSource.upsert({
      where: { name: source.name },
      update: { aliases: source.aliases, active: true },
      create: { name: source.name, aliases: source.aliases }
    });
  }

  for (const company of DEFAULT_COMPANIES) {
    await prisma.insuranceCompany.upsert({
      where: { name: company.name },
      update: { aliases: company.aliases, active: true },
      create: { name: company.name, aliases: company.aliases }
    });
  }

  for (const category of DEFAULT_CATEGORIES) {
    await prisma.serviceCategory.upsert({
      where: { name: category.name },
      update: { aliases: category.aliases, keywords: category.keywords, active: true },
      create: { name: category.name, aliases: category.aliases, keywords: category.keywords }
    });
  }

  for (const type of DEFAULT_POLICY_TYPES) {
    const category = await prisma.serviceCategory.findUnique({ where: { name: type.category } });
    if (!category) continue;
    const company = type.company
      ? await prisma.insuranceCompany.findUnique({ where: { name: type.company } })
      : null;

    const existingPolicyType = await prisma.policyType.findFirst({
      where: { name: type.name, insuranceCompanyId: company?.id || null, serviceCategoryId: category.id }
    });
    const policyType = existingPolicyType
      ? await prisma.policyType.update({
          where: { id: existingPolicyType.id },
          data: { aliases: type.aliases, keywords: type.keywords, insuranceCompanyId: company?.id || null, active: true }
        })
      : await prisma.policyType.create({
        data: {
        name: type.name,
        aliases: type.aliases,
        keywords: type.keywords,
        insuranceCompanyId: company?.id || null,
        serviceCategoryId: category.id
        }
      });

    const schema = await prisma.policySchema.upsert({
      where: { policyTypeId_version: { policyTypeId: policyType.id, version: 1 } },
      update: {
        active: true,
        bankSourceId: null,
        serviceCategoryId: category.id,
        insuranceCompanyId: policyType.insuranceCompanyId
      },
      create: {
        policyTypeId: policyType.id,
        bankSourceId: null,
        serviceCategoryId: category.id,
        insuranceCompanyId: policyType.insuranceCompanyId,
        version: 1
      }
    });

    for (const [index, field] of type.fields.entries()) {
      await prisma.fieldDefinition.upsert({
        where: { policySchemaId_key: { policySchemaId: schema.id, key: field.key } },
        update: { ...field, order: index },
        create: { ...field, order: index, policySchemaId: schema.id }
      });
    }
  }

  seeded = true;
}

export async function getFieldSetupCatalog() {
  await ensureDefaultFieldSetup();

  const [bankSources, companies, categories, policyTypes] = await Promise.all([
    prisma.bankSource.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.insuranceCompany.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.serviceCategory.findMany({ where: { active: true }, orderBy: { name: "asc" } }),
    prisma.policyType.findMany({
      where: { active: true },
      include: { insuranceCompany: true, serviceCategory: true, schemas: { where: { active: true }, include: { fields: { orderBy: { order: "asc" } } } } },
      orderBy: { name: "asc" }
    })
  ]);

  return {
    fieldTypes: FIELD_TYPES,
    bankSources,
    companies,
    categories,
    policyTypes: policyTypes.map(serializePolicyType)
  };
}

export async function getPolicySchema({ bankSourceId, companyId, categoryId, policyTypeId }) {
  await ensureDefaultFieldSetup();

  const policyType = await prisma.policyType.findFirst({
    where: policyTypeId
      ? { id: policyTypeId, active: true }
      : {
          active: true,
          serviceCategoryId: categoryId || undefined,
          OR: [{ insuranceCompanyId: companyId || null }, { insuranceCompanyId: null }]
        },
    include: {
      insuranceCompany: true,
      serviceCategory: true,
      schemas: false
    }
  });

  if (!policyType) return null;

  const schema = await findBestSchema({
    bankSourceId,
    companyId,
    categoryId: categoryId || policyType.serviceCategoryId,
    policyTypeId: policyType.id
  });

  if (!schema) return null;
  return serializeSchema(policyType, schema);
}

export async function createFieldSetup(payload) {
  await ensureDefaultFieldSetup();
  const preparedPayload = {
    ...payload,
    categoryName: clean(payload.categoryName || payload.categoryId) ? payload.categoryName : "Commercial Insurance"
  };
  validateFieldSetupPayload(preparedPayload);

  const bankSource = preparedPayload.bankSourceName
    ? await prisma.bankSource.upsert({
        where: { name: clean(preparedPayload.bankSourceName) },
        update: { aliases: toList(preparedPayload.bankSourceAliases), active: true },
        create: { name: clean(preparedPayload.bankSourceName), aliases: toList(preparedPayload.bankSourceAliases) }
      })
    : preparedPayload.bankSourceId
      ? await prisma.bankSource.findUnique({ where: { id: preparedPayload.bankSourceId } })
      : null;

  const company = preparedPayload.companyName
    ? await prisma.insuranceCompany.upsert({
        where: { name: clean(preparedPayload.companyName) },
        update: { aliases: toList(preparedPayload.companyAliases), active: true },
        create: { name: clean(preparedPayload.companyName), aliases: toList(preparedPayload.companyAliases) }
      })
    : preparedPayload.companyId
      ? await prisma.insuranceCompany.findUnique({ where: { id: preparedPayload.companyId } })
      : null;

  const category = preparedPayload.categoryName
    ? await prisma.serviceCategory.upsert({
        where: { name: clean(preparedPayload.categoryName) },
        update: { aliases: toList(preparedPayload.categoryAliases), keywords: toList(preparedPayload.categoryKeywords), active: true },
        create: {
          name: clean(preparedPayload.categoryName),
          aliases: toList(preparedPayload.categoryAliases),
          keywords: toList(preparedPayload.categoryKeywords)
        }
      })
    : await prisma.serviceCategory.findUnique({ where: { id: preparedPayload.categoryId } });

  if (!category) {
    throw new Error("Service category is required.");
  }

  const policyName = clean(preparedPayload.policyTypeName);
  if (!policyName) {
    throw new Error("Policy type name is required.");
  }

  const existingPolicyType = await prisma.policyType.findFirst({
    where: {
      name: policyName,
      insuranceCompanyId: company?.id || null,
      serviceCategoryId: category.id
    }
  });
  const policyType = existingPolicyType
    ? await prisma.policyType.update({
        where: { id: existingPolicyType.id },
        data: {
          aliases: toList(preparedPayload.policyTypeAliases),
          keywords: toList(preparedPayload.policyTypeKeywords),
          active: true
        }
      })
    : await prisma.policyType.create({
      data: {
      name: policyName,
      aliases: toList(preparedPayload.policyTypeAliases),
      keywords: toList(preparedPayload.policyTypeKeywords),
      insuranceCompanyId: company?.id || null,
      serviceCategoryId: category.id
      }
    });

  const latest = await prisma.policySchema.findFirst({
    where: { policyTypeId: policyType.id },
    orderBy: { version: "desc" }
  });

  await prisma.policySchema.updateMany({
    where: {
      active: true,
      policyTypeId: policyType.id,
      bankSourceId: bankSource?.id || null,
      insuranceCompanyId: company?.id || null,
      serviceCategoryId: category.id
    },
    data: { active: false }
  });

  const schema = await prisma.policySchema.create({
    data: {
      policyTypeId: policyType.id,
      bankSourceId: bankSource?.id || null,
      insuranceCompanyId: company?.id || null,
      serviceCategoryId: category.id,
      version: (latest?.version || 0) + 1
    }
  });

  const fields = Array.isArray(preparedPayload.fields) ? preparedPayload.fields : [];
  for (const [index, rawField] of fields.entries()) {
    const key = cleanKey(rawField.key || rawField.label);
    if (!key) continue;
    await prisma.fieldDefinition.create({
      data: {
        policySchemaId: schema.id,
        key,
        label: clean(rawField.label) || key,
        fieldType: FIELD_TYPES.includes(rawField.fieldType) ? rawField.fieldType : "text",
        required: Boolean(rawField.required),
        aliases: toList(rawField.aliases),
        options: toList(rawField.options),
        regexPattern: clean(rawField.regexPattern),
        section: clean(rawField.section),
        active: rawField.active !== false,
        order: index
      }
    });
  }

  return getPolicySchema({
    bankSourceId: bankSource?.id,
    companyId: company?.id,
    categoryId: category.id,
    policyTypeId: policyType.id
  });
}

export function serializeSchema(policyType, schema) {
  return {
    id: schema.id,
    version: schema.version,
    fallbackLevel: schema.fallbackLevel || "Exact match",
    fallbackUsed: Boolean(schema.fallbackUsed),
    policyType: serializePolicyType({ ...policyType, schemas: undefined }),
    bankSource: schema.bankSource || null,
    company: schema.insuranceCompany || policyType.insuranceCompany || null,
    category: schema.serviceCategory || policyType.serviceCategory,
    fields: schema.fields.filter((field) => field.active !== false).map((field) => ({
      id: field.id,
      key: field.key,
      label: field.label,
      fieldType: field.fieldType,
      required: field.required,
      options: field.options || [],
      aliases: field.aliases || [],
      regexPattern: field.regexPattern || "",
      section: field.section || "",
      active: field.active,
      order: field.order
    }))
  };
}

async function findBestSchema({ bankSourceId, companyId, categoryId, policyTypeId }) {
  const candidates = await prisma.policySchema.findMany({
    where: {
      active: true,
      policyTypeId
    },
    include: {
      bankSource: true,
      insuranceCompany: true,
      serviceCategory: true,
      fields: { orderBy: { order: "asc" } }
    },
    orderBy: { version: "desc" }
  });

  const levels = [
    {
      label: "Exact match: Bank + Company + Category + Policy",
      fallbackUsed: false,
      match: (schema) =>
        schema.bankSourceId === (bankSourceId || null) &&
        schema.insuranceCompanyId === (companyId || null) &&
        schema.serviceCategoryId === (categoryId || null)
    },
    {
      label: "Fallback schema used: Company + Category + Policy",
      fallbackUsed: true,
      match: (schema) =>
        !schema.bankSourceId &&
        schema.insuranceCompanyId === (companyId || null) &&
        schema.serviceCategoryId === (categoryId || null)
    },
    {
      label: "Fallback schema used: Category + Policy",
      fallbackUsed: true,
      match: (schema) =>
        !schema.bankSourceId &&
        !schema.insuranceCompanyId &&
        schema.serviceCategoryId === (categoryId || null)
    },
    {
      label: "Fallback schema used: Policy only",
      fallbackUsed: true,
      match: (schema) => !schema.bankSourceId && !schema.insuranceCompanyId && !schema.serviceCategoryId
    },
    {
      label: "Fallback schema used: Policy name match",
      fallbackUsed: true,
      match: () => true
    }
  ];

  for (const level of levels) {
    const match = candidates.filter(level.match).sort((a, b) => b.version - a.version)[0];
    if (match) return { ...match, fallbackLevel: level.label, fallbackUsed: level.fallbackUsed };
  }

  return null;
}

function serializePolicyType(policyType) {
  const schema = policyType.schemas?.[0];
  return {
    id: policyType.id,
    name: policyType.name,
    aliases: policyType.aliases || [],
    keywords: policyType.keywords || [],
    insuranceCompanyId: policyType.insuranceCompanyId,
    serviceCategoryId: policyType.serviceCategoryId,
    companyName: policyType.insuranceCompany?.name || "",
    categoryName: policyType.serviceCategory?.name || "",
    schemaId: schema?.id || "",
    schemaVersion: schema?.version || null,
    fields: schema?.fields || []
  };
}

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function cleanKey(value) {
  const text = clean(value);
  if (!text) return "";
  return text
    .replace(/[^a-zA-Z0-9 ]/g, " ")
    .replace(/\s+([a-zA-Z0-9])/g, (_, letter) => letter.toUpperCase())
    .replace(/^./, (letter) => letter.toLowerCase());
}

function toList(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return String(value || "")
    .split(/\n|,/)
    .map(clean)
    .filter(Boolean);
}

function validateFieldSetupPayload(payload) {
  const policyName = clean(payload.policyTypeName);
  const fields = Array.isArray(payload.fields) ? payload.fields : [];

  if (!policyName) throw new Error("Policy type is required.");
  if (!fields.length) throw new Error("At least one field is required.");

  const seen = new Set();
  for (const field of fields) {
    const key = cleanKey(field.key || field.label);
    const label = clean(field.label);
    if (!key) throw new Error("Every field needs a key.");
    if (!label) throw new Error(`Field "${key}" needs a label.`);
    if (seen.has(key)) throw new Error(`Duplicate field key "${key}" in this schema.`);
    seen.add(key);
    if (!FIELD_TYPES.includes(field.fieldType || "text")) throw new Error(`Invalid field type for "${key}".`);
    if (field.regexPattern) {
      try {
        new RegExp(field.regexPattern);
      } catch {
        throw new Error(`Invalid regex pattern for "${key}".`);
      }
    }
    if (field.fieldType === "dropdown" && !toList(field.options).length) {
      throw new Error(`Dropdown field "${key}" needs at least one option.`);
    }
  }
}
