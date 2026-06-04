import React, { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Participant, ReceiptItem, Tether } from "@/hooks/useUrunanState";
import { useTranslation } from "react-i18next";

interface ShareViewProps {
  participants: Participant[];
  items: ReceiptItem[];
  tethers: Tether[];
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
  items,
  tethers,
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (participantId: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(participantId)) {
        next.delete(participantId);
      } else {
        next.add(participantId);
      }
      return next;
    });
  };

  // Get the items a participant is tethered to and their split cost per item
  const getParticipantItems = (participantId: string) => {
    const result: { item: ReceiptItem; splitCost: number }[] = [];
    tethers.forEach(tether => {
      if (tether.participantIds.includes(participantId)) {
        const item = items.find(i => i.id === tether.itemId);
        if (item) {
          const splitCount = tether.participantIds.length;
          const splitCost = (item.price * item.quantity) / splitCount;
          result.push({ item, splitCost });
        }
      }
    });
    return result;
  };

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
    <div className="w-full max-w-[500px] mx-auto flex flex-col gap-5 relative z-[1]">

      {/* Header */}
      <div className="text-center mb-2.5 flex flex-col gap-2 items-center">
        <h1 className="logo-text text-5xl font-extrabold m-0">
          urunan
        </h1>
      </div>

      {/* Location & Totals Card Group */}
      <div className="flex flex-col gap-3 w-full">
        {/* Bill Name Display */}
        {billName && (
          <div className="share-bill-name">
            <span className="share-bill-name-value">📍 {billName}</span>
          </div>
        )}

        {/* Live split total bill and complete indicator */}
        <div className="glass-panel totals-card w-full">
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
          </div>

          {/* Show breakdown per participant */}
          <div className="breakdown-list">
            {participants.map((p) => {
              const total = individualTotals[p.id] || 0;
              const percent = totalReceiptCost > 0 ? (total / totalReceiptCost) * 100 : 0;
              const isExpanded = expandedIds.has(p.id);
              const participantItems = getParticipantItems(p.id);

              return (
                <div key={p.id} className="breakdown-row">
                  <button
                    type="button"
                    className="breakdown-row-header breakdown-row-toggle"
                    onClick={() => toggleExpand(p.id)}
                  >
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
                    <span className="breakdown-val-group">
                      <span className="breakdown-val">{formatRupiah(total)}</span>
                      <ChevronDown
                        className={`breakdown-chevron ${isExpanded ? "expanded" : ""}`}
                      />
                    </span>
                  </button>
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

                  {/* Expandable item details */}
                  {isExpanded && (
                    <div className="breakdown-items-detail">
                      {participantItems.length > 0 ? (
                        participantItems.map(({ item, splitCost }) => (
                          <div key={item.id} className="breakdown-item-row">
                            <span className="breakdown-item-name">
                              {item.name}
                            </span>
                            <span className="breakdown-item-price">{formatRupiah(splitCost)}</span>
                          </div>
                        ))
                      ) : (
                        <div className="breakdown-item-empty">Belum ada item</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}
