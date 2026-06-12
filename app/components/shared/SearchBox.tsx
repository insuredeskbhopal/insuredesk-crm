import { Search } from "lucide-react";

export default function SearchBox({ className = "search-box", value, placeholder, onChange }) {
  return (
    <label className={className}>
      <Search size={18} />
      <input type="search" value={value} placeholder={placeholder} onChange={onChange} />
    </label>
  );
}

