import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

async function buildServer() {
  await rm("dist", { recursive: true, force: true });

  console.log("building server...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  await esbuild({
    entryPoints: ["server/index.ts"],
    platform: "node",
    bundle: true,
    format: "cjs",
    outfile: "dist/index.cjs",
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false, // Easier debugging, usually not needed for server
    external: allDeps, // <--- EXTERNALIZE EVERYTHING
    logLevel: "info",
    keepNames: true, // Helps with some ORM reflection
  });
}

buildServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
