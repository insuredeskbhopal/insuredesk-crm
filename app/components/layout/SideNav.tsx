import { CircleHelp, LayoutDashboard, LogOut } from "lucide-react";

export default function SideNav({ activePage, navItems, onPageChange }) {
  return (
    <aside className="side-nav">
      <div className="portal-title">
        <h1>InsurCRM</h1>
        <p>Enterprise Portal</p>
      </div>

      <nav>
        <button type="button" onClick={() => onPageChange("dashboard")}>
          <LayoutDashboard size={20} /> Dashboard
        </button>
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <button className={activePage === item.id ? "active" : ""} type="button" key={item.id} onClick={() => onPageChange(item.id)}>
              <Icon size={20} /> {item.label}
            </button>
          );
        })}
      </nav>

      <div className="side-footer">
        <button type="button"><CircleHelp size={20} /> Help Center</button>
        <button type="button"><LogOut size={20} /> Logout</button>
      </div>
    </aside>
  );
}

