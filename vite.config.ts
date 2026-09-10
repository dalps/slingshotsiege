import { defineConfig } from "vite";

export default defineConfig({
  build: {
    minify: "terser",
    rolldownOptions: {
      platform: "browser",
      output: { entryFileNames: "main.js" },
    },
    assetsDir: "",
    copyPublicDir: false,
    terserOptions: {
      mangle: {
        keep_classnames: false,
        keep_fnames: false,
        // eval: true,
        properties: true,
      },
    },
  },
});
