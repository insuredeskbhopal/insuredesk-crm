import { useState, useEffect } from "react";
import { ShieldCheck } from "lucide-react";
import { FIELD_SETUP, POLICY_SCHEMA_LIBRARY } from "@/app/lib/dashboard-helpers";

export default function FieldSetupPanel() {
  const [selectedGroupId, setSelectedGroupId] = useState(POLICY_SCHEMA_LIBRARY[0]?.id || "");
  const selectedGroup =
    POLICY_SCHEMA_LIBRARY.find((group) => group.id === selectedGroupId) || POLICY_SCHEMA_LIBRARY[0];
  const [selectedPolicyId, setSelectedPolicyId] = useState(selectedGroup?.policies?.[0]?.id || "");
  const selectedPolicy =
    selectedGroup?.policies.find((policy) => policy.id === selectedPolicyId) || selectedGroup?.policies?.[0];
  const visibleFields = FIELD_SETUP.filter(([, key]) => selectedPolicy?.fields.includes(key));

  useEffect(() => {
    if (!selectedGroup?.policies.some((policy) => policy.id === selectedPolicyId)) {
      setSelectedPolicyId(selectedGroup?.policies?.[0]?.id || "");
    }
  }, [selectedGroup, selectedPolicyId]);

  return (
    <section className="glass-panel field-setup-panel">
      <div className="panel-head">
        <div>
          <p className="eyebrow">Configuration</p>
          <h2>Prisma-backed field setup</h2>
        </div>
        <button type="button">
          <ShieldCheck size={17} /> Prisma Schema Active
        </button>
      </div>
      <div className="schema-browser">
        <aside className="schema-groups">
          <p className="schema-title">Policy Families</p>
          <div className="schema-group-list">
            {POLICY_SCHEMA_LIBRARY.map((group) => (
              <button
                key={group.id}
                type="button"
                className={`schema-group-card ${group.id === selectedGroup?.id ? "active" : ""}`}
                onClick={() => setSelectedGroupId(group.id)}
              >
                <strong>{group.label}</strong>
                <span>{group.description}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="schema-catalog">
          <div className="schema-catalog-head">
            <div>
              <p className="schema-title">Schemas</p>
              <h3>{selectedGroup?.label}</h3>
            </div>
            <span>{selectedGroup?.policies.length || 0} formats</span>
          </div>
          <div className="schema-chip-list">
            {selectedGroup?.policies.map((policy) => (
              <button
                key={policy.id}
                type="button"
                className={`schema-chip ${policy.id === selectedPolicy?.id ? "active" : ""}`}
                onClick={() => setSelectedPolicyId(policy.id)}
              >
                {policy.name}
              </button>
            ))}
          </div>
          <div className="schema-meta">
            <div>
              <span>Selected Schema</span>
              <strong>{selectedPolicy?.name || "-"}</strong>
            </div>
            <div>
              <span>Mapped Fields</span>
              <strong>{visibleFields.length}</strong>
            </div>
          </div>
          <div className="table-wrap schema-table-wrap">
            <table className="schema-table">
              <colgroup>
                <col style={{ width: "34%" }} />
                <col style={{ width: "66%" }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Field Name</th>
                  <th>Prisma Key</th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.map(([label, key]) => (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>
                      <span className="record-code">{key}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </section>
  );
}
