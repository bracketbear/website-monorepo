module.exports = {
  root: true,
  extends: [
    '@nuxtjs/eslint-config-typescript',
    'plugin:tailwindcss/recommended',
  ],
  rules: {
    'comma-dangle': ['error', 'always-multiline'],
    'vue/html-self-closing': [
      'error',
      {
        html: {
          void: 'always',
        },
      },
    ],
    'vue/max-attributes-per-line': ['error', { singleline: 3 }],
    'tailwindcss/no-custom-classname': 'off',
  },
}
