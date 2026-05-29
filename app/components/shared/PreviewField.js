export default function PreviewField({ label, meta, value, onChange, type = "text", wide, options }) {
  const metaClass = meta ? `meta-${meta.toLowerCase().replace(" ", "-")}` : "";
  const labelEl = (
    <span>
      {label}
      {meta ? <em className={metaClass}>{meta}</em> : null}
    </span>
  );

  if (wide) {
    return (
      <label className="wide">
        {labelEl}
        <textarea value={value} onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  if (options?.length) {
    return (
      <label>
        {labelEl}
        <select value={value} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label>
      {labelEl}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
