module.exports = {
  root: true,
  env: {
    'vue/setup-compiler-macros': true,
    node: false
  },
  parser: 'vue-eslint-parser',
  extends: [
    'plugin:tailwindcss/recommended',
    'plugin:vue/vue3-essential',
    'standard',
    'eslint:recommended'
  ],
  plugins: [
    'import',
    'vue'
  ]
}
