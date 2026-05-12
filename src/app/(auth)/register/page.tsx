"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

type AuthPayload = {
  accessToken: string;
  refreshToken: string;
  tenantSlug: string;
  role: string;
};

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    slug: "",
    storeName: "",
    adminName: "",
    email: "",
    password: "",
  });

  const toSlug = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/-+/g, "-");

  const finishAuth = (payload: AuthPayload, isDemo = false) => {
    localStorage.setItem("accessToken", payload.accessToken);
    localStorage.setItem("refreshToken", payload.refreshToken);
    localStorage.setItem("tenantSlug", payload.tenantSlug);
    localStorage.setItem("role", payload.role);
    toast.success(isDemo ? "Store created in demo mode" : "Store created successfully!");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "slug" ? toSlug(value) : value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.slug || !formData.storeName || !formData.adminName || !formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      toast.error("Store slug can only contain lowercase letters, numbers, and hyphens");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/register-tenant`,
        {
          slug: formData.slug,
          storeName: formData.storeName,
          adminName: formData.adminName,
          email: formData.email,
          password: formData.password,
          planName: "free",
        }
      );

      if (response.data.accessToken) {
        localStorage.setItem(
          "merchantProfile",
          JSON.stringify({
            slug: formData.slug,
            storeName: formData.storeName,
            adminName: formData.adminName,
            email: formData.email,
          })
        );
        finishAuth(response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ERR_NETWORK") {
        const demoAuth = {
          accessToken: `demo-access-${Date.now()}`,
          refreshToken: `demo-refresh-${Date.now()}`,
          tenantSlug: formData.slug,
          role: "TENANT_ADMIN",
        };
        localStorage.setItem(
          "demoStore",
          JSON.stringify({
            slug: formData.slug,
            storeName: formData.storeName,
            adminName: formData.adminName,
            email: formData.email,
            password: formData.password,
            createdAt: new Date().toISOString(),
          })
        );
        localStorage.setItem(
          "merchantProfile",
          JSON.stringify({
            slug: formData.slug,
            storeName: formData.storeName,
            adminName: formData.adminName,
            email: formData.email,
          })
        );
        finishAuth(demoAuth, true);
        return;
      }

      const errorMsg = axios.isAxiosError(error)
        ? error.response?.data?.error
          ? error.response.data.error
          : error.code === "ERR_NETWORK"
          ? "Cannot reach backend API. Ensure Spring Boot is running and NEXT_PUBLIC_API_URL is correct."
          : error.message
        : error instanceof Error
        ? error.message
        : "Failed to create store. Please try again.";
      
      toast.error(errorMsg);
      console.error("Registration error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grain-bg min-h-screen py-16">
      <section className="section-shell max-w-lg card-soft p-8">
        <h1 className="text-3xl font-semibold tracking-tight">Start Your Store</h1>
        <p className="mt-2 text-sm text-[#5b5d72]">Create your merchant account and launch your storefront.</p>

        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium sm:col-span-2">
            Store Name
            <input
              name="storeName"
              value={formData.storeName}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2.5"
              type="text"
              placeholder="Acme Shop"
              disabled={loading}
            />
          </label>
          <label className="block text-sm font-medium">
            Store Slug
            <input
              name="slug"
              value={formData.slug}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2.5"
              type="text"
              placeholder="healthy-living"
              disabled={loading}
            />
          </label>
          <label className="block text-sm font-medium">
            Admin Name
            <input
              name="adminName"
              value={formData.adminName}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2.5"
              type="text"
              placeholder="John Doe"
              disabled={loading}
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Admin Email
            <input
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2.5"
              type="email"
              placeholder="owner@acme.com"
              disabled={loading}
            />
          </label>
          <label className="block text-sm font-medium sm:col-span-2">
            Password
            <input
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2.5"
              type="password"
              placeholder="At least 6 characters"
              disabled={loading}
            />
          </label>
          <button
            className="sm:col-span-2 w-full rounded-xl bg-[#ff7a18] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#e66d0e] transition"
            type="submit"
            disabled={loading}
          >
            {loading ? "Creating Store..." : "Create Store"}
          </button>
        </form>

        <p className="mt-5 text-sm text-[#5b5d72]">
          Already have an account? <Link href="/login" className="font-semibold text-[#1e63ff]">Login</Link>
        </p>
      </section>
      
      <footer className="mt-12 text-center text-xs text-[#62657a]">
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
      </footer>
    </main>
  );
}
