import "@/app/ui/dashboard.css";
import BrandLogo from "@/app/components/brand/BrandLogo";

export const metadata = {
  title: "BIMAHEADQUARTER - Authenticate",
  description: "Secure admin-managed login portal"
};

export default function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <div className="auth-canvas">
        <div className="auth-brand">
          <BrandLogo href="/" />
          <p>Enterprise Policy Operations & CRM</p>
        </div>
        {children}
      </div>
    </main>
  );
}
