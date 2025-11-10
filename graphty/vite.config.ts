import react from "@vitejs/plugin-react";
import {resolve} from "path";
import {defineConfig, loadEnv, UserConfig} from "vite";

// https://vitejs.dev/config/
export default defineConfig(({mode}) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), "");
    const config: UserConfig = {
        plugins: [react()],
        // Set base path for GitHub Pages deployment
        base: env.VITE_BASE_PATH || "/",
        resolve: {
            alias: {
                "@": resolve(__dirname, "./src"),
            },
        },
        server: {
            host: true,
            port: 9000,
            fs: {
                allow: [
                    // Allow serving files from the project root
                    resolve(__dirname, ".."),
                ],
            },
        },
        build: {
            outDir: "dist",
            sourcemap: true,
        },
    };

    if (env.HOST && config.server) {
        config.server.host = env.HOST;
    }

    if (env.PORT && config.server) {
        config.server.port = parseInt(env.PORT);
    }

    return config;
});
