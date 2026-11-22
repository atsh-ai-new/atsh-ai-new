export const permissionKeys = ["assistant","customers","content","products","settings","team","audit"];
export const rolePermissions = {
  owner: permissionKeys,
  admin: ["assistant","customers","content","products","settings","audit"],
  editor: ["assistant","content"],
  sales: ["customers"],
  viewer: []
};
export function effectivePermissions(role, overrides) {
  const base = Object.fromEntries(permissionKeys.map(key => [key, rolePermissions[role]?.includes(key) ?? false]));
  if (role === "owner") return base;
  if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
    for (const key of permissionKeys) if (typeof overrides[key] === "boolean") base[key] = overrides[key];
  }
  return base;
}
export function hasPermission(role, permissions, key) {
  return role === "owner" || permissions?.[key] === true;
}
