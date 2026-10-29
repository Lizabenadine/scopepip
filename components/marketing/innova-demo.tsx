"use client"

import { useState } from "react"
import { CheckCircle, Mail, MapPin, Phone, ShieldCheck } from "lucide-react"

export function InnovaDemo() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <div className="bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white">
        San Diego Painting Services | Lic #1099599
      </div>
      <header className="sticky top-0 z-50 bg-white shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <img src="/innova-logo.jpg?v=2" alt="Innova Pro Painting" className="h-16 w-auto rounded-md" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">INNOVA PRO PAINTING</h1>
              <p className="text-xs text-slate-500">Interior & Exterior</p>
            </div>
          </div>
          <a
            href="tel:6193626422"
            className="flex items-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            <Phone size={16} /> (619) 362-6422
          </a>
        </div>
      </header>
      <section className="bg-slate-900 px-4 py-16 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <span className="rounded-full bg-amber-500/20 px-3 py-1 text-xs font-semibold tracking-wider text-amber-400 uppercase">
            San Diego, California
          </span>
          <h2 className="mt-4 mb-6 text-4xl leading-tight font-extrabold md:text-5xl">
            Transform Your Home With San Diego&apos;s Elite Painters
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-300">
            Top-tier interior and exterior painting services. Clean work, flawless finishes, and guaranteed satisfaction.
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <a
              href="tel:6193626422"
              className="flex items-center justify-center gap-2 rounded-xl bg-amber-600 px-8 py-3 text-lg font-bold text-white shadow-lg hover:bg-amber-700"
            >
              <Phone size={20} /> Call For Free Quote
            </a>
          </div>
        </div>
      </section>
      <section className="border-b bg-white px-4 py-6">
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-6 text-center md:grid-cols-3">
          <div className="flex items-center justify-center gap-2 font-medium text-slate-700">
            <ShieldCheck className="text-amber-600" size={24} /> Licensed & Insured (#1099599)
          </div>
          <div className="flex items-center justify-center gap-2 font-medium text-slate-700">
            <CheckCircle className="text-amber-600" size={24} /> Interior & Exterior Specialists
          </div>
          <div className="flex items-center justify-center gap-2 font-medium text-slate-700">
            <MapPin className="text-amber-600" size={24} /> Proudly Serving San Diego
          </div>
        </div>
      </section>
      <section className="mx-auto max-w-xl px-4 py-16">
        <div className="rounded-2xl border border-slate-100 bg-white p-8 shadow-xl">
          <h3 className="mb-2 text-center text-2xl font-bold">Request a Free Estimate</h3>
          <p className="mb-6 text-center text-sm text-slate-500">
            Fill out the form below and Carlos will get back to you right away.
          </p>
          {submitted ? (
            <p className="text-center text-sm font-medium text-slate-700" data-testid="innova-submitted">
              Demo form submitted. Carlos will call you back.
            </p>
          ) : (
            <form
              onSubmit={(event) => {
                event.preventDefault()
                setSubmitted(true)
              }}
              className="space-y-4"
            >
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase" htmlFor="innova-name">
                  Your Name
                </label>
                <input
                  id="innova-name"
                  type="text"
                  placeholder="John Doe"
                  required
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase" htmlFor="innova-phone">
                  Phone Number
                </label>
                <input
                  id="innova-phone"
                  type="tel"
                  placeholder="(619) 000-0000"
                  required
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 uppercase" htmlFor="innova-details">
                  Project Details
                </label>
                <textarea
                  id="innova-details"
                  rows={3}
                  placeholder="Interior painting for 3 rooms..."
                  required
                  className="w-full rounded-lg border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-lg bg-slate-900 py-3 font-bold text-white transition hover:bg-slate-800"
              >
                Get My Free Quote
              </button>
            </form>
          )}
        </div>
      </section>
      <footer className="bg-slate-900 px-4 py-8 text-center text-sm text-slate-400">
        <img src="/innova-logo.jpg?v=2" alt="" className="mx-auto mb-4 h-28 w-auto rounded-md" />
        <p className="font-semibold text-white">Innova Pro Painting</p>
        <p className="mt-1 text-white">Carlos Morataya</p>
        <div className="mt-4 flex flex-col items-center gap-1">
          <a href="tel:6193626422" className="inline-flex items-center gap-2 hover:text-white">
            <Phone size={14} /> (619) 362-6422
          </a>
          <a href="mailto:innovapropainting@gmail.com" className="inline-flex items-center gap-2 hover:text-white">
            <Mail size={14} /> innovapropainting@gmail.com
          </a>
          <a
            href="https://instagram.com/innova_pro_painting"
            className="inline-flex items-center gap-2 hover:text-white"
          >
            @innova_pro_painting
          </a>
        </div>
        <p className="mt-4">License #1099599</p>
        <p className="mt-1 text-xs text-slate-500">Interior & Exterior · San Diego, California</p>
      </footer>
    </div>
  )
}
