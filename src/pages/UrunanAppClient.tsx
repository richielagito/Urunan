import React, { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import ShareView from "@/components/ShareView";
import NodeCanvas from "@/components/NodeCanvas";
import { useUrunanState } from "@/hooks/useUrunanState";
import { Sparkles, Receipt } from "lucide-react";

export default function UrunanAppClient() {
  const [mobileView, setMobileView] = useState<"canvas" | "dashboard">("canvas");
  const state = useUrunanState();

  useEffect(() => {
    localStorage.setItem("urunan_has_visited", "true");
  }, []);

  if (!state.isInitialized) {
    return (
      <div className="loading-screen">
        {/* Decorative ambient glowing backdrops */}
        <div className="loading-ambient-glow" />

        <div className="loading-content">
          <div className="loading-spinner" />
          <h2 className="loading-title logo-text text-5xl font-extrabold mt-2">
            urunan
          </h2>
        </div>
      </div>
    );
  }

  if (state.isReadOnly) {
    return (
      <main className="app-container readonly-mode">
        {/* Background Orbs for the entire app to show behind sidebar & canvas */}
        <div className="app-background-orbs-wrapper">
          <div className="canvas-ambient-orb-1" />
          <div className="canvas-ambient-orb-2" />
        </div>
        <ShareView
          participants={state.participants}
          items={state.items}
          tethers={state.tethers}
          individualTotals={state.individualTotals}
          totalReceiptCost={state.totalReceiptCost}
          itemSubtotal={state.itemSubtotal}
          tax={state.tax}
          serviceCharge={state.serviceCharge}
          discount={state.discount}
          otherFees={state.otherFees}
          billName={state.billName}
          isSplitComplete={state.isSplitComplete}
        />
      </main>
    );
  }

  return (
    <main className={`app-container ${mobileView}-active`}>
      {/* Background Orbs for the entire app to show behind sidebar & canvas */}
      <div className="app-background-orbs-wrapper">
        <div className="canvas-ambient-orb-1" />
        <div className="canvas-ambient-orb-2" />
      </div>

      {/* Dynamic Left Control Dashboard Sidebar Wrapper */}
      <div className={`sidebar-container ${mobileView === "dashboard" ? "active" : "inactive"}`}>
        <Sidebar
          participants={state.participants}
          items={state.items}
          tethers={state.tethers}
          individualTotals={state.individualTotals}
          totalReceiptCost={state.totalReceiptCost}
          itemSubtotal={state.itemSubtotal}
          tax={state.tax}
          serviceCharge={state.serviceCharge}
          discount={state.discount}
          otherFees={state.otherFees}
          billName={state.billName}
          isSplitComplete={state.isSplitComplete}
          geminiApiKey={state.geminiApiKey}
          setGeminiApiKey={state.setGeminiApiKey}
          setTax={state.setTax}
          setServiceCharge={state.setServiceCharge}
          setDiscount={state.setDiscount}
          setOtherFees={state.setOtherFees}
          setBillName={state.setBillName}
          addParticipant={state.addParticipant}
          deleteParticipant={state.deleteParticipant}
          addItem={state.addItem}
          updateItem={state.updateItem}
          deleteItem={state.deleteItem}
          addParsedItems={state.addParsedItems}
          generateShareUrl={state.generateShareUrl}
        />
      </div>

      {/* Force-directed Interactive Node Graph Physics Canvas Wrapper */}
      <div className={`canvas-container-wrapper ${mobileView === "canvas" ? "active" : "inactive"}`}>
        <NodeCanvas
          participants={state.participants}
          items={state.items}
          tethers={state.tethers}
          toggleTether={state.toggleTether}
          addTether={state.addTether}
          clearTethers={state.clearTethers}
          clearAll={state.clearAll}
          isReadOnly={state.isReadOnly}
        />
      </div>

      {/* Premium Floating Glassy Bottom Navigation Bar on Mobile */}
      <div className="mobile-nav-bar">
        <button
          type="button"
          onClick={() => setMobileView("canvas")}
          className={`mobile-nav-btn ${mobileView === "canvas" ? "active" : ""}`}
        >
          <Sparkles className="size-4" />
          <span>Urunan (Canvas)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("dashboard")}
          className={`mobile-nav-btn ${mobileView === "dashboard" ? "active" : ""}`}
        >
          <Receipt className="size-4" />
          <span>Kelola Struk & Kru</span>
        </button>
      </div>

    </main>
  );
}
