import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";
import React from "react";
import UrunanAppClient from "@/pages/UrunanAppClient";

// Mock dependent components
vi.mock("@/components/Sidebar", () => ({
  default: () => <div data-testid="sidebar" />,
}));
vi.mock("@/components/ShareView", () => ({
  default: () => <div data-testid="share-view" />,
}));
vi.mock("@/components/NodeCanvas", () => ({
  default: () => <div data-testid="node-canvas" />,
}));

// Mock hook
const mockUseUrunanState = vi.fn();
vi.mock("@/hooks/useUrunanState", () => ({
  useUrunanState: () => mockUseUrunanState(),
}));

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

describe("UrunanAppClient Component", () => {
  beforeEach(() => {
    localStorageMock.clear();
    mockUseUrunanState.mockReturnValue({
      isInitialized: true,
      isReadOnly: false,
      participants: [],
      items: [],
      tethers: [],
      individualTotals: {},
      totalReceiptCost: 0,
      itemSubtotal: 0,
      tax: 0,
      serviceCharge: 0,
      discount: 0,
      otherFees: 0,
      billName: "",
      isSplitComplete: false,
      geminiApiKey: "",
      setGeminiApiKey: vi.fn(),
      setTax: vi.fn(),
      setServiceCharge: vi.fn(),
      setDiscount: vi.fn(),
      setOtherFees: vi.fn(),
      setBillName: vi.fn(),
      addParticipant: vi.fn(),
      deleteParticipant: vi.fn(),
      addItem: vi.fn(),
      deleteItem: vi.fn(),
      addParsedItems: vi.fn(),
      cloneSession: vi.fn(),
      generateShareUrl: vi.fn(),
      toggleTether: vi.fn(),
      addTether: vi.fn(),
      clearTethers: vi.fn(),
      clearAll: vi.fn(),
    });
  });

  it("sets 'urunan_has_visited' to 'true' in localStorage on mount", () => {
    expect(localStorageMock.getItem("urunan_has_visited")).toBeNull();
    render(<UrunanAppClient />);
    expect(localStorageMock.getItem("urunan_has_visited")).toBe("true");
  });
});
