export const ADMIN_PREVIEW_KEY = "atsh-ai-admin-preview-v1";

export type PreviewPackage = { id: string; name: string; price: number | null; description: string };
export type PreviewTheme = { navy: string; blue: string; gold: string; page: string };
export type PreviewSiteData = {
  heroTitle: string;
  heroDescription: string;
  ctaText: string;
  packages: PreviewPackage[];
  colors: PreviewTheme;
};

export function readAdminPreview(): Partial<PreviewSiteData> | null {
  try {
    const raw = localStorage.getItem(ADMIN_PREVIEW_KEY);
    return raw ? JSON.parse(raw) as Partial<PreviewSiteData> : null;
  } catch {
    return null;
  }
}
