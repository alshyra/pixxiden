/**
 * SidecarService tests
 * Tests for the low-level CLI wrapper service
 *
 * Note: Since SidecarService depends on Tauri's Command API,
 * these tests verify the public API contract rather than
 * actual CLI execution (which would require mocking Tauri internals)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Tauri shell plugin before importing SidecarService
vi.mock("@tauri-apps/plugin-shell", () => ({
  Command: {
    sidecar: vi.fn(() => ({
      execute: vi.fn(),
    })),
  },
}));

import { SidecarService, getSidecar } from "@/services/base/SidecarService";
import { Command } from "@tauri-apps/plugin-shell";

describe("SidecarService", () => {
  let service: SidecarService;

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset singleton for each test by accessing private instance
    // @ts-expect-error - accessing private static for testing
    SidecarService.instance = null;
    service = SidecarService.getInstance();
  });

  describe("getInstance", () => {
    it("should return singleton instance", () => {
      const instance1 = SidecarService.getInstance();
      const instance2 = SidecarService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });

  describe("getSidecar", () => {
    it("should return the singleton instance", () => {
      const instance = getSidecar();

      expect(instance).toBe(SidecarService.getInstance());
    });
  });

  describe("runLegendary", () => {
    it("should call sidecar with legendary binary", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "output",
        stderr: "",
        code: 0,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runLegendary(["list", "--json"]);

      expect(Command.sidecar).toHaveBeenCalledWith("binaries/legendary", ["list", "--json"]);
      expect(result.stdout).toBe("output");
      expect(result.code).toBe(0);
    });

    it("should handle errors gracefully", async () => {
      vi.mocked(Command.sidecar).mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error("Binary not found")),
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runLegendary(["status"]);

      expect(result.code).toBe(-1);
      expect(result.stderr).toBe("Binary not found");
    });
  });

  describe("runGogdl", () => {
    it("should call sidecar with gogdl binary", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "[]",
        stderr: "",
        code: 0,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runGogdl(["list", "--json"]);

      expect(Command.sidecar).toHaveBeenCalledWith("binaries/gogdl", ["list", "--json"]);
      expect(result.code).toBe(0);
    });
  });

  describe("runNile", () => {
    it("should call sidecar with nile binary", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "[]",
        stderr: "",
        code: 0,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runNile(["library", "--json"]);

      expect(Command.sidecar).toHaveBeenCalledWith("binaries/nile", ["library", "--json"]);
      expect(result.code).toBe(0);
    });
  });

  describe("runSteam", () => {
    it("should call sidecar with steam binary", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "",
        stderr: "",
        code: 0,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runSteam(["--version"]);

      expect(Command.sidecar).toHaveBeenCalledWith("binaries/steam", ["--version"]);
      expect(result.code).toBe(0);
    });
  });

  describe("isAvailable", () => {
    it("should return true when sidecar executes successfully", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "legendary 0.20.33",
        stderr: "",
        code: 0,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.isAvailable("legendary");

      expect(result).toBe(true);
      expect(Command.sidecar).toHaveBeenCalledWith("binaries/legendary", ["--version"]);
    });

    it("should return false when sidecar fails", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "",
        stderr: "command not found",
        code: 127,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.isAvailable("legendary");

      expect(result).toBe(false);
    });

    it("should return false on execution error", async () => {
      vi.mocked(Command.sidecar).mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error("Not found")),
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.isAvailable("gogdl");

      expect(result).toBe(false);
    });
  });

  describe("getVersion", () => {
    it("should return version string on success", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "legendary 0.20.33\n",
        stderr: "",
        code: 0,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.getVersion("legendary");

      expect(result).toBe("legendary 0.20.33");
    });

    it("should return null on failure", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "",
        stderr: "error",
        code: 1,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.getVersion("legendary");

      expect(result).toBeNull();
    });

    it("should return null on exception", async () => {
      vi.mocked(Command.sidecar).mockReturnValue({
        execute: vi.fn().mockRejectedValue(new Error("Failed")),
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.getVersion("gogdl");

      expect(result).toBeNull();
    });
  });

  describe("error handling", () => {
    it("should handle non-zero exit codes", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "",
        stderr: "Permission denied",
        code: 1,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runLegendary(["auth"]);

      expect(result.code).toBe(1);
      expect(result.stderr).toBe("Permission denied");
    });

    it("should handle null exit code", async () => {
      const mockExecute = vi.fn().mockResolvedValue({
        stdout: "output",
        stderr: "",
        code: null,
      });

      vi.mocked(Command.sidecar).mockReturnValue({
        execute: mockExecute,
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runLegendary(["status"]);

      // Should default to 0 when code is null
      expect(result.code).toBe(0);
    });

    it("should convert non-Error exceptions to string", async () => {
      vi.mocked(Command.sidecar).mockReturnValue({
        execute: vi.fn().mockRejectedValue("String error"),
      } as unknown as ReturnType<typeof Command.sidecar>);

      const result = await service.runLegendary(["test"]);

      expect(result.stderr).toBe("String error");
      expect(result.code).toBe(-1);
    });
  });
});
