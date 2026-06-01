"use client";

import React from "react";
import { Check, Sparkles } from "lucide-react";
import { Participant } from "@/hooks/useUrunanState";
import { useTranslation } from "react-i18next";

interface ShareViewProps {
  participants: Participant[];
  individualTotals: Record<string, number>;
  totalReceiptCost: number;
  itemSubtotal: number;
  tax: number;
  serviceCharge: number;
  discount: number;
  otherFees: number;
  billName: string;
  isSplitComplete: boolean;
}

const formatRupiah = (amount: number) => {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
};

export default function ShareView({
  participants,
  individualTotals,
  totalReceiptCost,
  itemSubtotal,
  tax,
  serviceCharge,
  discount,
  otherFees,
  billName,
  isSplitComplete,
}: ShareViewProps) {
  const { t } = useTranslation();
  // Calculate Gamified Titles (same as Sidebar)
  const getGamifiedTitle = (pId: string): { label: string; icon: string; className: string } | null => {
    const total = individualTotals[pId] || 0;
    if (total === 0) {
      return { label: t("beban_tim"), icon: "💤", className: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
    }

    const activeTotals: number[] = [];
    for (const value of Object.values(individualTotals)) {
      if (value > 0) {
        activeTotals.push(value);
      }
    }

    if (activeTotals.length === 0) return null;

    const maxVal = Math.max(...activeTotals);
    const minVal = Math.min(...activeTotals);

    if (total === maxVal && activeTotals.length > 1) {
      return { label: t("sultan"), icon: "👑", className: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    }
    if (total === minVal && activeTotals.length > 1) {
      return { label: t("hemat"), icon: "🪙", className: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    }

    return { label: t("balance"), icon: "⚖️", className: "text-gray-400 bg-gray-500/5 border-gray-500/10" };
  };

  return (
    <div style={{ width: '100%', maxWidth: '500px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '10px', display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center' }}>
        <h1 className="text-3xl font-extrabold logo-text tracking-tight flex items-center justify-center gap-2" style={{ margin: 0 }}>
          urunan
        </h1>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          textAlign: 'center',
          fontFamily: 'serif',
          fontStyle: 'italic',
          color: 'rgba(255, 255, 255, 0.5)',
        }}>
          <div>
            <span style={{ fontSize: '1.25rem', color: 'rgba(255, 255, 255, 0.8)' }}>/urun·an/</span>
            <span style={{ fontSize: '16px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'normal', marginLeft: '8px' }}>({t("definition_pos")})</span>
          </div>
          <p style={{ fontSize: '15px', maxWidth: '450px', margin: '0 auto', lineHeight: '1.4' }}>
            {t("definition_desc")}
          </p>
        </div>

        {/* Bill Name Display */}
        {billName && (
          <div className="share-bill-name">
            <span className="share-bill-name-value">📍 {billName}</span>
          </div>
        )}
      </div>

      {/* Live split total bill and complete indicator */}
      <div className="glass-panel totals-card" style={{ width: '100%' }}>
        <h3 className="totals-card-title">{t("recap_title")}</h3>

        <div className="summary-rows-container">
          <div className="summary-row">
            <span>{t("subtotal_item")}</span>
            <span className="summary-row-val">{formatRupiah(itemSubtotal)}</span>
          </div>
          {tax > 0 && (
            <div className="summary-row">
              <span>{t("tax_colon")}</span>
              <span className="summary-row-val">{formatRupiah(tax)}</span>
            </div>
          )}
          {serviceCharge > 0 && (
            <div className="summary-row">
              <span>{t("service_colon")}</span>
              <span className="summary-row-val">{formatRupiah(serviceCharge)}</span>
            </div>
          )}
          {otherFees > 0 && (
            <div className="summary-row">
              <span>{t("other_colon")}</span>
              <span className="summary-row-val">{formatRupiah(otherFees)}</span>
            </div>
          )}
          {discount > 0 && (
            <div className="summary-row">
              <span>{t("discount_colon")}</span>
              <span className="summary-row-val discount-val">-{formatRupiah(discount)}</span>
            </div>
          )}
          <div className="summary-row summary-row-total">
            <span>{t("total_bill")}</span>
            <span className="summary-row-val">{formatRupiah(totalReceiptCost)}</span>
          </div>
          <div className="summary-row">
            <span>{t("split_status")}</span>
            {isSplitComplete ? (
              <span className="summary-row-val complete">
                {t("status_complete")} <Check className="w-3.5 h-3.5" />
              </span>
            ) : (
              <span className="summary-row-val partial">
                {t("status_partial")}
              </span>
            )}
          </div>
        </div>

        {/* Show breakdown per participant */}
        <div className="breakdown-list">
          {participants.map((p) => {
            const total = individualTotals[p.id] || 0;
            const percent = totalReceiptCost > 0 ? (total / totalReceiptCost) * 100 : 0;

            return (
              <div key={p.id} className="breakdown-row">
                <div className="breakdown-row-header">
                  <span className="breakdown-user">
                    <span>{p.emoji}</span>
                    <span>{p.name}</span>
                    {(() => {
                      const title = getGamifiedTitle(p.id);
                      return title && (
                        <span className={`title-badge ${title.className} rekap-title-badge`}>
                          {title.icon} {title.label}
                        </span>
                      );
                    })()}
                  </span>
                  <span className="breakdown-val">{formatRupiah(total)}</span>
                </div>
                {/* Bouncing colorful split bar chart */}
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${percent}%`,
                      backgroundColor: p.color,
                      boxShadow: `0 0 8px ${p.color}`
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
