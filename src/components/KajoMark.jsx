import kajoLogoSrc from "../assets/kajo-logo-full.png";

// نسبة العرض للارتفاع الحقيقية لملف الشعار (1680×719) - عشان الصورة ما
// تنطط بشكل غلط لما نحدد بس الارتفاع (height) من برّا
const ASPECT_RATIO = 1680 / 719;

/**
 * شعار Kajo الكامل (الأيقونة + كلمة "Kajo" سوا، متل ما هو بملف الشعار
 * الرسمي المرفوع من العميل) - مش رمز لحاله + نص لحاله متل قبل.
 *
 * inverted=true بتحوّل الشعار لأبيض بالكامل (فلتر CSS) عشان يشتغل فوق
 * خلفية غامقة (زي شريط التنقل الجانبي tokens.ink).
 *
 * `height` بيحدد ارتفاع الشعار بالبكسل، والعرض بينحسب تلقائياً حسب
 * النسبة الحقيقية لملف الصورة عشان ما ينمط.
 */
export function KajoMark({ height = 34, inverted = false }) {
  return (
    <img
      src={kajoLogoSrc}
      alt="Kajo"
      height={height}
      width={Math.round(height * ASPECT_RATIO)}
      style={{
        display: "block",
        objectFit: "contain",
        filter: inverted ? "brightness(0) invert(1)" : "none",
      }}
    />
  );
}