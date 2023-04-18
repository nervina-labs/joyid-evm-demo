import { defineConfig } from 'vite-plugin-windicss';
import daisyui from 'daisyui'

export default defineConfig({
  darkMode: false,
  theme: {
    extend: {},
  },
  plugins: [daisyui as any],
});
