import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const standaloneServerEntry = path.join(frontendDir, ".next", "standalone", "server.js");
const isRenderInstall = Boolean(process.env.RENDER);

const runCommand = (command, args) =>
  new Promise((resolve, reject) => {
    const childCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : command;
    const childArgs = process.platform === "win32" ? ["/d", "/s", "/c", command, ...args] : args;
    const child = spawn(childCommand, childArgs, {
      cwd: frontendDir,
      env: process.env,
      stdio: "inherit",
    });

    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`${command} ${args.join(" ")} exited with signal ${signal}`));
        return;
      }

      if (code !== 0) {
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code ?? "unknown"}`));
        return;
      }

      resolve();
    });
  });

const ensureRenderBuild = async () => {
  if (!isRenderInstall) {
    return;
  }

  if (existsSync(standaloneServerEntry)) {
    console.log("Render postinstall: standalone build artifacts already exist, skipping extra build.");
    return;
  }

  console.log("Render postinstall: production build artifacts are missing, running `npm run build` now.");
  await runCommand("npm", ["run", "build"]);
};

ensureRenderBuild().catch((error) => {
  console.error("Render postinstall failed to prepare the Next.js production build.", error);
  process.exit(1);
});
