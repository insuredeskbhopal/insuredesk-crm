import Link from "next/link";
import BrandLogo from "@/app/components/brand/BrandLogo";
import { BUSINESS_DETAILS } from "@/lib/seo/site";

export default function PublicFooter() {
  return (
    <footer className="bg-primary text-on-primary pt-16 pb-12 border-t border-white/10">
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-margin-desktop">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-16">
          
          {/* Logo & Description */}
          <div className="col-span-1 md:col-span-1">
            <div className="footer-brand mb-6">
              <BrandLogo href="/" />
            </div>
            <p className="font-body-md text-on-primary/70 mb-8 text-[16px] text-white/70">
              Institutional insurance consultancy by {BUSINESS_DETAILS.legalName}.
              Expert advocacy for your protection.
            </p>
            <div className="flex gap-4">
              <a
                className="w-10 h-10 rounded-full border border-on-primary/20 flex items-center justify-center hover:bg-secondary transition-all"
                href="#"
              >
                <span className="material-symbols-outlined text-[20px] text-white/60 hover:text-white">
                  public
                </span>
              </a>
              <a
                className="w-10 h-10 rounded-full border border-on-primary/20 flex items-center justify-center hover:bg-secondary transition-all"
                href="#"
              >
                <span className="material-symbols-outlined text-[20px] text-white/60 hover:text-white">
                  share
                </span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
              Quick Links
            </h5>
            <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60">
              <li>
                <Link href="/" className="hover:text-white transition-colors block text-left">
                  Home
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white transition-colors block text-left">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/services" className="hover:text-white transition-colors block text-left">
                  Our Services
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white transition-colors block text-left">
                  Contact Us
                </Link>
              </li>
            </ul>
          </div>

          {/* Core Services Links */}
          <div>
            <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
              Services
            </h5>
            <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60">
              <li>
                <Link href="/services/health-insurance" className="hover:text-white transition-colors block text-left">
                  Health Insurance
                </Link>
              </li>
              <li>
                <Link href="/services/motor-insurance" className="hover:text-white transition-colors block text-left">
                  Motor Insurance
                </Link>
              </li>
              <li>
                <Link href="/services/life-insurance" className="hover:text-white transition-colors block text-left">
                  Life Insurance
                </Link>
              </li>
              <li>
                <Link href="/services/commercial-insurance" className="hover:text-white transition-colors block text-left">
                  Commercial Insurance
                </Link>
              </li>
            </ul>
          </div>

          {/* Business Details */}
          <div>
            <h5 className="font-headline-md text-[18px] text-white mb-6 font-semibold">
              Contact Details
            </h5>
            <ul className="space-y-4 font-body-md text-on-primary/60 text-white/60 font-medium">
              <li className="text-white/80 font-bold">
                {BUSINESS_DETAILS.legalName}
              </li>
              <li className="flex gap-2 items-start text-white/60">
                <span className="material-symbols-outlined text-[18px] mt-1 flex-shrink-0">location_on</span>
                <span className="text-[13px] leading-relaxed">
                  {BUSINESS_DETAILS.address.streetAddress}, {BUSINESS_DETAILS.address.addressLocality}, {BUSINESS_DETAILS.address.addressRegion} - {BUSINESS_DETAILS.address.postalCode}
                </span>
              </li>
              <li className="flex gap-2 items-center text-white/60">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">call</span>
                <span className="text-[13px]">
                  {BUSINESS_DETAILS.phone}
                </span>
              </li>
              <li className="flex gap-2 items-center text-white/60">
                <span className="material-symbols-outlined text-[18px] flex-shrink-0">schedule</span>
                <span className="text-[13px]">
                  {BUSINESS_DETAILS.hours}
                </span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-on-primary/10 flex flex-col md:flex-row justify-between gap-6">
          <p className="font-body-md text-sm text-on-primary/60 text-white/50 text-[14px]">
            © {new Date().getFullYear()} BIMAHEADQUARTER. All rights reserved. Bhopal Office.
          </p>
          <div className="flex gap-8 text-sm text-on-primary/60 text-white/50 text-[14px]">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">mail</span>{" "}
              {BUSINESS_DETAILS.email}
            </span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">call</span>{" "}
              {BUSINESS_DETAILS.phone}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
