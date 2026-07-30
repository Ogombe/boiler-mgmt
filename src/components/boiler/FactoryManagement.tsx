'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Plus, Pencil, Trash2, Users, MapPin, Search, Loader2, X,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { ALL_ROLES, ROLE_DESCRIPTIONS, can } from '@/lib/permissions';
import { cn } from '@/lib/utils';

interface Factory {
  id: string;
  name: string;
  code: string;
  location: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  contactPerson: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: string;
  boilerCount: number;
  userCount: number;
  createdAt: string;
}

interface FactoryUser {
  id: string;
  email: string;
  name: string | null;
  role: string;
  phone: string | null;
  factoryRole?: string;
}

function RoleBadge({ role }: { role: string }) {
  const cls = 'text-[10px] h-5 px-1.5 font-medium';
  switch (role) {
    case 'CEO':
      return <Badge variant="destructive" className={cls}>CEO</Badge>;
    case 'Manager':
      return <Badge className={cn('bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100', cls)}>Manager</Badge>;
    case 'Plant Engineer':
      return <Badge className={cn('bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100', cls)}>Plant Engr</Badge>;
    case 'Shift Engineer':
      return <Badge className={cn('bg-sage/[0.07] text-cyan-700 border-sage/20 hover:bg-sage/[0.07]', cls)}>Shift Engr</Badge>;
    case 'Supervisor':
      return <Badge className={cn('bg-forest/[0.07] text-forest border-forest/20 hover:bg-forest/[0.07]', cls)}>Supervisor</Badge>;
    case 'Boiler Operator':
      return <Badge variant="secondary" className={cls}>Operator</Badge>;
    default:
      return <Badge variant="outline" className={cls}>{role}</Badge>;
  }
}

export function FactoryManagement() {
  const { user, setFactories: setGlobalFactories } = useAppStore();
  const factoryRole = useAppStore(s => s.getFactoryRole());
  const isManager = can(factoryRole, 'manageFactories');
  const canManageUsers = can(factoryRole, 'manageUsers');

  const [factories, setFactories] = useState<Factory[]>([]);
  const [filteredFactories, setFilteredFactories] = useState<Factory[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [editFactory, setEditFactory] = useState<Factory | null>(null);
  const [manageFactoryId, setManageFactoryId] = useState<string | null>(null);
  const [factoryUsers, setFactoryUsers] = useState<FactoryUser[]>([]);
  const [roleChangeLoadingId, setRoleChangeLoadingId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: '', code: '', location: '', city: '', state: '', contactPerson: '', contactEmail: '', contactPhone: '' });
  const [addUserForm, setAddUserForm] = useState({ email: '', name: '', phone: '', password: '', role: 'Boiler Operator' });
  const [addUserLoading, setAddUserLoading] = useState(false);

  const fetchFactories = useCallback(async () => {
    try {
      const res = await fetch('/api/factories');
      const data = await res.json();
      setFactories(data);
      setFilteredFactories(data);
      setGlobalFactories(
        (Array.isArray(data) ? data : []).map((f: Factory) => ({
          id: f.id, name: f.name, code: f.code,
          location: f.location, city: f.city, status: f.status, factoryRole: '',
        }))
      );
    } catch (err) {
      console.error('Failed to fetch factories:', err);
    }
    setLoading(false);
  }, [setGlobalFactories]);

  useEffect(() => { fetchFactories(); }, [fetchFactories]);

  useEffect(() => {
    if (!search.trim()) { setFilteredFactories(factories); return; }
    const q = search.toLowerCase();
    setFilteredFactories(factories.filter((f) =>
      f.name.toLowerCase().includes(q) || f.code.toLowerCase().includes(q) ||
      (f.city || '').toLowerCase().includes(q) || (f.location || '').toLowerCase().includes(q)
    ));
  }, [search, factories]);

  const openCreate = () => {
    setForm({ name: '', code: '', location: '', city: '', state: '', contactPerson: '', contactEmail: '', contactPhone: '' });
    setCreateOpen(true);
  };

  const openEdit = (f: Factory) => {
    setForm({ name: f.name, code: f.code, location: f.location || '', city: f.city || '', state: f.state || '', contactPerson: f.contactPerson || '', contactEmail: f.contactEmail || '', contactPhone: f.contactPhone || '' });
    setEditFactory(f);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return;
    try {
      if (editFactory) {
        await fetch('/api/factories', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: editFactory.id, ...form }) });
      } else {
        await fetch('/api/factories', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      }
      setCreateOpen(false);
      setEditFactory(null);
      fetchFactories();
    } catch (err) {
      console.error('Save error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this factory and ALL its data? This cannot be undone.')) return;
    await fetch(`/api/factories?id=${id}`, { method: 'DELETE' });
    fetchFactories();
  };

  const fetchUsers = useCallback(async (factoryId: string) => {
    try {
      const res = await fetch(`/api/users?factoryId=${factoryId}`);
      setFactoryUsers(await res.json());
    } catch (err) {
      console.error(err);
    }
  }, []);

  const openManageUsers = async (factoryId: string) => {
    setManageFactoryId(factoryId);
    setAddUserForm({ email: '', name: '', phone: '', password: '', role: 'Boiler Operator' });
    await fetchUsers(factoryId);
  };

  const handleAddUser = async () => {
    if (!addUserForm.email || !manageFactoryId) return;
    setAddUserLoading(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...addUserForm, factoryId: manageFactoryId }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to add user');
      } else {
        await fetchUsers(manageFactoryId);
        fetchFactories();
      }
    } catch (err) {
      console.error(err);
    }
    setAddUserLoading(false);
  };

  const handleRemoveUser = async (userId: string) => {
    if (!manageFactoryId) return;
    await fetch(`/api/users?id=${userId}&factoryId=${manageFactoryId}`, { method: 'DELETE' });
    await fetchUsers(manageFactoryId);
  };

  const handleChangeUserRole = async (userId: string, newRole: string) => {
    if (!manageFactoryId) return;
    setRoleChangeLoadingId(userId);
    try {
      await fetch('/api/factories/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ factoryId: manageFactoryId, userId, role: newRole }),
      });
      await fetchUsers(manageFactoryId);
    } catch (err) {
      console.error('Role update failed:', err);
    } finally {
      setRoleChangeLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Factory Management</h2>
          <p className="text-muted-foreground">Manage factories and their users. {factories.length} factories registered.</p>
        </div>
        {isManager && (
          <Button onClick={openCreate} className="bg-forest hover:bg-forest text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Factory
          </Button>
        )}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search factories by name, code, city..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredFactories.map((factory) => (
          <Card key={factory.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-forest/[0.07] flex items-center justify-center shrink-0">
                    <Building2 className="h-5 w-5 text-forest" />
                  </div>
                  <div className="min-w-0">
                    <CardTitle className="text-base truncate">{factory.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{factory.code}</p>
                  </div>
                </div>
                <Badge variant={factory.status === 'Active' ? 'default' : 'secondary'} className={factory.status === 'Active' ? 'bg-emerald-100 text-forest' : ''}>
                  {factory.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{[factory.city, factory.state, factory.country].filter(Boolean).join(', ') || 'No location set'}</span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /> {factory.boilerCount} boilers</span>
                <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-muted-foreground" /> {factory.userCount} users</span>
              </div>
              {factory.contactPerson && (
                <p className="text-xs text-muted-foreground">Contact: {factory.contactPerson}{factory.contactEmail ? ` (${factory.contactEmail})` : ''}</p>
              )}
              <div className="flex items-center gap-2 pt-2 border-t">
                {canManageUsers && (
                  <Button variant="outline" size="sm" onClick={() => openManageUsers(factory.id)}>
                    <Users className="h-3.5 w-3.5 mr-1" /> Users
                  </Button>
                )}
                {isManager && (
                  <>
                    <Button variant="outline" size="sm" onClick={() => openEdit(factory)}>
                      <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-critical hover:text-critical hover:bg-critical/[0.07]" onClick={() => handleDelete(factory.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredFactories.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>No factories found. Create one to get started.</p>
        </div>
      )}

      {/* Create/Edit Factory Dialog */}
      <Dialog open={createOpen || !!editFactory} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditFactory(null); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editFactory ? 'Edit Factory' : 'Create New Factory'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Factory Name *</Label>
                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mombasa Power Plant" />
              </div>
              <div className="space-y-2">
                <Label>Factory Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MPP" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Location / Address</Label>
              <Input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Street address" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="e.g. Mombasa" />
              </div>
              <div className="space-y-2">
                <Label>State / Region</Label>
                <Input value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })} placeholder="e.g. Coast" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Contact Person</Label>
                <Input value={form.contactPerson} onChange={(e) => setForm({ ...form, contactPerson: e.target.value })} placeholder="Name" />
              </div>
              <div className="space-y-2">
                <Label>Contact Email</Label>
                <Input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })} placeholder="email@factory.com" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Contact Phone</Label>
              <Input value={form.contactPhone} onChange={(e) => setForm({ ...form, contactPhone: e.target.value })} placeholder="+254 700 000 000" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditFactory(null); }}>Cancel</Button>
            <Button onClick={handleSave} className="bg-forest hover:bg-forest text-white" disabled={!form.name.trim()}>
              {editFactory ? 'Update' : 'Create'} Factory
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Manage Users Dialog */}
      <Dialog open={!!manageFactoryId} onOpenChange={(open) => { if (!open) setManageFactoryId(null); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Factory Users & Roles</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-64 overflow-y-auto border rounded-md p-3">
            {factoryUsers.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">No users assigned yet</p>}
            {factoryUsers.map((u) => {
              const displayRole = u.factoryRole || u.role;
              const isSelf = user?.id === u.id;
              const isChangingRole = roleChangeLoadingId === u.id;
              return (
                <div key={u.id} className="flex items-center justify-between py-1.5 gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium truncate">{u.name || u.email}</p>
                      <RoleBadge role={displayRole} />
                      {isSelf && <Badge variant="outline" className="text-[9px] h-4 px-1 text-muted-foreground">you</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{u.email}{u.phone ? ` | ${u.phone}` : ''}</p>
                  </div>
                  {canManageUsers && (
                    <div className="flex items-center gap-1 shrink-0">
                      <Select
                        value={displayRole}
                        onValueChange={(newRole) => { void handleChangeUserRole(u.id, newRole); }}
                        disabled={isChangingRole || isSelf}
                      >
                        <SelectTrigger className="h-8 w-[150px] text-xs" disabled={isChangingRole}>
                          {isChangingRole ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue />}
                        </SelectTrigger>
                        <SelectContent>
                          {ALL_ROLES.map((role) => (
                            <SelectItem key={role} value={role}>{role}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="ghost" size="sm" className="text-critical h-8 w-8 p-0" onClick={() => handleRemoveUser(u.id)} aria-label="Remove user">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-muted-foreground space-y-0.5 mt-1">
            {ALL_ROLES.map(r => (
              <p key={r}><span className="font-medium">{r}:</span> {ROLE_DESCRIPTIONS[r]}</p>
            ))}
          </div>

          {canManageUsers && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-medium">Add User to Factory</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Full Name</Label>
                  <Input placeholder="Full name" value={addUserForm.name} onChange={(e) => setAddUserForm({ ...addUserForm, name: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Email *</Label>
                  <Input type="email" placeholder="user@email.com" value={addUserForm.email} onChange={(e) => setAddUserForm({ ...addUserForm, email: e.target.value })} className="h-9" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Password *</Label>
                  <Input type="password" placeholder="Min 6 chars" value={addUserForm.password} onChange={(e) => setAddUserForm({ ...addUserForm, password: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Phone</Label>
                  <Input placeholder="+254..." value={addUserForm.phone} onChange={(e) => setAddUserForm({ ...addUserForm, phone: e.target.value })} className="h-9" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Select value={addUserForm.role} onValueChange={(v) => setAddUserForm({ ...addUserForm, role: v })}>
                    <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ALL_ROLES.map((role) => (
                        <SelectItem key={role} value={role}>{role}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleAddUser} disabled={addUserLoading || !addUserForm.email || !addUserForm.password} className="w-full bg-forest hover:bg-forest text-white">
                {addUserLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Add User
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
