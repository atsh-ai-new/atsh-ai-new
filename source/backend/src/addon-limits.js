// Allow a growing shared catalog while keeping request validation bounded.
export const MAX_ADDONS_PER_SELECTION = 100;
// Package and sector choices may coexist, with base, tax and other invoice lines.
export const MAX_ADDON_INVOICE_LINES = 2 * MAX_ADDONS_PER_SELECTION + 20;
