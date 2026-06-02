import "../ui/dashboard.css";
import BrandLogo from "@/app/components/brand/BrandLogo";

export const metadata = {
  title: "BIMAHEADQUARTER - Authenticate",
  description: "Secure admin-managed login portal",
  icons: {
    icon: { url: "/favicon.png", type: "image/png" },
    apple: "/apple-icon.png"
  }
};

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <main className="auth-layout">
      <div className="auth-canvas">
        <div className="auth-brand">
          <BrandLogo href="/" />
          <p>Enterprise Policy Operations &amp; CRM</p>
        </div>
        {children}
      </div>
    </main>
  );
}
