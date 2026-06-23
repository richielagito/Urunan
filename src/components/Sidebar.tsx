import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  Camera,
  UserCheck,
  X,
  Store,
  Home
} from "lucide-react";
import { Participant, ReceiptItem, Tether } from "@/hooks/useUrunanState";
import { parseReceiptWithGemini, ParsedItem, GeminiReceiptResult } from "@/lib/gemini";
import confetti from "canvas-confetti";
import { useTranslation } from "react-i18next";
import { toJpeg } from "@/lib/html-to-image";
import ShareView from "./ShareView";

interface SidebarProps {
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
  geminiApiKey: string;
  setGeminiApiKey: (key: string) => void;
  setTax: (value: number) => void;
  setServiceCharge: (value: number) => void;
  setDiscount: (value: number) => void;
  setOtherFees: (value: number) => void;
  setBillName: (value: string) => void;
  addParticipant: (name: string, emoji: string, color: string) => void;
  deleteParticipant: (id: string) => void;
  addItem: (name: string, price: number, quantity: number) => void;
  updateItem: (id: string, name: string, price: number, quantity: number) => void;
  deleteItem: (id: string) => void;
  addParsedItems: (parsed: ParsedItem[]) => void;
  generateShareUrl: () => string;
}

const EMOJI_PRESETS = ["🦊", "🐼", "🐨", "🦁", "🐯", "🐷", "🐸", "🐙", "🦖", "🦄", "🍕", "🥑", "☕️", "👑", "🚀", "🎩", "🐱", "🐶", "🐵", "🐧", "🧋", "🍔", "🍣", "🍩", "👻", "👽", "🤖", "💸", "🔥", "💎"];
const COLOR_PRESETS = ["#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#a855f7", "#ff7a00", "#a3e635", "#6366f1", "#14b8a6"];

const formatRupiah = (amount: number) => {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
};

const formatRupiahInput = (value: number | string): string => {
  if (value === undefined || value === null || value === "" || value === 0 || value === "0") return "";
  const numString = value.toString().replace(/[^0-9]/g, "");
  if (!numString) return "";
  return parseInt(numString, 10).toLocaleString("id-ID");
};

const parseRupiahInput = (value: string): number => {
  const cleanString = value.replace(/[^0-9]/g, "");
  return cleanString ? parseInt(cleanString, 10) : 0;
};

export default function Sidebar({
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
  geminiApiKey,
  setGeminiApiKey,
  setTax,
  setServiceCharge,
  setDiscount,
  setOtherFees,
  setBillName,
  addParticipant,
  deleteParticipant,
  addItem,
  updateItem,
  deleteItem,
  addParsedItems,
  generateShareUrl
}: SidebarProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSharing, setIsSharing] = useState(false);
  const shareViewRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"items" | "crew" | "summary">("items");
  const [showSettings, setShowSettings] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);
  // Draft state for quantity editing — allows empty field while typing
  const [draftQty, setDraftQty] = useState<{ id: string; value: string } | null>(null);

  useEffect(() => {
    if (!showQRModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setShowQRModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showQRModal]);

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

  const [uploadedImagePreview, setUploadedImagePreview] = useState<string | null>(null);
  const [scanningProgressText, setScanningProgressText] = useState<string>('');
  const [isScanningSuccess, setIsScanningSuccess] = useState<boolean>(false);
  const [scanningProgressPercent, setScanningProgressPercent] = useState<number>(0);

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
      setParsingError("Masukkan API Key Google AI Studio di Settings terlebih dahulu!");
      setShowSettings(true);
      return;
    }

    setIsParsingReceipt(true);
    setParsingError(null);
    setIsScanningSuccess(false);

    const previewUrl = URL.createObjectURL(file);
    setUploadedImagePreview(previewUrl);

    const stages = ["Memproses gambar...", "Mengupload struk...", "Menganalisa gambar...", "Mengekstrak harga...", "Menghitung Total..."];
    let currentStage = 0;
    setScanningProgressText(stages[0]);
    setScanningProgressPercent(20);

    const progressInterval = setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setScanningProgressText(stages[currentStage]);
        setScanningProgressPercent((currentStage + 1) * 20);
      }
    }, 1200);

    try {
      const result: GeminiReceiptResult = await parseReceiptWithGemini(file, geminiApiKey);
      clearInterval(progressInterval);

      if (result.items.length > 0) {
        setScanningProgressText("Berhasil!");
        setScanningProgressPercent(100);
        setIsScanningSuccess(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        addParsedItems(result.items);
        setActiveTab("items");
        // Pop nice sparkles confetti for parser success
        confetti({ particleCount: 30, spread: 40, colors: ["#06b6d4", "#8b5cf6"] });
      } else {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Apply detected tax & service charge
      if (result.tax > 0) setTax(result.tax);
      if (result.serviceCharge > 0) setServiceCharge(result.serviceCharge);

      // Apply detected discount
      if (result.discount > 0) setDiscount(result.discount);

      // Apply detected other fees (sum all fee amounts)
      if (result.otherFees && result.otherFees.length > 0) {
        const totalOtherFees = result.otherFees.reduce((sum, fee) => sum + fee.amount, 0);
        if (totalOtherFees > 0) setOtherFees(totalOtherFees);
      }

      // Apply detected bill name (auto-fill if not already set)
      if (result.billName && !billName) {
        setBillName(result.billName);
      }
    } catch (err: unknown) {
      clearInterval(progressInterval);
      const msg = err instanceof Error ? err.message : "Gagal memproses gambar struk.";
      setParsingError(msg);
    } finally {
      clearInterval(progressInterval);
      setIsParsingReceipt(false);
      setIsScanningSuccess(false);
      setUploadedImagePreview(null);
      URL.revokeObjectURL(previewUrl);
      e.target.value = "";
    }
  };


  // Check if Web Share is supported
  const isShareSupported = typeof navigator !== "undefined" && !!navigator.share;

  const handleShareLink = async () => {
    if (!shareViewRef.current) return;
    setIsSharing(true);

    try {
      // 1. Generate JPEG image using html-to-image
      const dataUrl = await toJpeg(shareViewRef.current, {
        quality: 0.95,
        backgroundColor: "#07080c",
        cacheBust: true,
      });

      // 2. Convert dataUrl to a File object
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const cleanBillName = billName ? billName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "urunan";
      const filename = `${cleanBillName}-rekap.jpg`;
      const file = new File([blob], filename, {
        type: "image/jpeg",
      });

      // 3. Try sharing via Web Share API
      const isFileShareSupported = typeof navigator !== "undefined" && 
        !!navigator.canShare && 
        navigator.canShare({ files: [file] });

      if (isFileShareSupported) {
        await navigator.share({
          files: [file],
          title: billName ? `Urunan - ${billName}` : "Urunan - Patungan",
          text: billName ? `Detail patungan "${billName}"` : "Detail patungan kita",
        });
      } else {
        // Fallback: download directly
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      }
    } catch (err) {
      console.error("Error generating or sharing image:", err);
      alert("Gagal membagikan gambar. Mengunduh file rekap sebagai cadangan...");
      // Download fallback
      try {
        const dataUrl = await toJpeg(shareViewRef.current, {
          quality: 0.9,
          backgroundColor: "#07080c",
        });
        const cleanBillName = billName ? billName.toLowerCase().replace(/[^a-z0-9]/g, "-") : "urunan";
        const filename = `${cleanBillName}-rekap.jpg`;
        const link = document.createElement("a");
        link.download = filename;
        link.href = dataUrl;
        link.click();
      } catch (innerErr) {
        console.error("Inner download failure:", innerErr);
      }
    } finally {
      setIsSharing(false);
    }
  };

  // Handle Copy share link
  const handleCopyLink = () => {
    const shareUrl = generateShareUrl();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Copy QR modal link
  const handleCopyQRLink = () => {
    const shareUrl = generateShareUrl();
    navigator.clipboard.writeText(shareUrl);
    setQrCopied(true);
    setTimeout(() => setQrCopied(false), 2000);
  };

  // Calculate Gamified Titles
  const getGamifiedTitle = (pId: string): { label: string; icon: string; className: string } | null => {
    const total = individualTotals[pId] || 0;
    if (total === 0) {
      return { label: t("beban_tim"), icon: "💤", className: "text-purple-400 bg-purple-500/10 border-purple-500/20" };
    }

    // Find min/max non-zero totals
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
    <aside className="sidebar">

      {/* 1. Header Area */}
      <div className="sidebar-header">
        <div>
          <h1 className="text-3xl font-extrabold logo-text tracking-tight flex items-center gap-2">
            urunan
          </h1>
          <div className="logo-subtext">
            <span className="logo-subtext-pronunciation">/urun·an/</span>
            <span className="logo-subtext-pos">{t("definition_pos")}</span>
            <span className="logo-subtext-def">{t("definition")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              localStorage.removeItem("urunan_has_visited");
              navigate("/");
            }}
            className="settings-toggle-btn"
            title="Go to Landing Page (Dev)"
          >
            <Home className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className={`settings-toggle-btn ${showSettings ? 'active' : ''}`}
          >
            <Settings className="size-4" />
          </button>
        </div>
      </div>

      {/* Settings Panel Drawer */}
      {showSettings && (
        <div className="settings-panel">
          <h3 className="settings-title">
            <Settings className="size-3.5" /> Settings API Key
          </h3>
          <p className="settings-desc">
            API key kamu disimpan lokal di browser dan dikirim langsung ke endpoint official Gemini Google. Aman bos!
          </p>
          <div className="settings-input-row">
            <input
              type="password"
              placeholder="Google AI Studio Gemini API Key"
              aria-label="Google AI Studio Gemini API Key"
              value={geminiApiKey}
              onChange={(e) => setGeminiApiKey(e.target.value)}
              className="settings-input"
            />
            {geminiApiKey && (
              <button
                type="button"
                onClick={() => setGeminiApiKey("")}
                className="settings-clear-btn"
              >
                Hapus
              </button>
            )}
          </div>
        </div>
      )}

      {/* Bill Name Display / Input */}
      <div className="bill-name-bar">
        <Store className="size-5 bill-name-icon" />
        <input
          type="text"
          placeholder={t("bill_placeholder")}
          aria-label={t("bill_aria")}
          value={billName}
          onChange={(e) => setBillName(e.target.value)}
          className="bill-name-input"
        />
        {billName && (
          <button
            type="button"
            onClick={() => setBillName("")}
            className="bill-name-clear"
            aria-label="Hapus nama bill"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {/* 2. Tabs Selector */}
      <div className="sidebar-tabs">
        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`tab-btn ${activeTab === "items" ? 'active-items' : ''}`}
        >
          <Receipt className="size-3.5" /> {t("tab_items")} ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crew")}
          className={`tab-btn ${activeTab === "crew" ? 'active-crew' : ''}`}
        >
          <Users className="size-3.5" /> {t("tab_crew")} ({participants.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`tab-btn ${activeTab === "summary" ? 'active-summary' : ''}`}
        >
          <Share2 className="size-3.5" /> {t("tab_recap")}
        </button>
      </div>

      {/* 3. Core Tab Content Area */}
      <div className="sidebar-content">

        {/* ================= TAB: ITEMS ================= */}
        {activeTab === "items" && (
          <div className="list-section">

            {/* AI Receipt Scanning Area */}
            {/* AI Receipt Scanning Area */}
            <label
              className={`glass-panel ai-parser-panel ${isParsingReceipt ? 'loading' : ''} ${isScanningSuccess ? 'success' : ''}`}
            >
              {!isParsingReceipt && !isScanningSuccess ? (
                <div className="flex flex-col items-center gap-2">
                  <Camera className="size-8 text-cyan-400" />
                  <h3 className="ai-parser-title m-0">
                    Scan Struk
                  </h3>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 w-full">
                  {uploadedImagePreview && (
                    <div className="scanner-image-preview-container">
                      <img src={uploadedImagePreview} alt="Receipt preview" className="scanner-image-preview" />
                      {!isScanningSuccess && <div className="scanner-shimmer-overlay"></div>}
                    </div>
                  )}

                  {isScanningSuccess ? (
                    <div className="flex items-center gap-2 text-emerald-500 font-bold">
                      <Check className="size-5" />
                      <span>{scanningProgressText}</span>
                    </div>
                  ) : (
                    <div className="w-full flex flex-col items-center gap-2">
                      <span className="parser-loader-text">
                        {scanningProgressText}
                      </span>
                      <div className="scanner-progress-bar-container">
                        <div className="scanner-progress-bar-fill" style={{ width: `${scanningProgressPercent}%` }}></div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                aria-label="Pilih file gambar struk untuk discan"
                onChange={handleOCRFileChange}
                disabled={isParsingReceipt}
                className="hidden"
              />

              {/* Error Banner */}
              {parsingError && (
                <div className="error-banner mt-2">
                  {parsingError}
                </div>
              )}
            </label>

            {/* Manual Add Item Form */}
            <form onSubmit={handleAddItemSubmit} className="glass-panel add-item-form">
              <h3 className="form-title">{t("add_item_title")}</h3>

              <div className="form-fields">
                <input
                  type="text"
                  placeholder={t("item_name_placeholder")}
                  aria-label={t("item_name_aria")}
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="form-input"
                />
                <div className="form-fields-row">
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-gray-500 text-sm select-none pointer-events-none">x</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="Jml"
                      aria-label={t("item_qty_aria")}
                      value={newItemQty}
                      onChange={(e) => setNewItemQty(e.target.value)}
                      className="form-input-number qty text-left w-16 pl-prefix-x"
                    />
                  </div>
                  <div className="relative flex items-center flex-1">
                    <span className="absolute left-2.5 text-gray-500 text-sm select-none pointer-events-none">Rp</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="Harga"
                      aria-label={t("item_price_aria")}
                      value={formatRupiahInput(newItemPrice)}
                      onChange={(e) => setNewItemPrice(parseRupiahInput(e.target.value).toString())}
                      className="form-input-number price w-full pl-prefix-rp"
                    />
                  </div>
                  <button type="submit" className="neo-btn neo-btn-primary py-1 px-3">
                    <Plus className="size-4" />
                  </button>
                </div>
              </div>
            </form>

            {/* Items List */}
            <div className="list-section">
              <h3 className="list-title">{t("items_list_title")} ({items.length})</h3>

              {items.length === 0 ? (
                <div className="list-empty">
                  {t("no_items_desc")}
                </div>
              ) : (
                <div className="list-cards-container">
                  {items.map((item) => {
                    const tether = tethers.find(t => t.itemId === item.id);
                    const splitCount = tether ? tether.participantIds.length : 0;
                    const assignedParticipants = tether
                      ? participants.filter((p) => tether.participantIds.includes(p.id))
                      : [];

                    return (
                      <div
                        key={item.id}
                        className={`item-card ${splitCount > 0 ? 'tethered' : ''}`}
                      >
                        <div className="item-info">
                          <input
                            type="text"
                            value={item.name}
                            aria-label={t("item_name_aria")}
                            onChange={(e) => updateItem(item.id, e.target.value, item.price, item.quantity)}
                            className="bg-transparent border-b border-dashed border-gray-700 hover:border-gray-500 focus:border-gray-400 focus:outline-none text-[16px] font-bold text-white w-full p-0.5 transition-colors"
                          />
                          <div className="item-price-row flex-wrap">
                            <div className="flex items-center gap-0.5">
                              <span className="text-[14px] text-gray-500 font-medium select-none">x</span>
                              <input
                                type="number"
                                min="1"
                                value={draftQty?.id === item.id ? draftQty.value : item.quantity}
                                aria-label={t("item_qty_aria")}
                                onFocus={() => setDraftQty({ id: item.id, value: item.quantity.toString() })}
                                onChange={(e) => setDraftQty({ id: item.id, value: e.target.value })}
                                onBlur={() => {
                                  const parsed = parseInt(draftQty?.value ?? "", 10);
                                  const newQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
                                  updateItem(item.id, item.name, item.price, newQty);
                                  setDraftQty(null);
                                }}
                                className="bg-transparent border-b border-dashed border-gray-700 hover:border-gray-500 focus:border-gray-400 focus:outline-none text-[16px] font-medium text-gray-300 w-14 px-0.5 text-center transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                            </div>
                            
                            <div className="flex items-center gap-0.5">
                              <span className="text-[14px] text-gray-500 font-semibold select-none">Rp</span>
                              <input
                                type="text"
                                inputMode="numeric"
                                value={formatRupiahInput(item.price)}
                                aria-label={t("item_price_aria")}
                                onChange={(e) => {
                                  const newPrice = parseRupiahInput(e.target.value);
                                  updateItem(item.id, item.name, newPrice, item.quantity);
                                }}
                                className="bg-transparent border-b border-dashed border-gray-700 hover:border-gray-500 focus:border-gray-400 focus:outline-none text-[16px] font-extrabold text-white w-28 px-0.5 text-left transition-colors"
                              />
                            </div>
                            
                            {splitCount > 0 && (
                              <div className="flex items-center gap-1.5 ml-1">
                                <div className="flex overflow-hidden">
                                  {assignedParticipants.map((p, idx) => (
                                    <div
                                      key={p.id}
                                      className="inline-flex rounded-full bg-slate-950 border items-center justify-center select-none shadow-sm participant-avatar-icon-badge"
                                      title={p.name}
                                      style={{
                                        borderColor: p.color,
                                        marginLeft: idx > 0 ? "-6px" : "0px"
                                      } as React.CSSProperties}
                                    >
                                      {p.emoji.replace(/\uFE0F/g, '')}
                                    </div>
                                  ))}
                                </div>
                                {splitCount > 1 && (
                                  <span className="text-[10px] text-gray-400 font-medium">
                                    ({formatRupiah((item.price * item.quantity) / splitCount)} {t("each")})
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteItem(item.id)}
                          className="delete-btn"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* ================= TAB: ITEMS (continued) — Tax, Service, Discount & Other Fees Panel ================= */}
        {activeTab === "items" && (
          <div className="glass-panel tax-service-panel">
            <h3 className="form-title">{t("tax_service_title")}</h3>
            <div className="flex flex-col gap-3">
              <div className="tax-service-field">
                <label htmlFor="tax-input" className="tax-service-label">{t("tax_label")}</label>
                <div className="relative flex items-center w-full">
                  <span className="absolute left-2.5 text-gray-500 text-sm select-none pointer-events-none">Rp</span>
                  <input
                    id="tax-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={t("tax_label")}
                    value={formatRupiahInput(tax)}
                    onChange={(e) => setTax(parseRupiahInput(e.target.value))}
                    className="form-input w-full pl-prefix-rp"
                  />
                </div>
              </div>
              <div className="tax-service-field">
                <label htmlFor="service-charge-input" className="tax-service-label">{t("service_charge_label")}</label>
                <div className="relative flex items-center w-full">
                  <span className="absolute left-2.5 text-gray-500 text-sm select-none pointer-events-none">Rp</span>
                  <input
                    id="service-charge-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={t("service_charge_label")}
                    value={formatRupiahInput(serviceCharge)}
                    onChange={(e) => setServiceCharge(parseRupiahInput(e.target.value))}
                    className="form-input w-full pl-prefix-rp"
                  />
                </div>
              </div>
              <div className="tax-service-field">
                <label htmlFor="discount-input" className="tax-service-label ">{t("discount_label")}</label>
                <div className="relative flex items-center w-full">
                  <span className="absolute left-2.5 text-gray-500 text-sm select-none pointer-events-none">Rp</span>
                  <input
                    id="discount-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={t("discount_label")}
                    value={formatRupiahInput(discount)}
                    onChange={(e) => setDiscount(parseRupiahInput(e.target.value))}
                    className="form-input discount-input w-full pl-prefix-rp"
                  />
                </div>
              </div>
              <div className="tax-service-field">
                <label htmlFor="other-fees-input" className="tax-service-label">{t("other_fees_label")}</label>
                <div className="relative flex items-center w-full">
                  <span className="absolute left-2.5 text-gray-500 text-sm select-none pointer-events-none">Rp</span>
                  <input
                    id="other-fees-input"
                    type="text"
                    inputMode="numeric"
                    placeholder="0"
                    aria-label={t("other_fees_label")}
                    value={formatRupiahInput(otherFees)}
                    onChange={(e) => setOtherFees(parseRupiahInput(e.target.value))}
                    className="form-input w-full pl-prefix-rp"
                  />
                </div>
              </div>
            </div>
            {(tax > 0 || serviceCharge > 0 || discount > 0 || otherFees > 0) && (
              <div className="tax-service-summary">
                {t("additions_total")} {formatRupiah(tax + serviceCharge + otherFees - discount)}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: CREW ================= */}
        {activeTab === "crew" && (
          <div className="list-section">

            {/* Add Participant Form */}
            <form onSubmit={handleAddParticipantSubmit} className="glass-panel add-item-form">
              <h3 className="form-title">{t("add_member_title")}</h3>

              <div className="form-fields">
                <input
                  type="text"
                  placeholder={t("member_name_placeholder")}
                  aria-label={t("member_name_aria")}
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="form-input"
                />

                {/* Emoji Preset Selectors */}
                <div>
                  <span className="crew-form-emoji-title">{t("choose_avatar")}</span>
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
                  <span className="crew-form-emoji-title">{t("choose_glow")}</span>
                  <div className="colors-grid">
                    {COLOR_PRESETS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setNewPartColor(color)}
                        className={`color-select-btn ${newPartColor === color ? 'selected' : ''}`}
                        style={{ backgroundColor: color }}
                        aria-label={`Warna ${color}`}
                      />
                    ))}
                  </div>
                </div>

                <button type="submit" className="neo-btn neo-btn-primary justify-center text-xs py-2 w-full mt-1">
                  <Plus className="size-3.5" /> {t("insert_crew_btn")}
                </button>
              </div>
            </form>

            {/* Participants list */}
            <div className="list-section">
              <h3 className="list-title">{t("crew_list_title")} ({participants.length})</h3>

              {participants.length === 0 ? (
                <div className="list-empty">
                  {t("no_crew_desc")}
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
                              ["--border-color" as string]: p.color,
                              boxShadow: `0 0 8px ${p.color}40`
                            } as React.CSSProperties}
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
                          </div>
                        </div>

                        <div className="participant-right">
                          <span className="participant-total-amount">
                            {formatRupiah(total)}
                          </span>
                          <button
                            type="button"
                            onClick={() => deleteParticipant(p.id)}
                            className="delete-btn"
                          >
                            <Trash2 className="size-5" />
                          </button>
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
                <Share2 className="size-3.5" /> {t("share_crew_title")}
              </h3>

              <p className="share-desc">
                {t("share_desc_main")}<b>{t("share_desc_bold")}</b>).
              </p>

              <div className="flex flex-col gap-2 w-full">
                <button
                  type="button"
                  onClick={handleShareLink}
                  disabled={isSharing}
                  className="w-full neo-btn neo-btn-primary justify-center text-xs py-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSharing ? (
                    <>
                      <div className="size-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      Membuat Gambar…
                    </>
                  ) : (
                    <>
                      <Share2 className="size-3.5" /> {t("share_link_btn")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full neo-btn neo-btn-secondary justify-center text-xs py-2"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-emerald-400" /> {t("copied_clipboard")}
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" /> {t("copy_share_btn")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQRModal(true)}
                  className="w-full neo-btn neo-btn-accent justify-center text-xs py-2"
                >
                  <Sparkles className="size-3.5 text-pink-400" /> {t("show_qr_btn")}
                </button>
              </div>
            </div>

            {/* QR Code Dialog Modal */}
            {showQRModal && (
              <div className="qr-modal-container">
                <button
                  type="button"
                  className="qr-modal-overlay"
                  onClick={() => setShowQRModal(false)}
                  aria-label={t("close_modal_aria") || "Tutup modal"}
                />
                <div className="qr-modal-content glass-panel pulsing-glow" onClick={(e) => e.stopPropagation()}>
                  <div className="qr-modal-header">
                    <h3 className="qr-modal-title logo-text">{t("scan_urunan")}</h3>
                    <button type="button" className="qr-modal-close-btn" onClick={() => setShowQRModal(false)}>
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="qr-modal-body">
                    <p className="qr-modal-desc">
                      {t("qr_desc")}
                    </p>
                    <div className="qr-code-wrapper">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(generateShareUrl())}&color=07080c&bgcolor=ffffff&qzone=2`}
                        alt="Urunan Share QR Code"
                        className="qr-code-img"
                        width={200}
                        height={200}
                      />
                    </div>
                    <div className="qr-modal-url">
                      <span className="truncate">
                        Link: {generateShareUrl().substring(0, 43)}…
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyQRLink}
                        className={`qr-modal-url-copy-btn ${qrCopied ? 'copied' : ''}`}
                        title="Copy Link Share"
                      >
                        {qrCopied ? (
                          <Check className="size-3" />
                        ) : (
                          <Copy className="size-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Live split total bill and complete indicator */}
            <div className="glass-panel totals-card">
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
                      {t("status_complete")} <Check className="size-3.5" />
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
        )}

      </div>

      {/* Offscreen ShareView for Image Capture */}
      <div
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "480px",
          pointerEvents: "none",
        }}
      >
        <div
          ref={shareViewRef}
          className="share-view-capture-container"
        >
          <ShareView
            participants={participants}
            items={items}
            tethers={tethers}
            individualTotals={individualTotals}
            totalReceiptCost={totalReceiptCost}
            itemSubtotal={itemSubtotal}
            tax={tax}
            serviceCharge={serviceCharge}
            discount={discount}
            otherFees={otherFees}
            billName={billName}
            isSplitComplete={isSplitComplete}
            defaultExpanded={true}
          />
        </div>
      </div>

    </aside>
  );
}
