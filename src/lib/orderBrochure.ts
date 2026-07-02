import QRCode from "qrcode";
import { escapeHtml } from "./htmlEscape";

export interface BrochureOrderData {
  orderId: string;
  orderNumber?: string | null;
  doctorName?: string | null;
  patientName?: string | null;
  labName?: string | null;
  labPhone?: string | null;
  status?: string | null;
  dueDate?: string | null;
  origin?: string;
}

const fallbackOrigin = () =>
  typeof window !== "undefined" ? window.location.origin : "https://lablink-smartlab.lovable.app";

export const buildOrderTrackingUrl = (orderId: string, origin = fallbackOrigin()) =>
  `${origin}/order-tracking?orderId=${encodeURIComponent(orderId)}`;

export const buildLabPaymentWhatsAppUrl = (
  labPhone: string,
  order: { orderNumber?: string | null; amount?: number | null; senderPhone?: string | null }
) => {
  const phone = labPhone.replace(/[^0-9]/g, "");
  const lines = [
    "LabLink - Order Payment Confirmation",
    order.orderNumber ? `Order #: ${order.orderNumber}` : null,
    order.amount ? `Amount: ${order.amount} EGP` : null,
    `Sender Number: ${order.senderPhone || "<your number here>"}`,
    "Method: InstaPay / Vodafone Cash",
  ].filter(Boolean).join("\n");
  return `https://wa.me/${phone}?text=${encodeURIComponent(lines)}`;
};

/**
 * Generate a printable HTML brochure for an order with embedded QR codes.
 * The brochure includes:
 *  - Order summary
 *  - QR to live tracking page
 *  - QR to "How to create an order" tutorial
 * Triggers print dialog so the user can save as PDF.
 */
export const printOrderBrochure = async (data: BrochureOrderData) => {
  const origin = data.origin || fallbackOrigin();
  const trackingUrl = buildOrderTrackingUrl(data.orderId, origin);
  const tutorialUrl = `${origin}/how-it-works`;

  const [trackingQr, tutorialQr] = await Promise.all([
    QRCode.toDataURL(trackingUrl, { width: 280, margin: 1 }),
    QRCode.toDataURL(tutorialUrl, { width: 220, margin: 1 }),
  ]);

  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>LabLink Order ${data.orderNumber ?? data.orderId.slice(0, 8)}</title>
  <style>
    *{box-sizing:border-box} body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;margin:0;padding:32px;color:#0F172A;background:#fff}
    .wrap{max-width:720px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden}
    .head{background:linear-gradient(135deg,#0EA5E9,#6366F1);color:#fff;padding:24px}
    .head h1{margin:0;font-size:24px;letter-spacing:-.02em}
    .head p{margin:4px 0 0;opacity:.9;font-size:13px}
    .body{padding:24px;display:grid;grid-template-columns:1fr 1fr;gap:24px}
    .field{font-size:13px;color:#475569;margin-bottom:4px}
    .val{font-size:15px;font-weight:600;color:#0F172A}
    .qr{text-align:center;padding:16px;border:1px dashed #cbd5e1;border-radius:12px}
    .qr img{display:block;margin:0 auto 8px}
    .qr small{display:block;color:#64748b;font-size:11px;word-break:break-all}
    .foot{padding:16px 24px;background:#f8fafc;font-size:12px;color:#64748b;text-align:center;border-top:1px solid #e2e8f0}
    @media print { body{padding:0} .wrap{border:none;border-radius:0} }
  </style></head><body>
  <div class="wrap">
    <div class="head">
      <h1>LabLink Order Brochure</h1>
      <p>Track your case end-to-end. Scan, follow, deliver.</p>
    </div>
    <div class="body">
      <div>
        <div class="field">Order #</div><div class="val">${data.orderNumber ?? data.orderId.slice(0, 8).toUpperCase()}</div>
        <div class="field" style="margin-top:12px">Patient</div><div class="val">${data.patientName ?? "-"}</div>
        <div class="field" style="margin-top:12px">Doctor</div><div class="val">${data.doctorName ?? "-"}</div>
        <div class="field" style="margin-top:12px">Lab</div><div class="val">${data.labName ?? "Pending assignment"}</div>
        <div class="field" style="margin-top:12px">Status</div><div class="val">${data.status ?? "Pending"}</div>
        ${data.dueDate ? `<div class="field" style="margin-top:12px">Due</div><div class="val">${data.dueDate}</div>` : ""}
      </div>
      <div style="display:flex;flex-direction:column;gap:16px">
        <div class="qr"><img src="${trackingQr}" alt="Track order QR" width="160" height="160"/><strong>Track this order</strong><small>${trackingUrl}</small></div>
        <div class="qr"><img src="${tutorialQr}" alt="How to use LabLink QR" width="120" height="120"/><strong>How to use LabLink</strong><small>${tutorialUrl}</small></div>
      </div>
    </div>
    <div class="foot">LabLink - Egypt's dental marketplace · lablink-smartlab.lovable.app</div>
  </div>
  <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),300))</script>
  </body></html>`;

  const w = window.open("", "_blank");
  if (!w) return;
  w.document.write(html);
  w.document.close();
};

export const downloadGenericBrochure = async () => {
  const origin = fallbackOrigin();
  await printOrderBrochure({
    orderId: "demo",
    orderNumber: "LABLINK-GUIDE",
    doctorName: "Your Clinic",
    patientName: "Sample Patient",
    labName: "Choose any verified lab",
    status: "Tutorial",
    origin,
  });
};
