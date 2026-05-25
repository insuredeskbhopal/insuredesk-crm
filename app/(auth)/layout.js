import "@/app/ui/dashboard.css";

export const metadata = {
  title: "InsurCRM - Authenticate",
  description: "Secure login and registration portal"
};

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <div className="auth-canvas">
        <div className="auth-brand">
          <h1>InsurCRM</h1>
          <p>Enterprise Policy Intake & CRM</p>
        </div>
        {children}
      </div>
    </main>
  );
}
