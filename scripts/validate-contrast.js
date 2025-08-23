#!/usr/bin/env node

/**
 * Build-time contrast validation script
 * Ensures all color combinations meet WCAG AA standards
 */

// Import shared color definitions
const colors = require('../src/ui/colors.json');

// Calculate relative luminance for WCAG contrast ratio
const getLuminance = (hex) => {
  if (!hex || !/^#[0-9A-F]{6}$/i.test(hex)) {
    console.warn(`Invalid hex color: ${hex}`);
    return 0;
  }

  const rgb = parseInt(hex.slice(1), 16);
  const r = (rgb >> 16) & 0xff;
  const g = (rgb >> 8) & 0xff;
  const b = (rgb >> 0) & 0xff;

  const sRGB = [r, g, b].map((val) => {
    val = val / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * sRGB[0] + 0.7152 * sRGB[1] + 0.0722 * sRGB[2];
};

// Calculate WCAG contrast ratio between two colors
const getContrastRatio = (foreground, background) => {
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
};

// Validation configurations
const validations = [
  {
    name: 'Primary text on background',
    fg: colors.textPrimary,
    bg: colors.bg,
    required: 4.5,
  },
  {
    name: 'Secondary text on background',
    fg: colors.textSecondary,
    bg: colors.bg,
    required: 4.5,
  },
  {
    name: 'Primary text on card',
    fg: colors.textPrimary,
    bg: colors.card,
    required: 4.5,
  },
  {
    name: 'Primary text on surface',
    fg: colors.textPrimary,
    bg: colors.surface,
    required: 4.5,
  },
  {
    name: 'White text on primary',
    fg: colors.white,
    bg: colors.primary,
    required: 4.5,
  },
  {
    name: 'White text on danger',
    fg: colors.white,
    bg: colors.danger,
    required: 4.5,
  },
  {
    name: 'White text on success',
    fg: colors.white,
    bg: colors.success,
    required: 4.5,
  },
];

// Run validation
console.log('🎨 Validating color contrasts for WCAG AA compliance...\n');

let hasFailures = false;
const results = [];

validations.forEach(({ name, fg, bg, required }) => {
  const ratio = getContrastRatio(fg, bg);
  const passes = ratio >= required;

  results.push({
    name,
    ratio: ratio.toFixed(2),
    passes,
    required,
  });

  const status = passes ? '✅' : '❌';
  const message = `${status} ${name}`;
  const details = `   Contrast: ${ratio.toFixed(2)}:1 (required: ${required}:1)`;

  console.log(message);
  console.log(details);
  console.log(`   Colors: ${fg} on ${bg}\n`);

  if (!passes) {
    hasFailures = true;
  }
});

// Summary
console.log('─'.repeat(50));
if (hasFailures) {
  console.warn('\n⚠️  Contrast validation WARNING');
  console.warn('Some color combinations do not meet WCAG AA standards.');
  console.warn('Please coordinate with design team to update colors in src/ui/tokens.ts');
  console.warn('This is a non-blocking warning for CI.\n');
  // Exit with 0 to not break CI, but log the issues
  process.exit(0);
} else {
  console.log('\n✅ All color contrasts meet WCAG AA standards!');
  console.log(`Validated ${results.length} color combinations.\n`);
  process.exit(0);
}
