import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useUrunanState } from "@/hooks/useUrunanState";

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock window.location
const locationMock = {
  hash: "",
  origin: "http://localhost:3000",
  pathname: "/app",
};
Object.defineProperty(window, "location", {
  value: locationMock,
  writable: true,
});

describe("useUrunanState Hook - Initialization and Basic Actions", () => {
  beforeEach(() => {
    localStorageMock.clear();
    locationMock.hash = "";
  });

  it("should initialize with default presets when localStorage and URL hash are empty", () => {
    const { result } = renderHook(() => useUrunanState());

    expect(result.current.isInitialized).toBe(true);
    expect(result.current.participants).toHaveLength(3);
    expect(result.current.items).toHaveLength(3);
    expect(result.current.tethers).toHaveLength(3);
    expect(result.current.tax).toBe(0);
    expect(result.current.serviceCharge).toBe(0);
    expect(result.current.discount).toBe(0);
    expect(result.current.otherFees).toBe(0);
    expect(result.current.billName).toBe("");
    expect(result.current.isReadOnly).toBe(false);
  });

  it("should load state from localStorage if present", () => {
    const customState = {
      participants: [{ id: "p1", name: "Alice", emoji: "🦊", color: "#ec4899" }],
      items: [{ id: "i1", name: "Apple", price: 10000, quantity: 2 }],
      tethers: [{ itemId: "i1", participantIds: ["p1"] }],
      tax: 1000,
      serviceCharge: 500,
      discount: 200,
      otherFees: 100,
      billName: "Toko Kelontong",
    };
    localStorageMock.setItem("urunan_session_state", JSON.stringify(customState));

    const { result } = renderHook(() => useUrunanState());

    expect(result.current.isInitialized).toBe(true);
    expect(result.current.participants).toHaveLength(1);
    expect(result.current.participants[0].name).toBe("Alice");
    expect(result.current.items).toHaveLength(1);
    expect(result.current.items[0].name).toBe("Apple");
    expect(result.current.tax).toBe(1000);
    expect(result.current.serviceCharge).toBe(500);
    expect(result.current.discount).toBe(200);
    expect(result.current.otherFees).toBe(100);
    expect(result.current.billName).toBe("Toko Kelontong");
    expect(result.current.isReadOnly).toBe(false);
  });

  it("should allow adding, updating, and deleting participants", () => {
    const { result } = renderHook(() => useUrunanState());

    // Add
    act(() => {
      result.current.addParticipant("Dewi", "🐱", "#f59e0b");
    });

    expect(result.current.participants).toHaveLength(4);
    expect(result.current.participants[3].name).toBe("Dewi");
    expect(result.current.participants[3].emoji).toBe("🐱");

    const dewiId = result.current.participants[3].id;

    // Update
    act(() => {
      result.current.updateParticipant(dewiId, "Dewi Updated", "🦁", "#ef4444");
    });

    expect(result.current.participants.find(p => p.id === dewiId)?.name).toBe("Dewi Updated");
    expect(result.current.participants.find(p => p.id === dewiId)?.emoji).toBe("🦁");

    // Delete
    act(() => {
      result.current.deleteParticipant(dewiId);
    });

    expect(result.current.participants).toHaveLength(3);
    expect(result.current.participants.some(p => p.id === dewiId)).toBe(false);
  });

  it("should allow adding, updating, and deleting receipt items", () => {
    const { result } = renderHook(() => useUrunanState());

    // Add
    act(() => {
      result.current.addItem("Es Teh Manis", 5000, 2);
    });

    expect(result.current.items).toHaveLength(4);
    expect(result.current.items[3].name).toBe("Es Teh Manis");
    expect(result.current.items[3].price).toBe(5000);
    expect(result.current.items[3].quantity).toBe(2);

    const itemId = result.current.items[3].id;

    // Update
    act(() => {
      result.current.updateItem(itemId, "Es Teh Tawar", 4000, 3);
    });

    expect(result.current.items.find(i => i.id === itemId)?.name).toBe("Es Teh Tawar");
    expect(result.current.items.find(i => i.id === itemId)?.price).toBe(4000);
    expect(result.current.items.find(i => i.id === itemId)?.quantity).toBe(3);

    // Delete
    act(() => {
      result.current.deleteItem(itemId);
    });

    expect(result.current.items).toHaveLength(3);
    expect(result.current.items.some(i => i.id === itemId)).toBe(false);
  });

  it("should support bulk addition of parsed items", () => {
    const { result } = renderHook(() => useUrunanState());

    act(() => {
      result.current.addParsedItems([
        { name: "Bakso", price: 15000, quantity: 1 },
        { name: "Mie Ayam", price: 12000, quantity: 2 },
      ]);
    });

    expect(result.current.items).toHaveLength(5); // 3 defaults + 2 parsed
    expect(result.current.items[3].name).toBe("Bakso");
    expect(result.current.items[4].name).toBe("Mie Ayam");
  });
});
