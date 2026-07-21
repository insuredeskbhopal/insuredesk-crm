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
  onClientIdRequestChange,
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
          onClientIdRequestChange={onClientIdRequestChange}
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

import { useState, useEffect, useRef } from "react";
import { matchesClientAccountIdentity } from "@/lib/client-accounts/utils";

function ClientIdSearch({ value, onChange, disabled, insuredName, contactNumber, email, onClientIdRequestChange }) {
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedClientName, setSelectedClientName] = useState("");
  const [clientIdRequest, setClientIdRequest] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const notifiedRequestId = useRef("");

  const [autoSuggestedClient, setAutoSuggestedClient] = useState(null);

  useEffect(() => {
    if (value && value.length === 36) {
      const controller = new window.AbortController();
      fetch(`/api/client-accounts/${value}`, { signal: controller.signal })
        .then((res) => res.json())
        .then((data) => {
          if (data?.name) {
            setSelectedClientName(data.name);
          }
        })
        .catch(() => {});
      return () => controller.abort();
    } else {
      setSelectedClientName("");
    }
    return undefined;
  }, [value]);

  useEffect(() => {
    if (value) {
      setAutoSuggestedClient(null);
      return;
    }

    const controller = new window.AbortController();
    const runAutoMatch = async () => {
      const cleanPhone = contactNumber ? contactNumber.replace(/[^0-9]/g, "") : "";
      const searchTerms = [];
      if (cleanPhone && cleanPhone.length >= 10) {
        searchTerms.push(cleanPhone.slice(-10));
      }
      if (email && email.includes("@")) {
        searchTerms.push(email);
      }
      if (!insuredName?.trim() || searchTerms.length === 0) {
        setAutoSuggestedClient(null);
        return;
      }

      setAutoSuggestedClient(null);
      try {
        for (const term of searchTerms) {
          const res = await fetch(`/api/client-accounts?page=1&limit=5&q=${encodeURIComponent(term)}`, {
            signal: controller.signal,
          });
          if (res.ok) {
            const data = await res.json();
            const matches = data.accounts || data.profiles || [];
            const identityMatch = matches.find((profile) =>
              matchesClientAccountIdentity(profile, { insuredName, contactNumber, email }),
            );
            if (identityMatch) {
              setAutoSuggestedClient(identityMatch);
              break;
            }
          }
        }
      } catch (err) {
        if (err?.name !== "AbortError") console.error("Auto-match check error:", err);
      }
    };

    const timer = window.setTimeout(runAutoMatch, 600);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [value, insuredName, contactNumber, email]);

  useEffect(() => {
    if (value || !insuredName?.trim()) return;
    const cleanPhone = contactNumber?.replace(/[^0-9]/g, "").slice(-10);
    if (cleanPhone?.length !== 10) return;

    let active = true;
    let timer;
    let inFlight = false;
    let shouldPoll = true;
    const controller = new window.AbortController();
    const scheduleNextCheck = () => {
      window.clearTimeout(timer);
      if (!active || !shouldPoll || document.hidden) return;
      timer = window.setTimeout(() => {
        timer = undefined;
        checkRequest();
      }, 10000);
    };
    const checkRequest = async () => {
      if (!active || inFlight || document.hidden) return;
      inFlight = true;
      try {
        const params = new window.URLSearchParams({
          mine: "1",
          phone: cleanPhone,
          name: insuredName.trim(),
        });
        const res = await fetch(`/api/client-id-requests?${params}`, { signal: controller.signal });
        if (!res.ok || !active) {
          shouldPoll = true;
          return;
        }
        const data = await res.json();
        const item = data.requests?.[0] || null;
        shouldPoll = Boolean(item?.id && item.status !== "COMPLETED");
        setClientIdRequest(item);
        if (item?.status === "COMPLETED" && item.resolvedClientId) {
          setSelectedClientName(item.resolvedClientName || "Client");
          if (notifiedRequestId.current) {
            notifiedRequestId.current = "";
            onClientIdRequestChange?.("");
          }
          onChange(item.resolvedClientId);
        } else if (item?.id && notifiedRequestId.current !== item.id) {
          notifiedRequestId.current = item.id;
          onClientIdRequestChange?.(item.id);
        }
      } catch (error) {
        if (error?.name === "AbortError") return;
        shouldPoll = true;
        // The normal client search remains available if request status cannot be loaded.
      } finally {
        inFlight = false;
        scheduleNextCheck();
      }
    };

    checkRequest();
    const resumeWhenVisible = () => {
      if (!document.hidden && shouldPoll && !timer && !inFlight) checkRequest();
    };
    document.addEventListener("visibilitychange", resumeWhenVisible);
    return () => {
      active = false;
      controller.abort();
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", resumeWhenVisible);
    };
  }, [value, insuredName, contactNumber, onChange, onClientIdRequestChange]);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (normalizedQuery.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }

    const controller = new window.AbortController();
    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/client-accounts?page=1&limit=5&q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });
        if (res.ok) {
          const data = await res.json();
          setResults(data.accounts || data.profiles || []);
        }
      } catch (err) {
        if (err?.name !== "AbortError") console.error(err);
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const handleClientIdRequest = async () => {
    setRequestError("");
    setRequesting(true);
    try {
      const res = await fetch("/api/client-id-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: insuredName, phone: contactNumber, email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Client ID request could not be submitted.");
      setClientIdRequest(data);
      notifiedRequestId.current = data.id;
      onClientIdRequestChange?.(data.id);
    } catch (err) {
      setRequestError(err.message);
    } finally {
      setRequesting(false);
    }
  };

  return (
    <div className="client-id-search-container">
      {selectedClientName && (
        <div className="client-id-linked-status">
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
              notifiedRequestId.current = "";
              onClientIdRequestChange?.("");
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
        className="client-id-search-toggle"
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
        <div className="client-id-search-panel" style={{
          marginTop: "6px",
          padding: "8px",
          background: "#ffffff",
          border: "1px solid #cbd5e1",
          borderRadius: "8px",
          boxShadow: "0 4px 6px rgba(0,0,0,0.05)"
        }}>
          <input
            type="text"
            className="client-id-search-input"
            placeholder="Type name, phone or email..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
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
                      padding: "8px 10px",
                      fontSize: "11px",
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "6px",
                      cursor: "pointer",
                      color: "#1e293b",
                      display: "block",
                      overflow: "hidden",
                    }}
                    onClick={() => {
                      onChange(profile.id);
                      notifiedRequestId.current = "";
                      onClientIdRequestChange?.("");
                      setSelectedClientName(profile.name);
                      setShowSearch(false);
                      setQuery("");
                      setResults([]);
                    }}
                  >
                    <div
                      style={{
                        fontWeight: "700",
                        fontSize: "11.5px",
                        lineHeight: "1.35",
                        marginBottom: "4px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {profile.name}
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gap: "2px",
                        fontSize: "10px",
                        lineHeight: "1.3",
                        color: "#64748b",
                        minWidth: 0,
                      }}
                    >
                      <span>Phone: {profile.phone || "No phone"}</span>
                      <span
                        style={{
                          display: "block",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                        title={profile.id}
                      >
                        Client ID: {profile.id}
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {!value && !clientIdRequest && (
            <button
              type="button"
              onClick={handleClientIdRequest}
              disabled={disabled || requesting}
              style={{
                width: "100%",
                marginTop: "8px",
                padding: "7px 9px",
                border: "1px solid #f59e0b",
                borderRadius: "6px",
                background: "#fffbeb",
                color: "#92400e",
                fontSize: "10.5px",
                fontWeight: "700",
                cursor: requesting ? "wait" : "pointer",
              }}
            >
              {requesting ? "Sending request..." : "No match found — Request Client ID"}
            </button>
          )}
          {clientIdRequest && clientIdRequest.status !== "COMPLETED" && (
            <div style={{ marginTop: "8px", padding: "7px 9px", borderRadius: "6px", background: "#fffbeb", color: "#92400e", fontSize: "10.5px", fontWeight: "650" }}>
              Client ID request sent to Super Admin. This field will fill automatically after approval.
            </div>
          )}
          {requestError && (
            <div style={{ marginTop: "6px", color: "#be123c", fontSize: "10px" }}>{requestError}</div>
          )}
        </div>
      )}
    </div>
  );
}
