import { build as esbuild } from "esbuild";
import { rm, readFile } from "fs/promises";

async function buildServer() {
  await rm("dist", { recursive: true, force: true });

  console.log("Building API and email worker...");
  const pkg = JSON.parse(await readFile("package.json", "utf-8"));
  const allDeps = [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
  ];

  const sharedOptions = {
    platform: "node" as const,
    bundle: true,
    format: "cjs" as const,
    external: allDeps,
    define: {
      "process.env.NODE_ENV": '"production"',
    },
    minify: false,
    logLevel: "info" as const,
    keepNames: true,
  };

  await esbuild({
    ...sharedOptions,
    entryPoints: ["server/index.ts"],
    outfile: "dist/index.cjs",
  });

  await esbuild({
    ...sharedOptions,
    entryPoints: ["server/queues/email.worker.ts"],
    outfile: "dist/email-worker.cjs",
  });
}

buildServer().catch((err) => {
  console.error(err);
  process.exit(1);
});
