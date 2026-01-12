"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";

import { useCollection, useFirestore, useMemoFirebase } from "@/firebase";
import { collection, doc, deleteDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";

// Helper to get a readable date from Firestore Timestamp, string, or Date
const getReadableDate = (dateValue: any) => {
  if (!dateValue) return "-";
  if (typeof dateValue === "string") {
    const d = new Date(dateValue);
    return isNaN(d.getTime()) ? dateValue : d.toLocaleDateString();
  }
  if (dateValue instanceof Date) {
    return dateValue.toLocaleDateString();
  }
  if (dateValue.seconds) {
    // Firestore Timestamp
    return new Date(dateValue.seconds * 1000).toLocaleDateString();
  }
  return "-";
};

export default function AdminReportsPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const invoicesCollectionRef = useMemoFirebase(() => (firestore ? collection(firestore, "invoices") : null), [firestore]);
  const { data: orders, isLoading } = useCollection<any>(invoicesCollectionRef);

  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | "usd" | "inr" | "wallet">("all");

  const filteredOrders = (orders || []).filter((order: any) => {
    const name = (order.userName || "").toLowerCase();
    const email = (order.userEmail || "").toLowerCase();
    const q = search.toLowerCase();
    const matchesSearch = name.includes(q) || email.includes(q);

    if (!matchesSearch) return false;

    const currency = String(order.currency || "").toUpperCase();
    const isWallet = order.type === "wallet-topup";

    if (filterType === "wallet") return isWallet;
    if (filterType === "usd") return currency !== "INR" && !isWallet;
    if (filterType === "inr") return currency === "INR" && !isWallet;

    return true;
  });



  const exportRows = filteredOrders.map((order: any) => ({
    id: order.id,
    userName: order.userName || "-",
    userEmail: order.userEmail || "-",
    plan: order.type === "wallet-topup" ? "Wallet Top Up" : order.planName || "-",
    amount: Number(order.amount || 0),
    currency: (order.currency || "").toUpperCase(),
    status: order.status || "-",
    paymentDate: getReadableDate(order.paymentDate || order.createdAt),
    type: order.type || "-",
  }));
  const handleExportExcel = async () => {
    const XLSX = await import("xlsx");
    const headers = [
      "Invoice ID",
      "User Name",
      "User Email",
      "Plan",
      "Amount",
      "Currency",
      "Status",
      "Payment Date",
      "Type",
    ];
    let worksheetData;
    if (exportRows.length) {
      worksheetData = exportRows.map((r) => ({
        "Invoice ID": r.id,
        "User Name": r.userName,
        "User Email": r.userEmail,
        Plan: r.plan,
        Amount: r.amount,
        Currency: r.currency,
        Status: r.status,
        "Payment Date": r.paymentDate,
        Type: r.type,
      }));
    } else {
      // Just a blank row for headers
      worksheetData = [Object.fromEntries(headers.map(h => [h, ""]))];
    }
    const ws = XLSX.utils.json_to_sheet(worksheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Invoices");
    XLSX.writeFile(wb, "invoices.xlsx");
  };

  const handleExportPdf = async () => {
    const jsPDFModule = await import("jspdf");
    const jsPDF = jsPDFModule.default;
    const autoTableModule = await import("jspdf-autotable");
    const docPdf = new jsPDF({ orientation: "landscape" });
    const tableColumn = [
      "Invoice ID",
      "User Name",
      "User Email",
      "Plan",
      "Amount",
      "Currency",
      "Status",
      "Payment Date",
      "Type",
    ];
    const tableRows = exportRows.length
      ? exportRows.map((r) => [
          r.id,
          r.userName,
          r.userEmail,
          r.plan,
          r.amount,
          r.currency,
          r.status,
          r.paymentDate,
          r.type,
        ])
      : [["", "", "", "", "", "", "", "", ""]];
    // Use the ESM-compatible API: autoTableModule.default(docPdf, options)
    autoTableModule.default(docPdf, { head: [tableColumn], body: tableRows, startY: 20, styles: { fontSize: 8 } });
    docPdf.save("invoices.pdf");
  };



  // Calculate totals
  const totalCount = filteredOrders.length;

  const walletInvoices = filteredOrders.filter((order: any) => order.type === 'wallet-topup');
  const walletCount = walletInvoices.length;

  let totalUsd = 0;
  let totalInr = 0;
  let walletInr = 0;
  filteredOrders.forEach((order: any) => {
    // Try to detect currency, fallback to USD if not present
    const amount = Number(order.amount || 0);
    const currency = (order.currency || '').toUpperCase();
    if (currency === 'INR') {
      totalInr += amount;
      if (order.type === 'wallet-topup') {
        walletInr += amount;
      }
    } else {
      totalUsd += amount;
    }
  });



  const handleDownloadInvoice = (order: any) => {
    const headers = ["Invoice ID", "User Name", "User Email", "Plan", "Amount", "Status", "Payment Date"];
    const row = [
      order.id,
      order.userName || "-",
      order.userEmail || "-",
      order.planName || "-",
      `$${Number(order.amount || 0) / 1}`,
      order.status,
      getReadableDate(order.paymentDate || order.createdAt),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + row.join(",");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `invoice-${order.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditInvoice = (order: any) => {
    router.push(`/admin/reports/${order.id}`);
  };

  const handleDeleteInvoice = async (order: any) => {
    if (window.confirm(`Are you sure you want to delete invoice for order ${order.id}?`)) {
      if (!firestore) return;
      try {
        await deleteDoc(doc(firestore, "invoices", order.id));
        alert(`Invoice for order ${order.id} deleted successfully.`);
      } catch (error) {
        console.error("Error deleting document: ", error);
        alert(`Error deleting invoice for order ${order.id}.`);
      }
    }
  };

  return (
  <div className="p-8 bg-gray-900 min-h-screen text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Reports & Analytics</h1>
      <div className="mb-4 flex gap-4">
        <Button type="button" onClick={handleExportPdf}>Export PDF</Button>
        <Button type="button" onClick={handleExportExcel}>Export Excel</Button>
      </div>
      <section className="mb-6">
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">Payment Invoices</h2>
          {/* Totals summary */}
          <div className="mb-4 flex flex-wrap gap-6">
            <div className="bg-gray-900 rounded p-3 border border-gray-700">
              <span className="font-semibold">Total Invoices:</span> {totalCount}
            </div>
            <div className="bg-gray-900 rounded p-3 border border-gray-700">
              <span className="font-semibold">Wallet Top-up Invoices:</span> {walletCount}
            </div>
            <div className="bg-gray-900 rounded p-3 border border-gray-700">
              <span className="font-semibold">Total USD Amount:</span> ${totalUsd.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="bg-gray-900 rounded p-3 border border-gray-700">
              <span className="font-semibold">Total INR Amount:</span> ₹{totalInr.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              {walletInr > 0 && (
                <span className="block text-xs text-gray-400 mt-1">
                  (Wallet Top-ups: ₹{walletInr.toLocaleString(undefined, { maximumFractionDigits: 2 })})
                </span>
              )}
            </div>
          </div>
          <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center">
            <input
              type="text"
              className="p-2 border rounded w-full md:w-auto flex-1"
              placeholder="Search user name or email..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="flex gap-2 text-sm">
              <span className="self-center text-gray-300">Filter:</span>
              <Button
                type="button"
                variant={filterType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("all")}
              >
                All
              </Button>
              <Button
                type="button"
                variant={filterType === "usd" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("usd")}
              >
                USD
              </Button>
              <Button
                type="button"
                variant={filterType === "inr" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("inr")}
              >
                INR
              </Button>
              <Button
                type="button"
                variant={filterType === "wallet" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilterType("wallet")}
              >
                Wallet
              </Button>
            </div>
          </div>
          {isLoading ? (
            <div>Loading invoices...</div>
          ) : (
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-700">
                  <th className="text-left p-2 text-gray-200">Invoice ID</th>
                  <th className="text-left p-2 text-gray-200">User Name</th>
                  <th className="text-left p-2 text-gray-200">User Email</th>
                  <th className="text-left p-2 text-gray-200">Plan</th>
                  <th className="text-left p-2 text-gray-200">Amount</th>
                  <th className="text-left p-2 text-gray-200">Status</th>
                  <th className="text-left p-2 text-gray-200">Payment Date</th>
                  <th className="text-left p-2 text-gray-200">Download</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order: any) => (
                  <tr key={order.id} className="border-b border-gray-700 hover:bg-gray-800">
                    <td className="p-2">{order.id}</td>
                    <td className="p-2">{order.userName || "-"}</td>
                    <td className="p-2">{order.userEmail || "-"}</td>
                    <td className="p-2">{order.type === 'wallet-topup' ? 'Wallet Top Up' : (order.planName || "-")}</td>
                    <td className="p-2">${Number(order.amount || 0) / 1}</td>
                    <td className="p-2">{order.status}</td>
                    <td className="p-2">{getReadableDate(order.paymentDate || order.createdAt)}</td>
                    <td className="p-2 flex gap-2">
                      <Button size="sm" className="bg-green-700 text-gray-200 hover:bg-green-600" onClick={() => router.push(`/invoice/${order.id}`)}>
                        View Invoice
                      </Button>
                      <Button size="sm" className="bg-red-700 text-gray-200 hover:bg-red-600" onClick={() => handleDeleteInvoice(order)}>
                        Delete Invoice
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
      <section>
        <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">Analytics Graphs</h2>
          {/* Add analytics graphs here */}
        </div>
      </section>
    </div>
  );
}
