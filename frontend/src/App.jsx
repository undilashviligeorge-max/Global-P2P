import React, { useState, useEffect } from 'react';
import { Wallet, ArrowRight, CheckCircle, RefreshCw, Globe, Shield, Zap, ArrowLeftRight } from 'lucide-react';

export default function App() {
  const [walletConnected, setWalletConnected] = useState(false);
  const [mode, setMode] = useState('transfer');
  const [amount, setAmount] = useState('');
  const [recipient, setRecipient] = useState('');
  const [txStatus, setTxStatus] = useState('idle');

  const [fee, setFee] = useState(0);
  const [estimatedReceive, setEstimatedReceive] = useState(0);

  const [sendCurrency, setSendCurrency] = useState('GEL');
  const [receiveCurrency, setReceiveCurrency] = useState('EUR');

  const rates = { USD: 1, EUR: 0.92, GEL: 2.70, GBP: 0.79 };

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
      if (afterFee > 0) {
        const finalAmt = (afterFee / sendRate) * recRate;
        setEstimatedReceive(finalAmt);
      } else {
        setEstimatedReceive(0);
      }
    } else {
      setFee(0);
      setEstimatedReceive(0);
    }
  }, [amount, sendCurrency, receiveCurrency]);

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!amount || (mode === 'transfer' && !recipient)) return;

    setTxStatus('step1_buying_usdt');

    try {
      // ბექენდთან კავშირი .env ცვლადის გამოყენებით
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const response = await fetch(`${API_URL}/api/transfer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, sendCurrency, receiveCurrency })
      });
      const data = await response.json();
      void data;

      setTimeout(() => setTxStatus('step2_escrow_holding'), 1500);
      setTimeout(() => setTxStatus('step3_sending_fiat'), 3000);
      setTimeout(() => setTxStatus('success'), 4500);
    } catch (error) {
      console.error("სერვერის შეცდომა", error);
      alert("ვერ დავუკავშირდით ბექენდის სერვერს.");
      setTxStatus('idle');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      <nav className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2 text-indigo-600">
          <Globe className="w-8 h-8" />
          <span className="text-xl font-bold">GlobalP2P</span>
        </div>
        <div>
          {!walletConnected ? (
            <button
              onClick={() => setWalletConnected(true)}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              <Wallet className="w-5 h-5" />
              <span>სისტემაში შესვლა</span>
            </button>
          ) : (
            <div className="flex items-center space-x-2 bg-green-100 text-green-700 px-4 py-2 rounded-lg font-medium border border-green-200">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>გიორგი მ.</span>
            </div>
          )}
        </div>
      </nav>

      <main className="max-w-4xl mx-auto mt-12 px-4 pb-12">
        <div className="text-center mb-10">
          <div className="inline-block bg-indigo-50 text-indigo-800 px-4 py-1.5 rounded-full text-sm font-semibold mb-4 border border-indigo-100 shadow-sm">
            ფიქსირებული 0.01% საკომისიო
          </div>
          <h1 className="text-4xl font-extrabold text-slate-900 mb-4">
            გადარიცხე ფული მსოფლიოს ნებისმიერ წერტილში
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            უსაფრთხო საერთაშორისო ტრანზაქციები და ვალუტის გადაცვლა ეროვნული ბანკის კურსით — შუამავალი ინსტიტუტების გარეშე.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-slate-100">
            {txStatus === 'idle' && (
              <form onSubmit={handleTransfer} className="space-y-6">
                <div className="flex bg-slate-100 p-1 rounded-xl mb-4">
                  <button type="button" onClick={() => setMode('transfer')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'transfer' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>გადარიცხვა</button>
                  <button type="button" onClick={() => setMode('exchange')} className={`flex-1 py-2 rounded-lg font-bold text-sm transition-all ${mode === 'exchange' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>ვალუტის გადაცვლა</button>
                </div>

                <div className="flex space-x-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">{mode === 'transfer' ? 'გასაგზავნი თანხა' : 'საკონვერტაციო თანხა'}</label>
                    <div className="flex border border-slate-200 rounded-xl bg-slate-50 overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                      <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" className="w-full px-4 py-3 bg-transparent outline-none text-lg" required />
                      <select value={sendCurrency} onChange={(e) => setSendCurrency(e.target.value)} className="bg-slate-100 border-l border-slate-200 px-4 font-bold text-slate-700 outline-none cursor-pointer">
                        <option value="GEL">GEL</option><option value="USD">USD</option><option value="EUR">EUR</option>
                      </select>
                    </div>
                  </div>
                </div>

                {mode === 'transfer' && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">მიმღების საბანკო რეკვიზიტები (IBAN) / ტელეფონი</label>
                    <input type="text" value={recipient} onChange={(e) => setRecipient(e.target.value)} placeholder="GE00XX0000..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-indigo-500 outline-none font-mono text-sm" required={mode === 'transfer'} />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">{mode === 'transfer' ? 'ჩარიცხვის მოცულობა' : 'კონვერტირებული მოცულობა'}</label>
                  <div className="flex border border-slate-200 rounded-xl bg-slate-50 overflow-hidden">
                    <div className="w-full px-4 py-3 bg-transparent font-mono text-lg font-bold text-slate-800">{estimatedReceive ? estimatedReceive.toFixed(2) : '0.00'}</div>
                    <select value={receiveCurrency} onChange={(e) => setReceiveCurrency(e.target.value)} className="bg-slate-100 border-l border-slate-200 px-4 font-bold text-slate-700 outline-none cursor-pointer">
                      <option value="EUR">EUR</option><option value="USD">USD</option><option value="GEL">GEL</option>
                    </select>
                  </div>
                  {amount && !isNaN(parseFloat(amount)) && (
                    <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 text-sm text-indigo-800 space-y-3">
                      <div className="flex justify-between items-center text-xs text-slate-500"><span>ეროვნული ბანკის გაცვლითი კურსი:</span><span className="font-bold text-slate-700">1 {sendCurrency} = {(rates[receiveCurrency] / rates[sendCurrency]).toFixed(4)} {receiveCurrency}</span></div>
                      <div className="flex justify-between items-center"><span className="text-indigo-600">საკომისიოს განაკვეთი (0.01% / მინ. $1):</span><span className="font-bold">- {fee.toFixed(2)} {sendCurrency}</span></div>
                      <div className="h-px w-full bg-indigo-200"></div>
                      <div className="flex justify-between items-center text-base"><span className="font-medium">{mode === 'transfer' ? 'მიმღების ანგარიშზე ჩაირიცხება:' : 'თქვენს ანგარიშზე აისახება:'}</span><span className="font-black text-indigo-700">{estimatedReceive.toFixed(2)} {receiveCurrency}</span></div>
                    </div>
                  )}
                </div>

                <button type="submit" disabled={!walletConnected || !amount || (mode === 'transfer' && !recipient)} className={`w-full py-4 rounded-xl font-bold text-lg flex justify-center items-center space-x-2 transition-all ${!walletConnected || !amount || (mode === 'transfer' && !recipient) ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg'}`}>
                  <span>{mode === 'transfer' ? 'გადარიცხვა' : 'ვალუტის გადაცვლა'}</span>
                  {mode === 'transfer' ? <ArrowRight className="w-5 h-5" /> : <ArrowLeftRight className="w-5 h-5" />}
                </button>
              </form>
            )}

            {txStatus.startsWith('step') && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-8">
                <div className="relative"><div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div><RefreshCw className="w-10 h-10 text-indigo-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" /></div>
                <div className="w-full max-w-sm text-left space-y-5">
                  <div className={`flex items-center space-x-4 p-3 rounded-lg ${txStatus === 'step1_buying_usdt' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400'}`}><div className="w-8 h-8 rounded-full bg-current flex items-center justify-center text-white text-sm">1</div><span>{mode === 'transfer' ? 'ტრანზაქციის ინიცირება' : 'კურსის დაფიქსირება ეროვნული ბანკის შესაბამისად'}</span></div>
                  <div className={`flex items-center space-x-4 p-3 rounded-lg ${txStatus === 'step2_escrow_holding' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400'}`}><div className="w-8 h-8 rounded-full bg-current flex items-center justify-center text-white text-sm">2</div><span>ფინანსური აქტივების უსაფრთხო განთავსება სისტემაში</span></div>
                  <div className={`flex items-center space-x-4 p-3 rounded-lg ${txStatus === 'step3_sending_fiat' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-400'}`}><div className="w-8 h-8 rounded-full bg-current flex items-center justify-center text-white text-sm">3</div><span>{mode === 'transfer' ? `მიმღების ანგარიშზე ${receiveCurrency}-ის ასახვა` : `თქვენს ანგარიშზე ${receiveCurrency}-ის ასახვა`}</span></div>
                </div>
              </div>
            )}

            {txStatus === 'success' && (
              <div className="py-8 flex flex-col items-center justify-center text-center space-y-6">
                <CheckCircle className="w-24 h-24 text-green-500" />
                <div>
                  <h3 className="text-2xl font-bold text-slate-800 mb-2">ტრანზაქცია წარმატებით დასრულდა</h3>
                  <button onClick={() => { setTxStatus('idle'); setAmount(''); setRecipient(''); }} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-3 rounded-xl font-medium mt-4">ახალი ოპერაცია</button>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-4">
              <div className="bg-blue-100 p-3 rounded-lg text-blue-600"><Zap className="w-6 h-6" /></div>
              <div><h3 className="font-bold text-slate-800 text-lg mb-1">დეცენტრალიზებული დაკავშირება</h3><p className="text-slate-600 text-sm">გამგზავნისა და მიმღების პირდაპირი დაკავშირება SWIFT-ის გარეშე.</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-4">
              <div className="bg-green-100 p-3 rounded-lg text-green-600"><Globe className="w-6 h-6" /></div>
              <div><h3 className="font-bold text-slate-800 text-lg mb-1">ოპტიმიზებული სატარიფო პოლიტიკა</h3><p className="text-slate-600 text-sm">სტანდარტული საკომისიო შეადგენს 0.01%-ს (მინიმუმ $1 ექვივალენტს).</p></div>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-start space-x-4">
              <div className="bg-indigo-100 p-3 rounded-lg text-indigo-600"><Shield className="w-6 h-6" /></div>
              <div><h3 className="font-bold text-slate-800 text-lg mb-1">ბლოკჩეინ უსაფრთხოება</h3><p className="text-slate-600 text-sm">სმარტ-კონტრაქტებით (Escrow მექანიზმით) დაცული სისტემა.</p></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
