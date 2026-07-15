import NotFoundPage from "@/app/components/public/NotFoundPage";

export const metadata = {
  title: "404 Page Not Found | Bima Headquarter",
  robots: {
    index: false,
    follow: true,
  },
};

export default function NotFoundRoutePage() {
  return <NotFoundPage />;
}
