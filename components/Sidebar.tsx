"use client";

import React, { useState } from "react";
import {
  Users,
  Receipt,
  Share2,
  Settings,
  Sparkles,
  Plus,
  Trash2,
  Check,
  Copy,
  RotateCcw,
  Camera,
  Play,
  UserCheck
} from "lucide-react";
import { Participant, ReceiptItem, Tether } from "@/hooks/useUrunanState";
import { parseReceiptWithGemini, MOCK_RECEIPTS, ParsedItem } from "@/lib/gemini";
import confetti from "canvas-confetti";

interface SidebarProps {
  participants: Participant[];
  items: ReceiptItem[];
  tethers: Tether[];
  individualTotals: Record<string, number>;
  totalReceiptCost: number;
  isSplitComplete: boolean;
  isReadOnly: boolean;
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  addParticipant: (name: string, emoji: string, color: string) => void;
  deleteParticipant: (id: string) => void;
  addItem: (name: string, price: number, quantity: number) => void;
  deleteItem: (id: string) => void;
  addParsedItems: (parsed: ParsedItem[]) => void;
  cloneSession: () => void;
  generateShareUrl: () => string;
  resetToDefault: () => void;
  clearAll: () => void;
}

const EMOJI_PRESETS = ["🦊", "🐼", "🐨", "🦁", "🐯", "🐷", "🐸", "🐙", "🦖", "🦄", "🍕", "🥑", "☕️", "👑", "🚀", "🎩"];
const COLOR_PRESETS = ["#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#a855f7"];

const formatRupiah = (amount: number) => {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
};

export default function Sidebar({
  participants,
  items,
  tethers,
  individualTotals,
  totalReceiptCost,
  isSplitComplete,
  isReadOnly,
  geminiApiKey,
  setGeminiApiKey,
  addParticipant,
  deleteParticipant,
  addItem,
  deleteItem,
  addParsedItems,
  cloneSession,
  generateShareUrl,
  resetToDefault,
  clearAll
}: SidebarProps) {
  const [activeTab, setActiveTab] = useState<"items" | "crew" | "summary">("items");
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  // Forms states
  const [newPartName, setNewPartName] = useState("");
  const [newPartEmoji, setNewPartEmoji] = useState("🦁");
  const [newPartColor, setNewPartColor] = useState("#ec4899");

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemQty, setNewItemQty] = useState("1");

  // Gemini processing states
  const [isParsingReceipt, setIsParsingReceipt] = useState(false);
  const [parsingError, setParsingError] = useState<string | null>(null);

  // Trigger celebration confetti
  const handleCelebrate = () => {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4"]
    });
  };

  // Add Participant
  const handleAddParticipantSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartName.trim()) return;
    addParticipant(newPartName, newPartEmoji, newPartColor);
    setNewPartName("");
    // Pick next presets randomly
    setNewPartEmoji(EMOJI_PRESETS[Math.floor(Math.random() * EMOJI_PRESETS.length)]);
    setNewPartColor(COLOR_PRESETS[Math.floor(Math.random() * COLOR_PRESETS.length)]);
  };

  // Add Item
  const handleAddItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemPrice) return;
    const price = parseFloat(newItemPrice);
    const qty = parseInt(newItemQty) || 1;
    if (isNaN(price)) return;

    addItem(newItemName, price, qty);
    setNewItemName("");
    setNewItemPrice("");
    setNewItemQty("1");
  };

  // Handle OCR upload
  const handleOCRFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!geminiApiKey) {
      setParsingError("Please enter your Google AI Studio API key in Settings first!");
      setShowSettings(true);
      return;
    }

    setIsParsingReceipt(true);
    setParsingError(null);

    try {
      const parsedItems = await parseReceiptWithGemini(file, geminiApiKey);
      if (parsedItems.length > 0) {
        addParsedItems(parsedItems);
        setActiveTab("items");
        // Pop nice sparkles confetti for parser success
        confetti({ particleCount: 30, spread: 40, colors: ["#06b6d4", "#8b5cf6"] });
      }
    } catch (err: any) {
      setParsingError(err.message || "Failed to process receipt image.");
    } finally {
      setIsParsingReceipt(false);
      // Reset input
      e.target.value = "";
    }
  };

  // Trigger Mock OCR Presets
  const handleMockReceiptTrigger = (presetIndex: number) => {
    setIsParsingReceipt(true);
    setParsingError(null);

    setTimeout(() => {
      const preset = MOCK_RECEIPTS[presetIndex];
      if (preset) {
        addParsedItems(preset.items);
        setActiveTab("items");
        handleCelebrate();
      }
      setIsParsingReceipt(false);
    }, 1200); // realistic short delay
  };

  // Handle Copy share link
  const handleCopyLink = () => {
    const shareUrl = generateShareUrl();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Calculate Gamified Titles
  const getGamifiedTitle = (pId: string): { label: string; icon: string; className: string } | null => {
    const total = individualTotals[pId] || 0;
    if (total === 0) {
      return { label: "Beban Tim", icon: "💤", className: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
    }

    // Find min/max non-zero totals
    const activeTotals = Object.entries(individualTotals)
      .filter(([_, value]) => value > 0)
      .map(([_, value]) => value);

    if (activeTotals.length === 0) return null;

    const maxVal = Math.max(...activeTotals);
    const minVal = Math.min(...activeTotals);

    if (total === maxVal && activeTotals.length > 1) {
      return { label: "Si Sultan", icon: "👑", className: "text-amber-400 bg-amber-500/10 border-amber-500/30" };
    }
    if (total === minVal && activeTotals.length > 1) {
      return { label: "Si Paling Hemat", icon: "🪙", className: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
    }

    return { label: "Balance Abis", icon: "⚖️", className: "text-gray-400 bg-gray-500/5 border-gray-500/10" };
  };

  return (
    <aside className="sidebar">

      {/* 1. Header Area */}
      <div className="sidebar-header">
        <div>
          <h1 className="text-3xl font-extrabold logo-text tracking-tight flex items-center gap-2">
            Urunan <Sparkles className="w-5 h-5 text-indigo-400 animate-pulse" />
          </h1>
          <p className="logo-subtext">Tracker patungan physics-based yang asik</p>
        </div>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`settings-toggle-btn ${showSettings ? 'active' : ''}`}
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Settings Panel Drawer */}
      {showSettings && (
        <div className="settings-panel">
          <h3 className="settings-title">
            <Settings className="w-3.5 h-3.5" /> Settings API Key
          </h3>
          <p className="settings-desc">
            API key kamu disimpan lokal di browser dan dikirim langsung ke endpoint official Gemini Google. Aman bos!
          </p>
          <div className="settings-input-row">
            <input
              type="password"
              placeholder="Google AI Studio Gemini API Key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="settings-input"
            />
            {geminiApiKey && (
              <button
                onClick={() => setGeminiApiKey("")}
                className="settings-clear-btn"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      )}

      {/* READ-ONLY CLONE WORKSPACE PANEL */}
      {isReadOnly && (
        <div className="readonly-banner">
          <p className="readonly-desc">Lu lagi liat graph patungan view-only dari share link.</p>
          <button
            onClick={cloneSession}
            className="w-full neo-btn neo-btn-primary justify-center text-xs py-2"
          >
            <UserCheck className="w-3.5 h-3.5" /> Clone & Edit di Lokal
          </button>
        </div>
      )}

      {/* 2. Tabs Selector */}
      <div className="sidebar-tabs">
        <button
          onClick={() => setActiveTab("items")}
          className={`tab-btn ${activeTab === "items" ? 'active-items' : ''}`}
        >
          <Receipt className="w-3.5 h-3.5" /> Item Orb ({items.length})
        </button>
        <button
          onClick={() => setActiveTab("crew")}
          className={`tab-btn ${activeTab === "crew" ? 'active-crew' : ''}`}
        >
          <Users className="w-3.5 h-3.5" /> Grup ({participants.length})
        </button>
        <button
          onClick={() => setActiveTab("summary")}
          className={`tab-btn ${activeTab === "summary" ? 'active-summary' : ''}`}
        >
          <Share2 className="w-3.5 h-3.5" /> Rekap
        </button>
      </div>

      {/* 3. Core Tab Content Area */}
      <div className="sidebar-content">

        {/* ================= TAB: ITEMS ================= */}
        {activeTab === "items" && (
          <div className="list-section">

            {/* AI Receipt Scanning Area */}
            {!isReadOnly && (
              <div className="glass-panel ai-parser-panel">
                <h3 className="ai-parser-title">
                  <Camera className="w-3.5 h-3.5" /> AI Scanner Struk
                </h3>

                {/* File picker */}
                <div>
                  <label className="ocr-upload-label">
                    <Camera className="w-4 h-4 text-cyan-400" />
                    <span>Upload Struk</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleOCRFileChange}
                      disabled={isParsingReceipt}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Instant Presets Mock flow */}
                <div>
                  <span className="presets-label">Preset Demo Instan:</span>
                  <div className="presets-row">
                    {MOCK_RECEIPTS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleMockReceiptTrigger(idx)}
                        disabled={isParsingReceipt}
                        className="preset-btn"
                      >
                        <Play className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                        <span>{preset.name.split(" ")[1]}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Banner */}
                {parsingError && (
                  <div className="error-banner">
                    {parsingError}
                  </div>
                )}

                {/* Loading State Overlay */}
                {isParsingReceipt && (
                  <div className="parser-loader">
                    <span className="spinner" />
                    <span className="parser-loader-text">
                      Gemini 2.5 Flash-Lite lagi mikir... <Sparkles className="w-3.5 h-3.5 animate-pulse text-yellow-300" />
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Manual Add Item Form */}
            {!isReadOnly && (
              <form onSubmit={handleAddItemSubmit} className="glass-panel add-item-form">
                <h3 className="form-title">Tambah Orb Item</h3>

                <div className="form-fields">
                  <input
                    type="text"
                    placeholder="Nama item (mis. Nasi Goreng)"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="form-input"
                  />
                  <div className="form-fields-row">
                    <input
                      type="number"
                      step="1000"
                      placeholder="Harga"
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="form-input-number price"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Jml"
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="form-input-number qty"
                    />
                    <button type="submit" className="neo-btn neo-btn-primary py-1 px-3">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Items List */}
            <div className="list-section">
              <h3 className="list-title">Orb Item ({items.length})</h3>

              {items.length === 0 ? (
                <div className="list-empty">
                  Belum ada item nih. Upload struk atau tambah manual aja!
                </div>
              ) : (
                <div className="list-cards-container">
                  {items.map((item) => {
                    const tether = tethers.find(t => t.itemId === item.id);
                    const splitCount = tether ? tether.participantIds.length : 0;

                    return (
                      <div
                        key={item.id}
                        className={`item-card ${splitCount > 0 ? 'tethered' : ''}`}
                      >
                        <div className="item-info">
                          <h4 className="item-name">{item.name}</h4>
                          <div className="item-price-row">
                            <span className="item-price-tag">
                              {formatRupiah(item.price * item.quantity)}
                            </span>
                            {item.quantity > 1 && (
                              <span className="item-qty-tag">
                                ({formatRupiah(item.price)} x {item.quantity})
                              </span>
                            )}
                            {splitCount > 0 && (
                              <span className="item-split-badge">
                                Bagi {splitCount} org ({formatRupiah((item.price * item.quantity) / splitCount)} masing2)
                              </span>
                            )}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="delete-btn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB: CREW ================= */}
        {activeTab === "crew" && (
          <div className="list-section">

            {/* Add Participant Form */}
            {!isReadOnly && (
              <form onSubmit={handleAddParticipantSubmit} className="glass-panel add-item-form">
                <h3 className="form-title">Tambah Anggota</h3>

                <div className="form-fields">
                  <input
                    type="text"
                    placeholder="Nama (mis. Budi)"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="form-input"
                  />

                  {/* Emoji Preset Selectors */}
                  <div>
                    <span className="crew-form-emoji-title">Pilih Emoji Avatar:</span>
                    <div className="emojis-grid">
                      {EMOJI_PRESETS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setNewPartEmoji(emoji)}
                          className={`emoji-select-btn ${newPartEmoji === emoji ? 'selected' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Color Selectors */}
                  <div>
                    <span className="crew-form-emoji-title">Pilih Warna Glow:</span>
                    <div className="colors-grid">
                      {COLOR_PRESETS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewPartColor(color)}
                          className={`color-select-btn ${newPartColor === color ? 'selected' : ''}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <button type="submit" className="neo-btn neo-btn-primary justify-center text-xs py-2 w-full mt-1">
                    <Plus className="w-3.5 h-3.5" /> Masukin Kru
                  </button>
                </div>
              </form>
            )}

            {/* Participants list */}
            <div className="list-section">
              <h3 className="list-title">Daftar Kru ({participants.length})</h3>

              {participants.length === 0 ? (
                <div className="list-empty">
                  Masih sepi nih. Tambahin anggota dulu dong!
                </div>
              ) : (
                <div className="list-cards-container">
                  {participants.map((p) => {
                    const total = individualTotals[p.id] || 0;
                    const title = getGamifiedTitle(p.id);

                    return (
                      <div
                        key={p.id}
                        className="participant-card"
                      >
                        <div className="participant-left">
                          {/* Colored Glowing Avatar Indicator */}
                          <div
                            className="participant-avatar-badge"
                            style={{
                              ["--border-color" as any]: p.color,
                              boxShadow: `0 0 8px ${p.color}40`
                            }}
                          >
                            {p.emoji}
                          </div>
                          <div className="participant-text-info">
                            <h4 className="participant-name-title">
                              {p.name}
                              {title && (
                                <span className={`title-badge ${title.className}`}>
                                  {title.icon} {title.label}
                                </span>
                              )}
                            </h4>
                            <p className="participant-total-label">Total Tagihan</p>
                          </div>
                        </div>

                        <div className="participant-right">
                          <span className="participant-total-amount">
                            {formatRupiah(total)}
                          </span>
                          {!isReadOnly && (
                            <button
                              onClick={() => deleteParticipant(p.id)}
                              className="delete-btn"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB: SUMMARY ================= */}
        {activeTab === "summary" && (
          <div className="list-section">

            {/* Share Split Glass card */}
            <div className="glass-panel share-panel">
              <h3 className="share-panel-title">
                <Share2 className="w-3.5 h-3.5" /> Share Tanpa Server
              </h3>

              <p className="share-desc">
                Kirim link patungan ini lgsg ke temen-temen lu! Semua state disimpen di URL — <b>gak pake database, gak pake ribet bikin akun</b>.
              </p>

              <button
                onClick={handleCopyLink}
                className="w-full neo-btn neo-btn-primary justify-center text-xs py-2"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Kecopy di Clipboard!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Link Share
                  </>
                )}
              </button>
            </div>

            {/* Live split total bill and complete indicator */}
            <div className="glass-panel totals-card">
              <h3 className="totals-card-title">Rekap Akhir Patungan</h3>

              <div className="summary-rows-container">
                <div className="summary-row">
                  <span>Total Tagihan:</span>
                  <span className="summary-row-val">{formatRupiah(totalReceiptCost)}</span>
                </div>
                <div className="summary-row">
                  <span>Status Patungan:</span>
                  {isSplitComplete ? (
                    <span className="summary-row-val complete">
                      Udah Dibagi Rata 100% <Check className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="summary-row-val partial">
                      Belum beres (ada item nganggur)
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

              {/* Gamified celebration fireworks button */}
              {isSplitComplete && (
                <button
                  onClick={handleCelebrate}
                  className="w-full neo-btn neo-btn-accent justify-center text-xs py-2 mt-4"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> Party Waktu Bayar!
                </button>
              )}
            </div>

          </div>
        )}

      </div>

      {/* 4. Footer & Session Reset Actions */}
      {!isReadOnly && (
        <div className="sidebar-footer">
          <button
            onClick={resetToDefault}
            className="sidebar-footer-btn presets"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Preset Bawaan
          </button>
          <button
            onClick={clearAll}
            className="sidebar-footer-btn reset"
          >
            <Trash2 className="w-3.5 h-3.5" /> Reset Kanvas
          </button>
        </div>
      )}

    </aside>
  );
}
