"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import { parsePageRange } from "@/lib/page-range";
import { COLOR_PRICE_PER_PAGE_PAISE, PRICE_PER_PAGE_PAISE } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import { APP_VERSION } from "@/lib/version";
import StudentBottomNav from "@/components/student/student-bottom-nav";
import type { PickupShop } from "@/app/page";

const MAX_FILE_SIZE = 25 * 1024 * 1024;
type PrintMode = "bw" | "color";
type CartDocument = { file: File; pageCount: number; pageSelection: string; selectedPages: number; copies: number; printMode: PrintMode };

function FileIcon() {
  return <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M13 2v7h7M8 14h8M8 18h6"/></svg>;
}
function formatRupees(paise: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(paise / 100);
}
function formatBytes(bytes: number) { return `${(bytes / (1024 * 1024)).toFixed(1)} MB`; }

function HeroIllustration() {
  return <div className="student-hero-art" aria-hidden="true"><svg viewBox="0 0 240 190" fill="none" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="121" cy="166" rx="91" ry="12" fill="#E9ECDD"/>
    <circle cx="121" cy="91" r="73" fill="#F2F1E5"/>
    <path d="M56 52c-8-9-20-8-25-4 11 1 14 8 14 15M188 48c8-9 20-8 25-4-11 1-14 8-14 15" stroke="#98A878" strokeWidth="3" strokeLinecap="round"/>
    <path d="M80 42h75a8 8 0 0 1 8 8v81H80V42Z" fill="white" stroke="#D9DFCE" strokeWidth="2"/>
    <path d="M96 65h42M96 77h48M96 89h31" stroke="#D6DDCE" strokeWidth="4" strokeLinecap="round"/>
    <rect x="78" y="95" width="88" height="55" rx="10" fill="#8FA276"/>
    <rect x="87" y="105" width="70" height="26" rx="5" fill="#63784B"/>
    <path d="M101 117h42" stroke="#C8D5B8" strokeWidth="3" strokeLinecap="round"/>
    <path d="M94 137h56v30H94z" fill="white" stroke="#D9DFCE" strokeWidth="2"/>
    <path d="M105 147h34M105 154h25" stroke="#D6DDCE" strokeWidth="3" strokeLinecap="round"/>
    <path d="m166 49 8-13 28 17-8 13-28-17Z" fill="#E99B72"/>
    <path d="m166 49 5-8 28 17-5 8-28-17Z" fill="#F2C778"/>
    <path d="m166 49 8-13 28 17-8 13-28-17Z" stroke="#CB7959" strokeWidth="2" strokeLinejoin="round"/>
    <path d="M175 36l8-13 28 17-9 13" fill="#81A5AD" stroke="#637F86" strokeWidth="2" strokeLinejoin="round"/>
    <path d="m174 36 8-13 8 5-8 13" fill="#EBCB83"/>
    <path d="m182 23 5-8 15 9-5 8" fill="#E99B72"/>
    <path d="M50 105c0 0 8-4 13 0M183 106c0 0 8-4 13 0" stroke="#D89A68" strokeWidth="3" strokeLinecap="round"/>
    <path d="M66 69v-8m-4 4h8m107 73v-8m-4 4h8" stroke="#D8A85F" strokeWidth="2.5" strokeLinecap="round"/>
    <circle cx="54" cy="83" r="3" fill="#E99B72"/><circle cx="194" cy="85" r="3" fill="#81A5AD"/>
  </svg></div>;
}

function ProfileAvatar({ user }: { user: User }) {
  const metadata = user.user_metadata ?? {};
  const photo = typeof metadata.avatar_url === "string" ? metadata.avatar_url : typeof metadata.picture === "string" ? metadata.picture : "";
  const palettes = [
    { background: "#E9EEDC", face: "#E9B890", hair: "#536348", detail: "#647A4D" },
    { background: "#F5E9DD", face: "#C98563", hair: "#4D4037", detail: "#B87655" },
    { background: "#E6EEF0", face: "#F0C8A5", hair: "#735C80", detail: "#7896A0" },
    { background: "#F1EAF3", face: "#D69B79", hair: "#4F433D", detail: "#8A7497" },
  ];
  const palette = palettes[parseInt(user.id.slice(-1), 16) % palettes.length];
  const name = typeof metadata.full_name === "string" ? metadata.full_name : "Your profile";
  return <Link href="/student/account" className="student-profile-avatar" aria-label={`${name} profile`} title={name}>
    {photo ? <img src={photo} alt="" referrerPolicy="no-referrer"/> : <svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="22" fill={palette.background}/><path d="M8 20 9 9l9 6m18 5-1-11-9 6" fill={palette.hair}/><path d="M10 21c0-9 5-14 12-14s12 5 12 14v6c0 7-5 12-12 12s-12-5-12-12v-6Z" fill={palette.face}/><path d="M10 20c1-9 6-13 12-13s11 4 12 13c-3-1-5-3-7-6-3 4-9 6-17 6Z" fill={palette.hair}/><circle cx="17" cy="24" r="1.5" fill="#38352F"/><circle cx="27" cy="24" r="1.5" fill="#38352F"/><path d="M19 30c2 2 4 2 6 0" stroke={palette.detail} strokeWidth="1.8" strokeLinecap="round"/><circle cx="13" cy="28" r="2" fill="#E98E84" opacity=".55"/><circle cx="31" cy="28" r="2" fill="#E98E84" opacity=".55"/></svg>}
  </Link>;
}

export default function StudentOrder({ shops }: { shops: PickupShop[] }) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [rangeMode, setRangeMode] = useState<"all" | "custom">("all");
  const [rangeInput, setRangeInput] = useState("");
  const [copies, setCopies] = useState(1);
  const [printMode, setPrintMode] = useState<PrintMode>("bw");
  const [cart, setCart] = useState<CartDocument[]>([]);
  const [screen, setScreen] = useState<"upload" | "checkout">("upload");
  const [fileError, setFileError] = useState("");
  const [isReadingPdf, setIsReadingPdf] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [paymentNotice, setPaymentNotice] = useState("");
  const [selectedShopId, setSelectedShopId] = useState(shops[0]?.id ?? "");
  const [includeOrderCover, setIncludeOrderCover] = useState(false);
  const [showOrderCoverPrompt, setShowOrderCoverPrompt] = useState(false);
  const [checkoutValidationError, setCheckoutValidationError] = useState("");

  const selectedShop = shops.find((shop) => shop.id === selectedShopId) ?? shops[0] ?? null;

  useEffect(() => {
    let active = true;
    const supabase = createClient();
    const applyUser = (user: User | null) => {
      if (!active) return;
      setProfileUser(user);
      const savedName = user?.user_metadata?.full_name;
      if (typeof savedName === "string") setCustomerName((current) => current || savedName.slice(0, 100));
    };
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => applyUser(session?.user ?? null));
    supabase.auth.getUser().then(({ data }) => applyUser(data.user)).catch(() => undefined);
    return () => { active = false; subscription.unsubscribe(); };
  }, []);

  const parsedRange = useMemo(() => pageCount ? parsePageRange(rangeMode === "all" ? "all" : rangeInput, pageCount) : { selectedCount: 0, error: null }, [pageCount, rangeInput, rangeMode]);
  const draftPrice = selectedShop ? (printMode === "color" ? selectedShop.colorPricePaise : selectedShop.bwPricePaise) : (printMode === "color" ? COLOR_PRICE_PER_PAGE_PAISE : PRICE_PER_PAGE_PAISE);
  const draftTotal = parsedRange.selectedCount * copies * draftPrice;
  const orderReady = Boolean(file && pageCount && parsedRange.selectedCount && !parsedRange.error && !fileError && !isReadingPdf);
  const documentTotal = cart.reduce((sum, item) => sum + item.selectedPages * item.copies * (item.printMode === "color" ? (selectedShop?.colorPricePaise ?? COLOR_PRICE_PER_PAGE_PAISE) : (selectedShop?.bwPricePaise ?? PRICE_PER_PAGE_PAISE)), 0);
  const orderCoverPrice = includeOrderCover ? 100 : 0;
  const cartTotal = documentTotal + orderCoverPrice;
  const hasOrderDraft = Boolean(cart.length || file || screen === "checkout");

  function resetDraft() {
    setFile(null); setPageCount(0); setRangeMode("all"); setRangeInput(""); setCopies(1); setPrintMode("bw"); setFileError("");
    if (fileInput.current) fileInput.current.value = "";
  }
  function saveDraft() {
    if (!orderReady || !file) return false;
    const pageSelection = rangeMode === "all" ? "all" : rangeInput;
    setCart((items) => [...items, { file, pageCount, pageSelection, selectedPages: parsedRange.selectedCount, copies, printMode }]);
    resetDraft();
    setPaymentNotice("");
    return true;
  }
  function goToCheckout() {
    if (file) {
      if (!orderReady) return;
      saveDraft();
    }
    if (cart.length || file) { setScreen("checkout"); setPaymentNotice(""); }
  }
  function askAboutOrderCover() {
    setCheckoutValidationError("");
    // Validate all required fields before showing checkout popup
    if (!selectedShopId || !selectedShop) {
      setCheckoutValidationError("Please select a pickup location to continue.");
      return;
    }
    if (!customerName.trim()) {
      setCheckoutValidationError("Please fill in your name to continue.");
      return;
    }
    if (!file && !cart.length) {
      setCheckoutValidationError("Please upload at least one PDF to continue.");
      return;
    }
    if (file && !orderReady) {
      setCheckoutValidationError("Please complete your document details to continue.");
      return;
    }
    setShowOrderCoverPrompt(true);
  }
  function decideOrderCover(include: boolean) {
    setIncludeOrderCover(include);
    setShowOrderCoverPrompt(false);
    goToCheckout();
  }
  function addMorePdfs() {
    if (orderReady) saveDraft();
    else if (!cart.length) return;
    setScreen("upload");
  }

  async function handleFile(candidate?: File) {
    setFileError(""); setFile(null); setPageCount(0); setRangeInput("");
    if (!candidate) return;
    if (!candidate.name.toLowerCase().endsWith(".pdf") || (candidate.type && candidate.type !== "application/pdf")) { setFileError("Please choose a PDF document."); return; }
    if (candidate.size > MAX_FILE_SIZE) { setFileError("This file is larger than 25 MB. Choose a smaller PDF."); return; }
    if (candidate.size < 8) { setFileError("This file does not look like a valid PDF."); return; }
    setIsReadingPdf(true);
    try {
      const signature = new TextDecoder().decode(new Uint8Array(await candidate.slice(0, 5).arrayBuffer()));
      if (!signature.startsWith("%PDF-")) throw new Error("Invalid PDF header");
      const pdfjs = await import("pdfjs-dist");
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const document = await pdfjs.getDocument({ data: new Uint8Array(await candidate.arrayBuffer()) }).promise;
      setFile(candidate); setPageCount(document.numPages);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setFileError(message.toLowerCase().includes("password") ? "Password-protected PDFs are not supported." : "We could not read this PDF. Please try another file.");
    } finally { setIsReadingPdf(false); }
  }
  function onInputChange(event: ChangeEvent<HTMLInputElement>) { void handleFile(event.target.files?.[0]); }
  function onDrop(event: DragEvent<HTMLDivElement>) { event.preventDefault(); setIsDragging(false); void handleFile(event.dataTransfer.files[0]); }

  return <main className="student-page">
    <header className="student-header"><Link href="/" className="student-brand"><span className="student-brand-mark"><span /></span>printify<span className="student-brand-dot">.</span></Link><div className="student-header-actions">{!profileUser && <Link className="student-account-nav" href="/student/account">My account</Link>}<a className="student-shop-link" href="https://wa.me/919268729970" target="_blank" rel="noopener noreferrer">Need help?</a></div></header>
    {profileUser && <div className="student-profile-float"><ProfileAvatar user={profileUser}/></div>}
    {screen === "upload" && cart.length === 0 && <section className="student-hero"><div className="student-hero-copy"><span className="student-eyebrow"><i /> {selectedShop?.name ?? "PICK A SHOP"} <span>·</span> {selectedShop?.isOpen ? "OPEN TODAY" : "CLOSED"}</span><h1>Your prints,<br/><em>without the wait.</em></h1><p>Upload your documents. We&apos;ll have them ready for pickup before you arrive.</p></div><HeroIllustration/><div className="student-steps"><div className="student-step student-step-active"><span>01</span><b>Upload</b></div><i/><div className="student-step"><span>02</span><b>Checkout</b></div><i/><div className="student-step"><span>03</span><b>Pick up</b></div></div></section>}

    {screen === "upload" ? <><div className="student-content"><section className="student-form-card">
      <div className="student-card-heading"><div><span className="student-eyebrow">{cart.length ? `PDF ${cart.length + 1}` : "YOUR ORDER"}</span><h2>{cart.length ? "Add another document" : "Let’s get printing"}</h2></div><span className="student-step-tag">STEP 1 OF 3</span></div>
      {cart.length > 0 && <div className="student-cart-progress">{cart.length} PDF{cart.length === 1 ? "" : "s"} added · {formatRupees(documentTotal)} so far <button type="button" onClick={askAboutOrderCover}>View checkout →</button></div>}
      <div className="student-field"><label className="student-label">Pickup location <span>Required</span></label>{shops.length ? <div className="student-shop-options">{shops.map((shop) => <button className={`student-shop-option ${shop.id === selectedShop?.id ? "student-shop-option-selected" : ""}`} type="button" key={shop.id} onClick={() => setSelectedShopId(shop.id)}><span className="student-shop-icon">⌂</span><span><b>{shop.name}</b><small>{shop.location} · {shop.isOpen ? "Open for orders" : "Currently closed"}</small></span>{shop.id === selectedShop?.id ? <span className="student-selected">Selected <i>✓</i></span> : <span className="student-shop-pick">Choose</span>}</button>)}</div> : <p className="student-error">No pickup locations are available right now.</p>}</div>
      <div className="student-field"><label className="student-label" htmlFor="student-name">Your name <span>Required</span></label><input id="student-name" className="student-range-input" value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Name for pickup" maxLength={100} autoComplete="name" /></div>
      <div className="student-field"><label className="student-label" htmlFor="student-pdf">Your document <span>PDF · up to 25 MB</span></label><input ref={fileInput} id="student-pdf" className="student-file-input" type="file" accept=".pdf,application/pdf" onChange={onInputChange}/>{file ? <div className="student-file-ready"><span className="student-pdf-icon"><FileIcon/></span><span className="student-file-info"><b>{file.name}</b><small>{pageCount} pages <i>·</i> {formatBytes(file.size)}</small></span><button type="button" className="student-remove-file" aria-label="Remove document" onClick={resetDraft}>×</button></div> : <div className={`student-dropzone ${isDragging ? "student-dropzone-active" : ""}`} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={onDrop} onClick={() => fileInput.current?.click()} role="button" tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); fileInput.current?.click(); } }}><span className="student-upload-icon"><FileIcon/></span><span><b>{isReadingPdf ? "Reading your PDF…" : "Drop your PDF here or browse"}</b><small>PDF only · Max file size 25 MB</small></span><span className="student-browse">Browse files</span></div>}{fileError && <p className="student-error" role="alert">{fileError}</p>}</div>
      <div className="student-field"><label className="student-label">Print type <span>Choose colour or black &amp; white</span></label><div className="student-range-options"><button type="button" onClick={() => setPrintMode("bw")} className={`student-range-option ${printMode === "bw" ? "selected" : ""}`}><span className="student-radio"/><span><b>Black &amp; white</b><small>{formatRupees(selectedShop?.bwPricePaise ?? PRICE_PER_PAGE_PAISE)} per page, per copy</small></span></button><button type="button" onClick={() => setPrintMode("color")} className={`student-range-option ${printMode === "color" ? "selected" : ""}`}><span className="student-radio"/><span><b>Colour</b><small>{formatRupees(selectedShop?.colorPricePaise ?? COLOR_PRICE_PER_PAGE_PAISE)} per page, per copy</small></span></button></div></div>
      <div className="student-field"><div className="student-label-row"><label className="student-label">Pages to print <span>{pageCount ? `${pageCount} pages in document` : "Choose your pages"}</span></label>{pageCount > 0 && <button className="student-all-link" type="button" onClick={() => { setRangeMode("all"); setRangeInput(""); }}>Select all</button>}</div><div className="student-range-options"><button type="button" onClick={() => setRangeMode("all")} className={`student-range-option ${rangeMode === "all" ? "selected" : ""}`}><span className="student-radio"/><span><b>All pages</b><small>{pageCount ? `${pageCount} pages` : "Print the whole document"}</small></span></button><button type="button" onClick={() => setRangeMode("custom")} className={`student-range-option ${rangeMode === "custom" ? "selected" : ""}`}><span className="student-radio"/><span><b>Choose pages</b><small>Pick a range</small></span></button></div>{rangeMode === "custom" && <div className="student-range-input-wrap"><input className="student-range-input" value={rangeInput} onChange={(event) => setRangeInput(event.target.value)} placeholder="e.g. 1-4, 7, 9-12" aria-label="Page range" inputMode="text"/><span>of {pageCount || "—"} pages</span></div>}{parsedRange.error && <p className="student-error" role="alert">{parsedRange.error}</p>}</div>
      <div className="student-field student-last-field"><label className="student-label">Number of copies <span>1–20 copies</span></label><div className="student-copy-controls"><span>Copies</span><div><button type="button" aria-label="Remove a copy" onClick={() => setCopies((value) => Math.max(1, value - 1))} disabled={copies <= 1}>−</button><output aria-live="polite">{copies}</output><button type="button" aria-label="Add a copy" onClick={() => setCopies((value) => Math.min(20, value + 1))} disabled={copies >= 20}>+</button></div></div></div>
    </section>
    <aside className="student-summary"><div className="student-summary-heading"><span className="student-eyebrow">THIS DOCUMENT</span><span className="student-price-tag">A4 · {printMode === "color" ? "COLOUR" : "B&W"}</span></div><h2>Print details</h2><div className="student-summary-file"><span className="student-summary-file-icon"><FileIcon/></span><span>{file ? file.name : "Your PDF will appear here"}<small>{file ? `${pageCount} pages in document` : "Upload a PDF to get started"}</small></span></div><div className="student-summary-lines"><div><span>Selected pages</span><b>{parsedRange.selectedCount || "—"}</b></div><div><span>Copies</span><b>{copies}</b></div><div><span>Print type</span><b>{printMode === "color" ? "Colour" : "Black & white"}</b></div><div><span>Rate per page</span><b>{formatRupees(draftPrice)}</b></div><div className="student-summary-total"><span>Document total</span><b>{formatRupees(draftTotal)}</b></div></div><p className="student-price-note">{printMode === "color" ? "Colour printing" : "Black & white"} · {formatRupees(draftPrice)} per page, per copy.</p>
      <div className="student-cart-actions"><button className="student-cart-secondary" type="button" disabled={!orderReady && !cart.length} onClick={addMorePdfs}>Add more PDFs <span>＋</span></button><button className="student-continue" type="button" onClick={askAboutOrderCover}>Checkout</button></div>
      {checkoutValidationError && <p className="student-error student-checkout-validation" role="alert">{checkoutValidationError}</p>}
      <div className="student-trust"><span>⌑</span><span>Your document stays private and is shared only with the shop printing your order.</span></div>
    </aside></div>{hasOrderDraft && <div className="student-mobile-cart-bar"><div><span>Order total</span><b>{formatRupees(documentTotal + (file ? draftTotal : 0))}</b><small>{cart.length + (file ? 1 : 0)} PDF{cart.length + (file ? 1 : 0) === 1 ? "" : "s"} in order</small></div><div className="student-mobile-cart-actions"><button type="button" disabled={!orderReady && !cart.length} onClick={addMorePdfs}>Add more PDFs</button><button type="button" onClick={askAboutOrderCover}>Checkout</button></div></div>}</> : <section className="student-checkout-page"><div className="student-checkout-heading"><button type="button" className="student-back-link" aria-label="Back to PDFs" onClick={() => setScreen("upload")}><span aria-hidden="true">‹</span> Back</button><div><span className="student-eyebrow">STEP 2 OF 3 · REVIEW</span><h2>Your checkout</h2><p>{cart.length} PDF{cart.length === 1 ? "" : "s"} in your order · Pickup at {selectedShop?.name ?? "your selected shop"}</p></div></div>
      {cart.length ? <div className="student-cart-list">{cart.map((item, index) => {
        const rate = item.printMode === "color" ? (selectedShop?.colorPricePaise ?? COLOR_PRICE_PER_PAGE_PAISE) : (selectedShop?.bwPricePaise ?? PRICE_PER_PAGE_PAISE);
        return <article className="student-cart-item" key={`${item.file.name}-${index}`}><div className="student-cart-item-heading"><span className="student-cart-file-icon"><FileIcon/></span><div><b title={item.file.name}>{item.file.name}</b><small>{item.pageCount} pages in document · {formatBytes(item.file.size)}</small></div><button type="button" className="student-remove-file" aria-label={`Remove ${item.file.name} from order`} onClick={() => setCart((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></div><div className="student-cart-item-details"><span>Print pages: {item.pageSelection === "all" ? `All ${item.pageCount}` : item.pageSelection}</span><span>{item.copies} {item.copies === 1 ? "copy" : "copies"}</span><span>{item.printMode === "color" ? "Colour" : "Black & white"}</span><b>{formatRupees(item.selectedPages * item.copies * rate)}</b></div><small className="student-cart-rate">{item.selectedPages} selected pages · {formatRupees(rate)} per page, per copy</small></article>;
      })}{includeOrderCover ? <article className="student-order-cover"><div><b>Pickup cover sheet</b><small>One page for this whole order with your code, name, document list and tiny first-page previews.</small></div><span><s>₹2</s> ₹1</span></article> : null}</div> : <div className="student-cart-empty"><b>Your cart is empty</b><p>Add a PDF and choose how you want it printed.</p><button type="button" className="student-cart-secondary" onClick={() => setScreen("upload")}>Add a PDF <span>＋</span></button></div>}
      <div className="student-checkout-bottom"><div className="student-checkout-total"><span>Total due</span><b>{formatRupees(cartTotal)}</b></div><p>Prices include the selected page count, print type and copies for each PDF.</p><button className="student-continue student-pay-button" type="button" disabled={!cart.length || !customerName.trim() || !selectedShop?.isOpen} onClick={() => setPaymentNotice("Online payment isn’t connected yet. No order was submitted and your PDFs were not sent to the shop.")}>Pay {formatRupees(cartTotal)} <span>→</span></button>{paymentNotice && <p className="student-payment-note" role="status">{paymentNotice}</p>}</div>
    </section>}
    {showOrderCoverPrompt ? <div className="student-cover-backdrop" role="dialog" aria-modal="true" aria-labelledby="cover-title"><section className="student-cover-dialog"><span className="student-eyebrow">MAKE PICKUP EASIER</span><h2 id="cover-title">Add one pickup cover sheet?</h2><p>We’ll place one extra page on top of this order with your collection code, name, every document’s page count and tiny first-page previews. It makes larger batches much easier to sort and find.</p><div className="student-cover-price"><span>Usually <s>₹2</s></span><b>₹1 for your whole order</b></div><div className="student-cover-actions"><button type="button" className="student-cover-no" onClick={() => decideOrderCover(false)}>No, it’s okay</button><button type="button" className="student-continue" onClick={() => decideOrderCover(true)}>Yes, add my cover sheet</button></div></section></div> : null}
    <footer className="student-footer"><span>© 2026 Printify · v{APP_VERSION}</span><span>Made for a smoother campus day <i>✳</i></span><span className="student-footer-support"><button type="button" className="student-support-btn" onClick={() => alert("Thank you for your support! ❤️\n\nA donation feature is coming soon. We'll let you know when it's ready.")}>Support Printify ❤️</button></span><span>Need help? <a href="https://wa.me/919268729970" target="_blank" rel="noopener noreferrer">Get in touch</a></span></footer>
    {!hasOrderDraft && <StudentBottomNav active="home"/>}
  </main>;
}
