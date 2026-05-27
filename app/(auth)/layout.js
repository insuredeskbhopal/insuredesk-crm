import "@/app/ui/dashboard.css";

export const metadata = {
  title: "BIMAHEADQUARTER - Authenticate",
  description: "Secure admin-managed login portal"
};

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <div className="auth-canvas">
        <div className="auth-brand">
          <h1>BIMAHEADQUARTER</h1>
          <p>Enterprise Policy Operations & CRM</p>
        </div>
        {children}
      </div>
    </main>
  );
}
