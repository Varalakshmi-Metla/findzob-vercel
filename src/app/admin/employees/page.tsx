"use client";
import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useCollection, useFirestore, useMemoFirebase, useUser, updateDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase";
import { useToast } from "@/hooks/use-toast";
import { collection, doc, addDoc, query, collectionGroup } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import { formatName, getInitials } from "@/lib/utils";

export default function AdminEmployeesPage() {
	const firestore = useFirestore();
	const { user } = useUser();
	const { toast } = useToast();

	// Fetch plans for dropdown

		// Fetch employees and users
		const usersCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "users") : null, [firestore]);
		const { data: users, isLoading } = useCollection<any>(usersCollectionRef as any);
		const employeeList = (users || []).filter((u: any) => u.role === "employee");
		const userList = (users || []).filter((u: any) => u.role === "user");

	// Removed active/inactive logic


		// Fetch resumes
		const resumesCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "resumes") : null, [firestore]);
		const { data: resumes } = useCollection<any>(resumesCollectionRef as any);

    const jobsCollectionRef = useMemoFirebase(() => firestore ? query(collectionGroup(firestore, 'jobs')) : null, [firestore]);
    const { data: allJobs } = useCollection<any>(jobsCollectionRef);

		// Fetch hot jobs
		const hotJobsCollectionRef = useMemoFirebase(() => firestore ? collection(firestore, "hot-jobs") : null, [firestore]);
		const { data: hotJobs } = useCollection<any>(hotJobsCollectionRef as any);

	// Edit modal state
	const [editingEmployee, setEditingEmployee] = React.useState<any>(null);
	const [editSubmitting, setEditSubmitting] = React.useState(false);
  const [showAddDialog, setShowAddDialog] = React.useState(false);
  const [newEmployee, setNewEmployee] = React.useState({ name: "", email: "", password: "" });

	const openEdit = (u: any) => {
			setEditingEmployee({
				uid: u.id,
				name: u.name || "",
				email: u.email || "",
				phone: u.phone || "",
				address: u.address || "",
				gender: u.gender || "",
				dateOfBirth: u.dateOfBirth || "",
				role: u.role || "employee"
			});
	};

	const submitEdit = async () => {
		if (!editingEmployee) return;
		if (!user) {
			toast({ variant: "destructive", title: "Not signed in" });
			return;
		}
		setEditSubmitting(true);
		try {
			const idToken = await (user as any).getIdToken();
			const payload = {
				uid: editingEmployee.uid,
				name: editingEmployee.name,
				email: editingEmployee.email,
				phone: editingEmployee.phone,
				address: editingEmployee.address,
				gender: editingEmployee.gender,
				dateOfBirth: editingEmployee.dateOfBirth,
				role: editingEmployee.role,
			};
			const res = await fetch("/api/admin/update-user", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${idToken}`,
				},
				body: JSON.stringify(payload),
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) throw new Error(json?.error || json?.message || "Failed to update employee");
			toast({ title: "Employee updated", description: editingEmployee.email });
			setEditingEmployee(null);
		} catch (err: any) {
			toast({ variant: "destructive", title: "Error", description: err?.message || "Failed to update employee" });
		} finally {
			setEditSubmitting(false);
		}
	};

	const handleAddEmployee = async () => {
		if (!newEmployee.name || !newEmployee.email || !newEmployee.password) {
			toast({
				variant: "destructive",
				title: "Missing fields",
				description: "Name, email, and password are required.",
			});
			return;
		}
		try {
			const res = await fetch("/api/admin/add-employee", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(newEmployee),
			});

			const data = await res.json();

			if (!res.ok) {
				throw new Error(data?.error || "Failed to add employee");
			}

			toast({ title: "Employee Added", description: newEmployee.email });
			setShowAddDialog(false);
			setNewEmployee({ name: "", email: "", password: "" });
		} catch (error: any) {
			toast({
				variant: "destructive",
				title: "Error",
				description: error?.message || "Failed to add employee",
			});
		}
	};


	return (
		<div className="p-8">
			<Card className="mb-6">
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Employee Management</CardTitle>
						<CardDescription>Manage all employees, edit details, and perform actions.</CardDescription>
					</div>
					<Button onClick={() => setShowAddDialog(true)}>Add Employee</Button>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Email</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Assigned Users</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
											{employeeList.map((emp: any) => {
												// Users assigned to employee (mock: users with assignedEmployeeId === emp.id)
												const assignedUsers = userList.filter((u: any) => u.assignedEmployeeId === emp.id);
												return (
													<TableRow key={emp.id}>
														<TableCell>
															<div className="flex items-center gap-2">
																<Avatar>
																	<AvatarImage src={emp.photoURL || ""} />
																	<AvatarFallback>{getInitials(emp.name)}</AvatarFallback>
																</Avatar>
																<span>{formatName(emp.name)}</span>
															</div>
														</TableCell>
														<TableCell>{emp.email}</TableCell>
																			<TableCell><Badge variant="secondary">{emp.role}</Badge></TableCell>
														<TableCell>{assignedUsers.length}</TableCell>
														<TableCell>
															<Button size="sm" variant="outline" onClick={() => openEdit(emp)}>
																Edit
															</Button>
															<Button size="sm" variant="destructive" onClick={() => deleteDocumentNonBlocking(doc(firestore, "users", emp.id))}>
																Delete
															</Button>
														</TableCell>
													</TableRow>
												);
											})}
						</TableBody>
					</Table>
					{isLoading && <Loader2 className="animate-spin mx-auto mt-4" />}
					{!isLoading && employeeList.length === 0 && <div className="text-center text-gray-500 mt-4">No employees found.</div>}
				</CardContent>
			</Card>
			{/* Edit Employee Modal */}
			<Dialog open={!!editingEmployee} onOpenChange={v => { if (!v) setEditingEmployee(null); }}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Edit Employee</DialogTitle>
					</DialogHeader>
					<form
						onSubmit={e => { e.preventDefault(); submitEdit(); }}
						className="space-y-4"
					>
						<div className="grid grid-cols-2 gap-4">
							<div>
								<Label>Name</Label>
								<Input
									value={editingEmployee?.name || ""}
									onChange={e => setEditingEmployee({ ...editingEmployee, name: e.target.value })}
									required
								/>
							</div>
							<div>
								<Label>Email</Label>
								<Input
									value={editingEmployee?.email || ""}
									onChange={e => setEditingEmployee({ ...editingEmployee, email: e.target.value })}
									required
									type="email"
								/>
							</div>
							<div>
								<Label>Phone</Label>
								<Input
									value={editingEmployee?.phone || ""}
									onChange={e => setEditingEmployee({ ...editingEmployee, phone: e.target.value })}
								/>
							</div>
							<div>
								<Label>Address</Label>
								<Input
									value={editingEmployee?.address || ""}
									onChange={e => setEditingEmployee({ ...editingEmployee, address: e.target.value })}
								/>
							</div>
							<div>
								<Label>Role</Label>
								<Select
									value={editingEmployee?.role || "employee"}
									onValueChange={v => setEditingEmployee({ ...editingEmployee, role: v })}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="employee">Employee</SelectItem>
										<SelectItem value="admin">Admin</SelectItem>
										<SelectItem value="user">User</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Gender</Label>
								<Select
									value={editingEmployee?.gender || ""}
									onValueChange={v => setEditingEmployee({ ...editingEmployee, gender: v })}
								>
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select gender" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="male">Male</SelectItem>
										<SelectItem value="female">Female</SelectItem>
										<SelectItem value="other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>
							<div>
								<Label>Date of Birth</Label>
								<Input
									value={editingEmployee?.dateOfBirth || ""}
									onChange={e => setEditingEmployee({ ...editingEmployee, dateOfBirth: e.target.value })}
									type="date"
								/>
							</div>
						</div>
						<DialogFooter>
							<Button type="submit" disabled={editSubmitting}>
								{editSubmitting ? "Saving..." : "Save Changes"}
							</Button>
							<Button type="button" variant="secondary" onClick={() => setEditingEmployee(null)}>
								Cancel
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>

      {/* Add Employee Modal */}
			<Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Add New Employee</DialogTitle>
					</DialogHeader>
					<form
						onSubmit={e => { e.preventDefault(); handleAddEmployee(); }}
						className="space-y-4"
					>
						<div>
							<Label>Name</Label>
							<Input
								value={newEmployee.name}
								onChange={e => setNewEmployee({ ...newEmployee, name: e.target.value })}
								required
							/>
						</div>
						<div>
							<Label>Email</Label>
							<Input
								value={newEmployee.email}
								onChange={e => setNewEmployee({ ...newEmployee, email: e.target.value })}
								required
								type="email"
							/>
						</div>
						<div>
							<Label>Password</Label>
							<Input
								value={newEmployee.password}
								onChange={e => setNewEmployee({ ...newEmployee, password: e.target.value })}
								required
								type="password"
							/>
						</div>
						<DialogFooter>
							<Button type="submit">Add Employee</Button>
							<Button type="button" variant="secondary" onClick={() => setShowAddDialog(false)}>
								Cancel
							</Button>
						</DialogFooter>
					</form>
				</DialogContent>
			</Dialog>
		</div>
	);
}
