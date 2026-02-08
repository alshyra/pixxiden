import type { Options } from "@wdio/types";
import { spawn, ChildProcess } from "child_process";
import path from "path";

let tauriDriver: ChildProcess | null = null;

export const config: Options.Testrunner = {
  //
  // ====================
  // Runner Configuration
  // ====================
  runner: "local",
  autoCompileOpts: {
    autoCompile: true,
    tsNodeOpts: {
      project: "./tsconfig.e2e.json",
      transpileOnly: true,
    },
  },

  //
  // ==================
  // Specify Test Files
  // ==================
  specs: ["./e2e/scenarios/0{1,2,3,4,5}-*.spec.ts"],
  exclude: [],

  //
  // ============
  // Capabilities
  // ============
  maxInstances: 1,
  capabilities: [
    {
      "tauri:options": {
        application: path.resolve("./src-tauri/target/release/Pixxiden"),
      },
    } as any,
  ],

  //
  // ===================
  // Test Configurations
  // ===================
  logLevel: "warn",
  bail: 0,
  baseUrl: "",
  waitforTimeout: 30000,
  connectionRetryTimeout: 120000,
  connectionRetryCount: 3,

  //
  // ============
  // Services
  // ============
  port: 4444,
  hostname: "127.0.0.1",

  //
  // Framework
  // ============
  framework: "mocha",
  reporters: ["spec"],
  mochaOpts: {
    ui: "bdd",
    timeout: 60000,
  },

  //
  // =====
  // Hooks
  // =====
  onPrepare: async function () {
    const { execSync } = await import("child_process");

    // NOTE: We do NOT clear the Pixxiden cache — E2E tests run against
    // real user data (games synced from connected stores).
    // For a fresh-start test, manually delete ~/.local/share/pixxiden

    // Kill any existing tauri-driver processes and free up ports
    console.log("🧹 Cleaning up any existing tauri-driver processes...");
    try {
      execSync("pkill -9 tauri-driver || true", { stdio: "ignore" });
      execSync("pkill -9 Pixxiden || true", { stdio: "ignore" });
      execSync("pkill -9 pixxiden || true", { stdio: "ignore" });
      execSync("lsof -ti:4444 -ti:4445 | xargs -r kill -9 || true", { stdio: "ignore" });
      // Wait a bit for processes to fully terminate
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (e) {
      // Ignore errors from pkill
    }

    const tauriDriverPath = process.env.HOME + "/.cargo/bin/tauri-driver";
    console.log("🚀 Starting tauri-driver...");

    // Pass through current environment
    // Note: On Wayland/CachyOS, screenshots may be black but tests still work
    // via DOM inspection
    const env = {
      ...process.env,
    };

    tauriDriver = spawn(tauriDriverPath, [], {
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });

    tauriDriver.stdout?.on("data", (data) => {
      console.log(`[tauri-driver stdout]: ${data}`);
    });

    tauriDriver.stderr?.on("data", (data) => {
      console.error(`[tauri-driver stderr]: ${data}`);
    });

    // Wait for tauri-driver to be ready
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 2000);
    });
    console.log("✅ tauri-driver started");
  },

  onComplete: async function () {
    console.log("🛑 Stopping tauri-driver...");
    if (tauriDriver) {
      tauriDriver.kill("SIGKILL");
      tauriDriver = null;
    }
    // Also cleanup any zombie processes
    try {
      const { execSync } = await import("child_process");
      execSync("pkill -9 tauri-driver || true", { stdio: "ignore" });
      execSync("pkill -9 Pixxiden || true", { stdio: "ignore" });
    } catch (e) {
      // Ignore
    }
    console.log("✅ tauri-driver stopped");
  },

  afterTest: async function (test, context, { _error, _result, _duration, passed, _retries }) {
    if (!passed) {
      console.log(`❌ Test failed: ${test.title}`);
    }
  },
};
