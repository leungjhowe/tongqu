import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import UnoCSS from "unocss/vite";
import path from "node:path";
// Tauri-recommended Vite configuration
// https://v2.tauri.app/start/frontend/vite/
// Resolve a workspace package's source root on disk. Mirrors the
// `@tongqu/*` paths in tsconfig.base.json so Vite and tsc agree at
// both type-check and bundle time.
//
// Vite aliases are pure prefix-replacement — there's no "exact match"
// mode. To support both `@tongqu/ui` (root entry) and `@tongqu/ui/styles`
// (SCSS subpath) we use a regex alias for the /styles subpath and a
// simple prefix alias for everything else.
var pkgRoot = function (name) {
    return path.resolve(__dirname, "../../packages/".concat(name, "/src"));
};
var uiStylesAbs = path.resolve(__dirname, "../../packages/ui/src/styles/globals.scss");
export default defineConfig({
    plugins: [react(), UnoCSS()],
    css: {
        preprocessorOptions: {
            scss: { api: "modern-compiler" },
        },
    },
    resolve: {
        alias: [
            // @tongqu/ui/styles → /packages/ui/src/styles/globals.scss (must come
            // before the broader @tongqu/ui prefix alias so it matches first).
            {
                find: /^@tongqu\/ui\/styles$/,
                replacement: uiStylesAbs,
            },
            // Simple prefix aliases for the other workspace packages. We use
            // exact-match entries (no wildcard) since the apps only import
            // the package root, not arbitrary subpaths.
            { find: "@", replacement: path.resolve(__dirname, "./src") },
            { find: "@tongqu/shared", replacement: pkgRoot("shared") },
            { find: "@tongqu/ui", replacement: pkgRoot("ui") },
            { find: "@tongqu/workflow-core", replacement: pkgRoot("workflow-core") },
            { find: "@tongqu/workflow-ui", replacement: pkgRoot("workflow-ui") },
            { find: "@tongqu/gis-core", replacement: pkgRoot("gis-core") },
            { find: "@tongqu/data-core", replacement: pkgRoot("data-core") },
            { find: "@tongqu/ai-core", replacement: pkgRoot("ai-core") },
            { find: "@tongqu/asset-core", replacement: pkgRoot("asset-core") },
            { find: "@tongqu/export-core", replacement: pkgRoot("export-core") },
        ],
    },
    // Vite options tailored for Tauri development
    clearScreen: false,
    server: {
        port: 1420,
        strictPort: true,
        host: "0.0.0.0",
        watch: {
            ignored: ["**/src-tauri/**"],
        },
    },
    envPrefix: ["VITE_", "TAURI_"],
    build: {
        target: "es2022",
        minify: !process.env.TAURI_DEBUG ? "esbuild" : false,
        sourcemap: !!process.env.TAURI_DEBUG,
    },
});
