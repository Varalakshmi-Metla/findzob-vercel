"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirestore, useDoc } from "@/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function EditReportPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const params = useParams();
  const { id } = params;

  const orderRef = firestore && id ? doc(firestore, "orders", id as string) : null;
  const { data: order, isLoading } = useDoc<any>(orderRef);

  const [planName, setPlanName] = useState("");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (order) {
      setPlanName(order.planName || "");
      setAmount(String(Number(order.amount || 0) / 100));
      setStatus(order.status || "");
    }
  }, [order]);

  const handleSave = async () => {
    if (!orderRef) return;

    try {
      await updateDoc(orderRef, {
        planName,
        amount: Number(amount) * 100,
        status,
      });
      alert("Order updated successfully!");
      router.push("/admin/reports");
    } catch (error) {
      console.error("Error updating document: ", error);
      alert("Error updating order.");
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!order) {
    return <div>Order not found.</div>;
  }

  return (
    <div className="p-8 bg-gray-900 min-h-screen text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Edit Order {id}</h1>
      <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-sm p-6">
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Plan Name</label>
          <Input
            type="text"
            value={planName}
            onChange={(e) => setPlanName(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Amount ($)</label>
          <Input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full"
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Status</label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4">
          <Button onClick={handleSave}>Save</Button>
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
