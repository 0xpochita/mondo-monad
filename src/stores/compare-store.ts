import { create } from "zustand";
import { fetchVaultsViaProxy } from "@/lib/lifi-earn";
import { mapLifiVault } from "@/lib/vault-mapper";
import type { VaultStrategy } from "@/types";

export const COMPARE_MAX_SLOTS = 4;
const SEARCH_LIMIT = 30;

type SearchStatus = "idle" | "loading" | "ready" | "error";

type CompareState = {
  selectedVaults: VaultStrategy[];
  pickerOpen: boolean;
  searchChainId: number | null;
  searchQuery: string;
  searchResults: VaultStrategy[];
  searchStatus: SearchStatus;
  openPicker: () => void;
  closePicker: () => void;
  setSearchChain: (chainId: number | null) => void;
  setSearchQuery: (query: string) => void;
  searchVaults: () => Promise<void>;
  addVault: (vault: VaultStrategy) => void;
  removeVault: (id: string) => void;
  clearAll: () => void;
};

let searchController: AbortController | null = null;

export const useCompareStore = create<CompareState>((set, get) => ({
  selectedVaults: [],
  pickerOpen: false,
  searchChainId: 143,
  searchQuery: "",
  searchResults: [],
  searchStatus: "idle",
  openPicker: () => {
    set({ pickerOpen: true });
    if (get().searchResults.length === 0) {
      get().searchVaults();
    }
  },
  closePicker: () => set({ pickerOpen: false }),
  setSearchChain: (searchChainId) => {
    set({ searchChainId, searchResults: [] });
    get().searchVaults();
  },
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  searchVaults: async () => {
    const { searchChainId, searchQuery } = get();

    if (searchController) searchController.abort();
    const controller = new AbortController();
    searchController = controller;

    set({ searchStatus: "loading" });

    try {
      const params: Parameters<typeof fetchVaultsViaProxy>[0] = {
        sortBy: "apy",
        limit: SEARCH_LIMIT,
        minTvlUsd: searchChainId === 143 ? 0 : 50_000,
      };
      if (searchChainId) params.chainId = searchChainId;
      const trimmed = searchQuery.trim();
      if (trimmed) params.asset = trimmed.toUpperCase();

      const response = await fetchVaultsViaProxy(params, controller.signal);
      if (controller.signal.aborted) return;

      const vaults = response.data.map(mapLifiVault);
      set({ searchResults: vaults, searchStatus: "ready" });
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      set({ searchStatus: "error", searchResults: [] });
    }
  },
  addVault: (vault) => {
    set((state) => {
      if (state.selectedVaults.length >= COMPARE_MAX_SLOTS) return state;
      if (state.selectedVaults.some((v) => v.id === vault.id)) return state;
      return {
        selectedVaults: [...state.selectedVaults, vault],
        pickerOpen: false,
      };
    });
  },
  removeVault: (id) =>
    set((state) => ({
      selectedVaults: state.selectedVaults.filter((v) => v.id !== id),
    })),
  clearAll: () => set({ selectedVaults: [] }),
}));
