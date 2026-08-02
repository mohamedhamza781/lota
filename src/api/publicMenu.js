import { apiClient } from "./client";

export const publicMenuApi = {
  getMenu: (slug) => apiClient.get(`/public/menu/${slug}`),
  getDialogConfig: (slug) => apiClient.get(`/public/menu/${slug}/dialog-config`),
  submitLead: (slug, payload) => apiClient.post(`/public/menu/${slug}/lead`, payload),
};
