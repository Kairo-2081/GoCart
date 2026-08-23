import React, { useState } from 'react';
import { Admin, Address } from '../../types';
import { X, ShieldPlus, Send, Sparkles, KeyRound, Eye, EyeOff, Lock, User, Mail, Phone, MapPin } from 'lucide-react';
import { ADMIN_SECURITY_KEY } from './AdminSecurityModal';

interface AdminSignupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRegisterAdmin: (adminData: Partial<Admin> & { Username?: string }) => Promise<Admin>;
  onSuccessRegistered: (newAdmin: Admin) => void;
}

export const AdminSignupModal: React.FC<AdminSignupModalProps> = ({
  isOpen,
  onClose,
  onRegisterAdmin,
  onSuccessRegistered,
}) => {
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordState, setShowPasswordState] = useState(false);
  const [number, setNumber] = useState('');
  const [securityKey, setSecurityKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [address, setAddress] = useState<Address>({
    House_Name: '',
    Street: '',
    City: '',
    Postal_Code: '',
    Additional_Info: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAutoFill = () => {
    setUsername('elena_admin');
    setName('Elena Rostova (Compliance Lead)');
    setEmail('elena.rostova@marketplace.com');
    setPassword('ADMIN123');
    setNumber('+1 (800) 555-8899');
    setSecurityKey(ADMIN_SECURITY_KEY);
    setAddress({
      House_Name: 'HQ Operations Wing Floor 12',
      Street: '1 Marketplace Plaza',
      City: 'San Jose',
      Postal_Code: '95113',
      Additional_Info: 'Global Marketplace Governance & Compliance Division',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !password.trim()) {
      setError('Please provide name, email, and set password.');
      return;
    }
    if (securityKey.trim().toUpperCase() !== ADMIN_SECURITY_KEY) {
      setError(`Invalid Admin Security Key! System key required to register as Admin.`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const finalUsername = (username.trim() || 'admin_' + (Date.now() % 1000)).toLowerCase();
      const newAdmin = await onRegisterAdmin({
        Username: finalUsername,
        Name: name.trim(),
        Email: email.trim(),
        Password: password.trim(),
        Number: number.trim() || '+1 (800) 555-0000',
        Address: address,
      });

      setName('');
      setEmail('');
      setPassword('');
      setUsername('');
      setNumber('');
      setSecurityKey('');
      setAddress({ House_Name: '', Street: '', City: '', Postal_Code: '', Additional_Info: '' });

      onSuccessRegistered(newAdmin);
      onClose();
    } catch (err: any) {
      console.error('Registration failed:', err);
      setError(err.message || 'Failed to register admin account.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between bg-purple-50/50 dark:bg-purple-950/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-600/30">
              <ShieldPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Admin Officer Registration</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Register new Governance Admin (Raw SQL DB)</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">Username *</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. elena_admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-2.5 pl-8 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <User className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Elena Rostova"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-2.5 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">Official Email *</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@marketplace.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-2.5 pl-8 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              </div>
            </div>

            <div>
              <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">Password *</label>
              <div className="relative">
                <input
                  type={showPasswordState ? 'text' : 'password'}
                  required
                  placeholder="Set admin password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2.5 pl-8 pr-9 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
                <Lock className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                <button
                  type="button"
                  onClick={() => setShowPasswordState(!showPasswordState)}
                  className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
                >
                  {showPasswordState ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">Admin Security Passcode *</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                required
                placeholder={`Enter security key (${ADMIN_SECURITY_KEY})`}
                value={securityKey}
                onChange={(e) => setSecurityKey(e.target.value)}
                className="w-full p-2.5 pl-8 pr-9 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-zinc-600 focus:ring-2 focus:ring-purple-500 focus:outline-none uppercase font-mono tracking-wider"
              />
              <KeyRound className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-300 cursor-pointer"
              >
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 dark:text-zinc-300 font-semibold mb-1">Phone Number</label>
            <div className="relative">
              <input
                type="text"
                placeholder="+1 (800) 555-0000"
                value={number}
                onChange={(e) => setNumber(e.target.value)}
                className="w-full p-2.5 pl-8 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
              />
              <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800">
            <h4 className="font-semibold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-purple-500" /> Operational Address
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 mb-1">Building / Wing</label>
                <input
                  type="text"
                  placeholder="HQ Tower Floor 15"
                  value={address.House_Name}
                  onChange={(e) => setAddress({ ...address, House_Name: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 mb-1">Street Address</label>
                <input
                  type="text"
                  placeholder="1 Marketplace Plaza"
                  value={address.Street}
                  onChange={(e) => setAddress({ ...address, Street: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 mb-1">City</label>
                <input
                  type="text"
                  placeholder="San Jose"
                  value={address.City}
                  onChange={(e) => setAddress({ ...address, City: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-slate-600 dark:text-zinc-400 mb-1">Postal Code</label>
                <input
                  type="text"
                  placeholder="95113"
                  value={address.Postal_Code}
                  onChange={(e) => setAddress({ ...address, Postal_Code: e.target.value })}
                  className="w-full p-2 bg-slate-50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-xl text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-1.5 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-md disabled:opacity-50 transition-colors cursor-pointer"
            >
              <Send className="w-4 h-4" />
              {isSubmitting ? 'Registering...' : 'Register Administrator'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
