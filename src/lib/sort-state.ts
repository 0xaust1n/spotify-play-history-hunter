export type SortColumn =
  | "track_name"
  | "album_name"
  | "artist_name"
  | "first_streamed"
  | "last_streamed"
  | "stream_count";

export type SortDirection = "asc" | "desc";

export type SortRule = {
  column: SortColumn;
  direction: SortDirection;
};

export function toggleSortRule(rules: SortRule[], column: SortColumn): SortRule[] {
  const index = rules.findIndex((rule) => rule.column === column);
  if (index === -1) {
    return [...rules, { column, direction: "asc" }];
  }

  const current = rules[index];
  if (current.direction === "asc") {
    return rules.map((rule, ruleIndex) =>
      ruleIndex === index ? { ...rule, direction: "desc" } : rule,
    );
  }

  return rules.filter((_, ruleIndex) => ruleIndex !== index);
}

export function serializeSortRules(rules: SortRule[]): string {
  return rules.map((rule) => `${rule.column}:${rule.direction}`).join(",");
}
