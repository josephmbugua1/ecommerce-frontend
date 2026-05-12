import Link from "next/link";
import { Check, Lock, Package, Rocket, ShoppingCart } from "lucide-react";

export default function Home() {
  const features = [
    {
      title: "Easy Setup",
      desc: "Launch your store in minutes with guided onboarding and ready-made storefront blocks.",
      icon: Rocket,
    },
    {
      title: "Secure by Default",
      desc: "JWT auth, tenant isolation, and production-grade security baked into your workflow.",
      icon: Lock,
    },
    {
      title: "Inventory Control",
      desc: "Track stock, variants, and low-stock alerts from one clean merchant dashboard.",
      icon: Package,
    },
    {
      title: "Checkout Ready",
      desc: "Integrated payment flows with Stripe-ready architecture for fast go-live.",
      icon: ShoppingCart,
    },
  ];

  const plans = [
    { name: "Free", price: "KSH 0", sub: "For new merchants", cta: "Start Free" },
    { name: "Starter", price: "KSH 29", sub: "For growing stores", cta: "Choose Starter" },
    { name: "Pro", price: "KSH 79", sub: "For scale and teams", cta: "Go Pro" },
  ];

  return (
    <div className="grain-bg min-h-screen">
      <header className="sticky top-0 z-30 border-b border-[#e7e8ef] glass">
        <nav className="section-shell flex h-18 items-center justify-between py-3">
          <div className="flex items-center gap-3 font-semibold text-lg">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#1e63ff] text-white">
              SF
            </span>
            StoreForge
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="rounded-full px-4 py-2 text-sm font-medium hover:bg-[#eef2ff]">
              Login
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-[#1e63ff] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#0f3ba8]"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      <main className="pb-14">
        <section className="section-shell pt-20 pb-14">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-[#d5ddff] bg-white/80 px-4 py-1.5 text-xs font-mono uppercase tracking-widest text-[#3753a9]">
              Multi-tenant Ecommerce Platform
            </p>
            <h1 className="text-5xl leading-tight font-semibold tracking-tight text-[#16161d] sm:text-6xl">
              Launch Your Online Store Today
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-[#4d4f62]">
              The fastest way to sell online, manage orders, and scale with tenant-ready architecture built for modern commerce teams.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/register"
                className="rounded-full bg-[#ff7a18] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#d86410]"
              >
                Start Free Trial
              </Link>
              <Link
                href="/store/demo"
                className="rounded-full border border-[#ccd6ff] bg-white px-6 py-3 text-sm font-semibold text-[#1e63ff]"
              >
                View Demo Store
              </Link>
            </div>
          </div>
        </section>

        <section className="section-shell py-8">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <article key={feature.title} className="card-soft p-5">
                  <Icon className="h-5 w-5 text-[#1e63ff]" />
                  <h3 className="mt-3 text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#5b5d72]">{feature.desc}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="section-shell py-14">
          <div className="mb-7">
            <h2 className="text-3xl font-semibold tracking-tight">Pricing Plans</h2>
            <p className="mt-2 text-[#5b5d72]">Choose the plan that matches your growth stage.</p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article key={plan.name} className="card-soft p-6">
                <p className="text-sm font-mono uppercase tracking-wider text-[#5f6aa0]">{plan.name}</p>
                <p className="mt-3 text-4xl font-semibold">
                  {plan.price}
                  <span className="ml-1 text-sm text-[#6a6b7c]">/mo</span>
                </p>
                <p className="mt-2 text-sm text-[#6a6b7c]">{plan.sub}</p>
                <ul className="mt-4 space-y-2 text-sm">
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#1e63ff]" /> Multi-tenant store</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#1e63ff]" /> Product management</li>
                  <li className="flex items-center gap-2"><Check className="h-4 w-4 text-[#1e63ff]" /> Secure checkout</li>
                </ul>
                <button className="mt-6 w-full rounded-xl border border-[#d2dafc] bg-white px-4 py-2.5 text-sm font-semibold text-[#2149bf]">
                  {plan.cta}
                </button>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-[#e7e8ef] py-8">
        <div className="section-shell flex flex-col items-start justify-between gap-3 text-sm text-[#62657a] sm:flex-row sm:items-center">
          <p>StoreForge Commerce Platform</p>
          <div className="flex flex-col gap-2 sm:text-right">
            <p>2026 StoreForge. Build stores people remember.</p>
            <p>
              Powered by{" "}
              <a
                href="https://www.joetech-hub.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[#1e63ff] hover:underline"
              >
                JoeTech Hub
              </a>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
