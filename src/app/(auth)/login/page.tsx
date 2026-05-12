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

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    tenantSlug: "",
  });

  const finishAuth = (payload: AuthPayload, isDemo = false) => {
    localStorage.setItem("accessToken", payload.accessToken);
    localStorage.setItem("refreshToken", payload.refreshToken);
    localStorage.setItem("tenantSlug", payload.tenantSlug);
    localStorage.setItem("role", payload.role);
    toast.success(isDemo ? "Logged in with demo store" : "Logged in successfully!");
    setTimeout(() => {
      router.push("/dashboard");
    }, 1200);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!formData.email || !formData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/auth/login`,
        {
          email: formData.email,
          password: formData.password,
          tenantSlug: formData.tenantSlug || undefined,
        }
      );

      if (response.data.accessToken) {
        finishAuth(response.data);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.code === "ERR_NETWORK") {
        const raw = localStorage.getItem("demoStore");
        if (raw) {
          const demoStore = JSON.parse(raw);
          if (demoStore.email === formData.email && demoStore.password === formData.password) {
            localStorage.setItem(
              "merchantProfile",
              JSON.stringify({
                slug: demoStore.slug,
                storeName: demoStore.storeName,
                adminName: demoStore.adminName,
                email: demoStore.email,
              })
            );
            finishAuth(
              {
                accessToken: `demo-access-${Date.now()}`,
                refreshToken: `demo-refresh-${Date.now()}`,
                tenantSlug: demoStore.slug,
                role: "TENANT_ADMIN",
              },
              true
            );
            return;
          }
        }
      }

      const errorMsg = axios.isAxiosError(error)
        ? error.response?.data?.error
          ? error.response.data.error
          : error.code === "ERR_NETWORK"
          ? "Cannot reach backend API. Ensure Spring Boot is running and NEXT_PUBLIC_API_URL is correct."
          : error.message
        : error instanceof Error
        ? error.message
        : "Login failed. Please check your credentials.";
      
      toast.error(errorMsg);
      console.error("Login error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="grain-bg min-h-screen py-16">
      <section className="section-shell max-w-md card-soft p-8">
        <h1 className="text-3xl font-semibold tracking-tight">Merchant Login</h1>
        <p className="mt-2 text-sm text-[#5b5d72]">Access your dashboard and manage your store.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium">
            Email
            <input
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2.5"
              placeholder="owner@store.com"
              disabled={loading}
            />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2.5"
              placeholder="Password"
              disabled={loading}
            />
          </label>
          <button
            className="w-full rounded-xl bg-[#1e63ff] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0f3ba8] transition"
            type="submit"
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="mt-5 text-sm text-[#5b5d72]">
          New merchant? <Link href="/register" className="font-semibold text-[#1e63ff]">Create your store</Link>
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
