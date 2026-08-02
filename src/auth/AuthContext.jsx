import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { authApi } from "../api/auth";
import { usersApi } from "../api/users";
import { establishmentsApi } from "../api/establishments";
import { customersApi } from "../api/customers";
import { categoriesApi } from "../api/categories";
import { productsApi } from "../api/products";
import { superAdminApi } from "../api/superAdmin";
import { getToken, setToken, onUnauthorized } from "../api/client";
import {
  normalizeCustomerProfile,
  normalizeEstablishment,
  normalizeCategoriesWithProducts,
  normalizeUser,
  kpisFromCustomers,
} from "../api/adapters";

/**
 * هاد الملف هو نقطة الاتصال الوحيدة بين واجهة التطبيق (الصفحات) والباك
 * إند الحقيقي (Express + MongoDB). كل الدوال هون بتنادي الـ API عبر
 * src/api/*.js، وبتحوّل الرد لنفس الشكل يلي كانت الصفحات متعودة عليه
 * وقت كان كل شي mock — عشان أغلب الصفحات ما احتاجت تتغيّر.
 *
 * establishments: بتتحمّل كقائمة "سطحية" أول ما تسجّل الدخول (بدون منيو
 * أو عملاء)، وبعدين كل صفحة (المنيو/العملاء/RFM) بتنادي
 * ensureEstablishmentDetail(id) بأول ما تفتح، وهاي بتجيب الفئات+الأصناف+
 * العملاء وتدمجها جوا نفس الكائن.
 */

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [establishments, setEstablishments] = useState([]);
  const [users, setUsers] = useState([]);
  const loadedDetails = useRef(new Set());

  // ---------------- تحميل الجلسة عند فتح التطبيق ----------------
  useEffect(() => {
    onUnauthorized(() => {
      setToken(null);
      setCurrentUser(null);
    });

    async function bootstrap() {
      const token = getToken();
      if (!token) {
        setAuthLoading(false);
        return;
      }
      try {
        const me = await authApi.me();
        setCurrentUser({
          id: me.id,
          name: me.name,
          email: me.email,
          role: me.role,
          establishmentId: me.establishmentId ? String(me.establishmentId) : null,
        });
      } catch {
        setToken(null);
      } finally {
        setAuthLoading(false);
      }
    }
    bootstrap();
  }, []);

  // ---------------- تحميل قائمة المنشآت حسب دور المستخدم ----------------
  const loadEstablishments = useCallback(async (user) => {
    if (!user) {
      setEstablishments([]);
      return;
    }
    try {
      if (user.role === "super_admin") {
        const [list, summary] = await Promise.all([
          establishmentsApi.list(),
          superAdminApi.establishmentsSummary(),
        ]);
        const summaryById = new Map(summary.map((s) => [String(s.establishmentId), s]));
        setEstablishments(
          list
            .filter((e) => e.isActive !== false)
            .map((e) => normalizeEstablishment(e, summaryById.get(String(e._id))))
        );
      } else if (user.establishmentId) {
        const est = await establishmentsApi.get(user.establishmentId);
        setEstablishments([normalizeEstablishment(est)]);
      }
    } catch (err) {
      console.error("تعذّر تحميل المنشآت:", err);
      setEstablishments([]);
    }
  }, []);

  useEffect(() => {
    loadEstablishments(currentUser);
    if (currentUser?.role === "super_admin") {
      usersApi
        .list()
        .then((list) => setUsers(list.map(normalizeUser)))
        .catch((err) => console.error("تعذّر تحميل المستخدمين:", err));
    } else {
      setUsers([]);
    }
    loadedDetails.current = new Set();
  }, [currentUser, loadEstablishments]);

  // ---------------- تفاصيل منشأة محدّدة (منيو + عملاء) عند الطلب ----------------
  const ensureEstablishmentDetail = useCallback(async (establishmentId, { force = false } = {}) => {
    if (!establishmentId) return;
    if (!force && loadedDetails.current.has(establishmentId)) return;
    loadedDetails.current.add(establishmentId);

    try {
      const [categories, products, customerProfiles] = await Promise.all([
        categoriesApi.list(establishmentId),
        productsApi.list(establishmentId),
        customersApi.list(establishmentId),
      ]);

      const menu = { categories: normalizeCategoriesWithProducts(categories, products) };
      const customers = customerProfiles.map(normalizeCustomerProfile);

      setEstablishments((prev) =>
        prev.map((e) =>
          e.id === establishmentId
            ? { ...e, menu, customers, kpis: kpisFromCustomers(customers, e.kpis) }
            : e
        )
      );
    } catch (err) {
      console.error("تعذّر تحميل تفاصيل المنشأة:", err);
      loadedDetails.current.delete(establishmentId);
    }
  }, []);

  // ---------------- Auth ----------------
  async function login(email, password) {
    try {
      const { token, user } = await authApi.login(email, password);
      setToken(token);
      const safeUser = {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        establishmentId: user.establishmentId ? String(user.establishmentId) : null,
      };
      setCurrentUser(safeUser);
      return { ok: true, user: safeUser };
    } catch (err) {
      return { ok: false, error: err.message || "تعذّر تسجيل الدخول" };
    }
  }

  function logout() {
    setToken(null);
    setCurrentUser(null);
    setEstablishments([]);
    setUsers([]);
  }

  // ---------------- إدارة المستخدمين (سوبر أدمن فقط) ----------------
  async function addUser(payload) {
    try {
      const created = await usersApi.create(payload);
      const normalized = normalizeUser(created);
      setUsers((prev) => [normalized, ...prev]);
      return normalized;
    } catch (err) {
      console.error("تعذّر إضافة المستخدم:", err);
      throw err;
    }
  }

  async function updateUser(id, patch) {
    try {
      const updated = await usersApi.update(id, patch);
      const normalized = normalizeUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === id ? normalized : u)));
    } catch (err) {
      console.error("تعذّر تحديث المستخدم:", err);
    }
  }

  async function deleteUser(id) {
    try {
      await usersApi.remove(id);
      setUsers((prev) => prev.filter((u) => u.id !== id));
    } catch (err) {
      console.error("تعذّر حذف المستخدم:", err);
    }
  }

  async function toggleUserStatus(id) {
    try {
      const updated = await usersApi.toggleStatus(id);
      const normalized = normalizeUser(updated);
      setUsers((prev) => prev.map((u) => (u.id === id ? normalized : u)));
    } catch (err) {
      console.error("تعذّر تحديث حالة المستخدم:", err);
    }
  }

  // ---------------- إدارة المنشآت (سوبر أدمن فقط) ----------------
  async function addEstablishment(payload) {
    try {
      const created = await establishmentsApi.create(payload);
      const normalized = normalizeEstablishment(created);
      setEstablishments((prev) => [normalized, ...prev]);
      return normalized;
    } catch (err) {
      console.error("تعذّر إضافة المنشأة:", err);
      throw err;
    }
  }

  async function updateEstablishment(id, patch) {
    try {
      const updated = await establishmentsApi.update(id, patch);
      setEstablishments((prev) => prev.map((e) => (e.id === id ? { ...e, ...normalizeEstablishment(updated) } : e)));
    } catch (err) {
      console.error("تعذّر تحديث المنشأة:", err);
    }
  }

  // الباك إند ما بيدعم حذف نهائي للمنشأة (تجنّبًا لتيتّم بياناتها) — فبنعمل
  // إلغاء تفعيل (isActive: false) وبتختفي من القائمة، بدل حذف فعلي.
  async function deleteEstablishment(id) {
    try {
      await establishmentsApi.update(id, { isActive: false });
      setEstablishments((prev) => prev.filter((e) => e.id !== id));
      setUsers((prev) => prev.filter((u) => u.establishmentId !== id));
    } catch (err) {
      console.error("تعذّر إلغاء تفعيل المنشأة:", err);
    }
  }

  // ---------------- إدارة منيو منشأة محدّدة ----------------
  async function addMenuCategory(establishmentId, name) {
    try {
      await categoriesApi.create({ name }, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر إضافة الفئة:", err);
    }
  }

  async function updateMenuCategory(establishmentId, categoryId, patch) {
    try {
      await categoriesApi.update(categoryId, patch, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر تحديث الفئة:", err);
    }
  }

  async function deleteMenuCategory(establishmentId, categoryId) {
    try {
      await categoriesApi.remove(categoryId, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر حذف الفئة (تأكد إنه ما في أصناف مرتبطة فيها):", err);
    }
  }

  async function addMenuItem(establishmentId, categoryId, item) {
    try {
      await productsApi.create({ ...item, categoryId }, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر إضافة الصنف:", err);
    }
  }

  async function updateMenuItem(establishmentId, categoryId, itemId, patch) {
    try {
      await productsApi.update(itemId, { ...patch, categoryId }, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر تحديث الصنف:", err);
    }
  }

  async function deleteMenuItem(establishmentId, categoryId, itemId) {
    try {
      await productsApi.remove(itemId, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر حذف الصنف:", err);
    }
  }

  // ---------------- إدارة عملاء منشأة محدّدة ----------------
  async function addCustomer(establishmentId, payload, source = "dashboard") {
    try {
      await customersApi.create(payload, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر إضافة العميل:", err);
    }
  }

  async function updateCustomer(establishmentId, customerId, patch) {
    try {
      await customersApi.update(customerId, patch, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر تحديث العميل:", err);
    }
  }

  async function deleteCustomer(establishmentId, customerId) {
    try {
      await customersApi.remove(customerId, establishmentId);
      await ensureEstablishmentDetail(establishmentId, { force: true });
    } catch (err) {
      console.error("تعذّر حذف العميل:", err);
    }
  }

  const value = useMemo(
    () => ({
      currentUser,
      authLoading,
      login,
      logout,
      users,
      addUser,
      updateUser,
      deleteUser,
      toggleUserStatus,
      establishments,
      ensureEstablishmentDetail,
      addEstablishment,
      updateEstablishment,
      deleteEstablishment,
      addMenuCategory,
      updateMenuCategory,
      deleteMenuCategory,
      addMenuItem,
      updateMenuItem,
      deleteMenuItem,
      addCustomer,
      updateCustomer,
      deleteCustomer,
    }),
    [currentUser, authLoading, users, establishments, ensureEstablishmentDetail]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth لازم تستخدم جوا AuthProvider");
  return ctx;
}
