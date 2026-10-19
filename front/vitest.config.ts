import {defineConfig, mergeConfig} from "vitest/config";
import viteConfig from "./vite.config.ts";

export default mergeConfig(viteConfig, defineConfig({
    test: {
        environment: "node",
        include: ["tests/**/*.{test,spec}.{js,mjs,ts,tsx}"],
        coverage: {
            provider: "v8",
            include: ["src/**/*.{ts,tsx}"],
            exclude: ["src/**/*.d.ts"],
            reporter: ["text", "lcov", "html"],
            reportsDirectory: "coverage",
        },
    },
}));
