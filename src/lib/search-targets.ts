export function toggleSearchTarget(current: string, target: string): string {
  if (target === "all") return "all";
  const selected = current === "all" ? [] : current.split(",");
  const next = selected.includes(target)
    ? selected.filter((item) => item !== target)
    : [...selected, target];
  return next.length === 0 || next.length === 3 ? "all" : next.join(",");
}
