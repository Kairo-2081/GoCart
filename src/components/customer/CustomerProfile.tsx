import React from 'react';
import { Customer, Address } from '../../types';
import { User, Mail, Phone, MapPin, Save, CheckCircle2 } from 'lucide-react';

interface CustomerProfileProps {
  currentCustomer: Customer;
  onUpdateCustomer: (updated: Customer) => void;
}

export const CustomerProfile: React.FC<CustomerProfileProps> = ({ currentCustomer, onUpdateCustomer }) => {
  const [name, setName] = React.useState(currentCustomer.Name);
  const [email, setEmail] = React.useState(currentCustomer.Email);
  const [number, setNumber] = React.useState(currentCustomer.Number);
  const [address, setAddress] = React.useState<Address>({
    Street: currentCustomer.Address?.Street || '',
    House_Name: currentCustomer.Address?.House_Name || '',
    City: currentCustomer.Address?.City || '',
    Postal_Code: currentCustomer.Address?.Postal_Code || '',
    Additional_Info: currentCustomer.Address?.Additional_Info || '',
  });

  const [savedSuccess, setSavedSuccess] = React.useState(false);

  React.useEffect(() => {
    setName(currentCustomer.Name);
    setEmail(currentCustomer.Email);
    setNumber(currentCustomer.Number);
    setAddress({
      Street: currentCustomer.Address?.Street || '',
      House_Name: currentCustomer.Address?.House_Name || '',
      City: currentCustomer.Address?.City || '',
      Postal_Code: currentCustomer.Address?.Postal_Code || '',
      Additional_Info: currentCustomer.Address?.Additional_Info || '',
    });
  }, [currentCustomer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateCustomer({
      ...currentCustomer,
      Name: name,
      Email: email,
      Number: number,
      Address: address,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-16">
      <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold text-lg flex items-center justify-center">
            {currentCustomer.Name.charAt(0)}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">Customer Account & Address</h1>
            <p className="text-xs text-slate-500 font-mono">ID: {currentCustomer.Customer_ID}</p>
          </div>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 rounded-2xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          Profile and Address details saved successfully!
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-6">
        {/* Personal Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <User className="w-4 h-4 text-blue-600" />
            Personal Contact Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Phone Number</label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Address Entity details */}
        <div className="space-y-4 pt-2">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
            <MapPin className="w-4 h-4 text-blue-600" />
            Primary Default Address (Address Entity)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">House Name / Unit Number</label>
              <input
                type="text"
                required
                value={address.House_Name}
                onChange={(e) => setAddress({ ...address, House_Name: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Street Address</label>
              <input
                type="text"
                required
                value={address.Street}
                onChange={(e) => setAddress({ ...address, Street: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">City</label>
              <input
                type="text"
                required
                value={address.City}
                onChange={(e) => setAddress({ ...address, City: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Postal Code</label>
              <input
                type="text"
                required
                value={address.Postal_Code}
                onChange={(e) => setAddress({ ...address, Postal_Code: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-600 dark:text-slate-400 mb-1 font-medium">Additional Info / Delivery Instructions</label>
              <input
                type="text"
                value={address.Additional_Info}
                onChange={(e) => setAddress({ ...address, Additional_Info: e.target.value })}
                className="w-full p-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Profile Changes
          </button>
        </div>
      </form>
    </div>
  );
};
