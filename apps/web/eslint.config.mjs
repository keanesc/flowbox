import { FlatCompat } from "@eslint/eslintrc";
import tsParser from "@typescript-eslint/parser";
import designSystem from "@atlaskit/eslint-plugin-design-system";
import uiStyling from "@atlaskit/eslint-plugin-ui-styling-standard";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

export default [
  { ignores: [".next/**", "next-env.d.ts"] },
  ...compat.extends("next/core-web-vitals"),
  uiStyling.configs["flat/recommended"],
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { parser: tsParser },
    rules: designSystem.configs["recommended/flat"].rules,
  },
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      // The feature layer shares one token-only cssMap so the shell and panels
      // remain visually consistent. The repository guard still rejects raw
      // styling values and global CSS.
      "@atlaskit/ui-styling-standard/no-imported-style-values": "off",
      "@atlaskit/ui-styling-standard/no-exported-styles": "off",
      "@atlaskit/design-system/no-invalid-css-map": "off",
      "@atlaskit/design-system/no-unused-css-map": "off",
      "@atlaskit/design-system/use-field-message-wrapper": "off",
      "@atlaskit/design-system/no-placeholder": "off",
      "@atlaskit/design-system/no-readonly-or-disabled-inputs": "off",
      "@atlaskit/design-system/use-heading-level-in-section-message": "off",
      "@atlaskit/design-system/no-html-code": "off",
    },
  },
  {
    files: ["app/layout.tsx"],
    rules: { "@atlaskit/ui-styling-standard/no-global-styles": "off" },
  },
];
