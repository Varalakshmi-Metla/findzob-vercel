// Admin Plans Management Page
// Allows admin to create, edit, delete plans


import React, { useEffect, useState } from 'react';
import { useFirestore } from '@/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { Button } from '@/components/ui/button';

type Plan = {
  id: string;
  name: string;
  price: string;
  description: string;
};

export default function AdminPlansPage() {
  const firestore = useFirestore();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [newPlan, setNewPlan] = useState<{ name: string; price: string; description: string }>({ name: '', price: '', description: '' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingPlan, setEditingPlan] = useState<{ name: string; price: string; description: string }>({ name: '', price: '', description: '' });

  useEffect(() => {
    if (!firestore) return;
    getDocs(collection(firestore, 'plans')).then(snapshot => {
      setPlans(snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        name: docSnap.data().name || '',
        price: docSnap.data().price || '',
        description: docSnap.data().description || ''
      })));
    });
  }, [firestore]);

  const handleAddPlan = async () => {
    if (!firestore || !newPlan.name || !newPlan.price) return;
    await addDoc(collection(firestore, 'plans'), newPlan);
    setNewPlan({ name: '', price: '', description: '' });
    const snapshot = await getDocs(collection(firestore, 'plans'));
    setPlans(snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      name: docSnap.data().name || '',
      price: docSnap.data().price || '',
      description: docSnap.data().description || ''
    })));
  };

  const handleEditPlan = (plan: Plan) => {
    setEditingId(plan.id);
    setEditingPlan({ name: plan.name, price: plan.price, description: plan.description });
  };

  const handleUpdatePlan = async () => {
    if (!firestore || !editingId) return;
    await updateDoc(doc(firestore, 'plans', editingId), editingPlan);
    setEditingId(null);
    setEditingPlan({ name: '', price: '', description: '' });
    const snapshot = await getDocs(collection(firestore, 'plans'));
    setPlans(snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      name: docSnap.data().name || '',
      price: docSnap.data().price || '',
      description: docSnap.data().description || ''
    })));
  };

  const handleDeletePlan = async (id: string) => {
    if (!firestore) return;
    await deleteDoc(doc(firestore, 'plans', id));
    setPlans(plans.filter(p => p.id !== id));
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Admin: Manage Plans</h1>
      <div className="mb-6">
        <input
          className="border p-2 mr-2"
          placeholder="Plan Name"
          value={newPlan.name}
          onChange={e => setNewPlan({ ...newPlan, name: e.target.value })}
        />
        <input
          className="border p-2 mr-2"
          placeholder="Price (USD)"
          value={newPlan.price}
          onChange={e => setNewPlan({ ...newPlan, price: e.target.value })}
        />
        <input
          className="border p-2 mr-2"
          placeholder="Description"
          value={newPlan.description}
          onChange={e => setNewPlan({ ...newPlan, description: e.target.value })}
        />
        <Button onClick={handleAddPlan}>Add Plan</Button>
      </div>
      <table className="w-full border">
        <thead>
          <tr>
            <th className="border p-2">Name</th>
            <th className="border p-2">Price</th>
            <th className="border p-2">Description</th>
            <th className="border p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {plans.map(plan => (
            <tr key={plan.id}>
              <td className="border p-2">
                {editingId === plan.id ? (
                  <input
                    className="border p-1"
                    value={editingPlan.name}
                    onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  />
                ) : (
                  plan.name
                )}
              </td>
              <td className="border p-2">
                {editingId === plan.id ? (
                  <input
                    className="border p-1"
                    value={editingPlan.price}
                    onChange={e => setEditingPlan({ ...editingPlan, price: e.target.value })}
                  />
                ) : (
                  plan.price
                )}
              </td>
              <td className="border p-2">
                {editingId === plan.id ? (
                  <input
                    className="border p-1"
                    value={editingPlan.description}
                    onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })}
                  />
                ) : (
                  plan.description
                )}
              </td>
              <td className="border p-2">
                {editingId === plan.id ? (
                  <>
                    <Button onClick={handleUpdatePlan} className="mr-2">Save</Button>
                    <Button onClick={() => setEditingId(null)}>Cancel</Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => handleEditPlan(plan)} className="mr-2">Edit</Button>
                    <Button onClick={() => handleDeletePlan(plan.id)} variant="destructive">Delete</Button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
