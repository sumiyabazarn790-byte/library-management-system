import { existsSync } from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const frontendDir = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const serverEntry = path.join(frontendDir, ".next", "standalone", "server.js");
const npmCommand = "npm";

const runCommand = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    const childCommand = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : command;
    const childArgs = process.platform === "win32" ? ["/d", "/s", "/c", command, ...args] : args;
    const child = spawn(childCommand, childArgs, {
      cwd: frontendDir,
      env: process.env,
      stdio: "inherit",
      ...options,
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

const ensureStandaloneBuild = async () => {
  if (existsSync(serverEntry)) {
    return;
  }

  console.log(
    "Production build artifacts were not found. Running `npm run build` before startup so hosted deploys can boot cleanly.",
  );

  await runCommand(npmCommand, ["run", "build"]);

  if (!existsSync(serverEntry)) {
    throw new Error(`Expected standalone server entry at ${serverEntry}, but it was still missing after build.`);
  }
};

const start = async () => {
  await ensureStandaloneBuild();

  const child = spawn(process.execPath, [serverEntry], {
    cwd: frontendDir,
    env: process.env,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error("Failed to launch the standalone Next.js server.", error);
    process.exit(1);
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
};

start().catch((error) => {
  console.error("Unable to prepare the production server.", error);
  process.exit(1);
});
