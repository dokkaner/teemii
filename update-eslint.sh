#!/bin/bash

# Update frontend ESLint
cd app
npm uninstall eslint eslint-config-standard eslint-plugin-import eslint-plugin-n eslint-plugin-promise eslint-plugin-tailwindcss eslint-plugin-vue
npm install --save-dev --legacy-peer-deps \
  eslint@^8.56.0 \
  eslint-config-standard@^17.1.0 \
  eslint-plugin-import@^2.29.1 \
  eslint-plugin-n@^16.6.1 \
  eslint-plugin-promise@^6.1.1 \
  eslint-plugin-tailwindcss@^3.13.1 \
  eslint-plugin-vue@^9.19.2

# Update backend ESLint
cd ../server
npm uninstall eslint eslint-config-standard eslint-plugin-import eslint-plugin-n eslint-plugin-promise eslint-plugin-vue
npm install --save-dev --legacy-peer-deps \
  eslint@^8.56.0 \
  eslint-config-standard@^17.1.0 \
  eslint-plugin-import@^2.29.1 \
  eslint-plugin-n@^16.6.1 \
  eslint-plugin-promise@^6.1.1 \
  eslint-plugin-vue@^9.19.2
