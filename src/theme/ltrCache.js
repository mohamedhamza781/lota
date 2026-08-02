import createCache from "@emotion/cache";
import { prefixer } from "stylis";

// بدون rtlPlugin — مخصص للصفحات LTR زي منيو Brewhaus، عشان ما ينعكس أي
// left/right بالخطأ بسبب الـ cache العام لبقية التطبيق (اللي هو RTL).
export const ltrCache = createCache({
  key: "muiltr",
  stylisPlugins: [prefixer],
});
