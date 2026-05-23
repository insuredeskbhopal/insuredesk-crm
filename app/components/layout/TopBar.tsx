import { Bell, CalendarDays } from "lucide-react";
import SearchBox from "@/app/components/shared/SearchBox";

export default function TopBar({ query, onQueryChange }) {
  return (
    <header className="top-bar">
      <div className="top-brand">
        <strong>InsurCRM</strong>
        <nav>
          <a href="#explore">Explore</a>
          <a className="active" href="#bulk">Bulk PDF Upload</a>
        </nav>
      </div>

      <div className="top-actions">
        <SearchBox className="global-search" value={query} placeholder="Search policies..." onChange={(event) => onQueryChange(event.target.value)} />
        <button className="icon-button" type="button" aria-label="Calendar">
          <CalendarDays size={19} />
        </button>
        <button className="icon-button has-dot" type="button" aria-label="Notifications">
          <Bell size={19} />
        </button>
        <div className="avatar">IC</div>
      </div>
    </header>
  );
}

