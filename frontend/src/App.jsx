import React, { useState, useEffect, useRef } from 'react';
import { Wallet, ArrowRight, CheckCircle, RefreshCw, Globe, Shield, Zap, ArrowLeftRight, Clock, Lock, ChevronRight, Activity, Fingerprint, Cpu, Sparkles, ShieldCheck, Languages, Bot, X, Send } from 'lucide-react';

const translations = {
  ka: {
    heroTitle: ["გადარიცხე.", "მომენტალურად.", "მსოფლიო მასშტაბით."],
    heroSub: "0.01% საკომისიო. ბიუროკრატიის გარეშე. უმაღლესი დაცვა.",
    gateway: "კალკულატორი", infra: "ტექნოლოგია", security: "უსაფრთხოება", verify: "ავტორიზაცია",
    secured: "დაცული სესია", syncing: "ქსელის სინქრონიზაცია...", transfer: "გადარიცხვა", exchange: "კონვერტაცია",
    amount: "მოცულობა", iban: "მიმღების IBAN", receive: "მისაღები აქტივი", confirm: "დადასტურება", rate: "კურსი", fee: "საკომისიო",
    meshTitle: "Global Mesh პროტოკოლი", fortress: "ციფრული ფორთრესი", aiTitle: "ქსელის ასისტენტი",
    aiGreeting: "გამარჯობა! მე GlobalP2P-ის AI ასისტენტი ვარ. რით შემიძლია დაგეხმაროთ?", aiPlaceholder: "კითხეთ AI-ს რამე...", aiError: "კავშირის პრობლემაა. სცადეთ მოგვიანებით.",
    settled: "ტრანზაქცია დასრულებულია", newOrder: "ახალი ოპერაცია", privacy: "კონფიდენციალურობა", aml: "AML პოლიტიკა", terms: "წესები",
    meshDesc: "პირდაპირი წვდომა გლობალურ ბაზრებზე შუამავლების გარეშე.", logicTitle: "ჭკვიანი ლოგიკა", logicDesc: "ავტომატური ოპტიმიზაცია აქტივების მომენტალური ასახვისთვის."
  },
  en: {
    heroTitle: ["Transfer.", "Momentarily.", "Worldwide."],
    heroSub: "0.01% Fee. Zero Bureaucracy. Ultimate Security.",
    gateway: "Calculator", infra: "Technology", security: "Security", verify: "Authorize", secured: "Secured Session", syncing: "Syncing Mesh...",
    transfer: "Transfer", exchange: "Exchange", amount: "Volume", iban: "Recipient IBAN", receive: "Settled Asset", confirm: "Execute", rate: "Rate", fee: "Fee",
    meshTitle: "Global Mesh Protocol", fortress: "Digital Fortress", aiTitle: "Mesh AI Assistant",
    aiGreeting: "Hello! I am GlobalP2P AI assistant. How can I help you?", aiPlaceholder: "Ask AI anything...", aiError: "Connection error. Please try again later.",
    settled: "Protocol Settled", newOrder: "New Operation", privacy: "Privacy", aml: "AML Policy", terms: "Terms",
    meshDesc: "Direct access to global markets without intermediaries.", logicTitle: "Smart Logic", logicDesc: "Automated optimization for instantaneous asset reflection."
  },
  ru: {
    heroTitle: ["Переводи.", "Моментально.", "По всему миру."],
    heroSub: "0.01% Комиссия. Без Бюрократии. Высшая защита.",
    gateway: "Калькулятор", infra: "Технология", security: "Безопасность", verify: "Вход", secured: "Защищено", syncing: "Синхронизация...",
    transfer: "Перевод", exchange: "Обмен", amount: "Объем", iban: "IBAN получателя", receive: "Актив", confirm: "Ок",
    meshTitle: "Global Mesh Протокол", fortress: "Цифровая Крепость", aiTitle: "AI Ассистент",
    aiGreeting: "Привет! Я AI ассистент GlobalP2P. Чем могу помочь?", aiPlaceholder: "Спросите AI...", aiError: "Ошибка соединения. Попробуйте позже.",
    settled: "Транзакция завершена", newOrder: "Новая операция", privacy: "Конфиденциальность", aml: "AML Политика", terms: "Правила",
    meshDesc: "Прямой доступ к мировым рынкам без посредников.", logicTitle: "Smart Логика", logicDesc: "Автоматическая оптимизация для мгновенного зачисления."
  }
};

const SolarSystem = () => (
  <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#010a05]">
    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle, #10b981 1px, transparent 1px)', backgroundSize: '150px 150px' }}></div>
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] bg-gradient-to-br from-emerald-500/15 via-cyan-500/10 to-transparent blur-[180px] rounded-full animate-pulse"></div>
    {[
      { size: 'w-[450px] h-[450px]', speed: 'animate-[spin_40s_linear_infinite]', pColor: 'bg-white', glow: 'shadow-[0_0_15px_white]' },
      { size: 'w-[750px] h-[750px]', speed: 'animate-[spin_65s_linear_infinite]', pColor: 'bg-emerald-300', glow: 'shadow-[0_0_20px_#10b981]' },
      { size: 'w-[1050px] h-[1050px]', speed: 'animate-[spin_90s_linear_infinite]', pColor: 'bg-cyan-200', glow: 'shadow-[0_0_15px_#2dd4bf]' }
    ].map((orbit, i) => (
      <div key={i} className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/5 ${orbit.size} ${orbit.speed}`}>
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full ${orbit.pColor} ${orbit.glow}`}></div>
      </div>
    ))}
  </div>
);

export default function App() {
  const [lang, setLang] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [walletConnected, setWalletConnected] = useState(false);
  const [mode, setMode] = useState('transfer');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [txStatus, setTxStatus] = useState('idle');
  const [rates, setRates] = useState({ USD: 1, EUR: 0.92, GEL: 2.70, GBP: 0.79 });
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const t = translations[lang || 'ka'];

  useEffect(() => { if (lang && chatMessages.length === 0) setChatMessages([{ role: 'ai', text: t.aiGreeting }]); }, [lang, t, chatMessages.length]);
  useEffect(() => {
    const fetchRates = async () => {
      try {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const res = await fetch(`${API_URL}/api/rates`);
        if (res.ok) setRates(await res.json());
      } catch (e) { console.log('Syncing Mesh...'); }
    };
    fetchRates();
  }, []);

  const [fee, setFee] = useState(0);
  const [estimatedReceive, setEstimatedReceive] = useState(0);
  const [sendCurrency, setSendCurrency] = useState('GEL');
  const [receiveCurrency, setReceiveCurrency] = useState('EUR');

  useEffect(() => {
    const sendAmt = parseFloat(amount);
    if (!isNaN(sendAmt) && sendAmt > 0) {
      const sendRate = rates[sendCurrency] || 1;
      const recRate = rates[receiveCurrency] || 1;
      const percentFee = sendAmt * 0.0001;
      const minFee = 1 * sendRate;
      const actualFee = Math.max(percentFee, minFee);
      setFee(actualFee);
      const afterFee = sendAmt - actualFee;
      setEstimatedReceive(afterFee > 0 ? (afterFee / sendRate) * recRate : 0);
    } else {
      setFee(0);
      setEstimatedReceive(0);
    }
  }, [amount, sendCurrency, receiveCurrency, rates]);

  const generateAIResponse = async (userQuery) => {
    const apiKey = "";
    setIsAiTyping(true);
    const systemPrompt = `You are GlobalP2P AI assistant. Strictly respond in ${lang === 'ka' ? 'Georgian' : 'English'}. Fee is 0.01%. Worldwide transfers. Secure Mesh protocol. Professional tone.`;
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: userQuery }] }], systemInstruction: { parts: [{ text: systemPrompt }] } })
      });
      const result = await response.json();
      const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || "შეცდომაა პასუხში.";
      setChatMessages(prev => [...prev, { role: 'ai', text: aiText }]);
    } catch {
      setChatMessages(prev => [...prev, { role: 'ai', text: t.aiError }]);
    } finally { setIsAiTyping(false); }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || isAiTyping) return;
    const msg = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: msg }]);
    setChatInput('');
    generateAIResponse(msg);
  };

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, isAiTyping]);

  if (!lang) {
    return (
      <div className="min-h-screen bg-[#010a05] flex items-center justify-center p-6 relative overflow-hidden">
        <SolarSystem />
        <div className="relative z-10 w-full max-w-md text-center animate-in fade-in zoom-in duration-700">
          <div className="bg-white/[0.03] backdrop-blur-3xl border border-white/10 rounded-[3rem] p-12 shadow-2xl">
            <div className="w-16 h-16 bg-white text-emerald-900 rounded-2xl flex items-center justify-center mx-auto mb-10 shadow-[0_0_30px_white] transition-transform hover:scale-110"><Globe className="w-8 h-8" /></div>
            <div className="space-y-4">
              {['ka', 'en', 'ru'].map((l) => (
                <button key={l} onClick={() => setLang(l)} className="w-full py-5 bg-white/5 hover:bg-white/10 text-white border border-white/10 hover:border-emerald-500/50 rounded-2xl font-black text-[11px] tracking-[0.4em] uppercase transition-all flex items-center justify-between px-10 group">
                  <span>{l === 'ka' ? 'ქართული' : l === 'en' ? 'English' : 'Русский'}</span><ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-all text-emerald-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans text-slate-100 selection:bg-emerald-500/30 relative overflow-x-hidden flex flex-col">
      <SolarSystem />
      <nav className="fixed w-full top-0 z-50 bg-black/30 backdrop-blur-2xl border-b border-white/10 px-8 py-5 flex justify-between items-center shadow-2xl">
        <div className="flex items-center space-x-3 cursor-pointer group" onClick={() => setCurrentPage('home')}>
          <div className="w-10 h-10 bg-white text-emerald-900 rounded-xl flex items-center justify-center shadow-[0_0_20px_white] group-hover:rotate-12 transition-transform"><Globe className="w-6 h-6" /></div>
          <span className="text-xl font-black tracking-tighter uppercase tracking-[0.1em] text-white italic">Global<span className="text-emerald-400 font-light">P2P</span></span>
        </div>
        <div className="hidden md:flex items-center space-x-12 text-[10px] font-black tracking-[0.5em] text-slate-500 uppercase">
          <button onClick={() => setCurrentPage('home')} className={`hover:text-white transition-colors ${currentPage === 'home' ? 'text-white' : ''}`}>{t.gateway}</button>
          <button onClick={() => setCurrentPage('about')} className={`hover:text-white transition-colors ${currentPage === 'about' ? 'text-white' : ''}`}>{t.infra}</button>
          <button onClick={() => setCurrentPage('terms')} className={`hover:text-white transition-colors ${currentPage === 'terms' ? 'text-white' : ''}`}>{t.security}</button>
        </div>
        <div className="flex items-center space-x-4">
          <div className="relative group">
            <button className="p-2 hover:bg-white/5 rounded-lg transition-all text-slate-400"><Languages className="w-5 h-5 hover:text-emerald-400" /></button>
            <div className="absolute top-full right-0 mt-2 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl overflow-hidden hidden group-hover:block w-32 shadow-2xl">
              {['ka', 'en', 'ru'].map(l => (
                <button key={l} onClick={() => setLang(l)} className={`w-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-left hover:bg-white/5 ${lang === l ? 'text-emerald-400' : 'text-slate-400'}`}>
                  {l === 'ka' ? 'Georgian' : l === 'en' ? 'English' : 'Russian'}
                </button>
              ))}
            </div>
          </div>
          {!walletConnected ? (
            <button onClick={() => setWalletConnected(true)} className="bg-white hover:bg-emerald-400 text-emerald-950 px-6 py-2.5 rounded-xl font-black text-[10px] tracking-[0.2em] uppercase transition-all flex items-center gap-2 group shadow-[0_0_25px_white]"><Fingerprint className="w-4 h-4 group-hover:scale-110 transition-transform" /><span>{t.verify}</span></button>
          ) : (
            <div className="flex items-center space-x-2 bg-emerald-400/5 text-emerald-400 px-5 py-2.5 rounded-xl border border-emerald-400/20 text-[10px] font-black tracking-[0.2em] uppercase shadow-inner"><div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></div><span>{t.secured}</span></div>
          )}
        </div>
      </nav>

      <main className="pt-32 pb-24 px-6 relative z-10 flex-grow flex flex-col justify-center max-w-7xl mx-auto w-full text-white">
        {currentPage === 'home' && (
          <div className="animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="text-center mb-10 text-white">
              <div className="inline-flex items-center space-x-3 bg-white/5 backdrop-blur-xl border border-white/10 text-emerald-400 px-4 py-1.5 rounded-full text-[8px] font-black mb-6 uppercase tracking-[0.5em] shadow-[0_0_25px_rgba(52,211,153,0.15)]"><Sparkles className="w-3 h-3" /><span>Next-Gen Mesh Infrastructure 2.5</span></div>
              <h1 className="text-5xl lg:text-[76px] font-black tracking-tighter leading-[1] mb-6 text-white italic drop-shadow-[0_0_40px_rgba(255,255,255,0.1)]">{t.heroTitle[0]} {t.heroTitle[1]}<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-emerald-400 to-cyan-300 uppercase not-italic">{t.heroTitle[2]}</span></h1>
              <p className="text-lg md:text-xl text-slate-300/70 max-w-2xl mx-auto font-light leading-relaxed mb-10 opacity-80 tracking-tight">{t.heroSub}</p>
            </div>
            <div className="max-w-md mx-auto relative group">
              <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500/20 to-cyan-400/20 rounded-[3rem] blur-3xl opacity-40 transition duration-1000 group-hover:opacity-80"></div>
              <div className="relative bg-black/60 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-10 shadow-2xl shadow-black/90">
                {txStatus === 'idle' ? (
                  <form onSubmit={(e) => { e.preventDefault(); setTxStatus('step1'); setTimeout(() => setTxStatus('success'), 3500); }} className="space-y-8">
                    <div className="flex bg-black/80 p-1.5 rounded-2xl border border-white/5 shadow-inner">
                      {['transfer', 'exchange'].map(m => <button key={m} type="button" onClick={() => setMode(m)} className={`flex-1 py-3.5 rounded-xl font-black text-[10px] tracking-[0.4em] uppercase transition-all duration-500 ${mode === m ? 'bg-white text-emerald-950 shadow-[0_0_25px_white]' : 'text-slate-600 hover:text-white'}`}>{m === 'transfer' ? t.transfer : t.exchange}</button>)}
                    </div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center px-1 text-white"><label className="text-[10px] font-black tracking-[0.4em] text-slate-600 uppercase">{t.amount}</label><Activity className="w-3 h-3 text-emerald-500/50 animate-pulse" /></div>
                      <div className="flex bg-black/60 border border-white/10 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-all shadow-inner">
                        <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-8 py-6 bg-transparent outline-none text-4xl font-black text-white placeholder-slate-900 font-mono" required />
                        <select value={sendCurrency} onChange={(e) => setSendCurrency(e.target.value)} className="bg-white/5 border-l border-white/10 px-8 font-black text-white outline-none cursor-pointer hover:bg-white/10 transition-colors uppercase font-mono"><option>GEL</option><option>USD</option><option>EUR</option></select>
                      </div>
                    </div>
                    {mode === 'transfer' && (
                      <div className="space-y-4 text-white">
                        <label className="text-[10px] font-black tracking-[0.4em] text-slate-600 uppercase px-1">{t.iban}</label>
                        <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="GE00XX0000..." className="w-full px-8 py-6 bg-black/60 border border-white/10 rounded-2xl focus:border-emerald-500/50 outline-none font-mono text-base text-white placeholder-slate-900 transition-all uppercase" required />
                      </div>
                    )}
                    <div className="space-y-4">
                      <label className="text-[10px] font-black tracking-[0.4em] text-slate-600 uppercase px-1">{t.receive}</label>
                      <div className="flex bg-emerald-500/5 border border-emerald-500/20 rounded-2xl overflow-hidden shadow-inner font-mono">
                        <div className="w-full px-8 py-6 font-mono text-5xl font-black text-white flex items-center drop-shadow-[0_0_15px_rgba(16,185,129,0.5)]">{estimatedReceive ? estimatedReceive.toFixed(2) : '0.00'}</div>
                        <select value={receiveCurrency} onChange={(e) => setReceiveCurrency(e.target.value)} className="bg-white/5 border-l border-white/10 px-8 font-black text-white outline-none cursor-pointer uppercase font-mono"><option>EUR</option><option>USD</option><option>GEL</option></select>
                      </div>
                      {amount && <div className="flex justify-between px-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 font-mono"><span>{t.rate}: <span className="text-white">{(rates[receiveCurrency] / rates[sendCurrency]).toFixed(4)}</span></span><span className="text-red-500">-{fee.toFixed(2)} {sendCurrency}</span></div>}
                    </div>
                    <button type="submit" disabled={!walletConnected || !amount} className={`w-full py-6 rounded-2xl font-black text-[11px] tracking-[0.6em] uppercase flex justify-center items-center space-x-3 transition-all duration-700 ${!walletConnected || !amount ? 'opacity-10 grayscale cursor-not-allowed' : 'bg-white hover:bg-emerald-400 text-black hover:text-white shadow-[0_0_35px_white] hover:shadow-[0_0_50px_#10b981] transform hover:-translate-y-2'}`}><span>{t.confirm}</span><Zap className="w-4 h-4 shadow-2xl" /></button>
                  </form>
                ) : txStatus === 'success' ? (
                  <div className="py-16 text-center animate-in zoom-in duration-1000">
                    <div className="w-24 h-24 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-[0_0_50px_rgba(16,185,129,0.4)]"><ShieldCheck className="w-12 h-12 text-emerald-400" /></div>
                    <h3 className="text-4xl font-black uppercase tracking-tighter mb-6 text-white italic">{t.settled}</h3>
                    <p className="text-slate-400 text-[10px] font-mono tracking-[0.6em] uppercase mb-12">Network Signature Verified ✅</p>
                    <button onClick={() => setTxStatus('idle')} className="w-full py-5 border border-white/10 rounded-2xl font-black text-[10px] tracking-[0.5em] uppercase hover:bg-white/5 transition-all text-white">{t.newOrder}</button>
                  </div>
                ) : (
                  <div className="py-20 text-center text-white">
                    <div className="relative w-20 h-20 mx-auto mb-10"><RefreshCw className="w-full h-full text-emerald-500 animate-spin opacity-30" /><div className="absolute inset-0 flex items-center justify-center"><Activity className="w-6 h-6 text-emerald-400 animate-pulse" /></div></div>
                    <p className="text-[10px] text-slate-500 tracking-[0.6em] uppercase animate-pulse">{t.syncing}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        {currentPage === 'about' && (
          <div className="animate-in fade-in duration-1000 grid md:grid-cols-2 gap-12 text-white">
            <div className="bg-white/[0.02] backdrop-blur-3xl p-16 rounded-[4rem] border border-white/10 group hover:border-emerald-500/30 transition-all shadow-2xl"><Cpu className="w-12 h-12 text-white mb-10 group-hover:rotate-180 transition-transform duration-1000 shadow-[0_0_25px_white]" /><h2 className="text-4xl font-black uppercase tracking-tighter mb-8 text-white">{t.meshTitle}</h2><p className="text-slate-300 font-light leading-relaxed text-xl italic tracking-tight opacity-90 uppercase text-[13px] tracking-[0.3em]">{t.meshDesc}</p></div>
            <div className="bg-white/[0.02] backdrop-blur-3xl p-16 rounded-[4rem] border border-white/10 group shadow-2xl hover:border-cyan-400/30 transition-all"><Zap className="w-12 h-12 text-white mb-10 group-hover:scale-110 transition-transform shadow-[0_0_25px_white]" /><h2 className="text-4xl font-black uppercase tracking-tighter mb-8 text-white">{t.logicTitle}</h2><p className="text-slate-300 font-light leading-relaxed text-xl italic tracking-tight opacity-90 uppercase text-[13px] tracking-[0.3em]">{t.logicDesc}</p></div>
          </div>
        )}
        {currentPage === 'terms' && (
          <div className="animate-in fade-in duration-1000 max-w-5xl mx-auto w-full text-white text-center">
            <div className="bg-white/[0.02] backdrop-blur-3xl p-16 rounded-[4rem] border border-white/10 text-center relative overflow-hidden shadow-2xl border-emerald-500/10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[120px] rounded-full"></div>
              <Lock className="w-16 h-16 text-white mx-auto mb-12 shadow-[0_0_30px_white]" />
              <h2 className="text-5xl font-black uppercase tracking-tighter mb-16 text-white italic">Protocol Security</h2>
              <div className="space-y-6 text-left">
                {['AES-256 Multi-Layered Encryption', 'Biometric Fingerprint Validation', 'Escrow-Based High-Tech Settlement'].map(s => (
                  <div key={s} className="flex justify-between items-center p-8 bg-black/70 rounded-[2.5rem] border border-white/5 group hover:bg-emerald-500/5 hover:border-emerald-500/30 transition-all shadow-lg"><span className="text-[12px] font-black tracking-[0.5em] text-slate-400 group-hover:text-white uppercase transition-colors">{s}</span><ShieldCheck className="w-6 h-6 text-emerald-900 group-hover:text-emerald-400 group-hover:shadow-[0_0_15px_#10b981] transition-all" /></div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      <div className="fixed bottom-8 right-8 z-50 flex flex-col items-end text-white">
        <div className={`transition-all duration-500 transform origin-bottom-right ${isChatOpen ? 'scale-100 opacity-100 mb-6' : 'scale-0 opacity-0 h-0 w-0 overflow-hidden'}`}>
          <div className="w-[420px] bg-[#020a05]/95 backdrop-blur-3xl border border-white/10 rounded-[3rem] shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden">
            <div className="bg-white p-8 flex justify-between items-center shadow-2xl">
              <div className="flex items-center gap-5 text-black font-black">
                <Bot className="w-7 h-7" />
                <div><span className="text-[11px] uppercase tracking-[0.4em] block text-black">{t.aiTitle}</span><span className="text-emerald-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Online</span></div>
              </div>
              <button onClick={() => setIsChatOpen(false)} className="text-black/30 hover:text-black transition-colors p-2"><X className="w-7 h-7" /></button>
            </div>
            <div className="h-[400px] overflow-y-auto p-10 space-y-8 bg-transparent custom-scrollbar text-[14px] leading-relaxed text-white">
              {chatMessages.map((msg, idx) => <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4`}><div className={`max-w-[85%] p-6 rounded-[2rem] tracking-wide ${msg.role === 'user' ? 'bg-white text-black font-bold rounded-br-none shadow-2xl' : 'bg-white/5 text-slate-100 border border-white/10 rounded-bl-none shadow-lg'}`}>{msg.text}</div></div>)}
              {isAiTyping && <div className="flex justify-start"><div className="bg-white/5 p-4 rounded-2xl flex gap-2 items-center"><div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"></div><div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.2s]"></div><div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce [animation-delay:0.4s]"></div></div></div>}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSendChat} className="p-8 bg-black/70 border-t border-white/5 flex gap-4">
              <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} placeholder={t.aiPlaceholder} className="flex-1 bg-white/5 border border-white/10 rounded-[1.5rem] px-8 py-5 text-[14px] text-white outline-none focus:border-emerald-500/50 transition-all placeholder-slate-800" />
              <button type="submit" disabled={isAiTyping} className="bg-white hover:bg-emerald-400 disabled:opacity-20 text-black p-5 rounded-[1.5rem] transition-all shadow-[0_0_20px_white]"><Send className="w-6 h-6" /></button>
            </form>
          </div>
        </div>
        <button onClick={() => setIsChatOpen(!isChatOpen)} className={`w-18 h-18 rounded-full flex items-center justify-center shadow-[0_0_40px_white] transition-all hover:scale-110 active:scale-95 z-50 ${isChatOpen ? 'bg-black text-white border border-white/10' : 'bg-white text-black'}`}>{isChatOpen ? <X className="w-8 h-8" /> : <Bot className="w-8 h-8" />}</button>
      </div>

      <footer className="border-t border-white/5 py-10 px-10 bg-black/60 backdrop-blur-xl mt-auto relative z-10 text-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center text-white">
          <div className="flex items-center space-x-6 mb-6 md:mb-0 text-white">
            <div className="flex items-center space-x-2 text-white"><Globe className="w-5 h-5 text-white" /><span className="text-sm font-black tracking-tighter uppercase italic text-white">Global<span className="text-emerald-400 font-light">P2P</span></span></div>
            <div className="w-px h-4 bg-white/10 hidden md:block"></div>
            <div className="flex items-center gap-3"><Activity className="w-4 h-4 animate-pulse text-emerald-900" /><span className="text-[9px] font-black tracking-[0.4em] uppercase text-emerald-900 font-mono">System Live</span></div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-[10px] font-black uppercase tracking-[0.4em] text-slate-500">
            <button onClick={() => setCurrentPage('home')} className="hover:text-emerald-400 transition-colors font-bold">{t.gateway}</button>
            <button onClick={() => setCurrentPage('about')} className="hover:text-emerald-400 transition-colors font-bold">{t.infra}</button>
            <button onClick={() => setCurrentPage('terms')} className="hover:text-emerald-400 transition-colors font-bold">{t.security}</button>
            <button className="hover:text-white transition-colors">{t.privacy}</button>
            <button className="hover:text-white transition-colors">{t.aml}</button>
            <button className="hover:text-white transition-colors font-mono">{t.terms}</button>
          </div>
          <div className="mt-8 md:mt-0 text-slate-700"><p className="text-[9px] font-bold uppercase tracking-[0.2em] font-mono">© 2026 GLOBALP2P. SYSTEM ENCRYPTED.</p></div>
        </div>
      </footer>
    </div>
  );
}
