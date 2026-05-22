"use client";

import { useState, useEffect, useCallback } from "react";
import LZString from "lz-string";

export interface Participant {
  id: string;
  name: string;
  emoji: string;
  color: string; // Tailwind-like or hex color for avatar border/glow
}

export interface ReceiptItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

// itemId -> participantIds[]
export interface Tether {
  itemId: string;
  participantIds: string[];
}

export interface UrunanState {
  participants: Participant[];
  items: ReceiptItem[];
  tethers: Tether[];
}

const LOCAL_STORAGE_KEY = "urunan_session_state";
const API_KEY_STORAGE_KEY = "urunan_gemini_api_key";

const DEFAULT_PARTICIPANTS: Participant[] = [
  { id: "p1", name: "Siti", emoji: "🦊", color: "#ec4899" }, // pink
  { id: "p2", name: "Budi", emoji: "🐼", color: "#3b82f6" },    // blue
  { id: "p3", name: "Tejo", emoji: "🐨", color: "#10b981" } // green
];

const DEFAULT_ITEMS: ReceiptItem[] = [
  { id: "i1", name: "Pizza Kayu Bakar", price: 135000, quantity: 1 },
  { id: "i2", name: "Sayap Garlic Parmesan", price: 48000, quantity: 1 },
  { id: "i3", name: "Es Soda Gembira", price: 15000, quantity: 3 }
];

const DEFAULT_TETHERS: Tether[] = [
  { itemId: "i1", participantIds: ["p1", "p2"] }, // Pizza split between Alice and Bob
  { itemId: "i2", participantIds: ["p2", "p3"] }, // Wings split between Bob and Charlie
  { itemId: "i3", participantIds: ["p1", "p2", "p3"] } // Soda split between all three
];

export function useUrunanState() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [tethers, setTethers] = useState<Tether[]>([]);
  const [geminiApiKey, setGeminiApiKeyState] = useState<string>("");
  const [isReadOnly, setIsReadOnly] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);

  // Load API Key
  useEffect(() => {
    const savedKey = localStorage.getItem(API_KEY_STORAGE_KEY) || "";
    setGeminiApiKeyState(savedKey);
  }, []);

  // Set and save API Key
  const setGeminiApiKey = useCallback((key: string) => {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    setGeminiApiKeyState(key);
  }, []);

  // Initialize state from URL (if shared) or LocalStorage (if local session exists) or Default Presets
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleInitialLoad = () => {
      try {
        const hash = window.location.hash;
        if (hash && hash.startsWith("#share=")) {
          const compressed = hash.substring(7);
          const decompressed = LZString.decompressFromEncodedURIComponent(compressed);
          if (decompressed) {
            const parsed = JSON.parse(decompressed) as UrunanState;
            if (parsed && Array.isArray(parsed.participants) && Array.isArray(parsed.items)) {
              setParticipants(parsed.participants);
              setItems(parsed.items);
              setTethers(parsed.tethers || []);
              setIsReadOnly(true);
              setIsInitialized(true);
              return;
            }
          }
        }
      } catch (err) {
        console.error("Failed to parse shared state from URL:", err);
      }

      // Fallback to localStorage or defaults
      try {
        const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved) as UrunanState;
          if (parsed && Array.isArray(parsed.participants) && Array.isArray(parsed.items)) {
            setParticipants(parsed.participants);
            setItems(parsed.items);
            setTethers(parsed.tethers || []);
            setIsReadOnly(false);
            setIsInitialized(true);
            return;
          }
        }
      } catch (err) {
        console.error("Failed to parse local state:", err);
      }

      // Set defaults
      setParticipants(DEFAULT_PARTICIPANTS);
      setItems(DEFAULT_ITEMS);
      setTethers(DEFAULT_TETHERS);
      setIsReadOnly(false);
      setIsInitialized(true);
    };

    handleInitialLoad();
  }, []);

  // Save to localStorage whenever state changes (if not in read-only shared mode)
  useEffect(() => {
    if (!isInitialized || isReadOnly) return;
    const state: UrunanState = { participants, items, tethers };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [participants, items, tethers, isReadOnly, isInitialized]);

  // Actions: Crew / Participants
  const addParticipant = useCallback((name: string, emoji: string, color: string) => {
    if (isReadOnly) return;
    const newParticipant: Participant = {
      id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || "New User",
      emoji: emoji || "👤",
      color: color || "#6366f1"
    };
    setParticipants(prev => [...prev, newParticipant]);
  }, [isReadOnly]);

  const updateParticipant = useCallback((id: string, name: string, emoji: string, color: string) => {
    if (isReadOnly) return;
    setParticipants(prev =>
      prev.map(p => (p.id === id ? { ...p, name: name.trim(), emoji, color } : p))
    );
  }, [isReadOnly]);

  const deleteParticipant = useCallback((id: string) => {
    if (isReadOnly) return;
    setParticipants(prev => prev.filter(p => p.id !== id));
    // Clean up tethers containing this participant
    setTethers(prev =>
      prev
        .map(t => ({
          ...t,
          participantIds: t.participantIds.filter(pid => pid !== id)
        }))
        .filter(t => t.participantIds.length > 0)
    );
  }, [isReadOnly]);

  // Actions: Receipt Items
  const addItem = useCallback((name: string, price: number, quantity: number = 1) => {
    if (isReadOnly) return;
    const newItem: ReceiptItem = {
      id: `i_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim() || "Item",
      price: Math.max(0, price),
      quantity: Math.max(1, quantity)
    };
    setItems(prev => [...prev, newItem]);
  }, [isReadOnly]);

  const updateItem = useCallback((id: string, name: string, price: number, quantity: number) => {
    if (isReadOnly) return;
    setItems(prev =>
      prev.map(item =>
        item.id === id
          ? { ...item, name: name.trim(), price: Math.max(0, price), quantity: Math.max(1, quantity) }
          : item
      )
    );
  }, [isReadOnly]);

  const deleteItem = useCallback((id: string) => {
    if (isReadOnly) return;
    setItems(prev => prev.filter(item => item.id !== id));
    setTethers(prev => prev.filter(t => t.itemId !== id));
  }, [isReadOnly]);

  // Bulk add items (e.g. from receipt parsing)
  const addParsedItems = useCallback((parsed: Array<{ name: string; price: number; quantity: number }>) => {
    if (isReadOnly) return;
    const newItems: ReceiptItem[] = parsed.map(item => ({
      id: `i_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${Math.random()}`,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }));
    setItems(prev => [...prev, ...newItems]);
  }, [isReadOnly]);

  // Actions: Tethers (Drag and Drop / Toggle Link)
  const toggleTether = useCallback((itemId: string, participantId: string) => {
    if (isReadOnly) return;
    setTethers(prev => {
      const existing = prev.find(t => t.itemId === itemId);
      if (existing) {
        const containsUser = existing.participantIds.includes(participantId);
        const updatedIds = containsUser
          ? existing.participantIds.filter(pid => pid !== participantId)
          : [...existing.participantIds, participantId];

        if (updatedIds.length === 0) {
          // If no more users connected, remove this tether record completely
          return prev.filter(t => t.itemId !== itemId);
        }

        return prev.map(t => (t.itemId === itemId ? { ...t, participantIds: updatedIds } : t));
      } else {
        // Create new tether record
        return [...prev, { itemId, participantIds: [participantId] }];
      }
    });
  }, [isReadOnly]);

  const addTether = useCallback((itemId: string, participantId: string) => {
    if (isReadOnly) return;
    setTethers(prev => {
      const existing = prev.find(t => t.itemId === itemId);
      if (existing) {
        if (existing.participantIds.includes(participantId)) return prev;
        return prev.map(t =>
          t.itemId === itemId ? { ...t, participantIds: [...t.participantIds, participantId] } : t
        );
      } else {
        return [...prev, { itemId, participantIds: [participantId] }];
      }
    });
  }, [isReadOnly]);

  const removeTether = useCallback((itemId: string, participantId: string) => {
    if (isReadOnly) return;
    setTethers(prev => {
      const existing = prev.find(t => t.itemId === itemId);
      if (!existing) return prev;
      const updatedIds = existing.participantIds.filter(pid => pid !== participantId);
      if (updatedIds.length === 0) {
        return prev.filter(t => t.itemId !== itemId);
      }
      return prev.map(t => (t.itemId === itemId ? { ...t, participantIds: updatedIds } : t));
    });
  }, [isReadOnly]);

  const clearTethers = useCallback((itemId: string) => {
    if (isReadOnly) return;
    setTethers(prev => prev.filter(t => t.itemId !== itemId));
  }, [isReadOnly]);

  // Clone a shared read-only session into a mutable local session
  const cloneSession = useCallback(() => {
    setIsReadOnly(false);
    // Strip hash from URL quietly
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  // Generate share link
  const generateShareUrl = useCallback(() => {
    const state: UrunanState = { participants, items, tethers };
    const json = JSON.stringify(state);
    const compressed = LZString.compressToEncodedURIComponent(json);
    if (typeof window !== "undefined") {
      return `${window.location.origin}${window.location.pathname}#share=${compressed}`;
    }
    return "";
  }, [participants, items, tethers]);

  // Reset to default
  const resetToDefault = useCallback(() => {
    if (isReadOnly) return;
    setParticipants(DEFAULT_PARTICIPANTS);
    setItems(DEFAULT_ITEMS);
    setTethers(DEFAULT_TETHERS);
  }, [isReadOnly]);

  // Clear everything
  const clearAll = useCallback(() => {
    if (isReadOnly) return;
    setParticipants([]);
    setItems([]);
    setTethers([]);
  }, [isReadOnly]);

  // Computed: Split totals
  // participantId -> total cost split assigned to them
  const individualTotals = useCallback(() => {
    const totals: Record<string, number> = {};
    participants.forEach(p => {
      totals[p.id] = 0;
    });

    items.forEach(item => {
      const tether = tethers.find(t => t.itemId === item.id);
      if (tether && tether.participantIds.length > 0) {
        const costPerPerson = (item.price * item.quantity) / tether.participantIds.length;
        tether.participantIds.forEach(pid => {
          if (totals[pid] !== undefined) {
            totals[pid] += costPerPerson;
          }
        });
      }
    });

    return totals;
  }, [participants, items, tethers]);

  const totalReceiptCost = useCallback(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const isSplitComplete = useCallback(() => {
    if (items.length === 0) return false;
    // Every item must have at least one participant tethered
    return items.every(item => {
      const tether = tethers.find(t => t.itemId === item.id);
      return tether && tether.participantIds.length > 0;
    });
  }, [items, tethers]);

  return {
    participants,
    items,
    tethers,
    geminiApiKey,
    isReadOnly,
    isInitialized,
    addParticipant,
    updateParticipant,
    deleteParticipant,
    addItem,
    updateItem,
    deleteItem,
    addParsedItems,
    toggleTether,
    addTether,
    removeTether,
    clearTethers,
    setGeminiApiKey,
    cloneSession,
    generateShareUrl,
    resetToDefault,
    clearAll,
    individualTotals: individualTotals(),
    totalReceiptCost: totalReceiptCost(),
    isSplitComplete: isSplitComplete()
  };
}
