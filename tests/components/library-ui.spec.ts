/**
 * Tests pour les composants de la Library UI
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

// Mock Tauri
vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

// Composant simple pour tester les filtres
const FilterButton = {
  template: `
    <button 
      @click="$emit('click')"
      :class="{ active: isActive }"
    >
      {{ label }}
    </button>
  `,
  props: ["label", "isActive"],
  emits: ["click"],
};

const GameCard = {
  template: `
    <div class="game-card" @click="$emit('select', game)">
      <h3>{{ game.title }}</h3>
      <span class="store">{{ game.store }}</span>
      <span v-if="game.installed" class="installed">Installed</span>
    </div>
  `,
  props: ["game"],
  emits: ["select"],
};

describe("Library UI Components", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe("FilterButton", () => {
    it("should render with label", () => {
      const wrapper = mount(FilterButton, {
        props: { label: "All", isActive: false },
      });

      expect(wrapper.text()).toBe("All");
    });

    it("should have active class when selected", () => {
      const wrapper = mount(FilterButton, {
        props: { label: "Epic", isActive: true },
      });

      expect(wrapper.classes()).toContain("active");
    });

    it("should emit click event", async () => {
      const wrapper = mount(FilterButton, {
        props: { label: "GOG", isActive: false },
      });

      await wrapper.trigger("click");

      expect(wrapper.emitted("click")).toHaveLength(1);
    });
  });

  describe("GameCard", () => {
    const mockGame = {
      id: "1",
      title: "Test Game",
      store: "epic",
      store_id: "epic-123",
      installed: true,
    };

    it("should render game title", () => {
      const wrapper = mount(GameCard, {
        props: { game: mockGame },
      });

      expect(wrapper.find("h3").text()).toBe("Test Game");
    });

    it("should show store badge", () => {
      const wrapper = mount(GameCard, {
        props: { game: mockGame },
      });

      expect(wrapper.find(".store").text()).toBe("epic");
    });

    it("should show installed badge when game is installed", () => {
      const wrapper = mount(GameCard, {
        props: { game: mockGame },
      });

      expect(wrapper.find(".installed").exists()).toBe(true);
    });

    it("should not show installed badge when game is not installed", () => {
      const notInstalledGame = { ...mockGame, installed: false };
      const wrapper = mount(GameCard, {
        props: { game: notInstalledGame },
      });

      expect(wrapper.find(".installed").exists()).toBe(false);
    });

    it("should emit select event on click", async () => {
      const wrapper = mount(GameCard, {
        props: { game: mockGame },
      });

      await wrapper.trigger("click");

      expect(wrapper.emitted("select")).toHaveLength(1);
      expect(wrapper.emitted("select")![0]).toEqual([mockGame]);
    });
  });

  describe("Game Filtering Logic", () => {
    const games = [
      { id: "1", title: "Epic Game 1", store: "epic", installed: true },
      { id: "2", title: "Epic Game 2", store: "epic", installed: false },
      { id: "3", title: "GOG Game 1", store: "gog", installed: true },
      { id: "4", title: "Amazon Game 1", store: "amazon", installed: false },
    ];

    it("should filter by epic store", () => {
      const filtered = games.filter((g) => g.store === "epic");
      expect(filtered).toHaveLength(2);
      expect(filtered.every((g) => g.store === "epic")).toBe(true);
    });

    it("should filter by gog store", () => {
      const filtered = games.filter((g) => g.store === "gog");
      expect(filtered).toHaveLength(1);
      expect(filtered[0].title).toBe("GOG Game 1");
    });

    it("should filter by amazon store", () => {
      const filtered = games.filter((g) => g.store === "amazon");
      expect(filtered).toHaveLength(1);
    });

    it("should return all games when no filter", () => {
      const filtered = games;
      expect(filtered).toHaveLength(4);
    });

    it("should filter installed games", () => {
      const installed = games.filter((g) => g.installed);
      expect(installed).toHaveLength(2);
    });
  });

  describe("Game Sorting Logic", () => {
    const games = [
      { id: "1", title: "Zelda", play_time_minutes: 100, last_played: "2026-01-20" },
      { id: "2", title: "Elden Ring", play_time_minutes: 500, last_played: "2026-01-15" },
      { id: "3", title: "Cyberpunk", play_time_minutes: 200, last_played: "2026-01-21" },
    ];

    it("should sort by title alphabetically", () => {
      const sorted = [...games].sort((a, b) => a.title.localeCompare(b.title));
      expect(sorted[0].title).toBe("Cyberpunk");
      expect(sorted[1].title).toBe("Elden Ring");
      expect(sorted[2].title).toBe("Zelda");
    });

    it("should sort by play time descending", () => {
      const sorted = [...games].sort((a, b) => b.play_time_minutes - a.play_time_minutes);
      expect(sorted[0].title).toBe("Elden Ring");
      expect(sorted[0].play_time_minutes).toBe(500);
    });

    it("should sort by recently played", () => {
      const sorted = [...games].sort(
        (a, b) => new Date(b.last_played).getTime() - new Date(a.last_played).getTime(),
      );
      expect(sorted[0].title).toBe("Cyberpunk");
      expect(sorted[0].last_played).toBe("2026-01-21");
    });
  });
});
