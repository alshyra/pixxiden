/**
 * REAL Integration Test: Epic Auth with Sidecar
 * This test runs INSIDE the Tauri app (not Node/Vitest)
 * to test the actual sidecar execution
 *
 * How to run:
 * 1. Build the app: bun run tauri:build
 * 2. Run E2E tests: bun run test:e2e e2e/scenarios/05-sidecar-real-test.spec.ts
 */

import { waitForAppReady } from "../helpers";

describe("Scenario 5: Real Sidecar Execution Test", () => {
  it("should execute legendary sidecar without 'Scoped command not found' error", async () => {
    console.log("\n🔍 Testing REAL sidecar execution...");

    await waitForAppReady();
    await browser.pause(2000);

    // Execute JS code INSIDE the Tauri app to test sidecar
    const result = await browser.execute(async () => {
      try {
        // @ts-ignore - This runs in browser context, not Node
        const { Command } = await import("@tauri-apps/plugin-shell");

        console.log("🔧 Attempting to execute legendary sidecar...");

        const command = Command.sidecar("binaries/legendary", ["--version"]);
        const output = await command.execute();

        console.log("✅ Sidecar executed!");
        console.log("  stdout:", output.stdout);
        console.log("  stderr:", output.stderr);
        console.log("  code:", output.code);

        return {
          success: true,
          stdout: output.stdout,
          stderr: output.stderr,
          code: output.code,
        };
      } catch (error: any) {
        console.error("❌ Sidecar execution failed!");
        console.error("  Error:", error.message);
        console.error("  Stack:", error.stack);

        return {
          success: false,
          error: error.message,
          stack: error.stack,
        };
      }
    });

    console.log("\n📊 Test Result:", JSON.stringify(result, null, 2));

    // Assertions
    if (!result.success) {
      console.error("\n🐛 BUG REPRODUCED!");
      console.error("  Error message:", result.error);

      // Check if it's the "Scoped command not found" error
      if (result.error?.includes("Scoped command") || result.error?.includes("not found")) {
        console.error("\n❌ This is the EXACT bug we need to fix!");
        console.error("  The sidecar command is not properly configured in capabilities");
      }
    } else {
      console.log("\n✅ Sidecar works correctly!");
      console.log("  Output:", result.stdout);
    }

    // Test should pass if sidecar executed successfully
    expect(result.success).toBe(true);
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("legendary version");
  });

  it("should be able to check legendary authentication status via service", async () => {
    console.log("\n🔍 Testing legendary isAuthenticated() via service...");

    await waitForAppReady();
    await browser.pause(1000);

    // Execute real service call inside Tauri app
    const result = await browser.execute(async () => {
      try {
        // @ts-ignore
        const { invoke } = await import("@tauri-apps/api/core");

        console.log("🔧 Calling get_store_status command...");

        // This uses the Rust backend which calls sidecars
        const stores = await invoke("get_store_status");

        console.log("✅ Store status retrieved!");
        console.log("  Stores:", JSON.stringify(stores, null, 2));

        const epicStore = stores.find((s: any) => s.name === "epic");

        return {
          success: true,
          epicStore,
        };
      } catch (error: any) {
        console.error("❌ Store status call failed!");
        console.error("  Error:", error.message);

        return {
          success: false,
          error: error.message,
        };
      }
    });

    console.log("\n📊 Store Status Result:", JSON.stringify(result, null, 2));

    // Should succeed
    expect(result.success).toBe(true);
    expect(result.epicStore).toBeDefined();
    expect(result.epicStore.name).toBe("epic");

    console.log(
      `\n✅ Epic store status: ${result.epicStore.authenticated ? "AUTHENTICATED" : "NOT AUTHENTICATED"}`,
    );
  });

  it("should fail gracefully with invalid auth code (testing error path)", async () => {
    console.log("\n🔍 Testing invalid auth code error handling...");

    await waitForAppReady();
    await browser.pause(1000);

    const result = await browser.execute(async () => {
      try {
        // @ts-ignore
        const { Command } = await import("@tauri-apps/plugin-shell");

        console.log("🔧 Testing legendary auth with invalid code...");

        const command = Command.sidecar("binaries/legendary", [
          "auth",
          "--code",
          "INVALID_TEST_CODE_12345",
        ]);

        const output = await command.execute();

        return {
          success: true,
          stdout: output.stdout,
          stderr: output.stderr,
          code: output.code,
        };
      } catch (error: any) {
        return {
          success: false,
          error: error.message,
        };
      }
    });

    console.log("\n📊 Invalid Auth Result:", JSON.stringify(result, null, 2));

    // Should have executed (even if auth failed)
    expect(result.success).toBe(true);

    // Should have non-zero exit code (legendary auth failed)
    expect(result.code).not.toBe(0);

    // Should have error message in stderr
    expect(result.stderr).toBeTruthy();

    console.log("✅ Error handling works correctly");
    console.log("  Legendary returned error (as expected):", result.stderr?.substring(0, 100));
  });
});
