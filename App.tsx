
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { votingCenters as initialCenters } from './data';
import { VotingCenter, Person, ViewState, EmergencyContact, CloudData } from './types';
import { 
  MagnifyingGlassIcon, 
  MapPinIcon, 
  UserGroupIcon, 
  InformationCircleIcon, 
  PhoneIcon, 
  ChatBubbleLeftRightIcon,
  HomeIcon, 
  ArrowLeftIcon, 
  LockClosedIcon, 
  Bars3Icon, 
  XMarkIcon, 
  PencilSquareIcon, 
  TrashIcon, 
  PlusIcon, 
  Cog6ToothIcon, 
  ShieldCheckIcon, 
  MegaphoneIcon, 
  BuildingOfficeIcon, 
  InboxStackIcon, 
  KeyIcon, 
  ExclamationCircleIcon, 
  CheckCircleIcon, 
  MapIcon, 
  ArrowRightOnRectangleIcon, 
  CloudArrowUpIcon,
  ArrowUpTrayIcon,
  ArrowDownTrayIcon
} from '@heroicons/react/24/solid';

// Helper to convert English digits to Bengali digits
const toBengaliDigits = (num: string | number) => {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return num.toString().replace(/\d/g, (d) => bengaliDigits[parseInt(d)]);
};

// Centralized Sync Configuration
// Note: If this blob ID is invalid or read-only, cloud sync will fail. 
// We rely on localStorage as a primary backup.
const API_BASE = "https://jsonblob.com/api/jsonBlob/1344265780516626432"; 

interface CustomModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  type: 'WARNING' | 'SUCCESS' | 'INFO' | 'DANGER';
  onConfirm?: () => void;
  onClose: () => void;
  confirmText?: string;
  cancelText?: string;
  showCancel?: boolean;
}

const App: React.FC = () => {
  // Sync State
  const [lastUpdated, setLastUpdated] = useState<number>(() => Number(localStorage.getItem('army_last_updated')) || 0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [hasInitialSync, setHasInitialSync] = useState<boolean>(false);

  // Core App Data State - Initialized from local cache
  const [centers, setCenters] = useState<VotingCenter[]>(() => {
    const saved = localStorage.getItem('army_centers_cache');
    return saved ? JSON.parse(saved) : initialCenters;
  });
  const [emergencyContact, setEmergencyContact] = useState<EmergencyContact>(() => {
    const saved = localStorage.getItem('army_emergency_cache');
    return saved ? JSON.parse(saved) : { name: 'ক্যাম্প কমান্ডার', mobile: '01712345678' };
  });
  const [userPassword, setUserPassword] = useState(() => localStorage.getItem('army_user_pass_cache') || 'EPZArmy');
  const [adminPassword, setAdminPassword] = useState(() => localStorage.getItem('army_admin_pass_cache') || 'admin123');

  // Session State
  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('app_is_logged_in') === 'true');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => localStorage.getItem('app_is_admin_logged_in') === 'true');

  useEffect(() => {
    localStorage.setItem('app_is_logged_in', isLoggedIn.toString());
    localStorage.setItem('app_is_admin_logged_in', isAdminLoggedIn.toString());
  }, [isLoggedIn, isAdminLoggedIn]);

  const [inputPassword, setInputPassword] = useState('');
  const [inputAdminPassword, setInputAdminPassword] = useState('');
  
  const [view, setView] = useState<ViewState>(() => {
    const isAdmin = localStorage.getItem('app_is_admin_logged_in') === 'true';
    return isAdmin ? 'ADMIN' : 'HOME';
  });
  const [selectedCenter, setSelectedCenter] = useState<VotingCenter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState('');
  const [adminError, setAdminError] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  
  // Google Map States
  const [showMapPicker, setShowMapPicker] = useState(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const gMapRef = useRef<any>(null);
  const gMarkerRef = useRef<any>(null);
  const [mapSearchTerm, setMapSearchTerm] = useState('');

  // Modal State
  const [modal, setModal] = useState<CustomModalProps>({
    isOpen: false,
    title: '',
    message: '',
    type: 'INFO',
    onClose: () => setModal(prev => ({ ...prev, isOpen: false }))
  });

  const showModal = (props: Partial<CustomModalProps>) => {
    setModal({
      isOpen: true,
      title: props.title || 'সতর্কবার্তা',
      message: props.message || '',
      type: props.type || 'INFO',
      confirmText: props.confirmText || 'ঠিক আছে',
      cancelText: props.cancelText || 'বাতিল',
      showCancel: props.showCancel ?? false,
      onConfirm: props.onConfirm,
      onClose: () => setModal(prev => ({ ...prev, isOpen: false }))
    });
  };

  // Edit State
  const [editCenter, setEditCenter] = useState<Partial<VotingCenter>>({});
  const [tempEmergency, setTempEmergency] = useState<EmergencyContact>({ name: '', mobile: '' });
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newAdminPassword, setNewAdminPassword] = useState('');

  // Cloud Sync Functions
  const pushToCloud = async (newData?: Partial<CloudData>) => {
    setIsSyncing(true);
    const timestamp = Date.now();
    const dataToPush: CloudData = {
      centers: newData?.centers ?? centers,
      emergencyContact: newData?.emergencyContact ?? emergencyContact,
      userPassword: newData?.userPassword ?? userPassword,
      adminPassword: newData?.adminPassword ?? adminPassword,
      lastUpdated: timestamp
    };

    // First save to LocalStorage to ensure we don't lose data if cloud fails
    localStorage.setItem('army_centers_cache', JSON.stringify(dataToPush.centers));
    localStorage.setItem('army_emergency_cache', JSON.stringify(dataToPush.emergencyContact));
    localStorage.setItem('army_user_pass_cache', dataToPush.userPassword || '');
    localStorage.setItem('army_admin_pass_cache', dataToPush.adminPassword || '');
    localStorage.setItem('army_last_updated', timestamp.toString());
    setLastUpdated(timestamp);

    try {
      const response = await fetch(API_BASE, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(dataToPush)
      });
      if (!response.ok) throw new Error("Sync Failed");
      setSyncError(null);
    } catch (err) {
      console.error("Push failed:", err);
      setSyncError("ক্লাউড সিঙ্ক ব্যর্থ। ডাটা বর্তমানে শুধুমাত্র আপনার ব্রাউজারে সংরক্ষিত আছে।");
    } finally {
      setIsSyncing(false);
    }
  };

  const fetchFromCloud = async (isManual = false) => {
    try {
      if (isManual) setIsSyncing(true);
      const response = await fetch(API_BASE, {
        headers: { 'Accept': 'application/json' }
      });
      if (!response.ok) throw new Error("Fetch Failed");
      const data: CloudData = await response.json();
      
      // Update local state if cloud data is newer or if we've never synced
      if (data.lastUpdated > lastUpdated || !hasInitialSync) {
        if (data.centers) {
            setCenters(data.centers);
            localStorage.setItem('army_centers_cache', JSON.stringify(data.centers));
        }
        if (data.emergencyContact) {
            setEmergencyContact(data.emergencyContact);
            localStorage.setItem('army_emergency_cache', JSON.stringify(data.emergencyContact));
        }
        if (data.userPassword) {
            setUserPassword(data.userPassword);
            localStorage.setItem('army_user_pass_cache', data.userPassword);
        }
        if (data.adminPassword) {
            setAdminPassword(data.adminPassword);
            localStorage.setItem('army_admin_pass_cache', data.adminPassword);
        }
        const newTime = data.lastUpdated || Date.now();
        setLastUpdated(newTime);
        localStorage.setItem('army_last_updated', newTime.toString());
        setHasInitialSync(true);
      }
      setSyncError(null);
    } catch (err) {
      console.error("Cloud fetch error:", err);
      if (isManual) setSyncError("সার্ভার থেকে ডাটা পাওয়া যায়নি।");
    } finally {
      if (isManual) setIsSyncing(false);
    }
  };

  // Polling for updates
  useEffect(() => {
    fetchFromCloud();
    const interval = setInterval(() => {
      // Don't poll while editing to avoid remote overwrites
      if (view !== 'EDIT_CENTER' && view !== 'SETTINGS') {
        fetchFromCloud();
      }
    }, 20000); 
    return () => clearInterval(interval);
  }, [view, lastUpdated, hasInitialSync]);

  // Load Google Maps script
  useEffect(() => {
    const existingScript = document.getElementById('google-maps-script');
    if (!existingScript) {
      const script = document.createElement('script');
      script.id = 'google-maps-script';
      // Fallback API key check
      const apiKey = (window as any).process?.env?.API_KEY || (import.meta as any).env?.VITE_API_KEY || '';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === userPassword) {
      setIsLoggedIn(true);
      setError('');
    } else {
      setError('ভুল পাসওয়ার্ড! আবার চেষ্টা করুন।');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputAdminPassword === adminPassword) {
      setIsAdminLoggedIn(true);
      setView('ADMIN');
      setAdminError('');
    } else {
      setAdminError('ভুল অ্যাডমিন পাসওয়ার্ড!');
    }
  };

  const handleLogout = () => {
    showModal({
      title: 'লগআউট নিশ্চিতকরণ',
      message: 'আপনি কি নিশ্চিত যে আপনি অ্যাপ্লিকেশন থেকে লগআউট করতে চান?',
      type: 'WARNING',
      showCancel: true,
      confirmText: 'লগআউট',
      onConfirm: () => {
        setIsLoggedIn(false);
        setIsAdminLoggedIn(false);
        localStorage.removeItem('app_is_logged_in');
        localStorage.removeItem('app_is_admin_logged_in');
        setInputPassword('');
        setInputAdminPassword('');
        setView('HOME');
        setIsSidebarOpen(false);
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const filteredCenters = useMemo(() => {
    if (!searchQuery) return centers;
    const lowerQuery = searchQuery.toLowerCase();
    return centers.filter(center => 
      center.name.toLowerCase().includes(lowerQuery) ||
      center.centerNumber.includes(searchQuery) ||
      center.importantPersons.some(p => 
        p.name.toLowerCase().includes(lowerQuery) || 
        p.mobile.includes(searchQuery) ||
        p.designation.toLowerCase().includes(lowerQuery)
      )
    );
  }, [searchQuery, centers]);

  const stats = useMemo(() => ({
    totalCenters: centers.length,
    totalPersonnel: centers.reduce((acc, curr) => acc + curr.importantPersons.length, 0),
  }), [centers]);

  const navigateToDetails = (center: VotingCenter) => {
    setSelectedCenter(center);
    setView('CENTER_DETAILS');
    setIsSidebarOpen(false);
  };

  const goBack = () => {
    if (view === 'CENTER_DETAILS') setView('HOME');
    else if (view === 'CENTER_INFO' || view === 'PERSONS') setView('CENTER_DETAILS');
    else if (view === 'EDIT_CENTER' || view === 'SETTINGS') setView('ADMIN');
    else if (view === 'ADMIN' || view === 'ADMIN_LOGIN') setView('HOME');
    else setView('HOME');
  };

  const goHome = () => {
    setView('HOME');
    setSelectedCenter(null);
    setIsSidebarOpen(false);
    setSearchQuery('');
  };

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const deleteCenter = (id: string) => {
    showModal({
      title: 'মুছে ফেলার নিশ্চিতকরণ',
      message: 'আপনি কি নিশ্চিত যে এই কেন্দ্রটি তালিকা থেকে চিরতরে মুছে ফেলতে চান?',
      type: 'DANGER',
      showCancel: true,
      confirmText: 'মুছে ফেলুন',
      onConfirm: async () => {
        const filtered = centers.filter(c => c.id !== id).map((c, index) => ({
          ...c,
          centerNumber: toBengaliDigits((index + 1).toString().padStart(2, '0'))
        }));
        setCenters(filtered);
        await pushToCloud({ centers: filtered });
        if (selectedCenter?.id === id) {
          setSelectedCenter(null);
        }
        setModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const startEdit = (center?: VotingCenter) => {
    if (center) {
      setEditCenter(JSON.parse(JSON.stringify(center)));
    } else {
      const nextNum = (centers.length + 1).toString().padStart(2, '0');
      setEditCenter({
        id: Date.now().toString(),
        centerNumber: toBengaliDigits(nextNum),
        name: '',
        boothCount: '',
        voterCount: '',
        roomLocation: '',
        locationLink: '',
        importantPersons: []
      });
    }
    setView('EDIT_CENTER');
  };

  const saveCenter = async () => {
    if (!editCenter.name || !editCenter.centerNumber) {
      showModal({
        title: 'অসম্পূর্ণ তথ্য',
        message: 'অনুগ্রহ করে কেন্দ্রের নাম এবং নম্বর প্রদান করুন।',
        type: 'WARNING'
      });
      return;
    }
    const finalCenter = {
      id: editCenter.id,
      centerNumber: editCenter.centerNumber,
      name: editCenter.name,
      boothCount: editCenter.boothCount || '',
      voterCount: editCenter.voterCount || '',
      roomLocation: editCenter.roomLocation || '',
      locationLink: editCenter.locationLink || '',
      importantPersons: editCenter.importantPersons || []
    } as VotingCenter;

    let updatedCenters;
    const existsIndex = centers.findIndex(c => c.id === editCenter.id);
    if (existsIndex > -1) {
      updatedCenters = [...centers];
      updatedCenters[existsIndex] = finalCenter;
    } else {
      updatedCenters = [...centers, finalCenter];
    }
    
    updatedCenters = updatedCenters.map((c, index) => ({
      ...c,
      centerNumber: toBengaliDigits((index + 1).toString().padStart(2, '0'))
    }));

    setCenters(updatedCenters);
    await pushToCloud({ centers: updatedCenters });
    
    showModal({
      title: 'সফলভাবে সংরক্ষিত',
      message: 'কেন্দ্রের তথ্য সফলভাবে ডাটাবেসে আপডেট করা হয়েছে।',
      type: 'SUCCESS'
    });
    setView('ADMIN');
  };

  // Google Map Initialization logic for picker
  useEffect(() => {
    if (showMapPicker && mapContainerRef.current && (window as any).google) {
      const google = (window as any).google;
      const patengaPos = { lat: 22.2513, lng: 91.7915 };
      let initialPos = patengaPos;

      const coordMatch = editCenter.locationLink?.match(/q=([\d.]+),([\d.]+)/);
      if (coordMatch) {
        initialPos = { lat: parseFloat(coordMatch[1]), lng: parseFloat(coordMatch[2]) };
      }

      gMapRef.current = new google.maps.Map(mapContainerRef.current, {
        center: initialPos,
        zoom: 15,
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: false
      });

      gMarkerRef.current = new google.maps.Marker({
        position: initialPos,
        map: gMapRef.current,
        draggable: true,
        animation: google.maps.Animation.DROP,
      });

      gMapRef.current.addListener('click', (e: any) => {
        gMarkerRef.current.setPosition(e.latLng);
      });
    }
  }, [showMapPicker]);

  const handleMapConfirm = () => {
    const pos = gMarkerRef.current.getPosition();
    const gMapsLink = `https://www.google.com/maps?q=${pos.lat()},${pos.lng()}`;
    setEditCenter({ ...editCenter, locationLink: gMapsLink });
    setShowMapPicker(false);
  };

  const handleMapSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mapSearchTerm || !(window as any).google) return;
    const google = (window as any).google;
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ address: mapSearchTerm + ', Chattogram, Bangladesh' }, (results: any, status: any) => {
      if (status === 'OK' && results[0]) {
        const pos = results[0].geometry.location;
        gMapRef.current.setCenter(pos);
        gMapRef.current.setZoom(17);
        gMarkerRef.current.setPosition(pos);
      } else {
        showModal({ title: 'ত্রুটি', message: 'জায়গাটি খুঁজে পাওয়া যায়নি!', type: 'WARNING' });
      }
    });
  };

  const getMapEmbedUrl = (link: string) => {
    const match = link?.match(/q=([\d.]+),([\d.]+)/);
    if (match) return `https://maps.google.com/maps?q=${match[1]},${match[2]}&hl=bn&z=15&output=embed`;
    return null;
  };

  const updatePersonInEdit = (id: string, field: keyof Person, value: string) => {
    const updated = (editCenter.importantPersons || []).map(p => 
      p.id === id ? { ...p, [field]: value } : p
    );
    setEditCenter({ ...editCenter, importantPersons: updated });
  };

  const removePersonFromEdit = (id: string) => {
    setEditCenter({
      ...editCenter,
      importantPersons: (editCenter.importantPersons || []).filter(p => p.id !== id)
    });
  };

  const saveEmergencyContact = async () => {
    if (!tempEmergency.name || !tempEmergency.mobile) {
      showModal({
        title: 'ত্রুটি',
        message: 'অনুগ্রহ করে নাম এবং মোবাইল নম্বর উভয়ই পূরণ করুন।',
        type: 'WARNING'
      });
      return;
    }
    setEmergencyContact(tempEmergency);
    await pushToCloud({ emergencyContact: tempEmergency });
    showModal({
      title: 'আপডেট সফল',
      message: 'জরুরী যোগাযোগ নম্বর সফলভাবে ডাটাবেসে সেভ হয়েছে!',
      type: 'SUCCESS'
    });
  };

  useEffect(() => {
    if (view === 'ADMIN') {
      setTempEmergency(emergencyContact);
    }
  }, [view, emergencyContact]);

  const exportData = () => {
    const data: CloudData = { centers, emergencyContact, userPassword, adminPassword, lastUpdated };
    const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EPZ_ARMY_BACKUP_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    showModal({ title: 'রপ্তানি সফল', message: 'আপনার ডাটাবেস ফাইলটি ডাউনলোড হয়েছে। এটি সুরক্ষিত স্থানে রাখুন।', type: 'SUCCESS' });
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
        try {
            const data: CloudData = JSON.parse(event.target?.result as string);
            if (data.centers && data.emergencyContact) {
                setCenters(data.centers);
                setEmergencyContact(data.emergencyContact);
                if (data.userPassword) setUserPassword(data.userPassword);
                if (data.adminPassword) setAdminPassword(data.adminPassword);
                const timestamp = Date.now();
                setLastUpdated(timestamp);
                await pushToCloud({ 
                    centers: data.centers, 
                    emergencyContact: data.emergencyContact,
                    userPassword: data.userPassword,
                    adminPassword: data.adminPassword
                });
                showModal({ title: 'আমদানি সফল', message: 'ডাটাবেস সফলভাবে আমদানি এবং সিঙ্ক করা হয়েছে!', type: 'SUCCESS' });
            }
        } catch (err) {
            showModal({ title: 'ত্রুটি', message: 'ফাইলটি সঠিক ফরম্যাটে নেই।', type: 'DANGER' });
        }
    };
    reader.readAsText(file);
  };

  const ModalPortal = () => {
    if (!modal.isOpen) return null;
    const typeIcons = {
      SUCCESS: <CheckCircleIcon className="h-16 w-16 text-emerald-500" />,
      WARNING: <ExclamationCircleIcon className="h-16 w-16 text-amber-500" />,
      DANGER: <ExclamationCircleIcon className="h-16 w-16 text-red-500" />,
      INFO: <InformationCircleIcon className="h-16 w-16 text-blue-500" />,
    };

    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeInFast">
        <div className="bg-white w-full max-w-sm rounded-[2.5rem] shadow-2xl overflow-hidden animate-pop">
          <div className="p-8 text-center">
            <div className="flex justify-center mb-4">{typeIcons[modal.type]}</div>
            <h3 className="text-xl font-black text-black mb-2">{modal.title}</h3>
            <p className="text-gray-800 font-bold text-sm leading-relaxed mb-8">{modal.message}</p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (modal.onConfirm) modal.onConfirm();
                  else modal.onClose();
                }}
                className={`w-full py-4 rounded-2xl font-black text-white shadow-lg active:scale-95 transition-all ${
                  modal.type === 'DANGER' ? 'bg-red-600' : 
                  modal.type === 'SUCCESS' ? 'bg-emerald-600' :
                  modal.type === 'WARNING' ? 'bg-amber-600' : 'bg-army-green'
                }`}
              >
                {modal.confirmText}
              </button>
              {modal.showCancel && (
                <button onClick={modal.onClose} className="w-full py-3 text-gray-800 font-black uppercase text-xs tracking-widest active:opacity-50 transition-all cursor-pointer">
                  {modal.cancelText}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-200 p-4 font-['Hind_Siliguri']">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden border-t-8 border-army-green animate-fadeIn">
          <div className="p-8 text-center">
            <div className="mb-6 flex justify-center">
              <div className="bg-army-green p-5 rounded-2xl shadow-xl"><LockClosedIcon className="h-10 w-10 text-white" /></div>
            </div>
            <h1 className="text-2xl font-black text-black mb-2">প্রবেশাধিকার</h1>
            <p className="text-gray-800 font-bold mb-8 uppercase tracking-widest text-[10px]">ইপিজেড আর্মি ক্যাম্প - ২০২৬</p>
            <form onSubmit={handleLogin} className="space-y-5">
              <input
                type="password"
                placeholder="পাসওয়ার্ড দিন"
                className="w-full px-4 py-4 rounded-2xl border-2 border-gray-400 focus:outline-none focus:border-army-green transition-all bg-gray-50 text-center text-xl font-black text-black cursor-text placeholder-gray-500"
                value={inputPassword}
                autoFocus
                onChange={(e) => setInputPassword(e.target.value)}
              />
              {error && <p className="text-red-700 text-xs font-black bg-red-50 py-3 rounded-xl border border-red-200">{error}</p>}
              <button type="submit" className="w-full bg-army-green hover:bg-emerald-900 text-white font-black py-4 rounded-2xl transition-all shadow-xl active:scale-95 text-lg cursor-pointer">ভেরিফাই করুন</button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 md:pb-8 flex flex-col bg-slate-50 overflow-x-hidden font-['Hind_Siliguri'] antialiased text-black">
      <ModalPortal />
      
      {showMapPicker && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="p-4 bg-army-green text-white flex justify-between items-center">
                <h3 className="font-black flex items-center gap-2"><MapPinIcon className="h-5 w-5 text-army-gold" /> অবস্থান পিন পয়েন্ট করুন</h3>
                <button onClick={() => setShowMapPicker(false)} className="hover:rotate-90 transition-transform cursor-pointer"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <div className="p-4 bg-gray-100 shadow-inner">
               <form onSubmit={handleMapSearch} className="flex gap-2">
                 <input type="text" className="flex-1 px-4 py-3 rounded-xl border-2 border-gray-300 font-bold text-sm focus:border-army-green outline-none" placeholder="জায়গার নাম লিখে খুঁজুন..." value={mapSearchTerm} onChange={e => setMapSearchTerm(e.target.value)} />
                 <button type="submit" className="bg-army-gold text-army-green px-6 py-3 rounded-xl font-black shadow-md active:scale-95 transition-all">খুঁজুন</button>
               </form>
            </div>
            <div ref={mapContainerRef} className="flex-1 w-full min-h-[400px]"></div>
            <div className="p-4 bg-slate-50 border-t flex gap-4">
              <button onClick={() => setShowMapPicker(false)} className="flex-1 py-4 bg-gray-200 text-black rounded-xl font-black active:scale-95 transition-all">বাতিল</button>
              <button onClick={handleMapConfirm} className="flex-1 py-4 bg-army-green text-white rounded-xl font-black shadow-lg active:scale-95 transition-all">অবস্থান নিশ্চিত করুন</button>
            </div>
          </div>
        </div>
      )}

      {showSOS && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeInFast">
          <div className="bg-white w-full max-w-xs rounded-3xl overflow-hidden shadow-2xl">
            <div className="bg-red-600 p-8 text-center text-white">
              <MegaphoneIcon className="h-12 w-12 mx-auto mb-4 animate-bounce" />
              <h2 className="text-2xl font-black mb-1">জরুরী যোগাযোগ</h2>
            </div>
            <div className="p-6 space-y-4">
               <a href={`tel:${emergencyContact.mobile}`} className="flex items-center justify-between p-4 bg-red-50 rounded-2xl border border-red-100 active:scale-95 transition-all">
                  <div>
                    <p className="text-[9px] font-black text-red-600 uppercase tracking-widest mb-1">{emergencyContact.name}</p>
                    <p className="font-black text-lg text-black">{emergencyContact.mobile}</p>
                  </div>
                  <div className="bg-red-600 p-3 rounded-xl text-white"><PhoneIcon className="h-5 w-5" /></div>
               </a>
               <button onClick={() => setShowSOS(false)} className="w-full py-2 text-gray-800 font-black uppercase text-[10px] cursor-pointer">বন্ধ করুন</button>
            </div>
          </div>
        </div>
      )}

      <aside className={`fixed top-0 left-0 h-full w-72 bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-8 text-white" style={{ background: 'linear-gradient(135deg, #006847 0%, #004d35 100%)' }}>
          <div className="flex justify-between items-start mb-6">
            <div className="bg-white/10 p-3 rounded-2xl border border-white/20"><ShieldCheckIcon className="h-8 w-8 text-white" /></div>
            <button onClick={toggleSidebar} className="p-2 hover:bg-white/10 rounded-full cursor-pointer"><XMarkIcon className="h-6 w-6 text-white" /></button>
          </div>
          <h2 className="text-2xl font-black mb-1">ইপিজেড আর্মি</h2>
          <p className="text-[9px] opacity-80 font-black uppercase tracking-widest">Central Database v5.2</p>
        </div>

        <nav className="p-4 space-y-1">
          <button onClick={goHome} className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all cursor-pointer ${view === 'HOME' ? 'bg-army-green text-white font-black' : 'text-black hover:bg-gray-100 font-bold'}`}>
            <HomeIcon className="h-5 w-5" /><span className="text-sm">মূল পাতা</span>
          </button>
          <div className="border-t border-gray-100 my-4 pt-4">
            <p className="px-4 text-[9px] uppercase font-black text-black tracking-widest mb-2">প্রশাসন</p>
            <button onClick={() => { isAdminLoggedIn ? setView('ADMIN') : setView('ADMIN_LOGIN'); setIsSidebarOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all cursor-pointer ${(view === 'ADMIN' || view === 'ADMIN_LOGIN') ? 'bg-orange-600 text-white font-black' : 'text-black hover:bg-gray-100 font-bold'}`}>
              <Cog6ToothIcon className="h-5 w-5" /><span className="text-sm">অ্যাডমিন প্যানেল</span>
            </button>
          </div>
          <div className="border-t border-gray-100 my-4 pt-4">
            <p className="px-4 text-[9px] uppercase font-black text-black tracking-widest mb-2">সেটিংস</p>
            <button onClick={() => { setView('SETTINGS'); setIsSidebarOpen(false); }} className={`flex items-center gap-4 w-full p-4 rounded-xl transition-all cursor-pointer ${view === 'SETTINGS' ? 'bg-blue-600 text-white font-black' : 'text-black hover:bg-gray-100 font-bold'}`}>
              <KeyIcon className="h-5 w-5" /><span className="text-sm">পাসওয়ার্ড পরিবর্তন</span>
            </button>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-4 w-full p-4 rounded-xl text-red-700 hover:bg-red-50 transition-all font-black mt-8 cursor-pointer">
            <ArrowRightOnRectangleIcon className="h-5 w-5" /><span className="text-sm">লগআউট</span>
          </button>
        </nav>
      </aside>

      <header className="bg-army-green text-white p-4 sticky top-0 z-50 shadow-lg border-b border-white/5 flex items-center justify-between">
        <button onClick={toggleSidebar} className="p-2 hover:bg-white/10 rounded-xl transition-all flex-shrink-0 cursor-pointer"><Bars3Icon className="h-6 w-6 text-white" /></button>
        <div className="flex-1 text-center cursor-pointer" onClick={goHome}>
          <h1 className="text-base font-black text-white">ইপিজেড আর্মি ক্যাম্প</h1>
          <div className="flex items-center justify-center gap-1.5">
             <div className={`w-1.5 h-1.5 rounded-full ${syncError ? 'bg-red-500' : isSyncing ? 'bg-yellow-400 animate-pulse' : 'bg-emerald-400'}`}></div>
             <p className="text-[7px] opacity-80 uppercase tracking-widest font-black text-white">ত্রোয়োদশ জাতীয় সংসদ নির্বাচন</p>
          </div>
        </div>
        <button onClick={() => setShowSOS(true)} className="p-2.5 bg-red-600 text-white rounded-xl shadow-md border border-red-500 flex-shrink-0 active:scale-95 cursor-pointer"><MegaphoneIcon className="h-5 w-5" /></button>
      </header>

      {syncError && (
        <div className="bg-red-100 border-b border-red-200 text-red-700 px-4 py-2 text-[10px] font-bold text-center animate-fadeInFast">
          {syncError} <button onClick={() => fetchFromCloud(true)} className="underline ml-2">আবার চেষ্টা করুন</button>
        </div>
      )}

      <main className="flex-1 max-w-6xl mx-auto w-full p-4 md:p-8 overflow-y-auto">
        {view === 'HOME' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none"><MagnifyingGlassIcon className="h-6 w-6 text-black" /></div>
              <input type="text" placeholder="নাম বা নম্বর দিয়ে খুঁজুন..." className="block w-full pl-16 pr-6 py-4 rounded-2xl bg-white shadow-md focus:ring-4 focus:ring-army-green/5 outline-none text-lg font-black text-black" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <h2 className="text-[10px] font-black text-black uppercase tracking-widest col-span-full px-2 mb-2 flex items-center gap-2">
                <span className="bg-army-gold w-6 h-1 rounded-full"></span>কেন্দ্রের তালিকা ({toBengaliDigits(filteredCenters.length)})
              </h2>
              {filteredCenters.map((center) => (
                <button key={center.id} onClick={() => navigateToDetails(center)} className="flex flex-col gap-4 bg-white p-6 rounded-3xl shadow-sm border-2 border-transparent hover:border-army-green/10 text-left w-full active:scale-95 transition-all group cursor-pointer">
                  <div className="bg-army-gold text-army-green font-black w-10 h-10 flex items-center justify-center rounded-xl text-lg group-hover:bg-army-green group-hover:text-white transition-colors">{center.centerNumber}</div>
                  <div><h3 className="font-black text-black text-lg leading-tight mb-1">{center.name}</h3><p className="text-[9px] text-gray-800 font-black uppercase tracking-widest"> বিস্তারিত তথ্য দেখুন</p></div>
                </button>
              ))}
            </div>
          </div>
        )}

        {view === 'ADMIN_LOGIN' && (
          <div className="max-w-xs mx-auto mt-20 bg-white p-8 rounded-3xl shadow-xl border-t-8 border-orange-500 animate-fadeIn">
             <h2 className="text-xl font-black text-center mb-6 text-black">অ্যাডমিন কন্ট্রোল</h2>
             <form onSubmit={handleAdminLogin} className="space-y-4">
               <input type="password" placeholder="অ্যাডমিন পিন দিন" autoFocus className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-gray-400 focus:border-orange-500 outline-none text-center font-black cursor-text text-black placeholder-gray-500" value={inputAdminPassword} onChange={e => setInputAdminPassword(e.target.value)} />
               {adminError && <p className="text-red-700 text-[10px] text-center font-bold">{adminError}</p>}
               <button type="submit" className="w-full bg-orange-600 text-white py-3 rounded-xl font-black shadow-lg active:scale-95 cursor-pointer">প্রবেশ করুন</button>
             </form>
           </div>
        )}

        {view === 'ADMIN' && (
          <div className="space-y-6 animate-fadeIn pb-12">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-300">
                <p className="text-[10px] font-black text-black uppercase">মোট কেন্দ্র</p>
                <p className="text-3xl font-black text-black">{toBengaliDigits(stats.totalCenters)}</p>
              </div>
              <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-300">
                <p className="text-[10px] font-black text-black uppercase">মোট সদস্য</p>
                <p className="text-3xl font-black text-black">{toBengaliDigits(stats.totalPersonnel)}</p>
              </div>
              <button onClick={() => fetchFromCloud(true)} className={`bg-white p-4 rounded-2xl shadow-sm border border-emerald-200 flex items-center justify-between group active:scale-95 transition-all cursor-pointer ${isSyncing ? 'animate-pulse' : ''}`}>
                <span className="text-sm font-black text-emerald-800">রিফ্রেশ ডাটা</span>
                <CloudArrowUpIcon className="h-6 w-6 text-emerald-500 group-hover:text-emerald-800 transition-colors" />
              </button>
            </div>
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-red-200 space-y-4">
              <h2 className="text-lg font-black text-black flex items-center gap-3"><MegaphoneIcon className="h-6 w-6 text-red-600" />জরুরী যোগাযোগ সেটিংস</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input type="text" placeholder="দায়িত্বপ্রাপ্তর নাম" className="w-full px-4 py-2 rounded-xl bg-slate-50 border-2 border-gray-300 font-bold" value={tempEmergency.name} onChange={e => setTempEmergency({...tempEmergency, name: e.target.value})} />
                <input type="text" placeholder="মোবাইল নম্বর" className="w-full px-4 py-2 rounded-xl bg-slate-50 border-2 border-gray-300 font-bold" value={tempEmergency.mobile} onChange={e => setTempEmergency({...tempEmergency, mobile: e.target.value})} />
              </div>
              <button onClick={saveEmergencyContact} className="bg-red-600 text-white px-6 py-2 rounded-xl font-black shadow-md hover:bg-red-700 active:scale-95 transition-all cursor-pointer">জরুরী নম্বর আপডেট করুন</button>
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between bg-white p-6 rounded-3xl shadow-sm gap-4 border border-slate-200">
              <h2 className="text-xl font-black text-black">কেন্দ্র ব্যবস্থাপনা</h2>
              <button onClick={() => startEdit()} className="bg-army-green text-white px-6 py-3 rounded-xl font-black flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all cursor-pointer"><PlusIcon className="h-5 w-5" /> নতুন কেন্দ্র যোগ করুন</button>
            </div>
            <div className="bg-white rounded-3xl shadow-sm overflow-hidden border border-slate-300">
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-sm min-w-[600px] border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-300">
                    <tr className="text-black">
                      <th className="px-6 py-4 font-black uppercase text-[10px] w-20">নং</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px]">কেন্দ্রের নাম</th>
                      <th className="px-6 py-4 font-black uppercase text-[10px] text-right">অ্যাকশন</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-black">
                    {centers.map(c => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4 font-black text-army-green text-base">{c.centerNumber}</td>
                        <td className="px-6 py-4 font-bold">{c.name}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button onClick={() => startEdit(c)} className="p-2 text-blue-800 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer border border-blue-200"><PencilSquareIcon className="h-5 w-5" /></button>
                            <button onClick={() => deleteCenter(c.id)} className="p-2 text-red-700 bg-red-50 rounded-lg hover:bg-red-100 transition-colors cursor-pointer border border-red-200"><TrashIcon className="h-5 w-5" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {view === 'SETTINGS' && (
          <div className="max-w-md mx-auto animate-fadeIn space-y-6 pb-12">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-blue-600 space-y-8">
              <h2 className="text-xl font-black mb-6 flex items-center gap-3 text-black">
                <KeyIcon className="h-6 w-6 text-blue-600" />
                পাসওয়ার্ড পরিবর্তন
              </h2>
              
              <div className="space-y-6">
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                    <UserGroupIcon className="h-4 w-4 text-army-green" /> ইউজার পাসওয়ার্ড
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="password"
                      placeholder="নতুন ইউজার পাসওয়ার্ড"
                      className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-300 focus:border-army-green outline-none font-black text-center cursor-text text-black"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                    />
                    <button 
                      onClick={async () => {
                        if (!newUserPassword) return;
                        const newPass = newUserPassword;
                        setUserPassword(newPass);
                        await pushToCloud({ userPassword: newPass });
                        setNewUserPassword('');
                        showModal({ title: 'সাফল্য', message: 'ইউজার পাসওয়ার্ড পরিবর্তিত হয়েছে!', type: 'SUCCESS' });
                      }}
                      className="w-full py-3 bg-army-green text-white rounded-xl font-black shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      আপডেট করুন
                    </button>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200">
                  <h3 className="text-sm font-black mb-4 flex items-center gap-2">
                    <Cog6ToothIcon className="h-4 w-4 text-orange-600" /> অ্যাডমিন পিন
                  </h3>
                  <div className="space-y-4">
                    <input
                      type="password"
                      placeholder="নতুন অ্যাডমিন পিন"
                      className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-300 focus:border-orange-600 outline-none font-black text-center cursor-text text-black"
                      value={newAdminPassword}
                      onChange={(e) => setNewAdminPassword(e.target.value)}
                    />
                    <button 
                      onClick={async () => {
                        if (!newAdminPassword) return;
                        const newPass = newAdminPassword;
                        setAdminPassword(newPass);
                        await pushToCloud({ adminPassword: newPass });
                        setNewAdminPassword('');
                        showModal({ title: 'সাফল্য', message: 'অ্যাডমিন পিন পরিবর্তিত হয়েছে!', type: 'SUCCESS' });
                      }}
                      className="w-full py-3 bg-orange-600 text-white rounded-xl font-black shadow-md active:scale-95 transition-all cursor-pointer"
                    >
                      আপডেট করুন
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Robust Persistence Alternative */}
            <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-slate-600 space-y-6">
               <h2 className="text-xl font-black text-black flex items-center gap-3">
                 <ShieldCheckIcon className="h-6 w-6 text-slate-600" />
                 বিকল্প ব্যাকআপ সিস্টেম
               </h2>
               <p className="text-xs font-bold text-gray-700">ক্লাউড সিঙ্ক কাজ না করলে আপনি আপনার ডাটাবেস ম্যানুয়ালি ব্যাকআপ নিতে পারেন এবং অন্য ফোনে আমদানি করতে পারেন।</p>
               <div className="grid grid-cols-1 gap-4">
                  <button onClick={exportData} className="flex items-center justify-center gap-3 w-full py-4 bg-slate-800 text-white rounded-2xl font-black active:scale-95 transition-all cursor-pointer">
                    <ArrowDownTrayIcon className="h-5 w-5" /> ডাটা এক্সপোর্ট করুন
                  </button>
                  <label className="flex items-center justify-center gap-3 w-full py-4 bg-slate-200 text-black rounded-2xl font-black active:scale-95 transition-all cursor-pointer text-center">
                    <ArrowUpTrayIcon className="h-5 w-5" /> ডাটা ইমপোর্ট করুন
                    <input type="file" accept=".json" onChange={importData} className="hidden" />
                  </label>
               </div>
            </div>
            
            <button onClick={goHome} className="w-full py-4 bg-slate-100 text-black rounded-2xl font-black active:scale-95 cursor-pointer shadow-md">ফিরে যান</button>
          </div>
        )}

        {view === 'EDIT_CENTER' && (
          <div className="max-w-2xl mx-auto animate-fadeIn pb-12">
            <div className="bg-white p-8 rounded-3xl shadow-xl border-t-8 border-army-green">
              <h2 className="text-2xl font-black mb-8 text-black flex items-center justify-between">
                <span>{centers.some(c => c.id === editCenter.id) ? 'কেন্দ্র তথ্য সংশোধন' : 'নতুন কেন্দ্র যোগ'}</span>
                <span className="text-sm bg-army-gold text-army-green px-3 py-1 rounded-lg font-black shadow-sm">নং: {editCenter.centerNumber}</span>
              </h2>
              <div className="space-y-6 text-black">
                <input type="text" placeholder="কেন্দ্রের নাম" className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-gray-400 focus:border-army-green outline-none font-black" value={editCenter.name || ''} onChange={e => setEditCenter({ ...editCenter, name: e.target.value })} />
                <div className="grid grid-cols-2 gap-4">
                  <input placeholder="ভোট কক্ষ সংখ্যা" className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-gray-400 focus:border-army-green outline-none font-bold" value={editCenter.boothCount || ''} onChange={e => setEditCenter({ ...editCenter, boothCount: e.target.value })} />
                  <input placeholder="মোট ভোটার" className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-gray-400 focus:border-army-green outline-none font-bold" value={editCenter.voterCount || ''} onChange={e => setEditCenter({ ...editCenter, voterCount: e.target.value })} />
                </div>
                <input placeholder="অবস্থান ও তলা" className="w-full px-4 py-3 rounded-xl bg-slate-50 border-2 border-gray-400 focus:border-army-green outline-none font-bold" value={editCenter.roomLocation || ''} onChange={e => setEditCenter({ ...editCenter, roomLocation: e.target.value })} />
                <div className="flex gap-2">
                  <input placeholder="গুগল ম্যাপ লিংক" className="flex-1 px-4 py-3 rounded-xl bg-slate-50 border-2 border-gray-400 focus:border-army-green outline-none font-mono text-xs" value={editCenter.locationLink || ''} onChange={e => setEditCenter({ ...editCenter, locationLink: e.target.value })} />
                  <button onClick={() => setShowMapPicker(true)} className="bg-army-gold text-army-green p-3 rounded-xl shadow-md border border-army-gold/30 hover:bg-army-green hover:text-army-gold transition-all active:scale-95"><MapIcon className="h-6 w-6" /></button>
                </div>
                <div className="border-t border-slate-300 pt-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-lg text-black">দায়িত্বপ্রাপ্ত ব্যক্তিবর্গ</h3>
                    <button onClick={() => setEditCenter(prev => ({ ...prev, importantPersons: [...(prev.importantPersons || []), { id: Date.now().toString(), name: '', designation: '', mobile: '' }] }))} className="text-emerald-800 bg-emerald-50 px-4 py-1.5 rounded-xl text-xs font-black border border-emerald-300 cursor-pointer">সদস্য যোগ করুন</button>
                  </div>
                  <div className="space-y-4">
                    {(editCenter.importantPersons || []).map(p => (
                      <div key={p.id} className="p-5 bg-slate-50 rounded-2xl relative border border-gray-300">
                        <div className="grid grid-cols-2 gap-3">
                          <input placeholder="নাম" className="bg-white px-4 py-2 rounded-xl border border-gray-400 text-sm font-bold" value={p.name} onChange={e => updatePersonInEdit(p.id, 'name', e.target.value)} />
                          <input placeholder="পদবী" className="bg-white px-4 py-2 rounded-xl border border-gray-400 text-sm font-bold" value={p.designation} onChange={e => updatePersonInEdit(p.id, 'designation', e.target.value)} />
                          <input placeholder="মোবাইল নম্বর" className="bg-white px-4 py-2 rounded-xl border border-gray-400 text-sm font-bold col-span-2" value={p.mobile} onChange={e => updatePersonInEdit(p.id, 'mobile', e.target.value)} />
                        </div>
                        <button onClick={() => removePersonFromEdit(p.id)} className="absolute -top-2 -right-2 bg-red-600 text-white p-1.5 rounded-full shadow-lg active:scale-90"><XMarkIcon className="h-4 w-4" /></button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 pt-6">
                  <button onClick={() => setView('ADMIN')} className="flex-1 py-4 bg-slate-100 text-black rounded-2xl font-black active:scale-95 transition-all cursor-pointer">বাতিল</button>
                  <button onClick={saveCenter} className="flex-1 py-4 bg-army-green text-white rounded-2xl font-black shadow-lg active:scale-95 transition-all cursor-pointer">তথ্য সংরক্ষণ করুন</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'CENTER_DETAILS' && selectedCenter && (
          <div className="space-y-6 animate-fadeIn max-w-lg mx-auto pb-12">
            <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-300 text-center relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><ShieldCheckIcon className="h-32 w-32 text-army-gold" /></div>
              <div className="bg-army-gold text-army-green px-4 py-1 rounded-lg text-[10px] font-black inline-block mb-4 relative z-10 shadow-sm">কেন্দ্র নং {selectedCenter.centerNumber}</div>
              <h2 className="text-2xl font-black text-black mb-8 relative z-10 leading-tight">{selectedCenter.name}</h2>
              <div className="mb-8 rounded-3xl overflow-hidden border-4 border-slate-100 relative shadow-inner bg-slate-200 aspect-video">
                {getMapEmbedUrl(selectedCenter.locationLink) ? (
                   <iframe title="Map" className="w-full h-full border-none" src={getMapEmbedUrl(selectedCenter.locationLink)!} allowFullScreen loading="lazy"></iframe>
                ) : (
                   <div className="w-full h-full flex flex-col items-center justify-center font-bold text-gray-500 gap-2"><ExclamationCircleIcon className="h-10 w-10 text-gray-400" />মানচিত্রের অবস্থান নেই</div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 relative z-10">
                <button onClick={() => setView('CENTER_INFO')} className="flex items-center gap-4 p-5 rounded-2xl bg-blue-50/50 border border-blue-200 text-left active:scale-95 transition-all cursor-pointer shadow-sm">
                  <div className="bg-army-green p-3 rounded-xl text-army-gold shadow-md"><InformationCircleIcon className="h-6 w-6" /></div>
                  <div><h4 className="font-black text-blue-950">ভোটকেন্দ্র তথ্য</h4><p className="text-[10px] text-blue-800 font-black">বিস্তারিত বিবরণ</p></div>
                </button>
                <a href={selectedCenter.locationLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-4 p-5 rounded-2xl bg-rose-50/50 border border-rose-200 text-left active:scale-95 transition-all cursor-pointer shadow-sm">
                  <div className="bg-army-green p-3 rounded-xl text-army-gold shadow-md"><MapPinIcon className="h-6 w-6" /></div>
                  <div><h4 className="font-black text-rose-950">ম্যাপ অ্যাপে দেখুন</h4><p className="text-[10px] text-rose-800 font-black">Google Maps-এ যান</p></div>
                </a>
                <button onClick={() => setView('PERSONS')} className="flex items-center gap-4 p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200 text-left active:scale-95 transition-all cursor-pointer shadow-sm">
                  <div className="bg-army-green p-3 rounded-xl text-army-gold shadow-md"><UserGroupIcon className="h-6 w-6" /></div>
                  <div><h4 className="font-black text-emerald-950">যোগাযোগ</h4><p className="text-[10px] text-emerald-800 font-black">ব্যক্তিবর্গ ও নম্বর</p></div>
                </button>
              </div>
            </div>
          </div>
        )}

        {view === 'CENTER_INFO' && selectedCenter && (
          <div className="animate-fadeIn space-y-4 max-w-lg mx-auto pb-12">
            <div className="bg-white rounded-3xl p-8 shadow-lg border border-slate-300 text-black">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl font-black text-black">কেন্দ্রের তথ্যাদি</h2>
                <button onClick={goBack} className="text-gray-800 p-1 hover:text-black transition-colors cursor-pointer"><XMarkIcon className="h-6 w-6" /></button>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-300 shadow-sm">
                  <div className="p-3 bg-army-green rounded-xl text-army-gold"><InboxStackIcon className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black text-black uppercase tracking-widest">ভোট কক্ষের সংখ্যা</p><p className="font-black text-xl text-black">{toBengaliDigits(selectedCenter.boothCount) || 'N/A'}</p></div>
                </div>
                <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-300 shadow-sm">
                  <div className="p-3 bg-army-green rounded-xl text-army-gold"><UserGroupIcon className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black text-black uppercase tracking-widest">মোট ভোটার</p><p className="font-black text-xl text-black">{toBengaliDigits(selectedCenter.voterCount) || 'N/A'}</p></div>
                </div>
                <div className="flex items-center gap-5 p-4 bg-slate-50 rounded-2xl border border-slate-300 shadow-sm">
                  <div className="p-3 bg-army-green rounded-xl text-army-gold"><BuildingOfficeIcon className="h-6 w-6" /></div>
                  <div><p className="text-[10px] font-black text-black uppercase tracking-widest">অবস্থান ও তলা</p><p className="font-black text-xl text-black leading-tight">{selectedCenter.roomLocation || 'N/A'}</p></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'PERSONS' && selectedCenter && (
          <div className="animate-fadeIn space-y-4 max-w-lg mx-auto pb-12">
            <div className="flex items-center justify-between mb-6 px-2 text-black">
              <h2 className="text-xl font-black text-black">যোগাযোগের তালিকা</h2>
              <button onClick={goBack} className="text-gray-800 p-1 hover:text-black transition-colors cursor-pointer"><XMarkIcon className="h-6 w-6" /></button>
            </div>
            <div className="space-y-4">
              {selectedCenter.importantPersons.map((p) => (
                <div key={p.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-300 flex items-center justify-between gap-4">
                  <div className="flex-1 text-black">
                    <h3 className="font-black text-black text-lg leading-tight">{p.name}</h3>
                    <p className="text-[10px] text-gray-900 font-black uppercase tracking-widest mt-0.5">{p.designation}</p>
                    <p className="mt-2 text-army-green font-black text-lg">{p.mobile}</p>
                  </div>
                  <div className="flex gap-2">
                    <a href={`tel:${p.mobile}`} className="p-3 bg-army-green text-army-gold rounded-xl shadow-md active:scale-90 transition-transform cursor-pointer border border-army-gold/30"><PhoneIcon className="h-5 w-5" /></a>
                    <a href={`https://wa.me/${p.mobile.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="p-3 bg-army-green text-army-gold rounded-xl shadow-md active:scale-90 transition-transform cursor-pointer border border-army-gold/30"><ChatBubbleLeftRightIcon className="h-5 w-5" /></a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 shadow-xl px-4 py-3 flex justify-between items-center z-50 md:hidden h-16">
        <button onClick={goBack} className="flex-1 flex flex-col items-center text-gray-800 transition-all cursor-pointer"><ArrowLeftIcon className="h-6 w-6" /><span className="text-[8px] font-black mt-1 uppercase">পিছনে</span></button>
        <div className="flex-1 flex justify-center -mt-8 relative z-[60]"><button onClick={goHome} className="bg-army-green text-army-gold p-4 rounded-2xl shadow-xl border-4 border-slate-50 active:scale-95 transition-all cursor-pointer"><HomeIcon className="h-7 w-7" /></button></div>
        <button onClick={toggleSidebar} className="flex-1 flex flex-col items-center text-gray-800 transition-all cursor-pointer"><Bars3Icon className="h-6 w-6" /><span className="text-[8px] font-black mt-1 uppercase">মেনু</span></button>
      </nav>

      <footer className="hidden md:block text-center py-10 text-black text-[9px] font-black uppercase tracking-[0.4em] border-t border-slate-300 mt-auto">EPZ ARMY SECURITY DASHBOARD • 2026 • Real-time Sync</footer>
      <style>{`
        @font-face { font-family: 'Hind Siliguri'; font-style: normal; font-weight: 400; font-display: swap; src: url(https://fonts.gstatic.com/s/hindsiliguri/v12/ijwbRE69Lv_n96G8UuE-P1u9o9id772V.woff2) format('woff2'); }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeInFast { from { opacity: 0; } to { opacity: 1; } }
        @keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-fadeInFast { animation: fadeInFast 0.2s ease-out forwards; }
        .animate-pop { animation: pop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        body { -webkit-tap-highlight-color: transparent; }
        * { box-sizing: border-box; }
        input::placeholder { font-weight: 700; color: #475569; opacity: 1; }
        /* Table scroll support */
        .overflow-x-auto {
            -webkit-overflow-scrolling: touch;
            scrollbar-width: thin;
        }
      `}</style>
    </div>
  );
};

export default App;
