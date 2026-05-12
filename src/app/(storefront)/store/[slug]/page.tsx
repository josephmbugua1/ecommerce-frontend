"use client";

import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, MessageCircle, Search, ShoppingBag, ShoppingCart, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

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

type CartItem = {
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
  status: "PAID";
  items: CartItem[];
  createdAt: string;
};

const buildCartProductId = (item: {
  id?: string;
  name?: string;
  price?: string;
  discountedPrice?: string;
  image?: string;
  images?: string[];
}) => {
  const id = (item.id ?? "").trim();
  if (id) {
    return id;
  }

  const fallbackName = (item.name ?? "product").trim() || "product";
  const fallbackPrice = (item.discountedPrice || item.price || "0").trim();
  const fallbackImage = (item.images?.[0] || item.image || "").trim();
  return `${fallbackName}::${fallbackPrice}::${fallbackImage}`;
};

const normalizeCartItems = (items: CartItem[]) => {
  const merged = new Map<string, CartItem>();

  items.forEach((item) => {
    const normalizedName = String(item.name ?? "").trim();
    const normalizedPrice = String(item.price ?? "").trim();
    const normalizedImage = String(item.image ?? "").trim();
    const normalizedQuantity = Math.max(1, Math.floor(Number(item.quantity) || 1));
    const normalizedId = String(item.productId ?? "").trim()
      || `${normalizedName || "product"}::${normalizedPrice || "0"}::${normalizedImage}`;

    if (!normalizedName || !normalizedPrice) {
      return;
    }

    const existing = merged.get(normalizedId);
    if (existing) {
      existing.quantity += normalizedQuantity;
      return;
    }

    merged.set(normalizedId, {
      productId: normalizedId,
      name: normalizedName,
      price: normalizedPrice,
      image: normalizedImage || undefined,
      quantity: normalizedQuantity,
    });
  });

  return Array.from(merged.values());
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

const resolveColorValue = (color: string) => {
  const namedColors: Record<string, string> = {
    black: "#1f1f1f",
    white: "#f5f5f5",
    red: "#dc2626",
    orange: "#f97316",
    yellow: "#eab308",
    green: "#16a34a",
    blue: "#2563eb",
    purple: "#7c3aed",
    brown: "#92400e",
    gray: "#6b7280",
    grey: "#6b7280",
  };
  return namedColors[color.toLowerCase()] ?? color;
};

const defaultCategories = ["Electronics", "Clothing", "Accessories", "Home", "Fitness"];

const defaultProducts: ProductRecord[] = [
  { id: "default-1", name: "Noise Cancelling Headphones", category: "Electronics", price: "KSH 129.99", image: "/images/products/headphones.svg", images: ["/images/products/headphones.svg"], color: "Black", discount: "", size: "Standard" },
  { id: "default-2", name: "Classic Street Hoodie", category: "Clothing", price: "KSH 49.99", image: "/images/products/hoodie.svg", images: ["/images/products/hoodie.svg"], color: "Orange", discount: "", size: "XL" },
  { id: "default-3", name: "Minimal Leather Wallet", category: "Accessories", price: "KSH 29.99", image: "/images/products/wallet.svg", images: ["/images/products/wallet.svg"], color: "Brown", discount: "", size: "Compact" },
  { id: "default-4", name: "Portable Blender", category: "Home", price: "KSH 39.99", image: "/images/products/blender.svg", images: ["/images/products/blender.svg"], color: "Mint", discount: "", size: "500ml" },
  { id: "default-5", name: "Smartwatch S2", category: "Electronics", price: "KSH 199.99", image: "/images/products/smartwatch.svg", images: ["/images/products/smartwatch.svg"], color: "Blue", discount: "", size: "42mm" },
  { id: "default-6", name: "Travel Backpack", category: "Fitness", price: "KSH 69.99", image: "/images/products/backpack.svg", images: ["/images/products/backpack.svg"], color: "Gray", discount: "", size: "Large" },
  { id: "default-7", name: "Wireless Charger", category: "Electronics", price: "KSH 24.99", image: "/images/products/charger.svg", images: ["/images/products/charger.svg"], color: "White", discount: "", size: "Standard" },
].map(normalizeProductRecord);

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

export default function StorePage() {
  const params = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const slug = params?.slug ?? "demo";

  const [theme, setTheme] = useState<ThemeConfig>(defaultTheme);
  const [categories, setCategories] = useState<string[]>(defaultCategories);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [rotatingIndexes, setRotatingIndexes] = useState<Record<string, number>>({});
  const [galleryState, setGalleryState] = useState<{ productId: string; index: number } | null>(null);
  const [showCartModal, setShowCartModal] = useState(false);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<"confirm" | "details" | "payment">("confirm");
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<"mpesa" | "visa">("mpesa");
  const [mpesaPhone, setMpesaPhone] = useState("");
  const [visaCardName, setVisaCardName] = useState("");
  const [visaCardNumber, setVisaCardNumber] = useState("");
  const [visaExpiry, setVisaExpiry] = useState("");
  const [visaCvv, setVisaCvv] = useState("");
  const [detailQuantity, setDetailQuantity] = useState(1);
  const [selectedDetailColor, setSelectedDetailColor] = useState<string | null>(null);
  const [selectedVariantOptions, setSelectedVariantOptions] = useState<Record<string, string>>({});
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const cartStorageKey = `storefrontCart:${slug}`;
  const orderStorageKey = `storefrontOrders:${slug}`;

  const loadStorefrontState = () => {
    const rawTheme = localStorage.getItem(`storefrontTheme:${slug}`);
    if (rawTheme) {
      try {
        const parsed = JSON.parse(rawTheme) as Partial<ThemeConfig>;
        setTheme({ ...defaultTheme, ...parsed });
      } catch {
        setTheme(defaultTheme);
      }
    } else {
      setTheme(defaultTheme);
    }

    const rawCategories = localStorage.getItem(`storefrontCategories:${slug}`);
    if (rawCategories) {
      try {
        const parsed = JSON.parse(rawCategories) as string[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setCategories(parsed);
        } else {
          setCategories(defaultCategories);
        }
      } catch {
        setCategories(defaultCategories);
      }
    } else {
      setCategories(defaultCategories);
    }

    const rawProducts = localStorage.getItem(`storefrontProducts:${slug}`);
    if (rawProducts) {
      try {
        const parsed = JSON.parse(rawProducts) as ProductRecord[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProducts(parsed.map(normalizeProductRecord));
        } else {
          setProducts([]);
        }
      } catch {
        setProducts([]);
      }
    } else {
      setProducts([]);
    }

    const rawCart = localStorage.getItem(cartStorageKey);
    if (rawCart) {
      try {
        const parsedCart = JSON.parse(rawCart) as CartItem[];
        if (Array.isArray(parsedCart)) {
          const normalizedCart = normalizeCartItems(parsedCart);
          setCartItems(normalizedCart);
          localStorage.setItem(cartStorageKey, JSON.stringify(normalizedCart));
        } else {
          setCartItems([]);
        }
      } catch {
        setCartItems([]);
      }
    } else {
      setCartItems([]);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadStorefrontState();

    const handleStorage = (event: StorageEvent) => {
      if (!event.key || event.key.includes(`:${slug}`)) {
        loadStorefrontState();
      }
    };

    const handleCustomUpdate = (event: Event) => {
      const customEvent = event as CustomEvent<{ slug?: string }>;
      if (!customEvent.detail?.slug || customEvent.detail.slug === slug) {
        loadStorefrontState();
      }
    };

    const handleFocus = () => {
      loadStorefrontState();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("storefront-config-updated", handleCustomUpdate as EventListener);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("storefront-config-updated", handleCustomUpdate as EventListener);
      window.removeEventListener("focus", handleFocus);
    };
  }, [slug]);

  const category = searchParams.get("category");
  const q = searchParams.get("q") ?? "";
  const selectedCategory = category && categories.includes(category) ? category : "All";
  const categoryOptions = ["All", ...categories];
  const searchQuery = q.trim().toLowerCase();
  const productSource = products.length > 0 ? products : defaultProducts;
  const whatsappDigits = theme.whatsappNumber.replace(/\D/g, "");
  const whatsappHref = whatsappDigits ? `https://wa.me/${whatsappDigits}` : "";
  const checkoutMode = theme.checkoutMode ?? "basket";
  const whatsappCheckoutHref = whatsappHref
    ? `${whatsappHref}?text=${encodeURIComponent(`Hello ${slug} store, I want to checkout an order.`)}`
    : "";
  const productCheckoutHref = (productName: string) =>
    whatsappHref
      ? `${whatsappHref}?text=${encodeURIComponent(`Hello ${slug} store, I want to checkout ${productName}.`)}`
      : "";
  const cartCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  const addToCart = (item: ProductRecord, quantity = 1, notify = true) => {
    const safeQuantity = Math.max(1, Math.floor(quantity));
    const productId = buildCartProductId(item);
    setCartItems((prev) => {
      const existing = prev.find((entry) => entry.productId === productId);
      const next = existing
        ? prev.map((entry) =>
            entry.productId === productId ? { ...entry, quantity: entry.quantity + safeQuantity } : entry,
          )
        : [
            {
              productId,
              name: item.name,
              price: item.discountedPrice || item.price,
              image: item.images?.[0] ?? item.image,
              quantity: safeQuantity,
            },
            ...prev,
          ];

      const normalizedCart = normalizeCartItems(next);
      localStorage.setItem(cartStorageKey, JSON.stringify(normalizedCart));
      return normalizedCart;
    });
    if (notify) {
      window.alert("Product added to cart successfully.");
    }
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    setCartItems((prev) => {
      const next = prev.map((entry) =>
        entry.productId === productId ? { ...entry, quantity } : entry,
      );
      const normalizedCart = normalizeCartItems(next);
      localStorage.setItem(cartStorageKey, JSON.stringify(normalizedCart));
      return normalizedCart;
    });
  };

  const removeFromCart = (productId: string) => {
    setCartItems((prev) => {
      const next = prev.filter((entry) => entry.productId !== productId);
      const normalizedCart = normalizeCartItems(next);
      localStorage.setItem(cartStorageKey, JSON.stringify(normalizedCart));
      return normalizedCart;
    });
  };

  const cartSubtotal = cartItems.reduce((total, item) => {
    const priceNum = parseFloat(item.price.replace(/[^\d.-]/g, ""));
    return total + (isNaN(priceNum) ? 0 : priceNum * item.quantity);
  }, 0);

  const proceedToCheckout = () => {
    if (checkoutMode === "whatsapp" && whatsappHref) {
      const cartSummary = cartItems
        .map((item) => `${item.name} x${item.quantity} - ${item.price}`)
        .join("\n");
      const message = `Hello ${slug} store,\n\nI'd like to checkout:\n${cartSummary}\n\nSubtotal: KSH ${cartSubtotal.toFixed(2)}`;
      window.open(`${whatsappHref}?text=${encodeURIComponent(message)}`, "_blank");
    } else {
      setShowCheckoutModal(true);
      setCheckoutStep("confirm");
      setSelectedPaymentMethod("mpesa");
      setMpesaPhone(customerPhone);
    }
  };

  const finalizeOrder = (paymentLabel: string) => {
    if (checkoutMode === "basket") {
      // Show order confirmation
      // eslint-disable-next-line react-hooks/purity
      const orderId = `ORD-${Date.now()}`;
      const createdAt = new Date().toISOString();
      const orderRecord: OrderRecord = {
        id: orderId,
        customerName: customerEmail.split("@")[0] || "Customer",
        customerEmail,
        customerPhone,
        amount: Number(cartSubtotal.toFixed(2)),
        currency: "KSH",
        paymentMethod: paymentLabel,
        status: "PAID",
        items: cartItems,
        createdAt,
      };

      const rawOrders = localStorage.getItem(orderStorageKey);
      let existingOrders: OrderRecord[] = [];
      if (rawOrders) {
        try {
          const parsed = JSON.parse(rawOrders) as OrderRecord[];
          if (Array.isArray(parsed)) {
            existingOrders = parsed;
          }
        } catch {
        }
      }
      const nextOrders = [orderRecord, ...(Array.isArray(existingOrders) ? existingOrders : [])];
      localStorage.setItem(orderStorageKey, JSON.stringify(nextOrders));
      window.dispatchEvent(new CustomEvent("storefront-config-updated", { detail: { slug, type: "orders" } }));

      window.alert(
        `Order ${orderId} confirmed!\n\nPayment Method: ${paymentLabel}\nSubtotal: KSH ${cartSubtotal.toFixed(2)}\n\nYou will receive a confirmation message shortly.`
      );
      setShowCheckoutModal(false);
      setShowCartModal(false);
      setCartItems([]);
      localStorage.removeItem(cartStorageKey);
      setCheckoutStep("confirm");
      setSelectedPaymentMethod("mpesa");
      setMpesaPhone("");
      setVisaCardName("");
      setVisaCardNumber("");
      setVisaExpiry("");
      setVisaCvv("");
      setCustomerEmail("");
      setCustomerPhone("");
      setDeliveryAddress("");
    }
  };

  const handlePaymentAction = () => {
    if (selectedPaymentMethod === "mpesa") {
      const digits = mpesaPhone.replace(/\D/g, "");
      const normalized = digits.startsWith("0") ? `254${digits.slice(1)}` : digits;
      if (!/^2547\d{8}$/.test(normalized)) {
        window.alert("Enter a valid Safaricom number in format 07XXXXXXXX or 2547XXXXXXXX.");
        return;
      }

      window.alert(
        `M-Pesa STK push sent to ${normalized}. Enter your M-Pesa PIN on your phone to complete payment.`
      );
      finalizeOrder("M-Pesa");
      return;
    }

    if (selectedPaymentMethod === "visa") {
      const cardName = visaCardName.trim();
      const cardNumber = visaCardNumber.replace(/\s/g, "");
      const cvv = visaCvv.replace(/\D/g, "");
      const expiry = visaExpiry.trim();

      if (!cardName) {
        window.alert("Enter the cardholder name.");
        return;
      }

      if (!/^4\d{12}(\d{3})?(\d{3})?$/.test(cardNumber)) {
        window.alert("Enter a valid Visa card number.");
        return;
      }

      if (!/^(0[1-9]|1[0-2])\/(\d{2})$/.test(expiry)) {
        window.alert("Enter expiry as MM/YY.");
        return;
      }

      if (!/^\d{3,4}$/.test(cvv)) {
        window.alert("Enter a valid CVV.");
        return;
      }

      const [month, year] = expiry.split("/").map((value) => Number(value));
      const now = new Date();
      const currentYear = Number(String(now.getFullYear()).slice(-2));
      const currentMonth = now.getMonth() + 1;
      if (year < currentYear || (year === currentYear && month < currentMonth)) {
        window.alert("This Visa card appears to be expired.");
        return;
      }

      window.alert("Visa authorization successful.");
      finalizeOrder("Visa Card");
      return;
    }

    window.alert("Select a valid payment method.");
  };

  const getProductImages = (item: ProductRecord) => {
    if (item.images && item.images.length > 0) {
      return item.images;
    }
    return item.image ? [item.image] : [];
  };

  const getPreviewImage = (item: ProductRecord) => {
    const images = getProductImages(item);
    if (images.length === 0) {
      return "";
    }
    const index = rotatingIndexes[item.id] ?? 0;
    return images[index % images.length];
  };

  useEffect(() => {
    const withMultipleImages = productSource.filter((item) => getProductImages(item).length > 1);
    if (withMultipleImages.length === 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setRotatingIndexes((prev) => {
        const next = { ...prev };
        withMultipleImages.forEach((item) => {
          const images = getProductImages(item);
          next[item.id] = ((prev[item.id] ?? 0) + 1) % images.length;
        });
        return next;
      });
    }, 2200);

    return () => window.clearInterval(timer);
  }, [productSource]);

  const openGallery = (item: ProductRecord) => {
    const images = getProductImages(item);
    if (images.length === 0) {
      return;
    }
    const startIndex = rotatingIndexes[item.id] ?? 0;
    const availableColors = (item.colors && item.colors.length > 0 ? item.colors : item.color ? [item.color] : []);
    setGalleryState({ productId: item.id, index: startIndex % images.length });
    setDetailQuantity(1);
    setSelectedDetailColor(availableColors[0] ?? null);
    // pre-select first value of each attribute as default
    if (item.attributes && item.attributes.length > 0) {
      const defaults: Record<string, string> = {};
      item.attributes.forEach((attr) => {
        if (attr.values.length > 0) defaults[attr.name] = attr.values[0];
      });
      setSelectedVariantOptions(defaults);
    } else {
      setSelectedVariantOptions({});
    }
  };

  const activeGalleryProduct = useMemo(() => {
    if (!galleryState) {
      return undefined;
    }
    return productSource.find((item) => item.id === galleryState.productId);
  }, [galleryState, productSource]);

  const activeGalleryImages = activeGalleryProduct ? getProductImages(activeGalleryProduct) : [];
  const activeGalleryColors = activeGalleryProduct
    ? (activeGalleryProduct.colors && activeGalleryProduct.colors.length > 0 ? activeGalleryProduct.colors : activeGalleryProduct.color ? [activeGalleryProduct.color] : [])
    : [];
  const activeGalleryImage =
    galleryState && activeGalleryImages.length > 0
      ? activeGalleryImages[galleryState.index % activeGalleryImages.length]
      : "";
  const activeGalleryVariant: ProductVariant | undefined = (() => {
    if (!activeGalleryProduct?.variants || activeGalleryProduct.variants.length === 0) return undefined;
    const keys = Object.keys(selectedVariantOptions);
    if (keys.length === 0) return activeGalleryProduct.variants[0];
    return activeGalleryProduct.variants.find((v) =>
      keys.every((k) => v.combination[k] === selectedVariantOptions[k]),
    ) ?? activeGalleryProduct.variants[0];
  })();
  const activeGalleryPrice = activeGalleryVariant?.price || activeGalleryProduct?.discountedPrice || activeGalleryProduct?.price || "KSH 0.00";
  const activeGallerySku = activeGalleryVariant?.sku ||
    (activeGalleryProduct
      ? `${(activeGalleryProduct.category || "ITEM").slice(0, 3).toUpperCase()}-${(activeGalleryProduct.id || "0000").slice(-4).toUpperCase()}`
      : "ITEM-0000");

  const moveGallery = (direction: 1 | -1) => {
    if (!galleryState || activeGalleryImages.length === 0) {
      return;
    }
    setGalleryState((prev) => {
      if (!prev) {
        return prev;
      }
      const nextIndex = (prev.index + direction + activeGalleryImages.length) % activeGalleryImages.length;
      return { ...prev, index: nextIndex };
    });
  };

  const filteredFeatured = useMemo(() => {
    const byCategory = selectedCategory === "All"
      ? productSource
      : productSource.filter((item) => item.category === selectedCategory);
    return searchQuery
      ? byCategory.filter((item) => item.name.toLowerCase().includes(searchQuery))
      : byCategory;
  }, [productSource, selectedCategory, searchQuery]);

  const filteredArrivals = useMemo(() => {
    const arrivalsSource = products.length > 0 ? productSource.slice(0, 3) : defaultProducts.slice(4, 7);
    const byCategory = selectedCategory === "All"
      ? arrivalsSource
      : arrivalsSource.filter((item) => item.category === selectedCategory);
    return searchQuery
      ? byCategory.filter((item) => item.name.toLowerCase().includes(searchQuery))
      : byCategory;
  }, [productSource, products.length, selectedCategory, searchQuery]);

  const categoryHref = (option: string) => {
    if (option === "All") {
      return q ? `/store/${slug}?q=${encodeURIComponent(q)}` : `/store/${slug}`;
    }
    return q
      ? `/store/${slug}?category=${encodeURIComponent(option)}&q=${encodeURIComponent(q)}`
      : `/store/${slug}?category=${encodeURIComponent(option)}`;
  };

  const logoText = (theme.logoText || slug.slice(0, 2).toUpperCase()).slice(0, 3);

  return (
    <div className="min-h-screen bg-[#f7f8fd] text-[#181926]">
      <header className="border-b border-[#e2e5f1] bg-white">
        <div className="section-shell flex h-18 items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {theme.logoImage ? (
              <div className="relative h-10 w-10 overflow-hidden rounded-xl border border-[#d9ddec] bg-white">
                <Image src={theme.logoImage} alt={`${slug} logo`} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div
                className="grid h-10 w-10 place-items-center rounded-xl border border-[#d9ddec] text-sm font-bold text-white"
                style={{ backgroundColor: theme.primary }}
              >
                {logoText}
              </div>
            )}
            <div>
              <p className="font-semibold">{slug} store</p>
              <p className="text-xs text-[#636884]">Premium collection</p>
            </div>
          </div>

          <div className="hidden items-center gap-2 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-[#e2e5f1] bg-[#f7f8fd] px-3 py-1.5">
              <svg viewBox="0 0 80 80" className="h-7 w-7 shrink-0" aria-hidden="true">
                <circle cx="40" cy="40" r="38" fill="#1a1a1a" stroke="#1a1a1a" strokeWidth="2" />
                <path d="M40 12 L44 24 L57 24 L47 32 L51 45 L40 37 L29 45 L33 32 L23 24 L36 24 Z" fill="#f5c518" />
                <circle cx="40" cy="40" r="24" fill="none" stroke="#f5c518" strokeWidth="2" strokeDasharray="4 3" />
                <text x="40" y="36" textAnchor="middle" fontSize="7" fontWeight="bold" fill="white" fontFamily="sans-serif">AUTHENTIC</text>
                <text x="40" y="46" textAnchor="middle" fontSize="5" fill="#f5c518" fontFamily="sans-serif">GUARANTEED</text>
              </svg>
              <span className="text-[11px] font-semibold leading-tight text-[#1a1e36]">Authenticity<br />Guaranteed</span>
            </div>
          </div>

          <form className="hidden items-center gap-2 rounded-full border border-[#d9ddec] bg-[#f9faff] px-3 py-2 md:flex" method="get">
            {selectedCategory !== "All" && <input type="hidden" name="category" value={selectedCategory} />}
            <Search className="h-4 w-4 text-[#68708f]" />
            <input
              name="q"
              defaultValue={q}
              className="w-56 bg-transparent text-sm outline-none"
              placeholder="Search products"
            />
          </form>

          <div className="flex items-center gap-3 text-sm">
            {checkoutMode === "whatsapp" ? (
              whatsappCheckoutHref ? (
                <a
                  href={whatsappCheckoutHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#e9fbef] px-3 py-2 font-semibold text-[#12603a]"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Checkout
                </a>
              ) : (
                <button
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#fff7ed] px-3 py-2 text-[#9a3412]"
                  title="Merchant has not set a WhatsApp number yet"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp Unavailable
                </button>
              )
            ) : (
              <button
                onClick={() => setShowCartModal(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#eef2ff] px-3 py-2 hover:bg-[#e1e8f5] transition"
              >
                <ShoppingCart className="h-4 w-4" /> Cart ({cartCount})
              </button>
            )}
            <button className="inline-flex items-center gap-1.5 rounded-full border border-[#d9ddec] px-3 py-2">
              <UserRound className="h-4 w-4" /> Account
            </button>
          </div>
        </div>
      </header>

      <main className="section-shell space-y-8 py-8">
        <section
          className="relative overflow-hidden rounded-3xl p-8 text-white md:p-12"
          style={{ background: `linear-gradient(110deg, ${theme.primary}, ${theme.secondary})` }}
        >
          <Image
            src="/images/banners/summer-hero.svg"
            alt="Summer collection banner"
            fill
            className="object-cover opacity-20"
          />
          <div className="relative z-10">
            <p className="text-xs font-mono uppercase tracking-widest text-[#d7e5ff]">Summer Collection 2026</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">{theme.heroTitle}</h1>
            <p className="mt-3 max-w-xl text-sm text-[#e6efff]">{theme.heroSubtitle}</p>
            <button className="mt-6 rounded-full bg-white px-5 py-2.5 text-sm font-semibold" style={{ color: theme.primary }}>
              Shop Now
            </button>
          </div>
        </section>

        <section className="flex flex-wrap gap-2">
          {categoryOptions.map((option) => (
            <Link
              key={option}
              href={categoryHref(option)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                selectedCategory === option
                  ? "text-white"
                  : "border-[#d8dcec] bg-white hover:border-[#9aa8dd]"
              }`}
              style={selectedCategory === option ? { backgroundColor: theme.primary, borderColor: theme.primary } : undefined}
            >
              {option}
            </Link>
          ))}
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">Featured Products</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {filteredFeatured.map((item) => (
              <article
                key={item.id}
                className="card-soft group cursor-pointer overflow-hidden"
                onClick={() => openGallery(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openGallery(item);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open image gallery for ${item.name}`}
              >
                <div className="relative h-52 overflow-hidden rounded-t-[1.5rem] bg-[#eef3ff]">
                  {getPreviewImage(item) ? (
                    <>
                      <Image src={getPreviewImage(item)} alt={item.name} fill className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-103" unoptimized={getPreviewImage(item).startsWith("data:")} />
                    </>
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-[#dde5ff] via-[#eef0ff] to-[#f4f6ff]">
                      <div className="flex flex-col items-center gap-2 text-[#8a96c8]">
                        <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 16l5-5 4 4 3-3 4 4" /></svg>
                        <span className="text-xs">No image</span>
                      </div>
                    </div>
                  )}
                  {item.discount ? (
                    <span className="absolute left-3 top-3 rounded-full bg-[#ff5c35] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">{item.discount}</span>
                  ) : null}
                  {item.images && item.images.length > 1 ? (
                    <span className="absolute bottom-2.5 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm9 1a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7Z" /></svg>
                      {item.images.length}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <h3 className="text-sm font-bold leading-snug text-[#1a1e36]">{item.name}</h3>
                  {item.description ? <p className="line-clamp-2 text-xs leading-relaxed text-[#6a72a0]">{item.description}</p> : null}
                  {item.discountedPrice ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-[#1e63ff]">{item.discountedPrice}</span>
                      <span className="text-xs text-[#a0a8cc] line-through">{item.price}</span>
                    </div>
                  ) : (
                    <p className="text-base font-bold text-[#1a1e36]">{item.price}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[#6a72a0]">
                    {(item.colors && item.colors.length > 0) || item.color ? (
                      <div className="flex items-center gap-1">
                        {(item.colors && item.colors.length > 0 ? item.colors : [item.color]).slice(0, 6).map((color, index) => (
                          <span
                            key={`${item.id}-color-${index}`}
                            className="h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: resolveColorValue(color) }}
                            title={color}
                          />
                        ))}
                      </div>
                    ) : (
                      <span>No color</span>
                    )}
                    <span className="text-[#c0c6e0]">•</span>
                    <span>{item.size || "No size"}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    {checkoutMode === "whatsapp" ? (
                      productCheckoutHref(item.name) ? (
                        <a
                          href={productCheckoutHref(item.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-[#dcfce7] px-4 py-1.5 text-xs font-semibold text-[#166534] shadow-sm transition-colors hover:bg-[#bbf7d0]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          WhatsApp Checkout
                        </a>
                      ) : (
                        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a3412]">WhatsApp N/A</span>
                      )
                    ) : cartItems.some((cartItem) => cartItem.productId === buildCartProductId(item)) ? (
                      <button
                        type="button"
                        className="rounded-full bg-[#dcfce7] px-4 py-1.5 text-xs font-semibold text-[#166534] shadow-sm transition-colors hover:bg-[#bbf7d0]"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowCartModal(true);
                        }}
                      >
                        View Cart
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-full bg-[#1e63ff] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1650d4] active:scale-95"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(item);
                        }}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredFeatured.length === 0 && (
            <p className="mt-4 text-sm text-[#636884]">No featured products in {selectedCategory} matching &ldquo;{q}&rdquo;.</p>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-semibold tracking-tight">New Arrivals</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {filteredArrivals.map((item) => (
              <article
                key={item.id}
                className="card-soft group cursor-pointer overflow-hidden"
                onClick={() => openGallery(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openGallery(item);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Open image gallery for ${item.name}`}
              >
                <div className="relative h-52 overflow-hidden rounded-t-[1.5rem] bg-[#eef3ff]">
                  {getPreviewImage(item) ? (
                    <>
                      <Image src={getPreviewImage(item)} alt={item.name} fill className="object-contain p-2 transition-transform duration-500 ease-out group-hover:scale-103" unoptimized={getPreviewImage(item).startsWith("data:")} />
                    </>
                  ) : (
                    <div className="grid h-full place-items-center bg-gradient-to-br from-[#dde5ff] via-[#eef0ff] to-[#f4f6ff]">
                      <div className="flex flex-col items-center gap-2 text-[#8a96c8]">
                        <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="3" /><path d="M3 16l5-5 4 4 3-3 4 4" /></svg>
                        <span className="text-xs">No image</span>
                      </div>
                    </div>
                  )}
                  {item.discount ? (
                    <span className="absolute left-3 top-3 rounded-full bg-[#ff5c35] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-md">{item.discount}</span>
                  ) : null}
                  {item.images && item.images.length > 1 ? (
                    <span className="absolute bottom-2.5 right-3 flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Zm9 1a1 1 0 1 0-2 0v4H7a1 1 0 1 0 0 2h4v4a1 1 0 1 0 2 0v-4h4a1 1 0 1 0 0-2h-4V7Z" /></svg>
                      {item.images.length}
                    </span>
                  ) : null}
                </div>
                <div className="flex flex-col gap-2 p-4">
                  <p className="text-sm font-bold leading-snug text-[#1a1e36]">{item.name}</p>
                  {item.description ? <p className="line-clamp-2 text-xs leading-relaxed text-[#6a72a0]">{item.description}</p> : null}
                  {item.discountedPrice ? (
                    <div className="flex items-baseline gap-2">
                      <span className="text-base font-bold text-[#1e63ff]">{item.discountedPrice}</span>
                      <span className="text-xs text-[#a0a8cc] line-through">{item.price}</span>
                    </div>
                  ) : (
                    <p className="text-base font-bold text-[#1a1e36]">{item.price}</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-[#6a72a0]">
                    {(item.colors && item.colors.length > 0) || item.color ? (
                      <div className="flex items-center gap-1">
                        {(item.colors && item.colors.length > 0 ? item.colors : [item.color]).slice(0, 6).map((color, index) => (
                          <span
                            key={`${item.id}-arrival-color-${index}`}
                            className="h-3.5 w-3.5 rounded-full border-2 border-white shadow"
                            style={{ backgroundColor: resolveColorValue(color) }}
                            title={color}
                          />
                        ))}
                      </div>
                    ) : (
                      <span>No color</span>
                    )}
                    <span className="text-[#c0c6e0]">•</span>
                    <span>{item.size || "No size"}</span>
                  </div>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    {checkoutMode === "whatsapp" ? (
                      productCheckoutHref(item.name) ? (
                        <a
                          href={productCheckoutHref(item.name)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-full bg-[#dcfce7] px-4 py-1.5 text-xs font-semibold text-[#166534] shadow-sm transition-colors hover:bg-[#bbf7d0]"
                          onClick={(event) => event.stopPropagation()}
                        >
                          WhatsApp Checkout
                        </a>
                      ) : (
                        <span className="rounded-full bg-[#fff7ed] px-3 py-1 text-xs font-semibold text-[#9a3412]">WhatsApp N/A</span>
                      )
                    ) : cartItems.some((cartItem) => cartItem.productId === buildCartProductId(item)) ? (
                      <button
                        type="button"
                        className="rounded-full bg-[#dcfce7] px-4 py-1.5 text-xs font-semibold text-[#166534] shadow-sm transition-colors hover:bg-[#bbf7d0]"
                        onClick={(event) => {
                          event.stopPropagation();
                          setShowCartModal(true);
                        }}
                      >
                        View Cart
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="rounded-full bg-[#1e63ff] px-4 py-1.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#1650d4] active:scale-95"
                        onClick={(event) => {
                          event.stopPropagation();
                          addToCart(item);
                        }}
                      >
                        Add to Cart
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
          {filteredArrivals.length === 0 && (
            <p className="mt-4 text-sm text-[#636884]">No arrivals in {selectedCategory} matching &ldquo;{q}&rdquo;.</p>
          )}
        </section>

        <section
          className="rounded-2xl p-6 text-white"
          style={{ background: `linear-gradient(100deg, ${theme.secondary}, ${theme.primary})` }}
        >
          <p className="text-xs font-mono uppercase tracking-widest text-[#eef4ff]">Limited Time</p>
          <h3 className="mt-2 text-2xl font-semibold">{theme.promoTitle}</h3>
          <p className="mt-1 text-sm text-[#eef4ff]">{theme.promoSubtitle}</p>
        </section>
      </main>

      {galleryState && activeGalleryProduct && activeGalleryImage ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#10131fdd] p-3 md:p-6" onClick={() => setGalleryState(null)}>
          <div className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-2xl border border-[#d6dae8] bg-[#f8f8f6] shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <button
              onClick={() => setGalleryState(null)}
              className="absolute right-3 top-3 z-10 rounded-full border border-[#c7ccda] bg-white/90 p-2 text-[#4f567b]"
              aria-label="Close product details"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid md:grid-cols-[96px_minmax(0,1fr)_420px]">
              <div className="hidden border-r border-[#e0e3ed] bg-[#f2f3f2] p-3 md:block">
                <div className="space-y-3">
                  {activeGalleryImages.map((image, index) => (
                    <button
                      key={`${activeGalleryProduct.id}-gallery-thumb-${index}`}
                      onClick={() => setGalleryState({ productId: activeGalleryProduct.id, index })}
                      className={`relative h-20 w-full overflow-hidden rounded-md border bg-white ${galleryState.index === index ? "border-[#1d212f]" : "border-[#d5d9e7]"}`}
                      aria-label={`View image ${index + 1}`}
                    >
                      <Image src={image} alt={`${activeGalleryProduct.name} ${index + 1}`} fill className="object-cover" unoptimized={image.startsWith("data:")} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="relative min-h-[340px] border-r border-[#e0e3ed] bg-[#efefec]">
                <Image src={activeGalleryImage} alt={activeGalleryProduct.name} fill className="object-contain" unoptimized={activeGalleryImage.startsWith("data:")} />
                {activeGalleryImages.length > 1 ? (
                  <>
                    <button
                      onClick={() => moveGallery(-1)}
                      className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-[#d1d6e2] bg-white/90 p-2 text-[#1b2a62]"
                      aria-label="Previous image"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => moveGallery(1)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-[#d1d6e2] bg-white/90 p-2 text-[#1b2a62]"
                      aria-label="Next image"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>
                  </>
                ) : null}
              </div>

              <div className="space-y-6 p-6 md:p-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-lg font-semibold text-[#2a2f3f]">{slug} Store</p>
                    <h3 className="mt-1 text-3xl font-medium leading-tight text-[#20232d] md:text-4xl">{activeGalleryProduct.name}</h3>
                    <p className="mt-4 text-sm text-[#444a60]">Item Number: {activeGallerySku}</p>
                  </div>
                  <button className="rounded-full border border-[#8f96ac] p-3 text-[#2a2f3f]" aria-label="Save to wishlist">
                    <Heart className="h-6 w-6" />
                  </button>
                </div>

                <p className="text-4xl font-medium text-[#22252f] md:text-5xl">{activeGalleryPrice}</p>

                {/* Variant selectors */}
                {activeGalleryProduct.attributes && activeGalleryProduct.attributes.length > 0 ? (
                  <div className="space-y-4">
                    {activeGalleryProduct.attributes.map((attr) => (
                      <div key={attr.name}>
                        <p className="text-base font-medium text-[#2d3244]">
                          {attr.name}:{" "}
                          <span className="font-normal">{selectedVariantOptions[attr.name] ?? attr.values[0]}</span>
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {attr.values.map((val) => {
                            const isSelected = (selectedVariantOptions[attr.name] ?? attr.values[0]) === val;
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() =>
                                  setSelectedVariantOptions((prev) => ({ ...prev, [attr.name]: val }))
                                }
                                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                                  isSelected
                                    ? "border-[#1c2133] bg-[#1c2133] text-white"
                                    : "border-[#c4cad8] bg-white text-[#2d3244] hover:border-[#1c2133]"
                                }`}
                              >
                                {val}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                    {activeGalleryVariant ? (
                      <p className="text-xs text-[#6a72a0]">
                        SKU: {activeGalleryVariant.sku || activeGallerySku}
                        {activeGalleryVariant.stock ? ` · Stock: ${activeGalleryVariant.stock}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {activeGalleryColors.length > 0 ? (
                  <div>
                    <p className="text-2xl text-[#2d3244] md:text-3xl">
                      Color: <span className="font-medium">{selectedDetailColor || activeGalleryColors[0]}</span>
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      {activeGalleryColors.map((color, index) => (
                        <button
                          key={`${activeGalleryProduct.id}-detail-color-${index}`}
                          className={`h-10 w-10 rounded-full border-2 ${selectedDetailColor === color ? "border-[#1c2133]" : "border-transparent"}`}
                          style={{ backgroundColor: resolveColorValue(color) }}
                          title={color}
                          onClick={() => setSelectedDetailColor(color)}
                          aria-label={`Select color ${color}`}
                        />
                      ))}
                    </div>
                  </div>
                ) : null}

                <div>
                  <p className="text-xl font-medium text-[#d68b1a]">Low stock - Hurry! Limited stock left.</p>
                  <div className="mt-2 h-2 rounded-full bg-[#e7d4ab]">
                    <div className="h-2 w-4/5 rounded-full bg-[#d68b1a]" />
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-xl font-medium text-[#2d3244] md:text-2xl">Quantity</p>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <div className="inline-flex h-14 items-center rounded-lg border border-[#aeb4c7] bg-[#f5f6f8]">
                      <button
                        className="px-5 text-2xl text-[#4a5167] md:text-3xl"
                        onClick={() => setDetailQuantity((prev) => Math.max(1, prev - 1))}
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span className="min-w-12 text-center text-2xl font-medium text-[#2b3040] md:text-3xl">{detailQuantity}</span>
                      <button
                        className="px-5 text-2xl text-[#4a5167] md:text-3xl"
                        onClick={() => setDetailQuantity((prev) => prev + 1)}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <button
                      className="h-14 flex-1 rounded-lg border border-[#8f95aa] bg-white px-6 text-xl font-medium text-[#2c3142] md:text-2xl"
                      onClick={() => addToCart(activeGalleryProduct, detailQuantity)}
                    >
                      Add to cart
                    </button>
                  </div>
                </div>

                <button
                  className="h-14 w-full rounded-lg bg-[#151920] text-xl font-semibold text-white md:text-2xl"
                  onClick={() => {
                    addToCart(activeGalleryProduct, detailQuantity, false);
                    setGalleryState(null);
                    setShowCartModal(true);
                  }}
                >
                  Buy it now
                </button>

                {theme.pickupLocation || theme.pickupReadyTime ? (
                  <div className="rounded-xl border border-[#d9dbe8] bg-white px-4 py-4">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg border border-[#d9dbe8] p-2 text-[#2d3244]">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                      <div className="space-y-1 text-[#2d3244]">
                        {theme.pickupLocation ? (
                          <p className="text-base font-medium">Pickup available at {theme.pickupLocation}</p>
                        ) : null}
                        {theme.pickupReadyTime ? (
                          <p className="text-sm text-[#4f567b]">{theme.pickupReadyTime}</p>
                        ) : null}
                        <a
                          href={theme.pickupInfoLink || `/store/${slug}`}
                          target={theme.pickupInfoLink ? "_blank" : undefined}
                          rel={theme.pickupInfoLink ? "noopener noreferrer" : undefined}
                          className="inline-block text-sm font-medium text-[#1f3f9e] underline underline-offset-4"
                        >
                          View store information
                        </a>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showCartModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#0b1024cc] p-4" onClick={() => setShowCartModal(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e2e5f1] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#181926]">Shopping Cart</h2>
              <button
                onClick={() => setShowCartModal(false)}
                className="rounded-full border border-[#d9ddec] p-2 text-[#4f567b]"
                aria-label="Close cart"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {cartItems.length === 0 ? (
              <div className="p-8 text-center">
                <ShoppingCart className="h-12 w-12 mx-auto text-[#d0d7ef] mb-3" />
                <p className="text-[#636884]">Your cart is empty</p>
              </div>
            ) : (
              <>
                <div className="max-h-[60vh] overflow-y-auto">
                  {cartItems.map((item) => {
                    const priceNum = parseFloat(item.price.replace(/[^\d.-]/g, ""));
                    const subtotal = isNaN(priceNum) ? 0 : priceNum * item.quantity;
                    return (
                      <div key={item.productId} className="flex gap-4 border-b border-[#e2e5f1] p-6">
                        {item.image ? (
                          <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg">
                            <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized={item.image.startsWith("data:")} />
                          </div>
                        ) : (
                          <div className="h-24 w-24 shrink-0 rounded-lg bg-[#eef3ff] grid place-items-center text-xs text-[#6a72a0]">No image</div>
                        )}
                        <div className="flex-1">
                          <h3 className="text-sm font-semibold text-[#181926]">{item.name}</h3>
                          <p className="mt-1 text-sm text-[#4d5580]">{item.price}</p>
                          <div className="mt-3 flex items-center gap-2">
                            <button
                              onClick={() => updateCartQuantity(item.productId, Math.max(1, item.quantity - 1))}
                              className="rounded border border-[#d9ddec] px-2 py-1 text-sm text-[#4f567b] hover:bg-[#f9faff]"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm font-medium text-[#181926]">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQuantity(item.productId, item.quantity + 1)}
                              className="rounded border border-[#d9ddec] px-2 py-1 text-sm text-[#4f567b] hover:bg-[#f9faff]"
                            >
                              +
                            </button>
                            <span className="ml-auto text-sm font-semibold text-[#1e63ff]">
                              {item.price.split(" ").length > 1 ? item.price.split(" ")[0] + " " : ""}
                              {subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId)}
                          className="text-[#d86410] hover:text-[#c75510] transition"
                          title="Remove from cart"
                          aria-label={`Remove ${item.name} from cart`}
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-[#e2e5f1] px-6 py-4 space-y-3">
                  <div className="rounded-xl border border-[#d5defa] bg-[#eef3ff] px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold uppercase tracking-wide text-[#30406f]">Cart Subtotal</span>
                      <span className="text-2xl font-extrabold text-[#17307f]">
                        {cartItems[0]?.price.split(" ").length > 1 ? cartItems[0].price.split(" ")[0] + " " : ""}
                        {cartSubtotal.toFixed(2)}
                      </span>
                    </div>
                  </div>
                  {whatsappCheckoutHref ? (
                    <a
                      href={whatsappCheckoutHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full rounded-full bg-[#25D366] px-4 py-2.5 text-center font-semibold text-white hover:brightness-110 transition"
                    >
                      Checkout via WhatsApp
                    </a>
                  ) : (
                    <button
                      onClick={proceedToCheckout}
                      className="w-full rounded-full bg-[#eef2ff] px-4 py-2.5 text-[#2149bf] font-semibold text-sm hover:brightness-95 transition"
                      style={{ backgroundColor: theme.primary, color: "#fff" }}
                    >
                      Proceed to Checkout
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showCheckoutModal && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-[#0b1024cc] p-4" onClick={() => setShowCheckoutModal(false)}>
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[#e2e5f1] px-6 py-4">
              <h2 className="text-lg font-semibold text-[#181926]">
                {checkoutStep === "confirm"
                  ? "Order Confirmation"
                  : checkoutStep === "details"
                    ? "Delivery Details"
                    : "Payment Method"}
              </h2>
              <button
                onClick={() => setShowCheckoutModal(false)}
                className="rounded-full border border-[#d9ddec] p-2 text-[#4f567b]"
                aria-label="Close checkout"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {checkoutStep === "confirm" ? (
              <>
                <div className="max-h-[60vh] overflow-y-auto p-6 space-y-4">
                  <div className="rounded-lg border border-[#e2e5f1] p-4">
                    <h3 className="font-semibold text-[#181926] mb-3">Order Summary</h3>
                    {cartItems.map((item) => {
                      const priceNum = parseFloat(item.price.replace(/[^\d.-]/g, ""));
                      const subtotal = isNaN(priceNum) ? 0 : priceNum * item.quantity;
                      return (
                        <div key={item.productId} className="flex justify-between text-sm mb-2 pb-2 border-b border-[#f0f2ff] last:border-0">
                          <span className="text-[#4d5580]">
                            {item.name} <span className="text-[#8a91b4]">x{item.quantity}</span>
                          </span>
                          <span className="font-semibold text-[#181926]">
                            {item.price.split(" ").length > 1 ? item.price.split(" ")[0] + " " : ""}
                            {subtotal.toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="rounded-lg bg-[#f7f8fd] p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#636884]">Subtotal</span>
                      <span className="text-lg font-semibold text-[#1e63ff]">KSH {cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e2e5f1] px-6 py-4 flex gap-2">
                  <button
                    onClick={() => setShowCheckoutModal(false)}
                    className="flex-1 rounded-full border border-[#d9ddec] px-4 py-2.5 text-[#4f567b] font-semibold hover:bg-[#f9faff] transition"
                  >
                    Back to Cart
                  </button>
                  <button
                    onClick={() => setCheckoutStep("details")}
                    className="flex-1 rounded-full px-4 py-2.5 font-semibold text-white hover:brightness-95 transition"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Continue
                  </button>
                </div>
              </>
            ) : checkoutStep === "details" ? (
              <>
                <div className="p-6 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-[#181926] mb-1">Email Address</label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="your@email.com"
                      className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#181926] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+254..."
                      className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff]"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#181926] mb-1">Delivery Address</label>
                    <textarea
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Enter your delivery address"
                      rows={3}
                      className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff] resize-none"
                    />
                  </div>
                  <div className="rounded-lg bg-[#f7f8fd] p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#636884]">Order Total</span>
                      <span className="text-lg font-semibold text-[#1e63ff]">KSH {cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e2e5f1] px-6 py-4 flex gap-2">
                  <button
                    onClick={() => setCheckoutStep("confirm")}
                    className="flex-1 rounded-full border border-[#d9ddec] px-4 py-2.5 text-[#4f567b] font-semibold hover:bg-[#f9faff] transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => setCheckoutStep("payment")}
                    className="flex-1 rounded-full px-4 py-2.5 font-semibold text-white hover:brightness-95 transition"
                    style={{ backgroundColor: theme.primary }}
                  >
                    Place Order
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="p-6 space-y-3">
                  <p className="text-sm text-[#636884]">Choose a payment method to complete checkout.</p>
                  <button
                    onClick={() => setSelectedPaymentMethod("mpesa")}
                    className={`w-full rounded-lg border px-4 py-3 text-left font-semibold transition ${
                      selectedPaymentMethod === "mpesa"
                        ? "border-[#1e63ff] bg-[#eef3ff] text-[#1e63ff]"
                        : "border-[#d9ddec] bg-white text-[#2b3040]"
                    }`}
                  >
                    M-Pesa
                  </button>
                  <button
                    onClick={() => setSelectedPaymentMethod("visa")}
                    className={`w-full rounded-lg border px-4 py-3 text-left font-semibold transition ${
                      selectedPaymentMethod === "visa"
                        ? "border-[#1e63ff] bg-[#eef3ff] text-[#1e63ff]"
                        : "border-[#d9ddec] bg-white text-[#2b3040]"
                    }`}
                  >
                    Visa Card
                  </button>
                  {selectedPaymentMethod === "mpesa" ? (
                    <div className="rounded-lg border border-[#d9ddec] bg-white p-4 space-y-2">
                      <p className="text-sm font-semibold text-[#2b3040]">M-Pesa STK Push</p>
                      <input
                        type="tel"
                        value={mpesaPhone}
                        onChange={(event) => setMpesaPhone(event.target.value)}
                        placeholder="07XXXXXXXX or 2547XXXXXXXX"
                        className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff]"
                      />
                      <p className="text-xs text-[#6b728f]">A payment prompt will be sent to this number.</p>
                    </div>
                  ) : null}

                  {selectedPaymentMethod === "visa" ? (
                    <div className="rounded-lg border border-[#d9ddec] bg-white p-4 space-y-3">
                      <p className="text-sm font-semibold text-[#2b3040]">Visa Card Details</p>
                      <input
                        type="text"
                        value={visaCardName}
                        onChange={(event) => setVisaCardName(event.target.value)}
                        placeholder="Cardholder Name"
                        className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff]"
                      />
                      <input
                        type="text"
                        value={visaCardNumber}
                        onChange={(event) => setVisaCardNumber(event.target.value.replace(/[^\d\s]/g, ""))}
                        placeholder="Visa Card Number"
                        className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff]"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={visaExpiry}
                          onChange={(event) => setVisaExpiry(event.target.value.replace(/[^\d/]/g, "").slice(0, 5))}
                          placeholder="MM/YY"
                          className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff]"
                        />
                        <input
                          type="password"
                          value={visaCvv}
                          onChange={(event) => setVisaCvv(event.target.value.replace(/\D/g, "").slice(0, 4))}
                          placeholder="CVV"
                          className="w-full rounded-lg border border-[#d9ddec] px-3 py-2 text-sm outline-none focus:border-[#1e63ff]"
                        />
                      </div>
                    </div>
                  ) : null}

                  <div className="rounded-lg bg-[#f7f8fd] p-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[#636884]">Amount to Pay</span>
                      <span className="text-lg font-semibold text-[#1e63ff]">KSH {cartSubtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-[#e2e5f1] px-6 py-4 flex gap-2">
                  <button
                    onClick={() => setCheckoutStep("details")}
                    className="flex-1 rounded-full border border-[#d9ddec] px-4 py-2.5 text-[#4f567b] font-semibold hover:bg-[#f9faff] transition"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePaymentAction}
                    className="flex-1 rounded-full px-4 py-2.5 font-semibold text-white hover:brightness-95 transition"
                    style={{ backgroundColor: theme.primary }}
                  >
                    {selectedPaymentMethod === "mpesa" ? "Send STK Push" : "Pay with Visa"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <footer className="border-t border-[#e2e5f1] bg-white py-6 text-center text-sm text-[#636884]">
        <div className="section-shell">
          <p className="mb-2">2026 {slug} store. All rights reserved.</p>
          <p className="text-xs">
            Powered by{" "}
            <a
              href="https://www.joetech-hub.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold hover:underline"
              style={{ color: theme.primary }}
            >
              JoeTech Hub
            </a>
          </p>
        </div>
      </footer>

      {whatsappHref ? (
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chat ${slug} store on WhatsApp`}
          className="fixed bottom-6 right-6 z-30 inline-flex items-center gap-3 rounded-full px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:scale-[1.02]"
          style={{ backgroundColor: "#25D366" }}
        >
          <MessageCircle className="h-5 w-5" />
          <span className="hidden sm:inline">Chat on WhatsApp</span>
        </a>
      ) : null}
    </div>
  );
}
