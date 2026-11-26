// Old installations retain the two-hour expiry. A separately deployed local
// visual worker may use a bounded, explicitly configured longer window.
export function contentVideoTimeoutMinutes(value=process.env.CONTENT_STUDIO_GENERATION_TIMEOUT_MINUTES) {
  if (typeof value !== "string" || !/^[0-9]{1,4}$/.test(value)) return 120;
  const n=Number(value);
  return n>=120 && n<=1440 ? n : 120;
}
