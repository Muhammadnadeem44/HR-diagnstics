import React, { useState, useEffect } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
} from 'firebase/firestore';
import { db } from '../../firebase';
import {
  X,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Tv,
  CheckCircle2,
  Clock,
  Layers,
  Activity,
  FileText,
} from 'lucide-react';
import { ClinicToken } from '../../types';

interface PatientQueueDisplayModalProps {
  isOpen: boolean;
  tokens: ClinicToken[];
  onClose: () => void;
  onCallToken?: (token: ClinicToken) => void;
}

export const PatientQueueDisplayModal: React.FC<PatientQueueDisplayModalProps> = ({
  isOpen,
  tokens,
  onClose,
  onCallToken,
}) => {
  const [selectedDept, setSelectedDept] = useState<string>('All');
  const [isAudioEnabled, setIsAudioEnabled] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [isTvFullScreen, setIsTvFullScreen] = useState<boolean>(false);
  const [liveTokens, setLiveTokens] = useState<ClinicToken[]>(tokens);

  // Sync prop changes
  useEffect(() => {
    if (tokens && tokens.length > 0) {
      setLiveTokens(tokens);
    }
  }, [tokens]);

  // Real-time Firestore Live Subscription for Waiting Room TV
  useEffect(() => {
    if (!isOpen) return;
    const tokensRef = collection(db, 'clinic_tokens');
    const unsub = onSnapshot(
      query(tokensRef, orderBy('createdAt', 'desc')),
      (snapshot) => {
        if (!snapshot.empty) {
          const list: ClinicToken[] = [];
          snapshot.forEach((docSnap) => list.push(docSnap.data() as ClinicToken));
          setLiveTokens(list);
        }
      },
      (err) => console.warn('TV Queue Firestore sync note:', err)
    );
    return () => unsub();
  }, [isOpen]);

  // Live Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
      );
      setCurrentDate(
        now.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!isOpen) return null;

  // Filter tokens based on department
  const filteredTokens = liveTokens.filter(
    (t) => selectedDept === 'All' || t.department === selectedDept
  );

  // Active / Now Serving Token
  const nowServingToken =
    filteredTokens.find((t) => t.status === 'Called' || t.status === 'In Progress') ||
    filteredTokens[0] || {
      tokenNumber: 'A102',
      counterNumber: 'Counter 3',
      patientName: 'Now Serving Patient',
      department: 'Ultrasound',
      status: 'Called',
    };

  // Next Tokens list
  const queueList = filteredTokens.filter((t) => t.id !== nowServingToken.id).slice(0, 6);

  // Audio speech synthesis helper
  const playAnnouncement = (tokenNum: string, counter: string, lang = 'en') => {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const text =
        lang === 'ur'
          ? `Token number ${tokenNum}, ${counter} par tashreef layeie`
          : `Token ${tokenNum}, please proceed to ${counter}`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3 sm:p-6 select-none ${
        isTvFullScreen ? 'p-0 w-screen h-screen' : ''
      }`}
    >
      {/* Top Floating TV Controls Bar */}
      <div className="w-full max-w-6xl flex items-center justify-between pb-3 text-white text-xs">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-cyan-400" />
          <span className="font-extrabold text-sm tracking-wide">
            Waiting Room Patient Queue TV Display
          </span>
          <span className="hidden sm:inline-block px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 text-[10px] font-mono">
            Live Stream (1080p Full-HD Ready)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Department Filter Pills */}
          <div className="hidden md:flex items-center gap-1 bg-slate-800/80 p-1 rounded-lg border border-slate-700">
            {['All', 'Ultrasound', 'X-Ray', 'Laboratory', 'Consultation'].map((dept) => (
              <button
                key={dept}
                onClick={() => setSelectedDept(dept)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                  selectedDept === dept
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {dept}
              </button>
            ))}
          </div>

          {/* Sound Announcement Button */}
          <button
            onClick={() => {
              playAnnouncement(nowServingToken.tokenNumber, nowServingToken.counterNumber, 'en');
            }}
            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            title="Announce Current Token via Voice"
          >
            <Volume2 className="w-4 h-4" />
            <span>Voice Call</span>
          </button>

          {/* Urdu Voice Call */}
          <button
            onClick={() => {
              playAnnouncement(nowServingToken.tokenNumber, nowServingToken.counterNumber, 'ur');
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-[11px] transition-all"
            title="Urdu Voice Call"
          >
            اردو آواز
          </button>

          {/* Full Screen Toggle */}
          <button
            onClick={() => setIsTvFullScreen(!isTvFullScreen)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
            title="Toggle TV Full Screen"
          >
            {isTvFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white"
            title="Close TV Display"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* The Actual TV Display Card Matching image.png */}
      <div className="w-full max-w-6xl flex-1 bg-white rounded-3xl shadow-2xl border-4 border-slate-800 flex flex-col justify-between overflow-hidden p-6 sm:p-10 font-sans">
        {/* Header of TV Screen */}
        <div className="flex items-center justify-between pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 flex items-center justify-center text-white shadow-md">
              <Activity className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0c2340] tracking-tight">
                Patient Queue
              </h1>
              <p className="text-xs font-bold text-cyan-600 uppercase tracking-widest">
                HR DIAGNOSTICS & IMAGING CENTER
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 font-mono">
              {currentTime || '10:24 AM'}
            </div>
            <div className="text-xs sm:text-sm font-semibold text-slate-500">
              {currentDate || 'Monday, May 26'}
            </div>
          </div>
        </div>

        {/* Main TV Screen Content (Left Big Card & Right Table Matching image.png) */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 my-auto py-6 items-stretch">
          {/* LEFT FEATURED BIG CARD: Now Serving (Navy Blue Box) */}
          <div className="md:col-span-5 bg-[#0e3b6e] text-white rounded-3xl p-8 flex flex-col items-center justify-between text-center shadow-xl shadow-blue-900/30 min-h-[340px]">
            <span className="text-lg sm:text-xl font-bold tracking-wide text-cyan-200">
              Now Serving
            </span>

            {/* Massive Token Number */}
            <div className="my-2 text-6xl sm:text-7xl lg:text-8xl font-black text-white tracking-widest drop-shadow-md">
              {nowServingToken.tokenNumber}
            </div>

            {/* Counter Room */}
            <div className="text-2xl sm:text-3xl font-extrabold text-cyan-300">
              {nowServingToken.counterNumber || 'Counter 3'}
            </div>

            <p className="text-xs text-cyan-100/80 font-medium pt-3 border-t border-cyan-400/20 w-full">
              Thank you for your patience.
            </p>
          </div>

          {/* RIGHT QUEUE TABLE: Token Number | Counter | Status */}
          <div className="md:col-span-7 bg-[#f8fafc] rounded-3xl p-6 border border-slate-200 flex flex-col justify-between shadow-inner">
            <div className="w-full">
              {/* Table Header */}
              <div className="grid grid-cols-3 pb-3 border-b-2 border-slate-200 text-xs sm:text-sm font-bold text-slate-500 uppercase tracking-wider">
                <span>Token Number</span>
                <span className="text-center">Counter / Room</span>
                <span className="text-right">Status</span>
              </div>

              {/* Rows */}
              <div className="divide-y divide-slate-100 text-sm sm:text-base">
                {/* Row 1: Now Serving */}
                <div className="grid grid-cols-3 py-3.5 items-center font-bold">
                  <span className="text-xl sm:text-2xl font-black text-[#0c2340]">
                    {nowServingToken.tokenNumber}
                  </span>
                  <span className="text-center text-slate-700">
                    {nowServingToken.counterNumber || 'Counter 3'}
                  </span>
                  <span className="text-right text-emerald-600 font-extrabold flex items-center justify-end gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                    Now Serving
                  </span>
                </div>

                {/* Queue list rows */}
                {queueList.length > 0 ? (
                  queueList.map((tok, idx) => (
                    <div key={tok.id} className="grid grid-cols-3 py-3 items-center">
                      <span className="text-lg sm:text-xl font-bold text-slate-800">
                        {tok.tokenNumber}
                      </span>
                      <span className="text-center text-slate-600 font-medium">
                        {tok.counterNumber || `Counter ${idx + 1}`}
                      </span>
                      <span
                        className={`text-right font-bold ${
                          idx === 0
                            ? 'text-blue-600'
                            : 'text-slate-400'
                        }`}
                      >
                        {idx === 0 ? 'Next' : 'Waiting'}
                      </span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="grid grid-cols-3 py-3 items-center">
                      <span className="text-lg sm:text-xl font-bold text-slate-800">T-024</span>
                      <span className="text-center text-slate-600 font-medium">Counter 2</span>
                      <span className="text-right text-blue-600 font-bold">Next</span>
                    </div>
                    <div className="grid grid-cols-3 py-3 items-center">
                      <span className="text-lg sm:text-xl font-bold text-slate-800">T-025</span>
                      <span className="text-center text-slate-600 font-medium">Counter 1</span>
                      <span className="text-right text-slate-400 font-bold">Waiting</span>
                    </div>
                    <div className="grid grid-cols-3 py-3 items-center">
                      <span className="text-lg sm:text-xl font-bold text-slate-800">T-026</span>
                      <span className="text-center text-slate-600 font-medium">Counter 4</span>
                      <span className="text-right text-slate-400 font-bold">Waiting</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Department Quick Filter Tabs at bottom of table */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span className="font-semibold">Department Queue:</span>
              <span className="font-bold text-blue-600">
                {selectedDept === 'All' ? 'All Active Diagnostic Queues' : `${selectedDept} Queue`}
              </span>
            </div>
          </div>
        </div>

        {/* Bottom Footer Bar Matching image.png */}
        <div className="pt-4 border-t-2 border-slate-100 flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-slate-500 gap-2">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span className="font-semibold text-slate-700">
              Please have your ID and appointment details ready.
            </span>
          </div>

          <div className="font-semibold text-slate-600">
            Thank you for helping us serve you better.
          </div>
        </div>
      </div>
    </div>
  );
};
