"use client";

import React, { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
import NodeCanvas from "@/components/NodeCanvas";
import { useUrunanState } from "@/hooks/useUrunanState";
import { Sparkles } from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const state = useUrunanState();

  // Prevent hydration errors by waiting for the component to be mounted client-side
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !state.isInitialized) {
    return (
      <div className="loading-screen">
        {/* Decorative ambient glowing backdrops */}
        <div className="loading-ambient-glow" />
        
        <div className="loading-content">
          <div className="loading-spinner" />
          <h2 className="loading-title logo-text">
            URUNAN <Sparkles className="w-5 h-5 text-indigo-400" />
          </h2>
          <p className="loading-subtitle">Nge-booting physics engine...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="app-container">
      
      {/* Dynamic Left Control Dashboard Sidebar */}
      <Sidebar
        participants={state.participants}
        items={state.items}
        tethers={state.tethers}
        individualTotals={state.individualTotals}
        totalReceiptCost={state.totalReceiptCost}
        isSplitComplete={state.isSplitComplete}
        isReadOnly={state.isReadOnly}
        geminiApiKey={state.geminiApiKey}
        setGeminiApiKey={state.setGeminiApiKey}
        addParticipant={state.addParticipant}
        deleteParticipant={state.deleteParticipant}
        addItem={state.addItem}
        deleteItem={state.deleteItem}
        addParsedItems={state.addParsedItems}
        cloneSession={state.cloneSession}
        generateShareUrl={state.generateShareUrl}
        resetToDefault={state.resetToDefault}
        clearAll={state.clearAll}
      />

      {/* Force-directed Interactive Node Graph Physics Canvas */}
      <NodeCanvas
        participants={state.participants}
        items={state.items}
        tethers={state.tethers}
        toggleTether={state.toggleTether}
        addTether={state.addTether}
        clearTethers={state.clearTethers}
        isReadOnly={state.isReadOnly}
      />
      
    </main>
  );
}
