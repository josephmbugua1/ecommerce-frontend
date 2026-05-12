"use client";

import { useEffect, useRef, useState } from "react";

const lowStock = ["Wireless Charger (4 left)", "Canvas Backpack (3 left)"];
const defaultCategories = ["Electronics", "Clothing", "Accessories", "Home", "Fitness"];
const basicProductColors = [
  { name: "Black", hex: "#1f1f1f" },
  { name: "White", hex: "#f5f5f5" },
  { name: "Red", hex: "#dc2626" },
  { name: "Orange", hex: "#f97316" },
  { name: "Yellow", hex: "#eab308" },
  { name: "Green", hex: "#16a34a" },
  { name: "Blue", hex: "#2563eb" },
  { name: "Purple", hex: "#7c3aed" },
  { name: "Brown", hex: "#92400e" },
  { name: "Gray", hex: "#6b7280" },
] as const;

const randomHexColor = () => {
  const hex = Math.floor(Math.random() * 0xffffff).toString(16).padStart(6, "0");
  return `#${hex}`;
};

const PRODUCT_IMAGE_MAX_DIMENSION = 1400;
const PRODUCT_IMAGE_QUALITY = 0.78;

type MerchantProfile = {
  storeName: string;
  adminName: string;
  slug?: string;
};

type ThemeConfig = {
  logoText: string;
  logoImage?: string;
  primary: string;
  secondary: string;
  heroTitle: string;
  heroSubtitle: string;
  promoTitle: string;
  promoSubtitle: string;
  whatsappNumber: string;
  pickupLocation: string;
  pickupReadyTime: string;
  pickupInfoLink: string;
  checkoutMode: "basket" | "whatsapp";
};

type ProductAttribute = {
  name: string;
  values: string[];
};

type ProductVariant = {
  id: string;
  combination: Record<string, string>;
  price: string;
  stock: string;
  sku: string;
};

type ProductRecord = {
  id: string;
  name: string;
  description?: string;
  image?: string;
  images?: string[];
  color: string;
  colors?: string[];
  price: string;
  discountedPrice?: string;
  discount: string;
  size: string;
  category: string;
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
};

type OrderItemRecord = {
  productId: string;
  name: string;
  price: string;
  image?: string;
  quantity: number;
};

type OrderRecord = {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  status: "PAID" | "PENDING" | "SHIPPED";
  items: OrderItemRecord[];
  createdAt: string;
};

type MenuItem = {
  id: "dashboard" | "products" | "orders" | "customers" | "settings";
  label: string;
  sectionId: string;
};

const normalizeProductRecord = (product: ProductRecord): ProductRecord => {
  const images = Array.isArray(product.images)
    ? product.images.filter((image): image is string => typeof image === "string" && image.length > 0)
    : product.image
      ? [product.image]
      : [];

  const colors = Array.isArray(product.colors)
    ? product.colors.filter((color): color is string => typeof color === "string" && color.length > 0)
    : product.color
      ? [product.color]
      : [];

  return {
    ...product,
    image: images[0],
    images,
    color: colors[0] ?? "",
    colors,
  };
};

const isQuotaExceededError = (error: unknown) => {
  return error instanceof DOMException && (
    error.name === "QuotaExceededError"
    || error.name === "NS_ERROR_DOM_QUOTA_REACHED"
    || error.code === 22
    || error.code === 1014
  );
};

const optimizeImageForStorage = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const source = typeof reader.result === "string" ? reader.result : "";
      if (!source) {
        reject(new Error("Unable to read image"));
        return;
      }

      const image = new Image();
      image.onload = () => {
        const scale = Math.min(1, PRODUCT_IMAGE_MAX_DIMENSION / Math.max(image.width, image.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.width * scale));
        canvas.height = Math.max(1, Math.round(image.height * scale));

        const context = canvas.getContext("2d");
        if (!context) {
          resolve(source);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const optimized = canvas.toDataURL("image/webp", PRODUCT_IMAGE_QUALITY);
        resolve(optimized.length < source.length ? optimized : source);
      };
      image.onerror = () => reject(new Error("Unable to process image"));
      image.src = source;
    };
    reader.onerror = () => reject(new Error("Unable to read image"));
    reader.readAsDataURL(file);
  });

const defaultTheme: ThemeConfig = {
  logoText: "SF",
  primary: "#1e63ff",
  secondary: "#39a2ff",
  heroTitle: "Fresh styles for the new season",
  heroSubtitle: "Explore curated looks, daily essentials, and featured drops from our newest catalog.",
  promoTitle: "20% off selected collections",
  promoSubtitle: "Use code SUMMER20 at checkout.",
  whatsappNumber: "",
  pickupLocation: "",
  pickupReadyTime: "",
  pickupInfoLink: "",
  checkoutMode: "basket",
};

const menuItems: MenuItem[] = [
  { id: "dashboard", label: "Dashboard", sectionId: "section-dashboard" },
  { id: "products", label: "Products", sectionId: "section-products" },
  { id: "orders", label: "Orders", sectionId: "section-orders" },
  { id: "customers", label: "Customers", sectionId: "section-customers" },
  { id: "settings", label: "Settings", sectionId: "section-settings" },
];

export default function DashboardPage() {
  const themeLoadedRef = useRef(false);
  const categoriesLoadedRef = useRef(false);
  const productsLoadedRef = useRef(false);
  const [merchantProfile, setMerchantProfile] = useState<MerchantProfile>({
    storeName: "Acme Store",
    adminName: "John",
  });
  const [tenantSlug, setTenantSlug] = useState("demo");
  const [themeConfig, setThemeConfig] = useState<ThemeConfig>(defaultTheme);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [newCategory, setNewCategory] = useState("");
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [activeMenu, setActiveMenu] = useState<MenuItem["id"]>("dashboard");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    images: [] as string[],
    colors: [] as string[],
    price: "",
    discountedPrice: "",
    discount: "",
    size: "",
    category: defaultCategories[0],
  });
  const [customColorHex, setCustomColorHex] = useState("#16a34a");
  const [productMode, setProductMode] = useState<"simple" | "variant">("simple");
  const [productStep, setProductStep] = useState<1 | 2 | 3>(1);
  const [attrName, setAttrName] = useState("");
  const [attrValues, setAttrValues] = useState("");
  const [attributeDraft, setAttributeDraft] = useState<ProductAttribute[]>([]);
  const [variantDraft, setVariantDraft] = useState<ProductVariant[]>([]);
  const whatsappNumberValue = typeof themeConfig.whatsappNumber === "string" ? themeConfig.whatsappNumber : "";
  const whatsappNumberPreview = whatsappNumberValue.trim();
  const resetProductForm = () => {
    setProductForm({
      name: "",
      description: "",
      images: [],
      colors: [],
      price: "",
      discountedPrice: "",
      discount: "",
      size: "",
      category: categories[0] ?? defaultCategories[0],
    });
    setProductMode("simple");
    setProductStep(1);
    setAttributeDraft([]);
    setVariantDraft([]);
    setAttrName("");
    setAttrValues("");
  };

  const persistProducts = (nextProducts: ProductRecord[]) => {
    try {
      localStorage.setItem(`storefrontProducts:${tenantSlug}`, JSON.stringify(nextProducts));
      window.dispatchEvent(new CustomEvent("storefront-config-updated", { detail: { slug: tenantSlug } }));
      return true;
    } catch (error) {
      if (isQuotaExceededError(error)) {
        window.alert("Product images are too large for browser storage. Remove some images or upload smaller ones.");
        return false;
      }
      throw error;
    }
  };

  useEffect(() => {
    const rawProfile = localStorage.getItem("merchantProfile");
    if (rawProfile) {
      try {
        const parsed = JSON.parse(rawProfile) as Partial<MerchantProfile>;
        if (parsed.storeName || parsed.adminName) {
          setMerchantProfile({
            storeName: parsed.storeName ?? "Acme Store",
            adminName: parsed.adminName ?? "John",
            slug: parsed.slug,
          });
          if (parsed.slug) {
            setTenantSlug(parsed.slug);
          }
          return;
        }
      } catch {
      }
    }

    const rawDemo = localStorage.getItem("demoStore");
    if (rawDemo) {
      try {
        const parsedDemo = JSON.parse(rawDemo) as Partial<MerchantProfile>;
        setMerchantProfile({
          storeName: parsedDemo.storeName ?? "Acme Store",
          adminName: parsedDemo.adminName ?? "John",
          slug: parsedDemo.slug,
        });
        if (parsedDemo.slug) {
          setTenantSlug(parsedDemo.slug);
        }
      } catch {
      }
    }

    const storedTenantSlug = localStorage.getItem("tenantSlug");
    if (storedTenantSlug) {
      setTenantSlug(storedTenantSlug);
    }
  }, []);

  useEffect(() => {
    const rawTheme = localStorage.getItem(`storefrontTheme:${tenantSlug}`);
    if (rawTheme) {
      try {
        const parsedTheme = JSON.parse(rawTheme) as Partial<ThemeConfig>;
        setThemeConfig({ ...defaultTheme, ...parsedTheme });
        themeLoadedRef.current = true;
        return;
      } catch {
      }
    }
    setThemeConfig(defaultTheme);
    themeLoadedRef.current = true;
  }, [tenantSlug]);

  useEffect(() => {
    const rawCategories = localStorage.getItem(`storefrontCategories:${tenantSlug}`);
    if (rawCategories) {
      try {
        const parsedCategories = JSON.parse(rawCategories) as string[];
        if (Array.isArray(parsedCategories) && parsedCategories.length > 0) {
          setCategories(parsedCategories);
          categoriesLoadedRef.current = true;
          return;
        }
      } catch {
      }
    }
    setCategories(defaultCategories);
    categoriesLoadedRef.current = true;
  }, [tenantSlug]);

  useEffect(() => {
    const rawProducts = localStorage.getItem(`storefrontProducts:${tenantSlug}`);
    if (rawProducts) {
      try {
        const parsedProducts = JSON.parse(rawProducts) as ProductRecord[];
        if (Array.isArray(parsedProducts)) {
          setProducts(parsedProducts.map(normalizeProductRecord));
          productsLoadedRef.current = true;
          return;
        }
      } catch {
      }
    }
    setProducts([]);
    productsLoadedRef.current = true;
  }, [tenantSlug]);

  useEffect(() => {
    const loadOrders = () => {
      const rawOrders = localStorage.getItem(`storefrontOrders:${tenantSlug}`);
      if (rawOrders) {
        try {
          const parsedOrders = JSON.parse(rawOrders) as OrderRecord[];
          if (Array.isArray(parsedOrders)) {
            setOrders(parsedOrders);
            return;
          }
        } catch {
        }
      }
      setOrders([]);
    };

    loadOrders();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key === `storefrontOrders:${tenantSlug}`) {
        loadOrders();
      }
    };

    const handleCustomUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ slug?: string; type?: string }>;
      if ((!customEvent.detail?.slug || customEvent.detail.slug === tenantSlug) && customEvent.detail?.type === "orders") {
        loadOrders();
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("storefront-config-updated", handleCustomUpdate as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("storefront-config-updated", handleCustomUpdate as EventListener);
    };
  }, [tenantSlug]);

  useEffect(() => {
    if (!themeLoadedRef.current) {
      return;
    }

    localStorage.setItem(`storefrontTheme:${tenantSlug}`, JSON.stringify(themeConfig));
    window.dispatchEvent(new CustomEvent("storefront-config-updated", { detail: { slug: tenantSlug } }));
  }, [tenantSlug, themeConfig]);

  useEffect(() => {
    if (!categoriesLoadedRef.current) {
      return;
    }

    localStorage.setItem(`storefrontCategories:${tenantSlug}`, JSON.stringify(categories));
    window.dispatchEvent(new CustomEvent("storefront-config-updated", { detail: { slug: tenantSlug } }));
  }, [tenantSlug, categories]);

  const updateThemeField = (field: keyof ThemeConfig, value: string) => {
    setThemeConfig((prev) => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (result) {
        setThemeConfig((prev) => ({ ...prev, logoImage: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const saveTheme = () => {
    localStorage.setItem(`storefrontTheme:${tenantSlug}`, JSON.stringify(themeConfig));
    window.dispatchEvent(new CustomEvent("storefront-config-updated", { detail: { slug: tenantSlug } }));
    window.alert("Storefront created successfully.");
  };

  const resetTheme = () => {
    localStorage.setItem(`storefrontTheme:${tenantSlug}`, JSON.stringify(defaultTheme));
    setThemeConfig(defaultTheme);
  };

  const addCategory = () => {
    const normalized = newCategory.trim();
    if (!normalized) {
      return;
    }

    const exists = categories.some((category) => category.toLowerCase() === normalized.toLowerCase());
    if (exists) {
      setNewCategory("");
      return;
    }

    setCategories((prev) => [...prev, normalized]);
    setNewCategory("");
  };

  const removeCategory = (categoryToRemove: string) => {
    setCategories((prev) => prev.filter((category) => category !== categoryToRemove));
  };

  const saveCategories = () => {
    localStorage.setItem(`storefrontCategories:${tenantSlug}`, JSON.stringify(categories));
    window.alert("Category created successfully.");
  };

  const resetCategories = () => {
    localStorage.setItem(`storefrontCategories:${tenantSlug}`, JSON.stringify(defaultCategories));
    setCategories(defaultCategories);
  };

  const updateProductField = (field: keyof typeof productForm, value: string) => {
    setProductForm((prev) => ({ ...prev, [field]: value }));
  };

  const addProductColor = (value: string) => {
    const normalized = value.trim();
    if (!normalized) {
      return;
    }

    setProductForm((prev) => {
      const exists = prev.colors.some((color) => color.toLowerCase() === normalized.toLowerCase());
      if (exists) {
        return prev;
      }
      return { ...prev, colors: [...prev.colors, normalized] };
    });
  };

  const removeProductColor = (value: string) => {
    setProductForm((prev) => ({
      ...prev,
      colors: prev.colors.filter((color) => color.toLowerCase() !== value.toLowerCase()),
    }));
  };

  const toggleBasicProductColor = (value: string) => {
    setProductForm((prev) => {
      const exists = prev.colors.some((color) => color.toLowerCase() === value.toLowerCase());
      if (exists) {
        return {
          ...prev,
          colors: prev.colors.filter((color) => color.toLowerCase() !== value.toLowerCase()),
        };
      }
      return { ...prev, colors: [...prev.colors, value] };
    });
  };

  const generateProductColor = () => {
    addProductColor(randomHexColor());
  };

  const addAttributeToDraft = () => {
    const name = attrName.trim();
    const values = attrValues.split(",").map((v) => v.trim()).filter(Boolean);
    if (!name || values.length === 0) {
      return;
    }
    setAttributeDraft((prev) => {
      const existing = prev.findIndex((a) => a.name.toLowerCase() === name.toLowerCase());
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = { name, values };
        return updated;
      }
      return [...prev, { name, values }];
    });
    setAttrName("");
    setAttrValues("");
  };

  const removeAttributeFromDraft = (name: string) => {
    setAttributeDraft((prev) => prev.filter((a) => a.name !== name));
  };

  const buildVariantsFromAttributes = () => {
    const cartesian = (attrs: ProductAttribute[]): Record<string, string>[] => {
      if (attrs.length === 0) return [{}];
      return attrs.reduce<Record<string, string>[]>((acc, attr) => {
        return acc.flatMap((combo) => attr.values.map((v) => ({ ...combo, [attr.name]: v })));
      }, [{}]);
    };
    const combos = cartesian(attributeDraft);
    setVariantDraft(
      combos.map((combo, index) => ({
        id: `variant-${Date.now()}-${index}`,
        combination: combo,
        price: productForm.price,
        stock: "",
        sku: Object.values(combo).join("-").toLowerCase().replace(/\s+/g, "-"),
      })),
    );
    setProductStep(3);
  };

  const updateVariantField = (variantId: string, field: "price" | "stock" | "sku", value: string) => {
    setVariantDraft((prev) =>
      prev.map((v) => (v.id === variantId ? { ...v, [field]: value } : v)),
    );
  };

  const handleProductImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).filter((file) => file.type.startsWith("image/"));
    if (files.length === 0) {
      return;
    }

    Promise.all(
      files.map(
        (file) => optimizeImageForStorage(file),
      ),
    )
      .then((images) => {
        setProductForm((prev) => ({
          ...prev,
          images: [...prev.images, ...images],
        }));
      })
      .catch(() => {
        window.alert("One or more images could not be processed.");
      });

    e.target.value = "";
  };

  const removeProductImage = (imageToRemove: string) => {
    setProductForm((prev) => ({
      ...prev,
      images: prev.images.filter((image) => image !== imageToRemove),
    }));
  };

  const addProduct = (opts?: { withVariants?: boolean }) => {
    if (!productForm.name.trim() || !productForm.price.trim() || !productForm.category.trim()) {
      window.alert("Please fill Product Name, Price, and Category before adding.");
      return;
    }

    const productDraft: ProductRecord = {
      id: editingProductId ?? `product-${Date.now()}`,
      name: productForm.name.trim(),
      description: productForm.description.trim(),
      image: productForm.images[0],
      images: productForm.images,
      color: productForm.colors[0] ?? "",
      colors: productForm.colors,
      price: productForm.price.trim(),
      discountedPrice: productForm.discountedPrice.trim(),
      discount: productForm.discount.trim(),
      size: productForm.size.trim(),
      category: productForm.category.trim(),
      attributes: attributeDraft.length > 0 ? attributeDraft : undefined,
      variants: opts?.withVariants && variantDraft.length > 0 ? variantDraft : undefined,
    };

    if (editingProductId) {
      const nextProducts = products.map((product) => (product.id === editingProductId ? productDraft : product));
      if (!persistProducts(nextProducts)) {
        return;
      }
      setProducts(nextProducts);
      window.alert("Product updated successfully.");
    } else {
      const nextProducts = [productDraft, ...products];
      if (!persistProducts(nextProducts)) {
        return;
      }
      setProducts(nextProducts);
      window.alert("Product added successfully.");
    }

    resetProductForm();
    setEditingProductId(null);
  };

  const saveProducts = () => {
    if (!persistProducts(products)) {
      return;
    }
    window.alert("Products saved successfully.");
  };

  const removeProduct = (productId: string) => {
    const nextProducts = products.filter((product) => product.id !== productId);
    if (!persistProducts(nextProducts)) {
      return;
    }
    setProducts(nextProducts);
    if (editingProductId === productId) {
      setEditingProductId(null);
      resetProductForm();
    }
  };

  const editProduct = (product: ProductRecord) => {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name ?? "",
      description: product.description ?? "",
      images: product.images && product.images.length > 0 ? product.images : product.image ? [product.image] : [],
      colors: product.colors && product.colors.length > 0 ? product.colors : product.color ? [product.color] : [],
      price: product.price ?? "",
      discountedPrice: product.discountedPrice ?? "",
      discount: product.discount ?? "",
      size: product.size ?? "",
      category: product.category ?? categories[0] ?? defaultCategories[0],
    });
    setProductStep(1);
    setProductMode(product.variants && product.variants.length > 0 ? "variant" : "simple");
    setAttributeDraft(product.attributes ?? []);
    setVariantDraft(product.variants ?? []);
    const section = document.getElementById("section-products");
    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const cancelProductEdit = () => {
    setEditingProductId(null);
    resetProductForm();
  };

  const goToSection = (item: MenuItem, event?: React.MouseEvent<HTMLAnchorElement>) => {
    if (event) {
      event.preventDefault();
    }

    const target = document.getElementById(item.sectionId);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.history.replaceState(null, "", `#${item.sectionId}`);
    setActiveMenu(item.id);
  };

  const totalRevenue = orders.reduce((total, order) => total + (Number(order.amount) || 0), 0);
  const uniqueCustomers = new Set(
    orders
      .map((order) => order.customerEmail || order.customerPhone || order.customerName)
      .filter((value) => value && value.trim().length > 0),
  ).size;

  const stats = [
    { label: "Revenue", value: `KSH ${totalRevenue.toLocaleString()}` },
    { label: "Orders", value: String(orders.length) },
    { label: "Items", value: String(products.length) },
    { label: "Customers", value: String(uniqueCustomers) },
  ];

  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6)
    .map((order) => ({
      id: order.id,
      customer: order.customerName || order.customerEmail || order.customerPhone || "Guest",
      amount: `${order.currency || "KSH"} ${Number(order.amount || 0).toLocaleString()}`,
      status: order.status || "PAID",
    }));

  const soldByProduct = new Map<string, number>();
  orders.forEach((order) => {
    order.items?.forEach((item) => {
      const current = soldByProduct.get(item.name) ?? 0;
      soldByProduct.set(item.name, current + (Number(item.quantity) || 0));
    });
  });

  const topProducts = Array.from(soldByProduct.entries())
    .map(([name, sold]) => ({ name, sold }))
    .sort((a, b) => b.sold - a.sold)
    .slice(0, 5);

  const canSaveBaseProduct = Boolean(
    productForm.name.trim() && productForm.price.trim() && productForm.category.trim(),
  );
  const canSaveVariantProduct = canSaveBaseProduct && variantDraft.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f7ff] text-[#171826]">
      <div className="section-shell grid grid-cols-1 gap-4 py-6 lg:grid-cols-[240px_1fr]">
        <aside className="card-soft h-fit p-4">
          <h2 className="px-2 text-sm font-mono uppercase tracking-widest text-[#6470a7]">Merchant Panel</h2>
          <nav className="mt-3 space-y-1">
            {menuItems.map((item) => (
              <a
                key={item.id}
                href={`#${item.sectionId}`}
                onClick={(event) => goToSection(item, event)}
                className={`block w-full cursor-pointer rounded-xl px-3 py-2 text-left text-sm font-medium ${activeMenu === item.id ? "bg-[#1e63ff] text-white" : "text-[#3f4463] hover:bg-[#eff2ff]"}`}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        <main className="space-y-4">
          <section id="section-dashboard" className="card-soft p-6">
            <p className="text-sm text-[#57608b]">Good morning, {merchantProfile.adminName}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{merchantProfile.storeName} Dashboard</h1>
          </section>

          <section id="section-customers" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {stats.map((stat) => (
              <article key={stat.label} className="card-soft p-5">
                <p className="text-xs font-mono uppercase tracking-wider text-[#6a72a0]">{stat.label}</p>
                <p className="mt-2 text-3xl font-semibold">{stat.value}</p>
              </article>
            ))}
          </section>

          <section id="section-orders" className="grid gap-4 xl:grid-cols-3">
            <article className="card-soft p-5 xl:col-span-2">
              <h2 className="text-lg font-semibold">Recent Orders</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-[#5f6790]">
                    <tr>
                      <th className="pb-2">Order</th>
                      <th className="pb-2">Customer</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => (
                        <tr key={order.id} className="border-t border-[#eceffa]">
                          <td className="py-2.5 font-medium">{order.id}</td>
                          <td className="py-2.5">{order.customer}</td>
                          <td className="py-2.5">{order.amount}</td>
                          <td className="py-2.5">
                            <span className="rounded-full bg-[#edf2ff] px-3 py-1 text-xs font-semibold text-[#3551b4]">{order.status}</span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr className="border-t border-[#eceffa]">
                        <td className="py-3 text-[#5f6790]" colSpan={4}>No sales yet. Completed orders will appear here.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="card-soft p-5">
              <h2 className="text-lg font-semibold">Top Products</h2>
              <ul className="mt-4 space-y-3 text-sm">
                {topProducts.length > 0 ? (
                  topProducts.map((product) => (
                    <li key={product.name} className="flex items-center justify-between rounded-xl bg-[#f7f9ff] px-3 py-2">
                      <span>{product.name}</span>
                      <span className="font-semibold text-[#3750aa]">{product.sold} sold</span>
                    </li>
                  ))
                ) : (
                  <li className="rounded-xl bg-[#f7f9ff] px-3 py-2 text-[#5f6790]">No product sales yet.</li>
                )}
              </ul>
            </article>
          </section>

          <section className="card-soft p-5">
            <h2 className="text-lg font-semibold">Low Stock Alerts</h2>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-[#4f567b]">
              {lowStock.map((entry) => (
                <li key={entry}>{entry}</li>
              ))}
            </ul>
          </section>

          <section className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Store Contact</h2>
                <p className="mt-1 text-sm text-[#57608b]">Set the WhatsApp number that appears on the bottom-right of your storefront.</p>
              </div>
              <a
                href={`/store/${tenantSlug}`}
                className="rounded-xl border border-[#d2dafc] bg-white px-3 py-1.5 text-xs font-semibold text-[#2149bf]"
                target="_blank"
                rel="noreferrer"
              >
                Preview Storefront
              </a>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
              <label className="text-sm font-medium">
                WhatsApp Number
                <input
                  value={whatsappNumberValue}
                  onChange={(e) => updateThemeField("whatsappNumber", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="254712345678"
                />
                <span className="mt-1 block text-xs text-[#57608b]">Use full country code. Example: 254712345678.</span>
              </label>

              <div className="rounded-2xl border border-[#d9dbe8] bg-[#f8faff] p-4 text-sm text-[#57608b]">
                <p className="font-medium text-[#2b3152]">Storefront Button</p>
                <p className="mt-2">
                  {whatsappNumberPreview
                    ? `WhatsApp will appear for ${whatsappNumberPreview}.`
                    : "Add a number to enable the floating WhatsApp button."}
                </p>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="text-sm font-medium">
                Pickup Location
                <input
                  value={themeConfig.pickupLocation}
                  onChange={(e) => updateThemeField("pickupLocation", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="The Mall, Westlands"
                />
              </label>

              <label className="text-sm font-medium">
                Pickup Ready Time
                <input
                  value={themeConfig.pickupReadyTime}
                  onChange={(e) => updateThemeField("pickupReadyTime", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="Usually ready in 4 hours"
                />
              </label>

              <label className="text-sm font-medium">
                Store Info Link
                <input
                  value={themeConfig.pickupInfoLink}
                  onChange={(e) => updateThemeField("pickupInfoLink", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="https://example.com/store-info"
                />
              </label>
            </div>

            <p className="mt-2 text-xs text-[#57608b]">
              Pickup details appear on the storefront product details panel below Buy it now.
            </p>
          </section>

          <section id="section-settings" className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Settings Module</h2>
                <p className="mt-1 text-sm text-[#57608b]">Choose your preferred checkout flow for customers.</p>
              </div>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <button
                type="button"
                onClick={() => updateThemeField("checkoutMode", "basket")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  themeConfig.checkoutMode === "basket"
                    ? "border-[#1e63ff] bg-[#edf3ff]"
                    : "border-[#d9dbe8] bg-white"
                }`}
              >
                <p className="font-semibold text-[#1d2550]">Checkout Basket</p>
                <p className="mt-1 text-xs text-[#5f6790]">Customers use the cart/basket checkout flow.</p>
              </button>

              <button
                type="button"
                onClick={() => updateThemeField("checkoutMode", "whatsapp")}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  themeConfig.checkoutMode === "whatsapp"
                    ? "border-[#1e63ff] bg-[#edf3ff]"
                    : "border-[#d9dbe8] bg-white"
                }`}
              >
                <p className="font-semibold text-[#1d2550]">WhatsApp Checkout</p>
                <p className="mt-1 text-xs text-[#5f6790]">Customers checkout by contacting you on WhatsApp.</p>
              </button>
            </div>

            {themeConfig.checkoutMode === "whatsapp" && !whatsappNumberPreview ? (
              <p className="mt-3 text-xs text-[#b45309]">Add a WhatsApp number in Store Contact to activate WhatsApp checkout.</p>
            ) : null}
          </section>

          <section className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Store Builder</h2>
              <a
                href={`/store/${tenantSlug}`}
                className="rounded-xl border border-[#d2dafc] bg-white px-3 py-1.5 text-xs font-semibold text-[#2149bf]"
                target="_blank"
                rel="noreferrer"
              >
                Open Storefront
              </a>
            </div>

            <p className="mt-2 text-sm text-[#57608b]">Design your tenant storefront appearance for slug: {tenantSlug}</p>
            <p className="mt-1 text-xs text-[#6a72a0]">Changes save automatically and sync to your storefront preview.</p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium">
                Logo Text
                <input
                  value={themeConfig.logoText}
                  onChange={(e) => updateThemeField("logoText", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="SO"
                />
              </label>

              <label className="text-sm font-medium">
                Logo Photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                />
                <span className="mt-1 block text-xs text-[#57608b]">Upload PNG, JPG, WEBP, or SVG logo image.</span>
              </label>

              <div className="md:col-span-2">
                <p className="text-sm font-medium">Logo Preview</p>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-[#d9dbe8] bg-[#f8faff] p-4">
                  {themeConfig.logoImage ? (
                    <img
                      src={themeConfig.logoImage}
                      alt="Uploaded storefront logo preview"
                      className="h-16 w-16 rounded-xl object-cover ring-1 ring-[#d9dbe8]"
                    />
                  ) : (
                    <div
                      className="grid h-16 w-16 place-items-center rounded-xl text-sm font-bold text-white"
                      style={{ backgroundColor: themeConfig.primary }}
                    >
                      {(themeConfig.logoText || "SF").slice(0, 3)}
                    </div>
                  )}
                  <div className="text-sm text-[#57608b]">
                    {themeConfig.logoImage
                      ? "Uploaded logo photo will be shown on the storefront navbar after you save the design."
                      : "No logo photo uploaded yet. Logo text will be used instead."}
                  </div>
                </div>
              </div>

              <label className="text-sm font-medium">
                Hero Title
                <input
                  value={themeConfig.heroTitle}
                  onChange={(e) => updateThemeField("heroTitle", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Hero Subtitle
                <input
                  value={themeConfig.heroSubtitle}
                  onChange={(e) => updateThemeField("heroSubtitle", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Promo Title
                <input
                  value={themeConfig.promoTitle}
                  onChange={(e) => updateThemeField("promoTitle", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Promo Subtitle
                <input
                  value={themeConfig.promoSubtitle}
                  onChange={(e) => updateThemeField("promoSubtitle", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                />
              </label>

              <label className="text-sm font-medium">
                Primary Color
                <input
                  type="color"
                  value={themeConfig.primary}
                  onChange={(e) => updateThemeField("primary", e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-[#d9dbe8] bg-white p-1"
                />
              </label>

              <label className="text-sm font-medium">
                Secondary Color
                <input
                  type="color"
                  value={themeConfig.secondary}
                  onChange={(e) => updateThemeField("secondary", e.target.value)}
                  className="mt-1 h-10 w-full rounded-xl border border-[#d9dbe8] bg-white p-1"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={saveTheme}
                className="rounded-xl bg-[#1e63ff] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Storefront Design
              </button>
              <button
                onClick={resetTheme}
                className="rounded-xl border border-[#d2dafc] bg-white px-4 py-2 text-sm font-semibold text-[#2149bf]"
              >
                Reset Defaults
              </button>
            </div>
          </section>

          <section className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Storefront Categories</h2>
              <span className="text-xs text-[#57608b]">Manage categories shown on your frontstore</span>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <input
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addCategory();
                  }
                }}
                className="w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                placeholder="Add a category, e.g. Beauty"
              />
              <button
                onClick={addCategory}
                className="rounded-xl bg-[#1e63ff] px-4 py-2 text-sm font-semibold text-white"
              >
                Add Category
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {categories.map((category) => (
                <div
                  key={category}
                  className="inline-flex items-center gap-2 rounded-full border border-[#d9dbe8] bg-[#f8faff] px-4 py-2 text-sm"
                >
                  <span>{category}</span>
                  <button
                    onClick={() => removeCategory(category)}
                    className="rounded-full px-1 text-[#7b83a6] hover:text-[#1e63ff]"
                    aria-label={`Remove ${category}`}
                  >
                    x
                  </button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={saveCategories}
                className="rounded-xl bg-[#1e63ff] px-4 py-2 text-sm font-semibold text-white"
              >
                Save Categories
              </button>
              <button
                onClick={resetCategories}
                className="rounded-xl border border-[#d2dafc] bg-white px-4 py-2 text-sm font-semibold text-[#2149bf]"
              >
                Reset Category Defaults
              </button>
            </div>
          </section>

          <section id="section-products" className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Product Manager</h2>
              <span className="text-xs text-[#57608b]">{editingProductId ? "Editing product" : "Add products for your storefront"}</span>
            </div>

            {/* Mode picker */}
            {!editingProductId && (
              <div className="mt-5 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => { setProductMode("simple"); setProductStep(1); }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    productMode === "simple"
                      ? "border-[#1e63ff] bg-[#edf3ff]"
                      : "border-[#d9dbe8] bg-white hover:border-[#a9b8ff]"
                  }`}
                >
                  <p className="font-semibold text-[#1d2550]">Single Product</p>
                  <p className="mt-1 text-xs text-[#5f6790]">One listing with a fixed price, color, and size. Best for standalone items.</p>
                </button>
                <button
                  type="button"
                  onClick={() => { setProductMode("variant"); setProductStep(1); }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    productMode === "variant"
                      ? "border-[#1e63ff] bg-[#edf3ff]"
                      : "border-[#d9dbe8] bg-white hover:border-[#a9b8ff]"
                  }`}
                >
                  <p className="font-semibold text-[#1d2550]">Variant Product</p>
                  <p className="mt-1 text-xs text-[#5f6790]">Multiple options like Size or Color, each with its own price and stock.</p>
                </button>
              </div>
            )}

            {/* Step indicator — variant mode only */}
            {productMode === "variant" && (
              <div className="mt-5 flex items-center">
                {(["Product", "Attributes", "Variants"] as const).map((label, index) => {
                  const step = (index + 1) as 1 | 2 | 3;
                  return (
                    <div key={label} className="flex items-center">
                      {index > 0 && (
                        <div className={`mx-2 h-px w-10 transition-colors ${productStep > index ? "bg-[#1e63ff]" : "bg-[#d9dbe8]"}`} />
                      )}
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`grid h-8 w-8 place-items-center rounded-full text-sm font-semibold transition-colors ${
                            productStep > step
                              ? "bg-[#1e63ff] text-white"
                              : productStep === step
                                ? "bg-[#1e63ff] text-white ring-4 ring-[#c5d8ff]"
                                : "bg-[#e8ecfa] text-[#6a72a0]"
                          }`}
                        >
                          {productStep > step ? "✓" : step}
                        </div>
                        <span className={`text-xs ${productStep >= step ? "font-medium text-[#1e63ff]" : "text-[#6a72a0]"}`}>{label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* ── Step 1: Product Info ── */}
            {productStep === 1 && (
            <>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="text-sm font-medium md:col-span-2">
                Product Name
                <input
                  value={productForm.name}
                  onChange={(e) => updateProductField("name", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="Organic Avocado Oil"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Product Description
                <textarea
                  value={productForm.description}
                  onChange={(e) => updateProductField("description", e.target.value)}
                  className="mt-1 min-h-24 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="Write a short description for this product"
                />
              </label>

              <label className="text-sm font-medium">
                Product Images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleProductImageUpload}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                />
                <span className="mt-1 block text-xs text-[#57608b]">Select one or more product photos. The first image becomes the main storefront image.</span>
                {productForm.images.length > 0 ? (
                  <div className="mt-3 grid grid-cols-4 gap-2 rounded-xl border border-[#e0e6fb] bg-[#f8faff] p-2">
                    {productForm.images.slice(0, 8).map((image, index) => (
                      <div key={`quick-preview-${index}`} className="overflow-hidden rounded-lg border border-[#d9dbe8] bg-white">
                        <img
                          src={image}
                          alt={`Uploaded preview ${index + 1}`}
                          className="h-14 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}
              </label>

              <label className="text-sm font-medium">
                Category
                <select
                  value={productForm.category}
                  onChange={(e) => updateProductField("category", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>

              <label className="text-sm font-medium">
                Price
                <input
                  value={productForm.price}
                  onChange={(e) => updateProductField("price", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="KSH 1,500"
                />
              </label>

              <label className="text-sm font-medium">
                Discounted Price
                <input
                  value={productForm.discountedPrice}
                  onChange={(e) => updateProductField("discountedPrice", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="KSH 1,200"
                />
              </label>

              <label className="text-sm font-medium">
                Discount
                <input
                  value={productForm.discount}
                  onChange={(e) => updateProductField("discount", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="10% off"
                />
              </label>

              <label className="text-sm font-medium md:col-span-2">
                Color
                <div className="mt-2 rounded-xl border border-[#d9dbe8] bg-white p-3">
                  <div className="mb-2 text-xs text-[#57608b]">
                    {productForm.colors.length > 0 ? `${productForm.colors.length} selected` : "Select or generate colors"}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {basicProductColors.map((color) => {
                      const isSelected = productForm.colors.some((value) => value.toLowerCase() === color.name.toLowerCase());
                      return (
                        <button
                          key={color.name}
                          type="button"
                          onClick={() => toggleBasicProductColor(color.name)}
                          className={`h-8 w-8 rounded-full border-2 transition ${isSelected ? "border-[#1e63ff] ring-2 ring-[#bfceff]" : "border-white hover:border-[#c6d2ff]"}`}
                          style={{ backgroundColor: color.hex }}
                          aria-label={`Select ${color.name}`}
                          title={color.name}
                        />
                      );
                    })}
                    <button
                      type="button"
                      onClick={generateProductColor}
                      className="rounded-full border border-[#d9dbe8] px-3 py-1 text-xs font-semibold text-[#2149bf]"
                    >
                      Generate
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductForm((prev) => ({ ...prev, colors: [] }))}
                      className="rounded-full border border-[#d9dbe8] px-3 py-1 text-xs font-semibold text-[#4f567b]"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <input
                      type="color"
                      value={customColorHex}
                      onChange={(e) => setCustomColorHex(e.target.value)}
                      className="h-8 w-10 cursor-pointer rounded border border-[#d9dbe8] bg-white p-0.5"
                      aria-label="Pick custom color"
                    />
                    <button
                      type="button"
                      onClick={() => addProductColor(customColorHex)}
                      className="rounded-full border border-[#d9dbe8] px-3 py-1 text-xs font-semibold text-[#2149bf]"
                    >
                      Add custom color
                    </button>
                  </div>
                  {productForm.colors.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {productForm.colors.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => removeProductColor(color)}
                          className="inline-flex items-center gap-2 rounded-full border border-[#d9dbe8] bg-[#f8faff] px-3 py-1 text-xs font-medium text-[#4f567b]"
                          title={`Remove ${color}`}
                        >
                          <span className="h-3 w-3 rounded-full border border-[#d0d7ef]" style={{ backgroundColor: color }} />
                          <span>{color}</span>
                        </button>
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-2 text-xs text-[#57608b]">
                    One product can have multiple colors. Selected colors will appear as swatches on the storefront.
                  </div>
                </div>
              </label>

              <label className="text-sm font-medium">
                Size
                <input
                  value={productForm.size}
                  onChange={(e) => updateProductField("size", e.target.value)}
                  className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                  placeholder="500ml / M / XL"
                />
              </label>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {productMode === "simple" ? (
                <button
                  onClick={() => addProduct()}
                  className="rounded-xl bg-[#1e63ff] px-4 py-2 text-sm font-semibold text-white"
                >
                  {editingProductId ? "Save Changes" : "Add Product"}
                </button>
              ) : (
                <button
                  onClick={() => setProductStep(2)}
                  className="rounded-xl bg-[#1e63ff] px-4 py-2 text-sm font-semibold text-white"
                >
                  Next: Attributes →
                </button>
              )}
              {editingProductId ? (
                <button
                  onClick={cancelProductEdit}
                  className="rounded-xl border border-[#d2dafc] bg-white px-4 py-2 text-sm font-semibold text-[#4f567b]"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>
            </>
            )}

            {/* ── Step 2: Attributes ── */}
            {productStep === 2 && (
              <div className="mt-4">
                <p className="text-sm text-[#57608b]">
                  Define attributes (e.g. Size, Color, Material) and their options. Variants are auto-generated from all combinations.
                </p>

                <div className="mt-4 rounded-2xl border border-[#e0e6fb] bg-[#f8faff] p-4">
                  <p className="text-sm font-medium text-[#2b3152]">Add Attribute</p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <label className="text-sm font-medium">
                      Attribute Name
                      <input
                        value={attrName}
                        onChange={(e) => setAttrName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttributeToDraft(); } }}
                        className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                        placeholder="e.g. Size"
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Values (comma-separated)
                      <input
                        value={attrValues}
                        onChange={(e) => setAttrValues(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAttributeToDraft(); } }}
                        className="mt-1 w-full rounded-xl border border-[#d9dbe8] bg-white px-3 py-2"
                        placeholder="e.g. S, M, L, XL"
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={addAttributeToDraft}
                    className="mt-3 rounded-xl bg-[#eff2ff] px-4 py-2 text-sm font-semibold text-[#2149bf]"
                  >
                    + Add Attribute
                  </button>
                </div>

                {attributeDraft.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {attributeDraft.map((attr) => (
                      <div key={attr.name} className="flex items-start gap-3 rounded-xl border border-[#e0e6fb] bg-white p-3">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-[#2b3152]">{attr.name}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {attr.values.map((val) => (
                              <span key={val} className="rounded-full bg-[#eef2ff] px-3 py-0.5 text-xs font-medium text-[#2149bf]">{val}</span>
                            ))}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeAttributeFromDraft(attr.name)}
                          className="text-xs text-[#7b83a6] hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                    <p className="text-xs text-[#57608b]">
                      {attributeDraft.reduce((acc, a) => acc * a.values.length, 1)} variant{attributeDraft.reduce((acc, a) => acc * a.values.length, 1) !== 1 ? "s" : ""} will be generated.
                    </p>
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setProductStep(1)}
                    className="rounded-xl border border-[#d9dbe8] bg-white px-4 py-2 text-sm font-semibold text-[#4f567b]"
                  >
                    ← Back
                  </button>
                  {attributeDraft.length > 0 ? (
                    <button
                      type="button"
                      onClick={buildVariantsFromAttributes}
                      className="rounded-xl bg-[#1e63ff] px-4 py-2 text-sm font-semibold text-white"
                    >
                      Next: Generate Variants →
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => addProduct()}
                    className="rounded-xl border border-[#d2dafc] bg-white px-4 py-2 text-sm font-semibold text-[#2149bf]"
                  >
                    Save Without Variants
                  </button>
                  {editingProductId ? (
                    <button
                      type="button"
                      onClick={cancelProductEdit}
                      className="rounded-xl border border-[#d9dbe8] bg-white px-4 py-2 text-sm font-semibold text-[#4f567b]"
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {/* ── Step 3: Variants ── */}
            {productStep === 3 && (
              <div className="mt-4">
                <p className="text-sm text-[#57608b]">
                  Review and adjust the price, stock, and SKU for each variant before saving.
                </p>

                <div className="mt-4 overflow-x-auto rounded-2xl border border-[#e0e6fb]">
                  <table className="w-full text-sm">
                    <thead className="bg-[#f7f9ff]">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#5f6790]">Variant</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#5f6790]">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#5f6790]">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-[#5f6790]">SKU</th>
                      </tr>
                    </thead>
                    <tbody>
                      {variantDraft.map((variant) => (
                        <tr key={variant.id} className="border-t border-[#eceffa]">
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(variant.combination).map(([k, v]) => (
                                <span key={k} className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-xs font-medium text-[#2149bf]">
                                  {k}: {v}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={variant.price}
                              onChange={(e) => updateVariantField(variant.id, "price", e.target.value)}
                              className="w-28 rounded-lg border border-[#d9dbe8] bg-white px-2 py-1 text-sm"
                              placeholder="KSH 1,500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={variant.stock}
                              onChange={(e) => updateVariantField(variant.id, "stock", e.target.value)}
                              className="w-20 rounded-lg border border-[#d9dbe8] bg-white px-2 py-1 text-sm"
                              placeholder="50"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <input
                              value={variant.sku}
                              onChange={(e) => updateVariantField(variant.id, "sku", e.target.value)}
                              className="w-32 rounded-lg border border-[#d9dbe8] bg-white px-2 py-1 text-sm font-mono"
                              placeholder="shirt-red-m"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setProductStep(2)}
                    className="rounded-xl border border-[#d9dbe8] bg-white px-4 py-2 text-sm font-semibold text-[#4f567b]"
                  >
                    ← Back
                  </button>
                  <button
                    type="button"
                    onClick={() => addProduct({ withVariants: true })}
                    disabled={!canSaveVariantProduct}
                    className={`rounded-xl px-4 py-2 text-sm font-semibold text-white ${
                      canSaveVariantProduct
                        ? "bg-[#1e63ff]"
                        : "cursor-not-allowed bg-[#9db6ff]"
                    }`}
                    title={
                      canSaveVariantProduct
                        ? "Save product with variants"
                        : "Add product name, category, price, and generate at least one variant"
                    }
                  >
                    {editingProductId ? "Save Changes" : "Save Product"}
                  </button>
                  {editingProductId ? (
                    <button
                      type="button"
                      onClick={cancelProductEdit}
                      className="rounded-xl border border-[#d2dafc] bg-white px-4 py-2 text-sm font-semibold text-[#4f567b]"
                    >
                      Cancel Edit
                    </button>
                  ) : null}
                </div>
              </div>
            )}

            {productForm.images.length > 0 && (
              <div className="mt-4 rounded-2xl border border-[#e0e6fb] bg-[#f8faff] p-4">
                <p className="text-sm font-medium text-[#2b3152]">Selected Images</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {productForm.images.map((image, index) => (
                    <div key={`${image}-${index}`} className="overflow-hidden rounded-2xl border border-[#d9dbe8] bg-white">
                      <img src={image} alt={`Product upload ${index + 1}`} className="h-28 w-full object-cover" />
                      <div className="flex items-center justify-between px-3 py-2 text-xs text-[#5f6790]">
                        <span>{index === 0 ? "Primary image" : `Image ${index + 1}`}</span>
                        <button
                          onClick={() => removeProductImage(image)}
                          className="font-semibold text-[#2149bf]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <article key={product.id} className="rounded-2xl border border-[#e0e6fb] bg-white p-4">
                  <div className="flex items-start gap-3">
                    {(product.images?.[0] ?? product.image) ? (
                      <img src={product.images?.[0] ?? product.image} alt={product.name} className="h-16 w-16 rounded-xl object-cover" />
                    ) : (
                      <div className="grid h-16 w-16 place-items-center rounded-xl bg-[#eff4ff] text-xs text-[#5f6790]">
                        No image
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-sm font-semibold">{product.name}</h3>
                      {product.description ? <p className="mt-1 line-clamp-2 text-xs text-[#6a72a0]">{product.description}</p> : null}
                      {product.discountedPrice ? (
                        <p className="mt-1 flex items-center gap-2 text-sm">
                          <span className="font-semibold text-[#1e63ff]">{product.discountedPrice}</span>
                          <span className="text-[#8a91b4] line-through">{product.price}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-[#4d5580]">{product.price}</p>
                      )}
                      {product.discount ? <p className="text-xs text-[#d86410]">{product.discount}</p> : null}
                      <p className="mt-1 text-xs text-[#6a72a0]">{product.category}</p>
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#6a72a0]">
                        {(product.colors && product.colors.length > 0) || product.color ? (
                          <div className="flex items-center gap-1">
                            {(product.colors && product.colors.length > 0 ? product.colors : [product.color]).slice(0, 6).map((color, index) => (
                              <span key={`${product.id}-color-${index}`} className="h-3 w-3 rounded-full border border-[#d0d7ef]" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        ) : (
                          <span>No color</span>
                        )}
                        <span>• {product.size || "No size"}</span>
                      </div>
                      {product.images && product.images.length > 1 ? <p className="mt-1 text-xs text-[#2149bf]">{product.images.length} images</p> : null}
                    </div>
                  </div>
                  {product.images && product.images.length > 1 ? (
                    <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                      {product.images.slice(0, 4).map((image, index) => (
                        <img key={`${product.id}-thumb-${index}`} src={image} alt={`${product.name} thumbnail ${index + 1}`} className="h-12 w-12 rounded-lg object-cover" />
                      ))}
                    </div>
                  ) : null}
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => editProduct(product)}
                      className="rounded-xl border border-[#c8d5ff] bg-[#eef2ff] px-3 py-1.5 text-xs font-semibold text-[#2149bf]"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => removeProduct(product.id)}
                      className="rounded-xl border border-[#e0e6fb] px-3 py-1.5 text-xs font-semibold text-[#2149bf]"
                    >
                      Remove
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card-soft p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Live Storefront Preview</h2>
              <a
                href={`/store/${tenantSlug}`}
                className="rounded-xl border border-[#d2dafc] bg-white px-3 py-1.5 text-xs font-semibold text-[#2149bf]"
                target="_blank"
                rel="noreferrer"
              >
                View Full Storefront
              </a>
            </div>

            <p className="mt-2 text-sm text-[#57608b]">New products appear here immediately in the same card style used on the storefront.</p>

            <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {products.length > 0 ? (
                products.slice(0, 4).map((product) => (
                  <article key={`preview-${product.id}`} className="overflow-hidden rounded-2xl border border-[#e0e6fb] bg-white shadow-sm">
                    <div className="relative h-40 bg-[#eef3ff]">
                      {(product.images?.[0] ?? product.image) ? (
                        <img src={product.images?.[0] ?? product.image} alt={product.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="grid h-full place-items-center text-sm text-[#6a72a0]">No image</div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-sm font-semibold">{product.name}</h3>
                      {product.description ? <p className="mt-1 line-clamp-2 text-xs text-[#6a72a0]">{product.description}</p> : null}
                      {product.discountedPrice ? (
                        <p className="mt-1 flex items-center gap-2 text-sm">
                          <span className="font-semibold text-[#1e63ff]">{product.discountedPrice}</span>
                          <span className="text-[#8a91b4] line-through">{product.price}</span>
                        </p>
                      ) : (
                        <p className="mt-1 text-sm text-[#4d5580]">{product.price}</p>
                      )}
                      <div className="mt-1 flex items-center gap-2 text-xs text-[#6a72a0]">
                        {(product.colors && product.colors.length > 0) || product.color ? (
                          <div className="flex items-center gap-1">
                            {(product.colors && product.colors.length > 0 ? product.colors : [product.color]).slice(0, 6).map((color, index) => (
                              <span key={`preview-${product.id}-color-${index}`} className="h-3 w-3 rounded-full border border-[#d0d7ef]" style={{ backgroundColor: color }} />
                            ))}
                          </div>
                        ) : (
                          <span>No color</span>
                        )}
                        <span>• {product.size || "No size"}</span>
                      </div>
                      {product.discount ? <p className="mt-1 text-xs text-[#d86410]">{product.discount}</p> : null}
                      <p className="mt-2 text-xs font-medium text-[#5f6790]">{product.category}</p>
                      {product.images && product.images.length > 1 ? <p className="mt-1 text-xs text-[#2149bf]">Includes {product.images.length} photos</p> : null}
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-[#d9dbe8] bg-[#fafbff] p-6 text-sm text-[#6a72a0] sm:col-span-2 xl:col-span-4">
                  Add a product above to preview how it will display on the storefront.
                </div>
              )}
            </div>
          </section>
        </main>
      </div>
      
      <footer className="border-t border-[#e2e5f1] bg-white py-6 text-center text-xs text-[#636884]">
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
    </div>
  );
}
