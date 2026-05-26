export default function PreviewField({ label, meta, value, onChange, type = "text", wide }) {
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

  return (
    <label>
      {labelEl}
      <input type={type} value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}
