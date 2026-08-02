// أداة بسيطة لتنقّل سلس (smooth scroll) بين أقسام صفحة المنيو العامة —
// الصفحة أصلاً صفحة واحدة طويلة (Menu / About Us / Locations...)، فمش
// محتاجين راوت منفصل: بس نلقط العنصر بالـ id ونعمله scrollIntoView.
export function scrollToSection(id) {
  if (typeof document === "undefined") return;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}