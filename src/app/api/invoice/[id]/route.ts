export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getFirestore } from 'firebase-admin/firestore';
import PDFDocument from "pdfkit";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id) return new NextResponse("Invoice ID required", { status: 400 });
  try {
    const db = getFirestore();
    const docRef = db.collection("invoices").doc(id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) return new NextResponse("Invoice not found", { status: 404 });
    const invoice = docSnap.data();
    if (!invoice) return new NextResponse("Invoice not found", { status: 404 });
    // Generate PDF
    const pdfDoc = new PDFDocument();
    pdfDoc.font('Times-Roman'); // Set font immediately to avoid Helvetica.afm error
    const bufs: Buffer[] = [];
    pdfDoc.on("data", (d: Buffer) => bufs.push(d));
    pdfDoc.on("end", () => {});
    // Header
    pdfDoc.fontSize(20).text("INVOICE", { align: "center" });
    pdfDoc.moveDown();
    pdfDoc.fontSize(12).text("Findzob Technologies Pvt Ltd", { align: "left" });
    pdfDoc.text("Hyderabad, India", { align: "left" });
    pdfDoc.text("support@findzob.com", { align: "left" });
    pdfDoc.moveDown();
    pdfDoc.text(`Invoice ID: ${id}`);
    pdfDoc.text(`Date: ${invoice.createdAt?.toDate ? invoice.createdAt.toDate().toLocaleDateString() : new Date(invoice.createdAt).toLocaleDateString()}`);
    pdfDoc.text(`User ID: ${invoice.userId}`);
    pdfDoc.moveDown();
    pdfDoc.text(`Plan: ${invoice.planName}`);
    pdfDoc.text(`Amount: ${invoice.amount} ${invoice.currency?.toUpperCase()}`);
    pdfDoc.text(`Status: ${invoice.status}`);
    pdfDoc.text(`Payment Method: ${invoice.paymentMethod}`);
    pdfDoc.moveDown();
    pdfDoc.text("Thank you for your purchase!", { align: "center" });
    pdfDoc.end();
    const pdfBuffer = await new Promise<Buffer>((resolve) => {
      pdfDoc.on("end", () => resolve(Buffer.concat(bufs)));
    });
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename=invoice-${id}.pdf`,
      },
    });
  } catch (err) {
    console.error('[API][invoice][id] PDF generation error:', err);
    return new NextResponse(`Failed to generate invoice: ${err instanceof Error ? err.message : JSON.stringify(err)}`, { status: 500 });
  }
}
