import "@/app/ui/dashboard.css";
import BrandLogo from "@/app/components/brand/BrandLogo";

export const metadata = {
  title: "Bima Headquarter - Authenticate",
  description: "Secure admin-managed login portal",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
  icons: {
    icon: { url: "/favicon.png", type: "image/png" },
    apple: "/apple-icon.png",
  },
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
