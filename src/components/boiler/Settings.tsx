'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Settings, ShieldCheck, User, Building2, Clock } from 'lucide-react';

export function SettingsPage() {
  const { user, effectiveRole, factories, currentFactoryId } = useAppStore();
  const currentFactory = factories.find((f) => f.id === currentFactoryId);

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-6 w-6 text-muted-foreground" />
          Settings
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Manage your account, preferences, and system configuration.
        </p>
      </div>

      {/* Account Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4 text-blue-600" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Name</p>
              <p className="font-medium mt-0.5">{user?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium mt-0.5">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Role</p>
              <Badge className="mt-0.5" variant="outline">{effectiveRole}</Badge>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Current Factory</p>
              <p className="font-medium mt-0.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-forest" />
                {currentFactory?.name || 'None selected'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Change Password Section */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-forest" />
            Change Password
          </CardTitle>
          <CardDescription>
            Update your account password. You will need your current password to make changes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordInline />
        </CardContent>
      </Card>
    </div>
  );
}

/* Inline version of ChangePassword that fits inside a card (no outer card wrapper) */
function ChangePasswordInline() {
  const { user } = useAppStore();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword.length < 6) {
      setMessage({ type: 'error', text: 'New password must be at least 6 characters' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      return;
    }
    if (!user?.id) {
      setMessage({ type: 'error', text: 'User not found. Please log in again.' });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to change password' });
      } else {
        setMessage({ type: 'success', text: 'Password changed successfully!' });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error. Please try again.' });
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div className="grid sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Current Password</label>
          <Input
            type="password" placeholder="Enter current password"
            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
            required className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">New Password</label>
          <Input
            type="password" placeholder="Min 6 characters"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
            required minLength={6} className="h-9"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Confirm New</label>
          <Input
            type="password" placeholder="Re-enter new password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
            required minLength={6} className="h-9"
          />
        </div>
      </div>
      {message && (
        <p className={`text-sm rounded-md px-3 py-2 ${
          message.type === 'success' ? 'text-forest bg-forest/[0.07]' : 'text-critical bg-critical/[0.07]'
        }`}>
          {message.text}
        </p>
      )}
      <div>
        <button
          type="submit" disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-forest hover:bg-forest text-white disabled:opacity-50 transition-colors"
        >
          {loading ? <Clock className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
          Change Password
        </button>
      </div>
    </form>
  );
}
