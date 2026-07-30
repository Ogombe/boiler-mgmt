'use client';

import { useState, useEffect } from 'react';
import { Flame, Building2, ArrowRight, Eye, EyeOff, Loader2, KeyRound, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStore } from '@/lib/store';

export function LoginPage() {
  const { setUser, setFactories, setCurrentFactoryId, setCurrentPage, setShowLogin, setEffectiveRole, hydrate } = useAppStore();
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regFactoryName, setRegFactoryName] = useState('');
  const [regFactoryCode, setRegFactoryCode] = useState('');
  const [regFactoryCity, setRegFactoryCity] = useState('');

  // Change password form
  const [showChangePw, setShowChangePw] = useState(false);
  const [cpEmail, setCpEmail] = useState('');
  const [cpCurrentPw, setCpCurrentPw] = useState('');
  const [cpNewPw, setCpNewPw] = useState('');
  const [cpLoading, setCpLoading] = useState(false);

  // On mount, check if we have a saved session
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); setLoading(false); return; }

      setUser(data.user);
      setFactories(data.factories);
      setEffectiveRole(data.effectiveRole || 'Boiler Operator');

      if (data.factories.length >= 1) {
        setCurrentFactoryId(data.factories[0].id);
        setShowLogin(false);
        setCurrentPage('dashboard');
      } else {
        setError('No factories assigned. Please contact your administrator.');
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regFactoryName.trim()) { setError('Factory name is required'); return; }
    if (regPassword.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: regEmail, password: regPassword, name: regName,
          factoryName: regFactoryName, factoryCode: regFactoryCode, factoryCity: regFactoryCity,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Registration failed'); setLoading(false); return; }

      setUser(data.user);
      setFactories(data.factories);
      setEffectiveRole(data.effectiveRole || 'CEO');
      if (data.factories.length > 0) {
        setCurrentFactoryId(data.factories[0].id);
        setShowLogin(false);
        setCurrentPage('dashboard');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setLoading(false);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cpNewPw.length < 6) { setError('New password must be at least 6 characters'); return; }
    setCpLoading(true);
    setError('');
    setSuccess('');
    try {
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cpEmail, password: cpCurrentPw }),
      });
      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        setError('Email or current password is incorrect');
        setCpLoading(false);
        return;
      }

      const changeRes = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: loginData.user.id, currentPassword: cpCurrentPw, newPassword: cpNewPw }),
      });
      const changeData = await changeRes.json();
      if (!changeRes.ok) { setError(changeData.error || 'Failed to change password'); setCpLoading(false); return; }

      setSuccess('Password changed successfully! You can now sign in with your new password.');
      setShowChangePw(false);
      setCpEmail(''); setCpCurrentPw(''); setCpNewPw('');
      setActiveTab('login');
    } catch {
      setError('Network error. Please try again.');
    }
    setCpLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0C0F14] p-4 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
        backgroundSize: '64px 64px'
      }} />
      {/* Subtle radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-forest/5 blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-forest shadow-lg shadow-forest/30 mb-5">
            <Flame className="h-7 w-7 text-white" />
          </div>
          <h1 className="font-display text-[22px] font-semibold text-white tracking-tight">Boiler Management System</h1>
          <p className="text-muted-foreground mt-1.5 text-[13px]">Multi-Factory Operations & Maintenance Tracker</p>
        </div>

        <Card className="bg-[#14171D]/80 border-white/[0.06] backdrop-blur-xl rounded-2xl shadow-2xl shadow-black/40">
          <CardHeader className="pb-4 px-6 pt-6">
            <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as 'login' | 'register'); setError(''); setSuccess(''); }}>
              <TabsList className="grid w-full grid-cols-2 bg-white/[0.04] rounded-lg p-1 h-10">
                <TabsTrigger value="login" className="data-[state=active]:bg-forest data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md text-[13px] font-medium text-muted-foreground">Sign In</TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-forest data-[state=active]:text-white data-[state=active]:shadow-sm rounded-md text-[13px] font-medium text-muted-foreground">Register</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>

          <CardContent className="px-6 pb-6">
            {/* CHANGE PASSWORD MODE */}
            {showChangePw && (
              <form onSubmit={handleChangePassword} className="space-y-4">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="h-4 w-4 text-sage" />
                  <span className="text-[13px] font-medium text-slate-300">Change Your Password</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-email" className="text-muted-foreground text-xs">Email</Label>
                  <Input id="cp-email" type="email" placeholder="your@email.com" value={cpEmail} onChange={(e) => setCpEmail(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-current" className="text-muted-foreground text-xs">Current Password</Label>
                  <Input id="cp-current" type="password" placeholder="Enter current password" value={cpCurrentPw} onChange={(e) => setCpCurrentPw(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cp-new" className="text-muted-foreground text-xs">New Password</Label>
                  <Input id="cp-new" type="password" placeholder="Min 6 characters" value={cpNewPw} onChange={(e) => setCpNewPw(e.target.value)} required minLength={6} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                </div>
                {error && <p className="text-[13px] text-critical bg-critical/[0.08]/10 rounded-lg px-4 py-2.5 border border-critical/20/10">{error}</p>}
                {success && <p className="text-[13px] text-forest bg-forest/[0.15]/10 rounded-lg px-4 py-2.5 border border-forest/30-400/10">{success}</p>}
                <Button type="submit" className="w-full bg-forest hover:bg-forest/90 text-white h-10 rounded-lg" disabled={cpLoading}>
                  {cpLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                  Change Password
                </Button>
                <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-slate-300 hover:bg-white/[0.03]" onClick={() => { setShowChangePw(false); setError(''); setSuccess(''); }}>
                  Back to Sign In
                </Button>
              </form>
            )}

            {/* LOGIN */}
            {!showChangePw && activeTab === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email" className="text-muted-foreground text-xs">Email</Label>
                  <Input
                    id="login-email" type="email" placeholder="operator@factory.com"
                    value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} required
                    className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="login-pass" className="text-muted-foreground text-xs">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-pass" type={showPassword ? 'text' : 'password'} placeholder="Enter your password"
                      value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} required
                      className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg pr-10"
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-300 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {error && <p className="text-[13px] text-critical bg-critical/[0.08]/10 rounded-lg px-4 py-2.5 border border-critical/20/10">{error}</p>}
                {success && <p className="text-[13px] text-forest bg-forest/[0.15]/10 rounded-lg px-4 py-2.5 border border-forest/30-400/10">{success}</p>}
                <Button type="submit" className="w-full bg-forest hover:bg-forest/90 text-white h-10 rounded-lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ArrowRight className="h-4 w-4 mr-2" />}
                  Sign In
                </Button>
                <button type="button" onClick={() => { setShowChangePw(true); setActiveTab('login'); setError(''); setSuccess(''); }} className="w-full text-center text-[12px] text-muted-foreground hover:text-sage transition-colors">
                  Forgot password? Change it here
                </button>
              </form>
            )}

            {/* REGISTER */}
            {!showChangePw && activeTab === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name" className="text-muted-foreground text-xs">Full Name</Label>
                    <Input id="reg-name" placeholder="John Doe" value={regName} onChange={(e) => setRegName(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-email" className="text-muted-foreground text-xs">Email</Label>
                    <Input id="reg-email" type="email" placeholder="john@factory.com" value={regEmail} onChange={(e) => setRegEmail(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reg-pass" className="text-muted-foreground text-xs">Password</Label>
                  <Input id="reg-pass" type="password" placeholder="Min 6 characters" value={regPassword} onChange={(e) => setRegPassword(e.target.value)} required minLength={6} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                </div>

                <div className="border-t border-white/[0.06] pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Building2 className="h-4 w-4 text-sage" />
                    <span className="text-[13px] font-medium text-slate-300">Factory Details</span>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="fac-name" className="text-muted-foreground text-xs">Factory Name *</Label>
                      <Input id="fac-name" placeholder="e.g. Nairobi Thermal Plant" value={regFactoryName} onChange={(e) => setRegFactoryName(e.target.value)} required className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label htmlFor="fac-code" className="text-muted-foreground text-xs">Factory Code</Label>
                        <Input id="fac-code" placeholder="Auto-generated" value={regFactoryCode} onChange={(e) => setRegFactoryCode(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="fac-city" className="text-muted-foreground text-xs">City</Label>
                        <Input id="fac-city" placeholder="e.g. Nairobi" value={regFactoryCity} onChange={(e) => setRegFactoryCity(e.target.value)} className="bg-white/[0.04] border-white/[0.08] text-white placeholder:text-muted-foreground focus:border-forest focus:ring-forest/20 h-10 rounded-lg" />
                      </div>
                    </div>
                  </div>
                </div>

                {error && <p className="text-[13px] text-critical bg-critical/[0.08]/10 rounded-lg px-4 py-2.5 border border-critical/20/10">{error}</p>}
                <Button type="submit" className="w-full bg-forest hover:bg-forest/90 text-white h-10 rounded-lg" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Building2 className="h-4 w-4 mr-2" />}
                  Create Account & Factory
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-muted-foreground text-[11px] mt-8">
          Secure login — Role-based access: CEO, Manager, Plant Engineer, Shift Engineer, Supervisor, Boiler Operator
        </p>
      </div>
    </div>
  );
}