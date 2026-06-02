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
  tax: number;
  serviceCharge: number;
  discount: number;
  otherFees: number;
  billName: string;
}

// Pack Urunan state into a minimal array structure to shorten the share URL dramatically
// format: [ [participants], [items], [tethers], [tax, serviceCharge, discount, otherFees], billName ]
// Participant: [id, name, emoji, color]
// ReceiptItem: [id, name, price, quantity]
// Tether: [itemId, [participantIds]]
function packState(participants: Participant[], items: ReceiptItem[], tethers: Tether[], tax: number = 0, serviceCharge: number = 0, discount: number = 0, otherFees: number = 0, billName: string = ""): any[] {
  const packedParticipants = participants.map(p => [p.id, p.name, p.emoji, p.color]);
  const packedItems = items.map(i => [i.id, i.name, i.price, i.quantity]);
  const packedTethers = tethers.map(t => [t.itemId, t.participantIds]);
  return [packedParticipants, packedItems, packedTethers, [tax, serviceCharge, discount, otherFees], billName];
}

// Unpack minimal array structure back into full UrunanState objects
// Backward compatible: old URLs without discount/otherFees/billName fields default to 0/""
function unpackState(packed: any[]): UrunanState | null {
  if (!packed || !Array.isArray(packed) || packed.length < 3) return null;
  const [packedParticipants, packedItems, packedTethers, packedCharges, packedBillName] = packed;
  
  const participants: Participant[] = (packedParticipants || []).map((p: any) => ({
    id: p[0],
    name: p[1],
    emoji: p[2],
    color: p[3]
  }));
  
  const items: ReceiptItem[] = (packedItems || []).map((i: any) => ({
    id: i[0],
    name: i[1],
    price: i[2],
    quantity: i[3]
  }));
  
  const tethers: Tether[] = (packedTethers || []).map((t: any) => ({
    itemId: t[0],
    participantIds: t[1]
  }));

  // Backward compat: old URLs won't have packedCharges or extended fields
  const tax = Array.isArray(packedCharges) ? (packedCharges[0] || 0) : 0;
  const serviceCharge = Array.isArray(packedCharges) ? (packedCharges[1] || 0) : 0;
  const discount = Array.isArray(packedCharges) ? (packedCharges[2] || 0) : 0;
  const otherFees = Array.isArray(packedCharges) ? (packedCharges[3] || 0) : 0;
  const billName = typeof packedBillName === "string" ? packedBillName : "";
  
  return { participants, items, tethers, tax, serviceCharge, discount, otherFees, billName };
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
  const [tax, setTaxState] = useState<number>(0);
  const [serviceCharge, setServiceChargeState] = useState<number>(0);
  const [discount, setDiscountState] = useState<number>(0);
  const [otherFees, setOtherFeesState] = useState<number>(0);
  const [billName, setBillNameState] = useState<string>("");
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
            const parsed = JSON.parse(decompressed);
            let stateData: UrunanState | null = null;
            
            if (Array.isArray(parsed)) {
              // Compact format
              stateData = unpackState(parsed);
            } else if (parsed && Array.isArray(parsed.participants)) {
              // Legacy full JSON format
              stateData = parsed as UrunanState;
            }
            
            if (stateData) {
              setParticipants(stateData.participants);
              setItems(stateData.items);
              setTethers(stateData.tethers || []);
              setTaxState(stateData.tax || 0);
              setServiceChargeState(stateData.serviceCharge || 0);
              setDiscountState(stateData.discount || 0);
              setOtherFeesState(stateData.otherFees || 0);
              setBillNameState(stateData.billName || "");
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
            setTaxState(parsed.tax || 0);
            setServiceChargeState(parsed.serviceCharge || 0);
            setDiscountState(parsed.discount || 0);
            setOtherFeesState(parsed.otherFees || 0);
            setBillNameState(parsed.billName || "");
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
      setTaxState(0);
      setServiceChargeState(0);
      setDiscountState(0);
      setOtherFeesState(0);
      setBillNameState("");
      setIsReadOnly(false);
      setIsInitialized(true);
    };

    handleInitialLoad();
  }, []);

  // Set tax (with read-only guard)
  const setTax = useCallback((value: number) => {
    if (isReadOnly) return;
    setTaxState(Math.max(0, value));
  }, [isReadOnly]);

  // Set service charge (with read-only guard)
  const setServiceCharge = useCallback((value: number) => {
    if (isReadOnly) return;
    setServiceChargeState(Math.max(0, value));
  }, [isReadOnly]);

  // Set discount (with read-only guard)
  const setDiscount = useCallback((value: number) => {
    if (isReadOnly) return;
    setDiscountState(Math.max(0, value));
  }, [isReadOnly]);

  // Set other fees (with read-only guard)
  const setOtherFees = useCallback((value: number) => {
    if (isReadOnly) return;
    setOtherFeesState(Math.max(0, value));
  }, [isReadOnly]);

  // Set bill name (with read-only guard)
  const setBillName = useCallback((value: string) => {
    if (isReadOnly) return;
    setBillNameState(value);
  }, [isReadOnly]);

  // Save to localStorage whenever state changes (if not in read-only shared mode)
  useEffect(() => {
    if (!isInitialized || isReadOnly) return;
    const state: UrunanState = { participants, items, tethers, tax, serviceCharge, discount, otherFees, billName };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [participants, items, tethers, tax, serviceCharge, discount, otherFees, billName, isReadOnly, isInitialized]);

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
      prev.reduce<Tether[]>((acc, t) => {
        const filteredPids = t.participantIds.filter(pid => pid !== id);
        if (filteredPids.length > 0) {
          acc.push({
            ...t,
            participantIds: filteredPids
          });
        }
        return acc;
      }, [])
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
  }, []);

  const addTether = useCallback((itemId: string, participantId: string) => {
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
  }, []);

  const removeTether = useCallback((itemId: string, participantId: string) => {
    setTethers(prev => {
      const existing = prev.find(t => t.itemId === itemId);
      if (!existing) return prev;
      const updatedIds = existing.participantIds.filter(pid => pid !== participantId);
      if (updatedIds.length === 0) {
        return prev.filter(t => t.itemId !== itemId);
      }
      return prev.map(t => (t.itemId === itemId ? { ...t, participantIds: updatedIds } : t));
    });
  }, []);

  const clearTethers = useCallback((itemId: string) => {
    setTethers(prev => prev.filter(t => t.itemId !== itemId));
  }, []);

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
    const packed = packState(participants, items, tethers, tax, serviceCharge, discount, otherFees, billName);
    const json = JSON.stringify(packed);
    const compressed = LZString.compressToEncodedURIComponent(json);
    if (typeof window !== "undefined") {
      return `${window.location.origin}${window.location.pathname}#share=${compressed}`;
    }
    return "";
  }, [participants, items, tethers, tax, serviceCharge, discount, otherFees, billName]);



  // Clear everything
  const clearAll = useCallback(() => {
    if (isReadOnly) return;
    setParticipants([]);
    setItems([]);
    setTethers([]);
    setTaxState(0);
    setServiceChargeState(0);
    setDiscountState(0);
    setOtherFeesState(0);
    setBillNameState("");
  }, [isReadOnly]);

  // Computed: Split totals
  // participantId -> total cost split assigned to them (including proportional tax, service, fees, minus discount)
  const individualTotals = useCallback(() => {
    const totals: Record<string, number> = {};
    participants.forEach(p => {
      totals[p.id] = 0;
    });

    // First pass: compute item subtotals per person
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

    // Second pass: distribute (tax + service + otherFees - discount) proportionally based on item subtotals
    const extraCharges = tax + serviceCharge + otherFees - discount;
    if (extraCharges !== 0) {
      const itemSub = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      if (itemSub > 0) {
        // Proportional split based on each person's share of item costs
        participants.forEach(p => {
          const proportion = totals[p.id] / itemSub;
          totals[p.id] += extraCharges * proportion;
        });
      } else if (participants.length > 0) {
        // No items tethered yet — split equally
        const equalShare = extraCharges / participants.length;
        participants.forEach(p => {
          totals[p.id] += equalShare;
        });
      }
    }

    return totals;
  }, [participants, items, tethers, tax, serviceCharge, discount, otherFees]);

  const totalReceiptCost = useCallback(() => {
    const itemSub = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return itemSub + tax + serviceCharge + otherFees - discount;
  }, [items, tax, serviceCharge, discount, otherFees]);

  // Computed: item subtotal only (without tax/service/discount/fees)
  const itemSubtotal = useCallback(() => {
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
    tax,
    serviceCharge,
    discount,
    otherFees,
    billName,
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
    setTax,
    setServiceCharge,
    setDiscount,
    setOtherFees,
    setBillName,
    setGeminiApiKey,
    cloneSession,
    generateShareUrl,
    clearAll,
    individualTotals: individualTotals(),
    totalReceiptCost: totalReceiptCost(),
    itemSubtotal: itemSubtotal(),
    isSplitComplete: isSplitComplete()
  };
}
