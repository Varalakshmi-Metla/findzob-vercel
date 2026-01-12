"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, updateDocumentNonBlocking, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";

interface FirestoreUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedEmployeeId?: string;
  lastLogin?: string;
}

export default function UsersQueuePage() {
  const firestore = useFirestore();
  const { user: authUser } = useUser();

  const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "users") : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<FirestoreUser>(usersCollectionRef as any);

  const unassignedUsers = (users || []).filter((u: any) => u.role !== "employee" && !u.assignedEmployeeId);

  const currentUserData = authUser ? 
    (users || []).find((u: FirestoreUser) => u.id === authUser.uid) : null;

  const [assigning, setAssigning] = useState<string | null>(null);

  const handleAssign = async (userId: string) => {
    if (!authUser) return;
    setAssigning(userId);
    try {
      const ref = doc(firestore, "users", userId);
      await updateDocumentNonBlocking(ref, { assignedEmployeeId: authUser.uid });
    } catch (error) {
      console.error("Error assigning user:", error);
    } finally {
      setAssigning(null);
    }
  };

  if (usersLoading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <Loader2 className="animate-spin h-8 w-8" />
      </div>
    );
  }

  if (!currentUserData || currentUserData.role !== 'employee') {
    return (
        <div className="p-8">
            <Card>
                <CardHeader>
                    <CardTitle>Access Denied</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>This page is for employees only.</p>
                </CardContent>
            </Card>
        </div>
    )
  }

  return (
    <div className="p-8 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            Users Queue
            {unassignedUsers.length > 0 && ` (${unassignedUsers.length} unassigned)`}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {unassignedUsers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unassignedUsers.map((u: FirestoreUser) => {
                  return (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name || "Unknown"}</TableCell>
                      <TableCell>{u.email || "No email"}</TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          disabled={assigning === u.id}
                          onClick={() => handleAssign(u.id)}
                        >
                          {assigning === u.id ? "Assigning..." : "Assign to Me"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center text-gray-500 py-8">
              {usersLoading ? (
                <Loader2 className="animate-spin mx-auto h-6 w-6" />
              ) : (
                "No unassigned users available."
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}