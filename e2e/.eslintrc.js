module.exports = {
  env: {
    jest: true,
  },
  globals: {
    device: 'readonly',
    element: 'readonly',
    by: 'readonly',
    waitFor: 'readonly',
    expect: 'readonly',
  },
  rules: {
    'no-console': 'off', // Console logs are useful for debugging E2E tests
  },
};
