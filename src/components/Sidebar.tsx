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
  Camera,
  UserCheck,
  X,
  Store
} from "lucide-react";
import { Participant, ReceiptItem, Tether } from "@/hooks/useUrunanState";
import { parseReceiptWithGemini, ParsedItem, GeminiReceiptResult } from "@/lib/gemini";
import confetti from "canvas-confetti";
import { useTranslation } from "react-i18next";

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
  isReadOnly: boolean;
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
  deleteItem: (id: string) => void;
  addParsedItems: (parsed: ParsedItem[]) => void;
  cloneSession: () => void;
  generateShareUrl: () => string;
}

const EMOJI_PRESETS = ["🦊", "🐼", "🐨", "🦁", "🐯", "🐷", "🐸", "🐙", "🦖", "🦄", "🍕", "🥑", "☕️", "👑", "🚀", "🎩", "🐱", "🐶", "🐵", "🐧", "🧋", "🍔", "🍣", "🍩", "👻", "👽", "🤖", "💸", "🔥", "💎"];
const COLOR_PRESETS = ["#ec4899", "#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#a855f7", "#ff7a00", "#a3e635", "#6366f1", "#14b8a6"];

const formatRupiah = (amount: number) => {
  return "Rp" + Math.round(amount).toLocaleString("id-ID");
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
  isReadOnly,
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
  deleteItem,
  addParsedItems,
  cloneSession,
  generateShareUrl
}: SidebarProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"items" | "crew" | "summary">("items");
  const [showSettings, setShowSettings] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrCopied, setQrCopied] = useState(false);

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

    const progressInterval = setInterval(() => {
      currentStage++;
      if (currentStage < stages.length) {
        setScanningProgressText(stages[currentStage]);
      }
    }, 1200);

    try {
      const result: GeminiReceiptResult = await parseReceiptWithGemini(file, geminiApiKey);
      clearInterval(progressInterval);

      if (result.items.length > 0) {
        setScanningProgressText("Berhasil!");
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
        <button
          type="button"
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

      {/* READ-ONLY CLONE WORKSPACE PANEL */}
      {isReadOnly && (
        <div className="readonly-banner">
          <p className="readonly-desc">{t("readonly_banner")}</p>
          <button
            type="button"
            onClick={cloneSession}
            className="w-full neo-btn neo-btn-primary justify-center text-xs py-2"
          >
            <UserCheck className="w-3.5 h-3.5" /> {t("clone_btn")}
          </button>
        </div>
      )}

      {/* Bill Name Display / Input */}
      {!isReadOnly ? (
        <div className="bill-name-bar">
          <Store className="w-5 h-5 bill-name-icon" />
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
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      ) : billName ? (
        <div className="bill-name-bar bill-name-bar-readonly">
          <Store className="w-3.5 h-3.5 bill-name-icon" />
          <span className="bill-name-display">{billName}</span>
        </div>
      ) : null}

      {/* 2. Tabs Selector */}
      <div className="sidebar-tabs">
        <button
          type="button"
          onClick={() => setActiveTab("items")}
          className={`tab-btn ${activeTab === "items" ? 'active-items' : ''}`}
        >
          <Receipt className="w-3.5 h-3.5" /> {t("tab_items")} ({items.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("crew")}
          className={`tab-btn ${activeTab === "crew" ? 'active-crew' : ''}`}
        >
          <Users className="w-3.5 h-3.5" /> {t("tab_crew")} ({participants.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`tab-btn ${activeTab === "summary" ? 'active-summary' : ''}`}
        >
          <Share2 className="w-3.5 h-3.5" /> {t("tab_recap")}
        </button>
      </div>

      {/* 3. Core Tab Content Area */}
      <div className="sidebar-content">

        {/* ================= TAB: ITEMS ================= */}
        {activeTab === "items" && (
          <div className="list-section">

            {/* AI Receipt Scanning Area */}
            {!isReadOnly && (
              <label
                className={`glass-panel ai-parser-panel ${isParsingReceipt ? 'loading' : ''} ${isScanningSuccess ? 'success' : ''}`}
                style={{
                  cursor: isParsingReceipt ? 'not-allowed' : 'pointer',
                  borderStyle: isParsingReceipt || isScanningSuccess ? 'solid' : 'dashed',
                  borderColor: isScanningSuccess ? 'rgba(16, 185, 129, 0.5)' : undefined
                }}
              >
                {!isParsingReceipt && !isScanningSuccess ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <Camera className="w-8 h-8 text-cyan-400" />
                    <h3 className="ai-parser-title" style={{ margin: 0 }}>
                      Scan Struk
                    </h3>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', width: '100%' }}>
                    {uploadedImagePreview && (
                      <div className="scanner-image-preview-container">
                        <img src={uploadedImagePreview} alt="Receipt preview" className="scanner-image-preview" />
                        {!isScanningSuccess && <div className="scanner-shimmer-overlay"></div>}
                      </div>
                    )}

                    {isScanningSuccess ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#10b981', fontWeight: 'bold' }}>
                        <Check className="w-5 h-5" />
                        <span>{scanningProgressText}</span>
                      </div>
                    ) : (
                      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <span className="parser-loader-text" style={{ fontSize: '12px' }}>
                          {scanningProgressText}
                        </span>
                        <div className="scanner-progress-bar-container">
                          <div className="scanner-progress-bar-fill"></div>
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
                  style={{ display: 'none' }}
                />

                {/* Error Banner */}
                {parsingError && (
                  <div className="error-banner" style={{ marginTop: '8px' }}>
                    {parsingError}
                  </div>
                )}
              </label>
            )}

            {/* Manual Add Item Form */}
            {!isReadOnly && (
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
                    <input
                      type="number"
                      step="1000"
                      placeholder="Harga"
                      aria-label={t("item_price_aria")}
                      value={newItemPrice}
                      onChange={(e) => setNewItemPrice(e.target.value)}
                      className="form-input-number price"
                    />
                    <input
                      type="number"
                      min="1"
                      placeholder="Jml"
                      aria-label={t("item_qty_aria")}
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
                                {t("split_desc", { count: splitCount, amount: formatRupiah((item.price * item.quantity) / splitCount) })}
                              </span>
                            )}
                          </div>
                        </div>
                        {!isReadOnly && (
                          <button
                            type="button"
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

        {/* ================= TAB: ITEMS (continued) — Tax, Service, Discount & Other Fees Panel ================= */}
        {activeTab === "items" && !isReadOnly && (
          <div className="glass-panel tax-service-panel">
            <h3 className="form-title">{t("tax_service_title")}</h3>
            <div className="tax-service-fields">
              <div className="tax-service-field">
                <label htmlFor="tax-input" className="tax-service-label">{t("tax_label")}</label>
                <input
                  id="tax-input"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  aria-label={t("tax_label")}
                  value={tax || ""}
                  onChange={(e) => setTax(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
              <div className="tax-service-field">
                <label htmlFor="service-charge-input" className="tax-service-label">{t("service_charge_label")}</label>
                <input
                  id="service-charge-input"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  aria-label={t("service_charge_label")}
                  value={serviceCharge || ""}
                  onChange={(e) => setServiceCharge(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
            </div>
            <div className="tax-service-fields">
              <div className="tax-service-field">
                <label htmlFor="discount-input" className="tax-service-label ">{t("discount_label")}</label>
                <input
                  id="discount-input"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  aria-label={t("discount_label")}
                  value={discount || ""}
                  onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                  className="form-input discount-input"
                />
              </div>
              <div className="tax-service-field">
                <label htmlFor="other-fees-input" className="tax-service-label">{t("other_fees_label")}</label>
                <input
                  id="other-fees-input"
                  type="number"
                  step="1000"
                  min="0"
                  placeholder="0"
                  aria-label={t("other_fees_label")}
                  value={otherFees || ""}
                  onChange={(e) => setOtherFees(parseFloat(e.target.value) || 0)}
                  className="form-input"
                />
              </div>
            </div>
            {(tax > 0 || serviceCharge > 0 || discount > 0 || otherFees > 0) && (
              <div className="tax-service-summary">
                {t("additions_total")} {formatRupiah(tax + serviceCharge + otherFees - discount)}
              </div>
            )}
          </div>
        )}

        {/* Show tax/service/discount/fees read-only in items tab when in readonly mode */}
        {activeTab === "items" && isReadOnly && (tax > 0 || serviceCharge > 0 || discount > 0 || otherFees > 0) && (
          <div className="glass-panel tax-service-panel">
            <h3 className="form-title">{t("tax_service_title")}</h3>
            <div className="tax-service-fields">
              {tax > 0 && (
                <div className="tax-service-field">
                  <span className="tax-service-label">{t("tax_label_short")}</span>
                  <span className="tax-service-readonly-val">{formatRupiah(tax)}</span>
                </div>
              )}
              {serviceCharge > 0 && (
                <div className="tax-service-field">
                  <span className="tax-service-label">{t("service_charge_label")}</span>
                  <span className="tax-service-readonly-val">{formatRupiah(serviceCharge)}</span>
                </div>
              )}
            </div>
            {(discount > 0 || otherFees > 0) && (
              <div className="tax-service-fields">
                {discount > 0 && (
                  <div className="tax-service-field">
                    <span className="tax-service-label">{t("discount_label")}</span>
                    <span className="tax-service-readonly-val discount-val">-{formatRupiah(discount)}</span>
                  </div>
                )}
                {otherFees > 0 && (
                  <div className="tax-service-field">
                    <span className="tax-service-label">{t("other_fees_label")}</span>
                    <span className="tax-service-readonly-val">{formatRupiah(otherFees)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB: CREW ================= */}
        {activeTab === "crew" && (
          <div className="list-section">

            {/* Add Participant Form */}
            {!isReadOnly && (
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

                  <button type="submit" className="neo-btn neo-btn-primary justify-center text-xs py-2 w-full mt-2">
                    <Plus className="w-3.5 h-3.5" /> {t("insert_crew_btn")}
                  </button>
                </div>
              </form>
            )}

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
                          {!isReadOnly && (
                            <button
                              type="button"
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
                <Share2 className="w-3.5 h-3.5" /> {t("share_crew_title")}
              </h3>

              <p className="share-desc">
                {t("share_desc_main")}<b>{t("share_desc_bold")}</b>).
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%" }}>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="w-full neo-btn neo-btn-primary justify-center text-xs py-2"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> {t("copied_clipboard")}
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> {t("copy_share_btn")}
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQRModal(true)}
                  className="w-full neo-btn neo-btn-accent justify-center text-xs py-2"
                >
                  <Sparkles className="w-3.5 h-3.5 text-pink-400 animate-pulse" /> {t("show_qr_btn")}
                </button>
              </div>
            </div>

            {/* QR Code Dialog Modal */}
            {showQRModal && (
              <div
                className="qr-modal-overlay"
                onClick={() => setShowQRModal(false)}
              >
                <div className="qr-modal-content glass-panel pulsing-glow" onClick={(e) => e.stopPropagation()} style={{ "--glow-color": "rgba(139, 92, 246, 0.3)" } as React.CSSProperties}>
                  <div className="qr-modal-header">
                    <h3 className="qr-modal-title logo-text">{t("scan_urunan")}</h3>
                    <button type="button" className="qr-modal-close-btn" onClick={() => setShowQRModal(false)}>
                      <X className="w-4 h-4" />
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
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        Link: {generateShareUrl().substring(0, 43)}…
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyQRLink}
                        className={`qr-modal-url-copy-btn ${qrCopied ? 'copied' : ''}`}
                        title="Copy Link Share"
                      >
                        {qrCopied ? (
                          <Check className="w-3 h-3" style={{ width: '12px', height: '12px' }} />
                        ) : (
                          <Copy className="w-3 h-3" style={{ width: '12px', height: '12px' }} />
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
        )}

      </div>


    </aside>
  );
}
