"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

export default function AssignUsersPage() {
  const firestore = useFirestore();
  // Fetch users and employees
  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "users") : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<any>(usersCollectionRef as any);
  // Helper to check if lastLogin is today
  function isActive(lastLogin?: string) {
    if (!lastLogin) return false;
    const loginDate = new Date(lastLogin);
    const today = new Date();
    return loginDate.getFullYear() === today.getFullYear() && loginDate.getMonth() === today.getMonth() && loginDate.getDate() === today.getDate();
  }
  const employeeList = (users || []).filter((u: any) => u.role === "employee");
  const activeEmployeeList = employeeList.filter((e: any) => isActive(e.lastLogin));
  const [search, setSearch] = useState("");
  const userList = (users || [])
    .filter((u: any) => u.role !== "employee" && !u.assignedEmployeeId)
    .filter((u: any) => {
      const q = search.toLowerCase();
      return (
        (u.name || "").toLowerCase().includes(q) ||
        (u.email || "").toLowerCase().includes(q)
      );
    });

  const [assigning, setAssigning] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");

  // Manual assignment
  const handleAssign = async (userId: string, employeeId: string) => {
    setAssigning(userId);
    try {
      const ref = doc(firestore, "users", userId);
      await updateDocumentNonBlocking(ref, { assignedEmployeeId: employeeId });
    } finally {
      setAssigning(null);
    }
  };

  // Automatic assignment (round-robin, active employees only)
  const handleAutoAssign = async () => {
    if (!activeEmployeeList.length || !userList.length) return;
    setAssigning("auto");
    let idx = 0;
    for (const user of userList) {
      const employeeId = activeEmployeeList[idx % activeEmployeeList.length].id;
      const ref = doc(firestore, "users", user.id);
      await updateDocumentNonBlocking(ref, { assignedEmployeeId: employeeId });
      idx++;
    }
    setAssigning(null);
  };

  // Assign users equally to all employees (equity)
  const handleEquityAssign = async () => {
    if (!employeeList.length || !userList.length) return;
    setAssigning("equity");
    let idx = 0;
    for (const user of userList) {
      const employeeId = employeeList[idx % employeeList.length].id;
      const ref = doc(firestore, "users", user.id);
      await updateDocumentNonBlocking(ref, { assignedEmployeeId: employeeId });
      idx++;
    }
    setAssigning(null);
  };

  return (
    <div className="p-8">
      <Card>
        <CardHeader>
          <CardTitle>Assign Users to Employees</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4 flex-wrap">
            <Button onClick={handleEquityAssign} disabled={assigning === "equity" || usersLoading || !employeeList.length || !userList.length} variant="secondary">
              {assigning === "equity" ? "Assigning..." : "Assign Equally to All Employees"}
            </Button>
          </div>
          <input
            type="text"
            className="mb-4 p-2 border rounded w-full"
            placeholder="Search user name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assigned Employee</TableHead>
                <TableHead>Manual Assign</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {userList.map((u: any) => {
                const assignedEmp = employeeList.find((e: any) => e.id === u.assignedEmployeeId);
                return (
                  <TableRow key={u.id}>
                    <TableCell>{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell>{assignedEmp ? assignedEmp.name : "-"}</TableCell>
                    <TableCell>
                      <Select
                        value={selectedEmployee}
                        onValueChange={v => setSelectedEmployee(v)}
                        disabled={assigning === u.id}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder="Select employee" />
                        </SelectTrigger>
                        <SelectContent>
                          {employeeList.map((e: any) => (
                            <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        size="sm"
                        className="ml-2"
                        disabled={!selectedEmployee || assigning === u.id}
                        onClick={() => handleAssign(u.id, selectedEmployee)}
                      >
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {usersLoading && <Loader2 className="animate-spin mx-auto mt-4" />}
        </CardContent>
      </Card>
    </div>
  );
}
