export default function PreviewField({ label, meta, value, onChange, type = "text", wide, options, error, disabled }) {
  const metaClass = meta ? `meta-${meta.toLowerCase().replace(" ", "-")}` : "";
  const labelEl = (
    <span>
      {label}
      {meta ? <em className={metaClass}>{meta}</em> : null}
    </span>
  );

  let inputEl;
  if (wide) {
    inputEl = <textarea value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
  } else if (options?.length) {
    inputEl = (
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    );
  } else {
    inputEl = <input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} />;
  }

  const classes = [wide ? "wide" : "", error ? "has-error" : "", disabled ? "is-disabled" : ""].filter(Boolean).join(" ");

  return (
    <label className={classes}>
      {labelEl}
      {inputEl}
      {error ? <span className="field-error-message">{error}</span> : null}
    </label>
  );
}
