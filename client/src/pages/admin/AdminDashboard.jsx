
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../utils/api';

const STATUS_STYLES = {
  LISTED: 'bg-amber-100 text-amber-800',
  MATCHED: 'bg-green-100 text-green-800',
  EXPIRED: 'bg-red-100 text-red-800',
};

const FILTERS = ['ALL', 'LISTED', 'MATCHED', 'EXPIRED'];

function StatCard({ label, value, subtitle, color }) {
  return (
    <div className={`rounded-2xl p-5 shadow-sm ${color}`}>
      <p className="text-sm font-medium opacity-90">{label}</p>
      <p className="mt-2 text-3xl font-black">
        {value ?? 0}
      </p>
      {subtitle && <p className="mt-1 text-xs opacity-80">{subtitle}</p>}
    </div>
  );
}

function SectionTitle({ children, action }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold text-gray-800">{children}</h2>
      {action}
    </div>
  );
}

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const loadOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError('');

    try {
      const response = await api.get('/admin/overview');
      setOverview(response.data);
    } catch (err) {
      const status = err.response?.status;

      if (status === 401) {
        setError('Your session is missing or expired. Please log in again.');
      } else if (status === 403) {
        setError('This account does not have administrator access.');
      } else {
        setError(
          err.response?.data?.message ||
          'Could not load admin dashboard data. Check that the backend is running.'
        );
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOverview();
  }, [loadOverview]);

  const listings = overview?.recentListings ?? [];

  const filteredListings = useMemo(() => {
    const query = search.trim().toLowerCase();

    return listings.filter((listing) => {
      const matchesStatus =
        statusFilter === 'ALL' || listing.status === statusFilter;

      const donorName = listing.donor?.user?.name ?? '';
      const foodTypes = (listing.foodTypes ?? []).join(' ');

      const matchesSearch =
        !query ||
        foodTypes.toLowerCase().includes(query) ||
        donorName.toLowerCase().includes(query) ||
        listing.status.toLowerCase().includes(query) ||
        String(listing.vehicleNeeded ?? '').toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [listings, search, statusFilter]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
          <p className="mt-4 font-medium text-gray-600">
            Loading FoodBridge Admin...
          </p>
        </div>
      </div>
    );
  }

  const users = overview?.users ?? {};
  const listingStats = overview?.listings ?? {};
  const deliveries = overview?.deliveries ?? {};

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="sticky top-0 z-20 border-b bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">
              🌱 FoodBridge Admin
            </h1>
            <p className="mt-1 text-xs text-gray-500">
              Welcome, {user?.name || 'Administrator'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => loadOverview(true)}
              disabled={refreshing}
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50 disabled:opacity-50"
            >
              {refreshing ? 'Refreshing...' : '↻ Refresh'}
            </button>
            <button
              onClick={handleLogout}
              className="rounded-lg px-3 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:py-8">
        {error && (
          <div
            role="alert"
            className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            <p>{error}</p>
            <div className="flex gap-3">
              {error.includes('log in again') && (
                <button
                  onClick={handleLogout}
                  className="font-bold underline"
                >
                  Log in
                </button>
              )}
              <button
                onClick={() => loadOverview()}
                className="font-bold underline"
              >
                Retry
              </button>
            </div>
          </div>
        )}

        {/* User overview */}
        <section>
          <SectionTitle>Platform Users</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total Users"
              value={users.total}
              subtitle="Registered accounts"
              color="bg-slate-800 text-white"
            />
            <StatCard
              label="Donors"
              value={users.donors}
              subtitle="Food providers"
              color="bg-blue-600 text-white"
            />
            <StatCard
              label="NGOs"
              value={users.ngos}
              subtitle="Food recipients"
              color="bg-violet-600 text-white"
            />
            <StatCard
              label="Delivery Agents"
              value={users.agents}
              subtitle="Delivery partners"
              color="bg-cyan-700 text-white"
            />
          </div>
        </section>

        {/* Listing overview */}
        <section>
          <SectionTitle>Food Listing Overview</SectionTitle>
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <StatCard
              label="All Listings"
              value={listingStats.total}
              color="bg-white text-gray-900 border border-gray-100"
            />
            <StatCard
              label="Active"
              value={listingStats.active}
              subtitle="Awaiting a match"
              color="bg-amber-400 text-amber-950"
            />
            <StatCard
              label="Matched"
              value={listingStats.matched}
              subtitle="Matched with recipients"
              color="bg-green-600 text-white"
            />
            <StatCard
              label="Expired"
              value={listingStats.expired}
              subtitle="Past their expiry window"
              color="bg-red-500 text-white"
            />
          </div>
        </section>

        {/* Delivery overview */}
        <section>
          <SectionTitle>Delivery Overview</SectionTitle>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCard
              label="Total Deliveries"
              value={deliveries.total}
              color="bg-white text-gray-900 border border-gray-100"
            />
            <StatCard
              label="Active Deliveries"
              value={deliveries.active}
              subtitle="Assigned or in progress"
              color="bg-orange-500 text-white"
            />
            <StatCard
              label="Completed"
              value={deliveries.completed}
              subtitle="Marked as delivered"
              color="bg-emerald-600 text-white"
            />
          </div>
        </section>

        {/* Recent listings */}
        <section>
          <SectionTitle
            action={
              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
                Showing {filteredListings.length} of {listings.length} recent
                listings
              </span>
            }
          >
            Recent Food Listings
          </SectionTitle>

          <div className="mb-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search food, donor, vehicle or status..."
              className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"
            >
              {FILTERS.map((status) => (
                <option key={status} value={status}>
                  {status === 'ALL' ? 'All statuses' : status}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-3">
            {filteredListings.map((listing) => (
              <article
                key={listing.id}
                className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm transition hover:shadow-md sm:p-5"
              >
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <h3 className="font-bold text-gray-900">
                      {(listing.foodTypes ?? []).join(', ') || 'Food listing'}
                    </h3>

                    <p className="mt-2 text-sm text-gray-500">
                      {listing.quantityKg} kg
                      {' · '}
                      {listing.vehicleNeeded ?? 'Vehicle not specified'}
                      {' · '}
                      {listing.donor?.user?.name ?? 'Unknown donor'}
                    </p>

                    {listing.donor?.user?.email && (
                      <p className="mt-1 break-all text-xs text-gray-400">
                        {listing.donor.user.email}
                      </p>
                    )}

                    <p className="mt-1 text-xs text-gray-400">
                      Created:{' '}
                      {listing.createdAt
                        ? new Date(listing.createdAt).toLocaleString()
                        : 'Date unavailable'}
                    </p>
                  </div>

                  <span
                    className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${
                      STATUS_STYLES[listing.status] ??
                      'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {listing.status}
                  </span>
                </div>
              </article>
            ))}

            {filteredListings.length === 0 && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-4 py-12 text-center">
                <p className="font-semibold text-gray-700">
                  No listings found
                </p>
                <p className="mt-1 text-sm text-gray-500">
                  Try another search term or status filter.
                </p>
                <button
                  onClick={() => {
                    setSearch('');
                    setStatusFilter('ALL');
                  }}
                  className="mt-4 text-sm font-bold text-green-700 hover:underline"
                >
                  Clear filters
                </button>
              </div>
            )}
          </div>
        </section>

        <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">
          FoodBridge Admin Dashboard · Data from your FoodBridge API
        </footer>
      </main>
    </div>
  );
}
