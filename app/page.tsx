'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { InlinePdfDoc } from './PdfButton';
import { calculateEstimate } from '../estimator';
import { supabase } from './supabase';

const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  {
    ssr: false,
    loading: () => (
      <button
        disabled
        className="block w-full text-center bg-slate-800 text-slate-500 font-bold py-3 px-4 rounded-lg cursor-not-allowed text-sm border border-slate-700"
      >
        Loading PDF Engine...
      </button>
    ),
  }
);

interface SavedEstimate {
  id: string;
  created_at: string;
  room_name: string;
  wall_sqft: number;
  labor_hours: number;
  gallons_needed: number;
  total_price: number;
  status: string;
  clients: {
    name: string;
    email: string | null;
    phone: string | null;
    address: string | null;
  } | null;
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const [clientName, setClientName] = useState('Client Name');
  const [clientEmail, setClientEmail] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientAddress, setClientAddress] = useState('');
  const [roomScope, setRoomScope] = useState('Main Room');

  const [length, setLength] = useState<number>(12);
  const [width, setWidth] = useState<number>(10);
  const [height, setHeight] = useState<number>(9);

  const [sqftPerHour, setSqftPerHour] = useState<number>(150);
  const [hourlyRate, setHourlyRate] = useState<number>(50);
  const [paintCostPerGal, setPaintCostPerGal] = useState<number>(45);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [estimatesList, setEstimatesList] = useState<SavedEstimate[]>([]);
  const [fetchingHistory, setFetchingHistory] = useState(false);

  const calculation = calculateEstimate({
    length,
    width,
    height,
    sqftPerHour,
    hourlyRate,
    paintCostPerGal,
  });

  const wallArea = calculation.wallAreaSqFt ?? calculation.wall_sqft ?? (length + width) * 2 * height;
  const laborHours = calculation.estimatedLaborHours ?? calculation.labor_hours ?? wallArea / sqftPerHour;
  const gallonsNeeded = calculation.gallonsNeeded ?? calculation.gallons_needed ?? Math.ceil(wallArea / 350);
  const totalPrice = calculation.totalPrice ?? calculation.total_price ?? 0;

  const fetchEstimates = async () => {
    setFetchingHistory(true);
    try {
      const { data, error } = await supabase
        .from('estimates')
        .select(`
          id,
          created_at,
          room_name,
          wall_sqft,
          labor_hours,
          gallons_needed,
          total_price,
          status,
          clients (
            name,
            email,
            phone,
            address
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEstimatesList((data as unknown as SavedEstimate[]) || []);
    } catch (err: any) {
      console.error('Error fetching estimates:', err);
    } finally {
      setFetchingHistory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'history') {
      fetchEstimates();
    }
  }, [activeTab]);

  const handleSaveEstimate = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .insert([
          {
            name: clientName,
            email: clientEmail || null,
            phone: clientPhone || null,
            address: clientAddress || null,
          },
        ])
        .select()
        .single();

      if (clientError) throw clientError;

      const { error: estimateError } = await supabase.from('estimates').insert([
        {
          client_id: clientData.id,
          room_name: roomScope,
          length,
          width,
          height,
          wall_sqft: wallArea,
          labor_hours: laborHours,
          gallons_needed: gallonsNeeded,
          total_price: totalPrice,
          status: 'draft',
        },
      ]);

      if (estimateError) throw estimateError;

      setMessage({ text: 'Estimate saved successfully!', type: 'success' });
    } catch (err: any) {
      console.error('Error saving estimate:', err);
      setMessage({ text: err.message || 'Error saving to database.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 flex justify-center">
      <div className="w-full max-w-md space-y-6">
        <header className="space-y-3 text-center">
          <h1 className="text-3xl font-extrabold text-amber-500 tracking-tight">ScopePipe</h1>

          <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs font-semibold">
            <button
              onClick={() => setActiveTab('create')}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                activeTab === 'create'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              New Estimate
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-2 rounded-lg transition-colors ${
                activeTab === 'history'
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Saved History
            </button>
          </div>
        </header>

        {activeTab === 'create' ? (
          <>
            <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Project & Client Info
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400">Client Name</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="Client Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400">Email</label>
                    <input
                      type="email"
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                      placeholder="client@example.com"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400">Phone</label>
                    <input
                      type="tel"
                      value={clientPhone}
                      onChange={(e) => setClientPhone(e.target.value)}
                      className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                      placeholder="(555) 000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs text-slate-400">Job Site Address</label>
                  <input
                    type="text"
                    value={clientAddress}
                    onChange={(e) => setClientAddress(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="123 Main St"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-400">Room / Scope</label>
                  <input
                    type="text"
                    value={roomScope}
                    onChange={(e) => setRoomScope(e.target.value)}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                    placeholder="Main Room"
                  />
                </div>
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Room Dimensions (FT)
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400">Length</label>
                  <input
                    type="number"
                    value={length}
                    onChange={(e) => setLength(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-center text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Width</label>
                  <input
                    type="number"
                    value={width}
                    onChange={(e) => setWidth(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-center text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">Height</label>
                  <input
                    type="number"
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-center text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-lg">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Production & Rates
              </h2>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-400">SqFt / Hr</label>
                  <input
                    type="number"
                    value={sqftPerHour}
                    onChange={(e) => setSqftPerHour(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-center text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">$/Hr Rate</label>
                  <input
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-center text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-400">$/Gal Paint</label>
                  <input
                    type="number"
                    value={paintCostPerGal}
                    onChange={(e) => setPaintCostPerGal(Number(e.target.value))}
                    className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-center text-slate-100 font-semibold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </section>

            <section className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4 shadow-lg">
              <div className="grid grid-cols-3 text-center border-b border-slate-800 pb-3 text-xs text-slate-300">
                <div>
                  <span className="text-slate-500 block">Wall Area</span>
                  <strong className="text-slate-100">{wallArea} sq ft</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Est. Labor</span>
                  <strong className="text-slate-100">{laborHours} hrs</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Paint</span>
                  <strong className="text-slate-100">{gallonsNeeded} gal</strong>
                </div>
              </div>

              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-semibold text-slate-300">Total Price</span>
                <span className="text-3xl font-black text-amber-500">${totalPrice}</span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={handleSaveEstimate}
                  disabled={loading}
                  className="w-full bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-slate-950 font-bold py-3 px-4 rounded-lg transition duration-150 disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Estimate'}
                </button>

                {isClient && (
                  <PDFDownloadLink
                    document={
                      <InlinePdfDoc
                        clientName={clientName}
                        clientEmail={clientEmail}
                        clientPhone={clientPhone}
                        clientAddress={clientAddress}
                        roomScope={roomScope}
                        wallArea={wallArea}
                        laborHours={laborHours}
                        gallonsNeeded={gallonsNeeded}
                        totalPrice={totalPrice}
                      />
                    }
                    fileName={`Proposal_${clientName.replace(/\s+/g, '_') || 'Client'}.pdf`}
                    className="block w-full text-center bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-amber-400 font-bold py-3 px-4 rounded-lg transition duration-150 border border-slate-700 text-sm"
                  >
                    {({ loading: pdfLoading }: { loading: boolean }) =>
                      pdfLoading ? 'Preparing PDF...' : '📄 Download Proposal PDF'
                    }
                  </PDFDownloadLink>
                )}
              </div>

              {message && (
                <p
                  className={`text-xs text-center font-medium ${
                    message.type === 'success' ? 'text-emerald-400' : 'text-rose-500'
                  }`}
                >
                  {message.text}
                </p>
              )}
            </section>
          </>
        ) : (
          <section className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Recent Saved Estimates
              </h2>
              <button
                onClick={fetchEstimates}
                className="text-xs text-amber-500 hover:underline font-medium"
              >
                Refresh
              </button>
            </div>

            {fetchingHistory ? (
              <div className="text-center py-8 text-xs text-slate-500">Loading estimates...</div>
            ) : estimatesList.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center text-xs text-slate-500">
                No estimates saved yet.
              </div>
            ) : (
              <div className="space-y-3">
                {estimatesList.map((est) => (
                  <div
                    key={est.id}
                    className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3 shadow-md"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-sm font-bold text-slate-100">
                          {est.clients?.name || 'Unknown Client'}
                        </h3>
                        <p className="text-xs text-slate-400">{est.room_name}</p>
                      </div>
                      <span className="text-lg font-extrabold text-amber-500">
                        ${est.total_price}
                      </span>
                    </div>

                    {est.clients?.address && (
                      <p className="text-xs text-slate-500 truncate">{est.clients.address}</p>
                    )}

                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400 text-center">
                      <div>
                        <span className="block text-slate-500">Area</span>
                        <strong className="text-slate-300">{est.wall_sqft} sqft</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500">Labor</span>
                        <strong className="text-slate-300">{est.labor_hours} hrs</strong>
                      </div>
                      <div>
                        <span className="block text-slate-500">Paint</span>
                        <strong className="text-slate-300">{est.gallons_needed} gal</strong>
                      </div>
                    </div>

                    {isClient && (
                      <PDFDownloadLink
                        document={
                          <InlinePdfDoc
                            clientName={est.clients?.name || 'Valued Client'}
                            clientEmail={est.clients?.email || ''}
                            clientPhone={est.clients?.phone || ''}
                            clientAddress={est.clients?.address || ''}
                            roomScope={est.room_name}
                            wallArea={est.wall_sqft}
                            laborHours={est.labor_hours}
                            gallonsNeeded={est.gallons_needed}
                            totalPrice={est.total_price}
                          />
                        }
                        fileName={`Proposal_${(est.clients?.name || 'Client').replace(/\s+/g, '_')}.pdf`}
                        className="block w-full text-center bg-slate-950 hover:bg-slate-800 text-amber-400 font-medium py-1.5 px-3 rounded text-xs border border-slate-800 transition"
                      >
                        {({ loading: pdfLoading }: { loading: boolean }) =>
                          pdfLoading ? 'Preparing PDF...' : '📄 Download PDF'
                        }
                      </PDFDownloadLink>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}