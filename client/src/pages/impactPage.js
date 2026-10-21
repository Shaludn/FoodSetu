import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

const EMPTY_SUMMARY = {
  totalFoodKg: 0,
  completedDeliveries: 0,
  activeDeliveries: 0,
  totalDonors: 0,
  totalNGOs: 0,
  verifiedNGOs: 0,
  totalListings: 0,
};

function Metric({ icon, label, value, detail }) {
  return (
    <article className="rounded-2xl border border-green-100 bg-white p-5 shadow-sm">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-green-50 text-2xl">
        {icon}
      </div>
      <p className="mt-4 text-sm font-medium text-gray-500">{label}</p>
      <p className="mt-1 text-3xl font-black tracking-tight text-gray-900">
        {value}
      </p>
      {detail && <p className="mt-2 text-xs text-gray-500">{detail}</p>}
    </article>
  );
}

export default function ImpactPage() {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadImpact() {
      try {
        const response = await api.get('/impact');
        if (!cancelled) {
          setSummary({ ...EMPTY_SUMMARY, ...response.data.summary });
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.response?.data?.message ||
              'Impact statistics are temporarily unavailable.'
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadImpact();

    return () => {
      cancelled = true;
    };
  }, []);

  const number = (value) =>
    Number(value ?? 0).toLocaleString(undefined, {
      maximumFractionDigits: 2,
    });

  return (
    <div className="min-h-screen bg-[#f7faf7] text-gray-800">
      <header className="border-b border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4">
          <Link to="/" className="text-xl font-black text-green-800">
            🌱 FoodBridge
          </Link>

          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link to="/" className="text-gray-600 hover:text-green-700">
              Home
            </Link>
            <Link
              to="/login"
              className="rounded-xl bg-green-700 px-4 py-2.5 text-white hover:bg-green-800"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>

      <main>
        <section className="overflow-hidden bg-gradient-to-br from-green-950 via-green-800 to-emerald-700 text-white">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-16 sm:py-24 lg:grid-cols-[1.2fr_0.8fr] lg:items-center">
            <div>
              <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold">
                Our impact, measured
              </span>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight sm:text-6xl">
                Every meal deserves a destination.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-7 text-green-50 sm:text-lg">
                FoodBridge connects surplus food donors with NGOs and
                coordinates deliveries to help good food reach the people and
                communities that need it.
              </p>

              <Link
                to="/login"
                className="mt-8 inline-flex rounded-xl bg-white px-6 py-3 font-bold text-green-900 transition hover:bg-green-50"
              >
                Join FoodBridge <span className="ml-2">→</span>
              </Link>
            </div>

            <div className="rounded-3xl border border-white/15 bg-white/10 p-7 backdrop-blur-sm sm:p-9">
              <p className="text-sm font-semibold uppercase tracking-widest text-green-100">
                Food delivered successfully
              </p>

              {loading ? (
                <p className="mt-5 text-4xl font-black">Loading…</p>
              ) : (
                <p className="mt-5 text-5xl font-black sm:text-6xl">
                  {number(summary.totalFoodKg)}
                  <span className="ml-2 text-2xl text-green-100">kg</span>
                </p>
              )}

              <p className="mt-4 text-sm leading-6 text-green-50">
                Total food quantity recorded on deliveries marked as completed.
              </p>

              <div className="mt-7 h-px bg-white/20" />

              <p className="mt-5 text-sm text-green-100">
                We count completed deliveries, not just food listings.
              </p>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-7xl px-5 py-14 sm:py-20">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-widest text-green-700">
              The numbers behind the work
            </p>
            <h2 className="mt-3 text-3xl font-black text-gray-900 sm:text-4xl">
              Our platform at a glance
            </h2>
            <p className="mt-3 leading-7 text-gray-600">
              These figures come from FoodBridge's current platform records and
              update as new activity is recorded.
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
            >
              {error}
            </div>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Metric
              icon="🥗"
              label="Food delivered"
              value={`${number(summary.totalFoodKg)} kg`}
              detail="Quantity on completed deliveries"
            />
            <Metric
              icon="🚚"
              label="Completed deliveries"
              value={number(summary.completedDeliveries)}
              detail="Deliveries marked DELIVERED"
            />
            <Metric
              icon="🤝"
              label="Food donors"
              value={number(summary.totalDonors)}
              detail="Registered donor accounts"
            />
            <Metric
              icon="🏢"
              label="NGO partners"
              value={number(summary.totalNGOs)}
              detail="Registered NGO accounts"
            />
            <Metric
              icon="✅"
              label="Verified NGOs"
              value={number(summary.verifiedNGOs)}
              detail="NGOs verified by platform administrators"
            />
            <Metric
              icon="📦"
              label="Food listings"
              value={number(summary.totalListings)}
              detail="All listings, including expired ones"
            />
          </div>

          <div className="mt-8 rounded-2xl border border-green-100 bg-white p-6 sm:p-8">
            <h3 className="text-xl font-black text-gray-900">
              Impact through collaboration
            </h3>
            <p className="mt-3 max-w-3xl leading-7 text-gray-600">
              Donors make surplus food available, NGOs receive suitable
              donations, and delivery agents help move food between them.
              FoodBridge brings these steps into one coordinated platform.
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Figures reflect recorded platform activity. Registered accounts
              and listings are not the same as completed food donations.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-green-100 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-3 px-5 py-6 text-sm text-gray-500">
          <p>🌱 FoodBridge — Connecting surplus food with communities.</p>
          <Link to="/" className="font-semibold text-green-800 hover:underline">
            Back to home
          </Link>
        </div>
      </footer>
    </div>
  );
}