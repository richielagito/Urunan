import React, { useState } from "react";
import Sidebar from "@/components/Sidebar";
import ShareView from "@/components/ShareView";
import NodeCanvas from "@/components/NodeCanvas";
import { useUrunanState } from "@/hooks/useUrunanState";
import { Sparkles, Receipt } from "lucide-react";

export default function UrunanAppClient() {
  const [mobileView, setMobileView] = useState<"canvas" | "dashboard">("canvas");
  const state = useUrunanState();

  if (!state.isInitialized) {
    return (
      <div className="loading-screen">
        {/* Decorative ambient glowing backdrops */}
        <div className="loading-ambient-glow" />

        <div className="loading-content">
          <div className="loading-spinner" />
          <h2 className="loading-title logo-text">
            urunan <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="loading-subtitle">Nge-booting physics engine…</p>
        </div>
      </div>
    );
  }

  if (state.isReadOnly) {
    return (
      <main className="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', minHeight: '100vh', overflowY: 'auto' }}>
        <ShareView
          participants={state.participants}
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
          isReadOnly={state.isReadOnly}
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
          deleteItem={state.deleteItem}
          addParsedItems={state.addParsedItems}
          cloneSession={state.cloneSession}
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
          <Sparkles className="w-4 h-4" />
          <span>Urunan (Canvas)</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileView("dashboard")}
          className={`mobile-nav-btn ${mobileView === "dashboard" ? "active" : ""}`}
        >
          <Receipt className="w-4 h-4" />
          <span>Kelola Struk & Kru</span>
        </button>
      </div>

    </main>
  );
}
