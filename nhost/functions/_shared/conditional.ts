export type Branch = "true" | "false";

/** Deliberately constrained: no eval, no property traversal, no arbitrary code. */
export function evaluateBranch(expression: string, value: unknown): Branch {
  const normalized = expression.trim().toLowerCase();
  const text =
    typeof value === "string"
      ? value.toLowerCase()
      : JSON.stringify(value).toLowerCase();
  const match = normalized.match(/^(contains|equals|truthy)\s*(.*)$/);
  if (!match)
    throw new Error("Unsupported condition. Use contains, equals, or truthy.");
  if (match[1] === "truthy") return value ? "true" : "false";
  const expected = match[2].replace(/^['"]|['"]$/g, "").trim();
  return (match[1] === "contains" ? text.includes(expected) : text === expected)
    ? "true"
    : "false";
}
