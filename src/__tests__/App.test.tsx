import { describe, it, expect, beforeEach, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import App from "@/App";

// Mock the page components
vi.mock("@/pages/LandingPage", () => ({
  default: () => <div data-testid="landing-page">Landing Page</div>,
}));

vi.mock("@/pages/UrunanAppClient", () => ({
  default: () => <div data-testid="app-client">Urunan App Client</div>,
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

describe("App Routing", () => {
  beforeEach(() => {
    localStorageMock.clear();
    window.location.hash = "";
    window.history.pushState({}, "", "/");
  });

  it("renders LandingPage on '/' when it is the first time (no localStorage flag)", () => {
    render(<App />);
    expect(screen.getByTestId("landing-page")).toBeInTheDocument();
    expect(screen.queryByTestId("app-client")).not.toBeInTheDocument();
  });

  it("redirects to '/app' (UrunanAppClient) on '/' when localStorage flag is set", () => {
    localStorageMock.setItem("urunan_has_visited", "true");
    render(<App />);
    expect(screen.getByTestId("app-client")).toBeInTheDocument();
    expect(screen.queryByTestId("landing-page")).not.toBeInTheDocument();
  });
});
