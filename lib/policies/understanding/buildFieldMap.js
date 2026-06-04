function buildFieldMap(understanding = {}, schema = {}) {
  const sections = understanding.sections || [];
  const tables = understanding.tables || [];
  const fields = schema.fields || [];

  return fields.map((field) => {
    const section = sections.find((candidate) => candidate.type === field.section) ||
      findSectionByAliases(sections, field.aliases || []);
    const relatedTables = tables.filter((table) => section && Math.abs(table.startLine - section.startLine) < 80);
    return {
      field: field.field,
      aliases: field.aliases || [],
      type: field.type || "string",
      required: Boolean(field.required),
      section: field.section || section?.type || "",
      sectionMatch: section || null,
      relatedTables: relatedTables.map((table) => ({ type: table.type, page: table.page, startLine: table.startLine }))
    };
  });
}

function findSectionByAliases(sections, aliases) {
  return sections.find((section) => aliases.some((alias) => new RegExp(escapeRegExp(alias), "i").test(section.text || section.matchedLabel || "")));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = { buildFieldMap };
