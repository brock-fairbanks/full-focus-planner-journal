import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Plus, Trash2, ArrowLeft, Save, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

export default function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [fullName, setFullName] = useState('');
  const [cellNumber, setCellNumber] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [locations, setLocations] = useState([]);
  const [newLocation, setNewLocation] = useState('');
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => {
    if (user) {
      setFullName(user.full_name || '');
      setCellNumber(user.cell_number || '');
      setBusinessNumber(user.business_number || '');
      fetchLocations();
    }
  }, [user]);

  const fetchLocations = async () => {
    if (!user) return;
    try {
      const locs = await base44.entities.Location.filter({ created_by: user.email });
      setLocations(locs);
    } catch (e) {
      console.error(e);
    }
  };

  const addLocation = async () => {
    if (!newLocation.trim()) return;
    try {
      const loc = await base44.entities.Location.create({ 
        name: newLocation.trim(),
        address: newAddress.trim()
      });
      setLocations([...locations, loc]);
      setNewLocation('');
      setNewAddress('');
    } catch (e) {
      console.error(e);
      toast.error("Failed to add location");
    }
  };

  const removeLocation = async (id) => {
    try {
      await base44.entities.Location.delete(id);
      setLocations(locations.filter(l => l.id !== id));
    } catch (e) {
      console.error(e);
      toast.error("Failed to remove location");
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await base44.auth.updateMe({
        full_name: fullName,
        cell_number: cellNumber,
        business_number: businessNumber
      });
      toast.success("Profile updated");
    } catch (e) {
      console.error(e);
      toast.error("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="h-screen overflow-y-auto bg-[#F4EFE4] p-4 md:p-8 font-sans pb-32">
      <div className="max-w-3xl mx-auto">
        <button 
          onClick={() => navigate('/today')}
          className="flex items-center text-[#64748b] hover:text-[#1e293b] mb-6 transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-1" /> Back to Planner
        </button>
        
        <h1 className="text-3xl font-serif font-bold text-[#1e293b] mb-8">Settings</h1>

        <div className="space-y-8">
          {/* Profile Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={fullName} onChange={e => setFullName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input value={user.email} disabled className="bg-slate-50" />
              </div>
              <div className="space-y-2">
                <Label>Cell Number</Label>
                <Input value={cellNumber} onChange={e => setCellNumber(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Business Number</Label>
                <Input value={businessNumber} onChange={e => setBusinessNumber(e.target.value)} />
              </div>
            </div>
            <Button onClick={handleSaveProfile} disabled={loading} className="bg-[#1e293b] hover:bg-[#0f172a] text-white">
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
              Save Profile
            </Button>
          </div>

          {/* Locations Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">Locations</h2>
            <div className="space-y-2 mb-4 max-w-md">
              {locations.map((loc) => (
                <div key={loc.id} className="flex flex-col bg-slate-50 px-3 py-2 rounded-lg border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-[#F97316]" />
                      <span className="text-[#334155] font-medium">{loc.name}</span>
                    </div>
                    <button onClick={() => removeLocation(loc.id)} className="text-slate-400 hover:text-red-500">
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
              {locations.length === 0 && <p className="text-sm text-[#64748b]">No locations saved yet.</p>}
            </div>
            <div className="flex flex-col gap-2 max-w-md">
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
          </div>

          {/* Integrations Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">Integrations</h2>
            <div className="p-4 border border-[#E2E8F0] rounded-xl flex items-center justify-between max-w-md">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
                </div>
                <div>
                  <h3 className="font-semibold text-[#1e293b]">Google Drive</h3>
                  <p className="text-xs text-[#64748b]">
                    {user.drive_connected ? 'Connected and saving meeting recordings automatically' : 'Not connected'}
                  </p>
                </div>
              </div>
              {user.drive_connected ? (
                <Button 
                  variant="ghost" 
                  className="text-slate-400 hover:text-red-600 hover:bg-red-50" 
                  onClick={async () => {
                    await base44.auth.updateMe({ drive_connected: false });
                    window.location.reload();
                  }}
                >
                  Disconnect
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  className="text-blue-600 border-blue-200 hover:bg-blue-50" 
                  onClick={async () => {
                    await base44.auth.updateMe({ drive_connected: true });
                    window.location.reload();
                  }}
                >
                  Connect
                </Button>
              )}
            </div>
          </div>

          {/* Advanced Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6">
            <h2 className="text-xl font-bold text-[#1e293b] mb-4">Advanced</h2>
            <div className="flex flex-col gap-2 max-w-md">
              <Button onClick={() => navigate('/today?tour=true')} className="w-full bg-[#1e293b] text-white hover:bg-[#0f172a]">
                Start Guided Tour
              </Button>
              <Button onClick={() => navigate('/onboarding?force=true')} variant="outline" className="w-full text-[#64748b] hover:text-[#1e293b]">
                Re-run Onboarding Wizard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}