import "@/app/ui/dashboard.css";

export const metadata = {
  title: "BIMAHEADQUARTER - Authenticate",
  description: "Secure login and registration portal",
};

type Props = {
  children: React.ReactNode;
};

export default function AuthLayout({ children }: Props) {
  return (
    <main className="auth-layout">
      <div className="auth-canvas">
        <div className="auth-brand">
          <h1>BIMAHEADQUARTER</h1>
          <p>Enterprise Policy Operations &amp; CRM</p>
        </div>
        {children}
      </div>
    </main>
  );
}
