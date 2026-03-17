import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Trash2, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Profile
  const [fullName, setFullName] = useState('');
  const [cellNumber, setCellNumber] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  
  // Step 2: Locations
  const [locations, setLocations] = useState([{ name: 'Home', address: '' }, { name: 'Office', address: '' }]);
  const [newLocation, setNewLocation] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    if (user) {
      if (user.onboarding_completed) {
        navigate('/today');
      }
      setFullName(user.full_name || '');
      setCellNumber(user.cell_number || '');
      setBusinessNumber(user.business_number || '');
    }
  }, [user, navigate]);

  const handleNext = () => setStep(s => Math.min(s + 1, 3));
  const handleBack = () => setStep(s => Math.max(s - 1, 1));

  const addLocation = () => {
    if (newLocation.trim()) {
      setLocations([...locations, { name: newLocation.trim(), address: newAddress.trim() }]);
      setNewLocation('');
      setNewAddress('');
    }
  };

  const removeLocation = (index) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleComplete = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        full_name: fullName,
        cell_number: cellNumber,
        business_number: businessNumber,
        onboarding_completed: true
      });
      
      // Save locations
      for (const loc of locations) {
        await base44.entities.Location.create({ name: loc.name, address: loc.address });
      }
      
      // Reload page to refresh auth context
      window.location.href = '/today';
    } catch (error) {
      console.error(error);
      alert("Failed to complete onboarding.");
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen overflow-y-auto bg-[#F4EFE4] flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-8 max-w-md w-full my-auto">
        <h1 className="text-3xl font-serif font-bold text-[#1e293b] mb-2">Welcome to Planner</h1>
        <p className="text-[#64748b] mb-8">Let's get your workspace set up.</p>

        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">1. Your Profile</h2>
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Jane Doe" />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user.email} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label>Cell Number</Label>
              <Input value={cellNumber} onChange={e => setCellNumber(e.target.value)} placeholder="+1 555 123 4567" />
            </div>
            <div className="space-y-2">
              <Label>Business Number</Label>
              <Input value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} placeholder="+1 555 987 6543" />
            </div>
            <Button onClick={handleNext} className="w-full mt-6 bg-[#1e293b] hover:bg-[#0f172a] text-white">
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">2. Your Locations</h2>
            <p className="text-sm text-[#64748b]">Add places you frequently visit (Home, Office, Lake, Church, etc.)</p>
            
            <div className="space-y-2 mb-4">
              {locations.map((loc, i) => (
                <div key={i} className="flex flex-col bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#F97316]" />
                      <span className="text-[#334155] font-medium">{loc.name}</span>
                    </div>
                    <button onClick={() => removeLocation(i)} className="text-slate-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {loc.address && (
                    <div className="mt-1 ml-6 text-sm text-[#64748b]">
                      {loc.address}
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <Input 
                value={newLocation} 
                onChange={e => setNewLocation(e.target.value)} 
                placeholder="Location name (e.g. Home)" 
              />
              <Input 
                value={newAddress} 
                onChange={e => setNewAddress(e.target.value)} 
                placeholder="Physical address (optional)" 
                onKeyDown={e => e.key === 'Enter' && addLocation()}
              />
              <Button onClick={addLocation} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" /> Add Location
              </Button>
            </div>

            <div className="flex gap-3 mt-8">
              <Button onClick={handleBack} variant="outline" className="flex-1">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleNext} className="flex-1 bg-[#1e293b] hover:bg-[#0f172a] text-white">
                Next <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">3. Connect Integrations</h2>
            <p className="text-sm text-[#64748b]">Connect your external accounts to sync data seamlessly.</p>
            
            <div className="p-4 border border-[#E2E8F0] rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1e293b]">Google Drive</h3>
                  <p className="text-xs text-[#64748b]">Save recordings directly to your drive</p>
                </div>
              </div>
              <Button variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50" onClick={() => alert('We will set this up next!')}>
                Connect
              </Button>
            </div>
            
            <div className="flex gap-3 mt-8">
              <Button onClick={handleBack} variant="outline" className="flex-1" disabled={loading}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleComplete} className="flex-1 bg-[#F97316] hover:bg-[#ea580c] text-white" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Complete Setup
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}