export default function PreviewField({
  label,
  meta,
  value,
  onChange,
  type = "text",
  wide,
  options,
  error,
  disabled,
  suggestion,
  onApplySuggestion,
  insuredName,
  contactNumber,
  email,
}) {
  const metaClass = meta ? `meta-${meta.toLowerCase().replace(" ", "-")}` : "";
  const hasSuggestion = Boolean(suggestion?.suggestedValue);
  const labelEl = (
    <span>
      {label}
      {meta ? <em className={metaClass}>{meta}</em> : null}
      {hasSuggestion ? <em className="meta-ai-suggestion">AI suggestion available</em> : null}
    </span>
  );

  let inputEl;
  if (wide) {
    inputEl = (
      <textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />
    );
  } else if (options?.length) {
    inputEl = (
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    inputEl = (
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    );
  }

  const classes = [wide ? "wide" : "", error ? "has-error" : "", disabled ? "is-disabled" : ""]
    .filter(Boolean)
    .join(" ");

  const isClientId = label === "Client ID";

  return (
    <label className={classes}>
      {labelEl}
      {inputEl}
      {isClientId && (
        <ClientIdSearch
          value={value}
          onChange={onChange}
          disabled={disabled}
          insuredName={insuredName}
          contactNumber={contactNumber}
          email={email}
        />
      )}
      {hasSuggestion ? (
        <div className="ai-suggestion-card">
          <div>
            <strong>Suggested value</strong>
            <span>{suggestion.suggestedValue}</span>
          </div>
          <div>
            <strong>Current value</strong>
            <span>{value || "-"}</span>
          </div>
          {suggestion.evidenceText ? <blockquote>{suggestion.evidenceText}</blockquote> : null}
          <button
            type="button"
            onClick={() =>
              onApplySuggestion ? onApplySuggestion(suggestion) : onChange(suggestion.suggestedValue)
            }
            disabled={disabled}
          >
            Apply Suggestion
          </button>
        </div>
      ) : null}
      {error ? <span className="field-error-message">{error}</span> : null}
    </label>
  );
}

import { useState, useEffect } from "react";

function ClientIdSearch({ value, onChange, disabled, insuredName, contactNumber, email }) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState("");

  const [autoSuggestedClient, setAutoSuggestedClient] = useState(null);

  useEffect(() => {
    if (value && value.length === 36) {
      fetch(`/api/customer-profiles/${value}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.name) {
            setSelectedClientName(data.name);
          }
        })
        .catch(() => {});
    } else {
      setSelectedClientName("");
    }
  }, [value]);

  useEffect(() => {
    if (value) {
      setAutoSuggestedClient(null);
      return;
    }

    const runAutoMatch = async () => {
      const cleanPhone = contactNumber ? contactNumber.replace(/[^0-9]/g, "") : "";
      const searchTerms = [];
      if (cleanPhone && cleanPhone.length >= 10) {
        searchTerms.push(cleanPhone.slice(-10));
      }
      if (email && email.includes("@")) {
        searchTerms.push(email);
      }
      if (insuredName && insuredName.trim().length > 3) {
        searchTerms.push(insuredName.trim());
      }

      if (searchTerms.length === 0) {
        setAutoSuggestedClient(null);
        return;
      }

      try {
        for (const term of searchTerms) {
          const res = await fetch(`/api/customer-profiles?page=1&limit=1&q=${encodeURIComponent(term)}`);
          if (res.ok) {
            const data = await res.json();
            if (data.profiles && data.profiles.length > 0) {
              setAutoSuggestedClient(data.profiles[0]);
              break;
            }
          }
        }
      } catch (err) {
        console.error("Auto-match check error:", err);
      }
    };

    const timer = window.setTimeout(runAutoMatch, 600);
    return () => window.clearTimeout(timer);
  }, [value, insuredName, contactNumber, email]);

  const handleSearch = async (val) => {
    setQuery(val);
    if (val.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(`/api/customer-profiles?page=1&limit=5&q=${encodeURIComponent(val)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.profiles || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="client-id-search-container" style={{ marginTop: "6px", display: "block", width: "100%" }}>
      {selectedClientName && (
        <div style={{ fontSize: "11.5px", color: "#059669", marginBottom: "4px", fontWeight: "600" }}>
          ✓ Linked Client: {selectedClientName}
        </div>
      )}
      {!value && autoSuggestedClient && (
        <div style={{
          fontSize: "11px",
          color: "#0369a1",
          background: "#f0f9ff",
          border: "1px dashed #bae6fd",
          borderRadius: "6px",
          padding: "8px",
          marginBottom: "6px",
          display: "block"
        }}>
          💡 <strong>Auto-Match Found:</strong> Suggesting client profile:
          <div style={{ margin: "3px 0", fontWeight: "750", color: "#0f172a" }}>
            {autoSuggestedClient.name} ({autoSuggestedClient.phone || "No phone"})
          </div>
          <button
            type="button"
            style={{
              background: "#0284c7",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "10px",
              fontWeight: "700",
              cursor: "pointer",
              marginTop: "4px",
              display: "inline-block"
            }}
            onClick={() => {
              onChange(autoSuggestedClient.id);
              setSelectedClientName(autoSuggestedClient.name);
              setAutoSuggestedClient(null);
            }}
          >
            Link Client Profile
          </button>
        </div>
      )}
      <button
        type="button"
        style={{
          background: "none",
          border: "none",
          padding: 0,
          color: "#2563eb",
          textDecoration: "underline",
          fontSize: "11px",
          fontWeight: "600",
          cursor: "pointer",
        }}
        onClick={() => setShowSearch(!showSearch)}
        disabled={disabled}
      >
        {showSearch ? "Hide client search" : "🔍 Search & Link Client Profile"}
      </button>
      {showSearch && (
        <div style={{
          marginTop: "6px",
          padding: "8px",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
        }}>
          <input
            type="text"
            placeholder="Type name, phone or email..."
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "4px 8px",
              fontSize: "11.5px",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              marginBottom: "4px",
              outline: "none",
              background: "#ffffff",
              color: "#000000"
            }}
          />
          {searching && <div style={{ fontSize: "10px", color: "#64748b" }}>Searching...</div>}
          {!searching && query.trim().length >= 2 && results.length === 0 && (
            <div style={{ fontSize: "10px", color: "#94a3b8" }}>No matching clients found.</div>
          )}
          {results.length > 0 && (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {results.map((profile) => (
                <li key={profile.id} style={{ margin: "4px 0" }}>
                  <button
                    type="button"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "6px 8px",
                      fontSize: "11px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "4px",
                      cursor: "pointer",
                      color: "#1e293b"
                    }}
                    onClick={() => {
                      onChange(profile.id);
                      setSelectedClientName(profile.name);
                      setShowSearch(false);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <div style={{ fontWeight: "700" }}>{profile.name}</div>
                    <div style={{ fontSize: "9.5px", color: "#64748b" }}>
                      Phone: {profile.phone || "No phone"} | ID: {profile.id.slice(0, 8)}...
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
