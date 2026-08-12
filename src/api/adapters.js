// الباك إند الحقيقي بيرجّع بيانات بشكل مختلف عن الـ mock القديم (مثلاً
// Customer و CustomerProfile منفصلين، الأسعار والفئات موديلات مستقلة...).
// هاي الدوال بتحوّل رد الباك إند لنفس الشكل يلي كانت الصفحات متعوّدة عليه
// من mock/*.js، عشان نتفادى إعادة كتابة كل صفحة من الصفر.

function fmtDate(d) {
  if (!d) return "—";
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return "—";
  }
}

const SOURCE_MAP = {
  manual_form: "dashboard",
  menu_dialog: "menu",
  whatsapp_bot: "whatsapp",
};

export function normalizeCustomerProfile(profile) {
  const customer = profile.customerId || {};
  return {
    id: typeof customer === "object" ? customer._id : customer,
    profileId: profile._id,
    name: customer.name ?? "—",
    phone: customer.phone ?? "",
    waId: customer.waId ?? null,
    email: customer.email ?? "",
    // رمز عضوية فريد للعميل بهاي المنشأة تحديداً (مولّد تلقائياً أول ما
    // يسجل عن طريق بوت الواتساب، ومُرسل إله برسالة تأكيد التسجيل)
    membershipCode: profile.membershipCode || null,
    tier: profile.tier || "bronze",
    segment: profile.segment || "new",
    // تصنيف العميل على مرحلتين (شوف classification.service.js بالباك إند):
    // activityTier = مستوى النشاط (عدد الزيارات بآخر 30 يوم)، recencyStatus
    // = هل هو نشط فعلياً هلق ولا لأ. recencyStatus عنده الأولوية بالعرض —
    // عميل activityTier=ambassador بس recencyStatus=lost يعتبر "مفقود" حالياً.
    activityTier: profile.activityTier || "new",
    recencyStatus: profile.recencyStatus || "normal",
    points: profile.pointsBalance ?? 0,
    totalPointsEarned: profile.totalPointsEarned ?? 0,
    visits: profile.visitsCount ?? 0,
    // آخر زيارة فعلية (بوت واتساب) وليس بس آخر شراء - وبقيمة خام (ISO) مش
    // منسّقة سلفاً، عشان الصفحة تقدر تعرض تاريخ+يوم+ساعة وتفلتر عليها
    lastVisitAt: profile.lastVisitAt || profile.lastPurchaseAt || null,
    lastVisit: fmtDate(profile.lastVisitAt || profile.lastPurchaseAt),
    source: SOURCE_MAP[profile.source] || profile.source || "dashboard",
    createdAt: profile.createdAt,
  };
}

export function emptyKpis() {
  return {
    totalCustomers: 0,
    newThisMonth: 0,
    atRiskCount: 0,
    lostCount: 0,
    pointsIssued: 0,
    pointsRedeemed: 0,
  };
}

export function kpisFromSummary(summary) {
  if (!summary) return emptyKpis();
  return {
    totalCustomers: summary.customersCount ?? 0,
    newThisMonth: summary.newThisMonth ?? 0,
    atRiskCount: summary.atRiskCount ?? 0,
    lostCount: summary.lostCount ?? 0,
    pointsIssued: summary.totalPointsIssued ?? 0,
    pointsRedeemed: summary.totalPointsRedeemed ?? 0,
  };
}

// بتحسب الـ kpis لايف من قائمة عملاء منشأة محدّدة (بعد ما تنجلب فعليًا) —
// مفيدة لصفحة الداشبورد تبع أدمن المنشأة (ما إله صلاحية super-admin summary).
// ملاحظة: atRiskCount/lostCount بيتحسبوا من recencyStatus (التصنيف الحالي
// الفعلي، شوف classification.service.js بالباك إند) مش من حقل segment
// القديم يلي بيتحدث بس عن طريق خدمة تنبيهات قديمة منفصلة (atRisk.service.js)
// وبالتالي كان غالباً صفر بشكل دائم بغض النظر عن الواقع.
export function kpisFromCustomers(customers, fallback = emptyKpis()) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const atRiskCount = customers.filter((c) => c.recencyStatus === "at_risk").length;
  const lostCount = customers.filter((c) => c.recencyStatus === "lost").length;
  const newThisMonth = customers.filter((c) => c.createdAt && new Date(c.createdAt) >= startOfMonth).length;
  const pointsIssued = customers.reduce((sum, c) => sum + (c.totalPointsEarned || 0), 0);
  return {
    totalCustomers: customers.length,
    newThisMonth,
    atRiskCount,
    lostCount,
    pointsIssued,
    pointsRedeemed: fallback.pointsRedeemed ?? 0,
  };
}

export function normalizeEstablishment(est, summary) {
  const id = est._id || est.establishmentId || est.id;
  const name = est.name || "";
  return {
    id,
    name,
    slug: est.slug,
    city: est.city || "",
    address: est.address || "",
    whatsappNumber: est.whatsappNumber || "",
    logoUrl: est.logoUrl || null,
    menuPrimaryColor: est.menuPrimaryColor || null,
    adBannerUrl: est.adBannerUrl || null,
    footerConfig: est.footerConfig || null,
    plan: est.plan || "تجريبي",
    initial: name.trim().charAt(0) || "؟",
    subscriptionStatus: est.subscriptionStatus,
    isActive: est.isActive,
    menuDialogConfig: est.menuDialogConfig,
    kpis: kpisFromSummary(summary),
  };
}

export function normalizeCategoriesWithProducts(categories, products) {
  return categories.map((cat) => ({
    id: cat._id,
    name: cat.name,
    order: cat.order,
    items: products
      .filter((p) => (p.categoryId?._id || p.categoryId) === cat._id)
      .map((p) => ({
        id: p._id,
        name: p.name,
        price: p.price,
        imageUrl: p.imageUrl,
        isNew: !!p.isNewItem,
        order: p.order,
        description: p.description || "",
      })),
  }));
}

export function normalizeUser(u) {
  return {
    id: u.id || u._id,
    name: u.name,
    email: u.email,
    role: u.role,
    establishmentId: u.establishmentId?._id || u.establishmentId || null,
    status: u.isActive === false ? "suspended" : "active",
    createdAt: fmtDate(u.createdAt),
  };
}