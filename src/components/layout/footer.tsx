import Link from "next/link";
import { Zap, Globe, Code, ExternalLink } from "lucide-react";


export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/50 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
                VEnhance
              </span>
            </Link>
            <p className="text-sm text-zinc-400 max-w-xs leading-relaxed">
              Transform your videos with cutting-edge AI enhancement technology.
              Upscale, denoise, and sharpen your content to professional quality.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a href="#" className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
                <Globe className="w-4 h-4" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
                <Code className="w-4 h-4" />
              </a>
              <a href="#" className="text-zinc-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/10">
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Product</h3>
            <ul className="space-y-2">
              {[
                { href: "/how-it-works", label: "How It Works" },
                { href: "/pricing", label: "Pricing" },
                { href: "/upload", label: "Enhance Video" },
                { href: "/dashboard", label: "Dashboard" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="text-sm font-semibold text-white mb-4">Company</h3>
            <ul className="space-y-2">
              {[
                { href: "#", label: "About" },
                { href: "#", label: "Blog" },
                { href: "#", label: "Privacy Policy" },
                { href: "#", label: "Terms of Service" },
              ].map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-zinc-400 hover:text-white transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-500">
            &copy; {new Date().getFullYear()} VEnhance. All rights reserved.
          </p>
          <p className="text-sm text-zinc-600">
            Powered by AI &bull; Built with Next.js
          </p>
        </div>
      </div>
    </footer>
  );
}
