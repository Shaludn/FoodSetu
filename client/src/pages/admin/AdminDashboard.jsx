

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

import api from '../../utils/api';
import AdminImpactReport from './AdminImpactReport';



const PAGE_SIZE = 10;



const LISTING_FILTERS = ['ALL', 'LISTED', 'MATCHED', 'EXPIRED'];

const USER_ROLES = ['ALL', 'DONOR', 'NGO', 'AGENT', 'ADMIN'];

const DELIVERY_FILTERS = [

  'ALL',

  'ASSIGNED',

  'PICKED_UP',

  'IN_TRANSIT',

  'DELIVERED',

];



const STATUS_STYLES = {

  LISTED: 'bg-amber-100 text-amber-800',

  MATCHED: 'bg-green-100 text-green-800',

  EXPIRED: 'bg-red-100 text-red-800',

};



const ROLE_STYLES = {

  DONOR: 'bg-blue-100 text-blue-800',

  NGO: 'bg-violet-100 text-violet-800',

  AGENT: 'bg-cyan-100 text-cyan-800',

  ADMIN: 'bg-purple-100 text-purple-800',

};



const DELIVERY_STATUS_STYLES = {

  ASSIGNED: 'bg-amber-100 text-amber-800',

  PICKED_UP: 'bg-blue-100 text-blue-800',

  IN_TRANSIT: 'bg-violet-100 text-violet-800',

  DELIVERED: 'bg-green-100 text-green-800',

};



function StatCard({ label, value, subtitle, color }) {

  return (

    <div className={`rounded-2xl p-5 shadow-sm ${color}`}>

      <p className="text-sm font-medium opacity-90">{label}</p>

      <p className="mt-2 text-3xl font-black">{value ?? 0}</p>

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



function DetailRow({ label, children }) {

  return (

    <div className="grid grid-cols-1 gap-1 border-b border-gray-100 py-3 sm:grid-cols-3 sm:gap-4">

      <dt className="text-sm font-medium text-gray-500">{label}</dt>

      <dd className="break-words text-sm text-gray-800 sm:col-span-2">

        {children ?? 'Not available'}

      </dd>

    </div>

  );

}



function RoleBadge({ role }) {

  return (

    <span

      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${

        ROLE_STYLES[role] || 'bg-gray-100 text-gray-700'

      }`}

    >

      {role}

    </span>

  );

}



function formatDate(value) {

  if (!value) return 'Not available';



  const date = new Date(value);



  return Number.isNaN(date.getTime())

    ? 'Not available'

    : date.toLocaleString();

}



function getExpiryDate(listing) {

  if (!listing?.createdAt || listing?.expiryHours == null) return null;



  return new Date(

    new Date(listing.createdAt).getTime() +

      Number(listing.expiryHours) * 60 * 60 * 1000

  );

}



function getProofPhotoUrl(photoUrl) {

  if (!photoUrl) return null;



  // Preserve absolute URLs returned by the server.

  if (/^https?:\/\//i.test(photoUrl)) return photoUrl;



  // For relative upload paths, remove /api from the API base URL.

  const baseUrl = (api.defaults.baseURL || '').replace(/\/api\/?$/, '');

  const path = photoUrl.startsWith('/') ? photoUrl : `/${photoUrl}`;



  return `${baseUrl}${path}`;

}



const emptyPagination = {

  page: 1,

  limit: PAGE_SIZE,

  total: 0,

  totalPages: 0,

  hasNextPage: false,

  hasPreviousPage: false,

};



function Pagination({ pagination, page, setPage, loading, noun }) {

  const firstItem =

    pagination.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;



  const lastItem = Math.min(page * PAGE_SIZE, pagination.total);



  return (

    <div className="mt-5 flex flex-col items-center justify-between gap-3 rounded-xl bg-white p-4 sm:flex-row">

      <p className="text-sm text-gray-500">

        Showing {firstItem}–{lastItem} of {pagination.total} {noun}

      </p>



      <div className="flex items-center gap-2">

        <button

          onClick={() => setPage((current) => Math.max(1, current - 1))}

          disabled={!pagination.hasPreviousPage || loading}

          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"

        >

          Previous

        </button>



        <span className="text-sm">

          Page {page} of {Math.max(1, pagination.totalPages)}

        </span>



        <button

          onClick={() => setPage((current) => current + 1)}

          disabled={!pagination.hasNextPage || loading}

          className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40"

        >

          Next

        </button>

      </div>

    </div>

  );

}



export default function AdminDashboard() {

  const { user, logout } = useAuth();

  const navigate = useNavigate();



  // Dashboard overview

  const [overview, setOverview] = useState(null);

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState('');



  // Shared action messages

  const [actionMessage, setActionMessage] = useState('');

  const [actionError, setActionError] = useState('');



  // Listing management

  const [listings, setListings] = useState([]);

  const [listingPage, setListingPage] = useState(1);

  const [listingPagination, setListingPagination] =

    useState(emptyPagination);

  const [listingSearchInput, setListingSearchInput] = useState('');

  const [listingSearch, setListingSearch] = useState('');

  const [listingStatus, setListingStatus] = useState('ALL');

  const [listingsLoading, setListingsLoading] = useState(true);

  const [listingsError, setListingsError] = useState('');

  const [selectedListing, setSelectedListing] = useState(null);

  const [listingDetailLoading, setListingDetailLoading] = useState(false);

  const [listingDetailError, setListingDetailError] = useState('');

  const [updatingListingId, setUpdatingListingId] = useState(null);



  // User management

  const [managedUsers, setManagedUsers] = useState([]);

  const [userPage, setUserPage] = useState(1);

  const [userPagination, setUserPagination] = useState(emptyPagination);

  const [userSearchInput, setUserSearchInput] = useState('');

  const [userSearch, setUserSearch] = useState('');

  const [userRole, setUserRole] = useState('ALL');

  const [usersLoading, setUsersLoading] = useState(true);

  const [usersError, setUsersError] = useState('');

  const [selectedUser, setSelectedUser] = useState(null);

  const [userDetailLoading, setUserDetailLoading] = useState(false);

  const [userDetailError, setUserDetailError] = useState('');

  const [updatingUserId, setUpdatingUserId] = useState(null);



  // Delivery management

  const [deliveries, setDeliveries] = useState([]);

  const [deliveryPage, setDeliveryPage] = useState(1);

  const [deliveryPagination, setDeliveryPagination] =

    useState(emptyPagination);

  const [deliverySearchInput, setDeliverySearchInput] = useState('');

  const [deliverySearch, setDeliverySearch] = useState('');

  const [deliveryStatus, setDeliveryStatus] = useState('ALL');

  const [deliveriesLoading, setDeliveriesLoading] = useState(true);

  const [deliveriesError, setDeliveriesError] = useState('');



  // Load overview

  const loadOverview = useCallback(async () => {

    try {

      const response = await api.get('/admin/overview');

      setOverview(response.data);

      setError('');

    } catch (err) {

      if (err.response?.status === 401) {

        setError('Your session has expired. Please log in again.');

      } else if (err.response?.status === 403) {

        setError('This account does not have administrator access.');

      } else {

        setError(

          err.response?.data?.message ||

            'Could not load admin overview data.'

        );

      }

    }

  }, []);



  // Load listings

  const loadListings = useCallback(async () => {

    setListingsLoading(true);

    setListingsError('');



    try {

      const response = await api.get('/admin/listings', {

        params: {

          page: listingPage,

          limit: PAGE_SIZE,

          search: listingSearch,

          status: listingStatus,

        },

      });



      setListings(response.data.listings ?? []);

      setListingPagination(

        response.data.pagination ?? emptyPagination

      );

    } catch (err) {

      setListingsError(

        err.response?.data?.message || 'Could not load food listings.'

      );

    } finally {

      setListingsLoading(false);

    }

  }, [listingPage, listingSearch, listingStatus]);



  // Load users

  const loadUsers = useCallback(async () => {

    setUsersLoading(true);

    setUsersError('');



    try {

      const response = await api.get('/admin/users', {

        params: {

          page: userPage,

          limit: PAGE_SIZE,

          search: userSearch,

          role: userRole,

        },

      });



      setManagedUsers(response.data.users ?? []);

      setUserPagination(

        response.data.pagination ?? emptyPagination

      );

    } catch (err) {

      setUsersError(

        err.response?.data?.message || 'Could not load users.'

      );

    } finally {

      setUsersLoading(false);

    }

  }, [userPage, userSearch, userRole]);



  // Load deliveries

  const loadDeliveries = useCallback(async () => {

    setDeliveriesLoading(true);

    setDeliveriesError('');



    try {

      const response = await api.get('/admin/deliveries', {

        params: {

          page: deliveryPage,

          limit: PAGE_SIZE,

          search: deliverySearch,

          status: deliveryStatus,

        },

      });



      setDeliveries(response.data.deliveries ?? []);

      setDeliveryPagination(

        response.data.pagination ?? emptyPagination

      );

    } catch (err) {

      setDeliveriesError(

        err.response?.data?.message || 'Could not load deliveries.'

      );

    } finally {

      setDeliveriesLoading(false);

    }

  }, [deliveryPage, deliverySearch, deliveryStatus]);



  // Initial overview loading

  useEffect(() => {

    let active = true;



    const load = async () => {

      setLoading(true);

      await loadOverview();



      if (active) setLoading(false);

    };



    load();



    return () => {

      active = false;

    };

  }, [loadOverview]);



  useEffect(() => {

    loadListings();

  }, [loadListings]);



  useEffect(() => {

    loadUsers();

  }, [loadUsers]);



  useEffect(() => {

    loadDeliveries();

  }, [loadDeliveries]);



  // Debounce listing search

  useEffect(() => {

    const timer = setTimeout(() => {

      setListingPage(1);

      setListingSearch(listingSearchInput.trim());

    }, 350);



    return () => clearTimeout(timer);

  }, [listingSearchInput]);



  // Debounce user search

  useEffect(() => {

    const timer = setTimeout(() => {

      setUserPage(1);

      setUserSearch(userSearchInput.trim());

    }, 350);



    return () => clearTimeout(timer);

  }, [userSearchInput]);



  // Debounce delivery search

  useEffect(() => {

    const timer = setTimeout(() => {

      setDeliveryPage(1);

      setDeliverySearch(deliverySearchInput.trim());

    }, 350);



    return () => clearTimeout(timer);

  }, [deliverySearchInput]);



  const handleLogout = () => {

    logout();

    navigate('/login', { replace: true });

  };



  const refreshAll = async () => {

    setRefreshing(true);

    setActionMessage('');

    setActionError('');



    try {

      await Promise.all([

        loadOverview(),

        loadListings(),

        loadUsers(),

        loadDeliveries(),

      ]);

    } finally {

      setRefreshing(false);

    }

  };



  // Open listing details

  const openListingDetails = async (listingId) => {

    setSelectedListing(null);

    setListingDetailError('');

    setListingDetailLoading(true);



    try {

      const response = await api.get(`/admin/listings/${listingId}`);

      setSelectedListing(response.data);

    } catch (err) {

      setListingDetailError(

        err.response?.data?.message || 'Could not load listing details.'

      );

    } finally {

      setListingDetailLoading(false);

    }

  };



  // Expire listing

  const expireListing = async (listing) => {

    const confirmed = window.confirm(

      `Mark "${(listing.foodTypes ?? []).join(', ') || 'this listing'}" as expired?`

    );



    if (!confirmed) return;



    setUpdatingListingId(listing.id);

    setActionMessage('');

    setActionError('');



    try {

      const response = await api.patch(

        `/admin/listings/${listing.id}/status`,

        { status: 'EXPIRED' }

      );



      setActionMessage(response.data.message || 'Listing updated.');



      setSelectedListing((current) =>

        current?.id === listing.id ? response.data.listing : current

      );



      await Promise.all([loadOverview(), loadListings()]);

    } catch (err) {

      setActionError(

        err.response?.data?.message ||

          'Could not update listing status.'

      );

    } finally {

      setUpdatingListingId(null);

    }

  };



  // Open user details

  const openUserDetails = async (userId) => {

    setSelectedUser(null);

    setUserDetailError('');

    setUserDetailLoading(true);



    try {

      const response = await api.get(`/admin/users/${userId}`);

      setSelectedUser(response.data.user);

    } catch (err) {

      setUserDetailError(

        err.response?.data?.message || 'Could not load user details.'

      );

    } finally {

      setUserDetailLoading(false);

    }

  };



  // Verify or revoke NGO verification

  const updateNGOVerification = async (targetUser) => {

    if (!targetUser?.ngo || targetUser.role !== 'NGO') return;



    const nextValue = !targetUser.ngo.isVerified;



    const confirmed = window.confirm(

      nextValue

        ? `Verify NGO "${targetUser.ngo.ngoName}"?`

        : `Revoke verification for "${targetUser.ngo.ngoName}"?`

    );



    if (!confirmed) return;



    setUpdatingUserId(targetUser.id);

    setActionMessage('');

    setActionError('');



    try {

      const response = await api.patch(

        `/admin/users/${targetUser.id}/ngo-verification`,

        { isVerified: nextValue }

      );



      const updatedUser = response.data.user;



      setManagedUsers((current) =>

        current.map((item) =>

          item.id === targetUser.id ? updatedUser : item

        )

      );



      setSelectedUser((current) =>

        current?.id === targetUser.id ? updatedUser : current

      );



      setActionMessage(response.data.message);

    } catch (err) {

      setActionError(

        err.response?.data?.message ||

          'Could not update NGO verification.'

      );

    } finally {

      setUpdatingUserId(null);

    }

  };



  const users = overview?.users ?? {};

  const listingStats = overview?.listings ?? {};

  const deliveryStats = overview?.deliveries ?? {};



  const detailExpiry = useMemo(

    () => getExpiryDate(selectedListing),

    [selectedListing]

  );



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



  return (

    <div className="min-h-screen bg-gray-50 text-gray-800">

      {/* Header */}

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

              onClick={refreshAll}

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

            className="rounded-xl bg-red-50 p-4 text-sm text-red-700"

          >

            {error}

            {error.includes('log in again') && (

              <button

                onClick={handleLogout}

                className="ml-3 font-bold underline"

              >

                Log in

              </button>

            )}

          </div>

        )}



        {actionMessage && (

          <div

            role="status"

            className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800"

          >

            {actionMessage}

          </div>

        )}



        {actionError && (

          <div

            role="alert"

            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"

          >

            {actionError}

          </div>

        )}



        {/* Platform users overview */}

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

              color="bg-amber-400 text-amber-950"

            />

            <StatCard

              label="Matched"

              value={listingStats.matched}

              color="bg-green-600 text-white"

            />

            <StatCard

              label="Expired"

              value={listingStats.expired}

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

              value={deliveryStats.total}

              color="bg-white text-gray-900 border border-gray-100"

            />

            <StatCard

              label="Active Deliveries"

              value={deliveryStats.active}

              color="bg-orange-500 text-white"

            />

            <StatCard

              label="Completed"

              value={deliveryStats.completed}

              color="bg-emerald-600 text-white"

            />

          </div>

        </section>



        {/* FoodBridge Impact Report */}
        <section>
          <AdminImpactReport />
        </section>

        {/* Listing management */}

        <section>

          <SectionTitle

            action={

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">

                {listingPagination.total} total listings

              </span>

            }

          >

            Listing Management

          </SectionTitle>



          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px]">

            <input

              type="search"

              value={listingSearchInput}

              onChange={(event) => setListingSearchInput(event.target.value)}

              placeholder="Search food, donor name or email..."

              className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"

            />



            <select

              value={listingStatus}

              onChange={(event) => {

                setListingPage(1);

                setListingStatus(event.target.value);

              }}

              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"

            >

              {LISTING_FILTERS.map((status) => (

                <option key={status} value={status}>

                  {status === 'ALL' ? 'All statuses' : status}

                </option>

              ))}

            </select>

          </div>



          {listingsError && (

            <div

              role="alert"

              className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"

            >

              {listingsError}

              <button

                onClick={loadListings}

                className="ml-3 font-bold underline"

              >

                Retry

              </button>

            </div>

          )}



          {listingsLoading ? (

            <div className="rounded-2xl bg-white p-10 text-center text-gray-500">

              Loading listings...

            </div>

          ) : (

            <>

              <div className="space-y-3">

                {listings.map((listing) => (

                  <article

                    key={listing.id}

                    className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"

                  >

                    <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">

                      <div className="min-w-0">

                        <h3 className="font-bold text-gray-900">

                          {(listing.foodTypes ?? []).join(', ') ||

                            'Food listing'}

                        </h3>

                        <p className="mt-2 text-sm text-gray-500">

                          {listing.quantityKg} kg · {listing.vehicleNeeded} ·{' '}

                          {listing.donor?.user?.name ?? 'Unknown donor'}

                        </p>

                        <p className="mt-1 break-all text-xs text-gray-400">

                          {listing.donor?.user?.email ?? 'No donor email'}

                        </p>

                        <p className="mt-1 text-xs text-gray-400">

                          Created: {formatDate(listing.createdAt)}

                        </p>

                        <p className="mt-1 text-xs text-gray-400">

                          Pickup: {listing.pickupTiming} · Expires after{' '}

                          {listing.expiryHours} hours

                        </p>

                      </div>



                      <div className="flex shrink-0 flex-wrap items-center gap-2">

                        <span

                          className={`rounded-full px-3 py-1 text-xs font-bold ${

                            STATUS_STYLES[listing.status] ||

                            'bg-gray-100 text-gray-700'

                          }`}

                        >

                          {listing.status}

                        </span>



                        <button

                          onClick={() => openListingDetails(listing.id)}

                          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold hover:bg-gray-50"

                        >

                          Details

                        </button>



                        {listing.status === 'LISTED' && (

                          <button

                            onClick={() => expireListing(listing)}

                            disabled={updatingListingId === listing.id}

                            className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"

                          >

                            {updatingListingId === listing.id

                              ? 'Updating...'

                              : 'Expire listing'}

                          </button>

                        )}

                      </div>

                    </div>

                  </article>

                ))}



                {!listings.length && !listingsError && (

                  <div className="rounded-2xl border border-dashed bg-white p-10 text-center">

                    No listings found.

                  </div>

                )}

              </div>



              <Pagination

                pagination={listingPagination}

                page={listingPage}

                setPage={setListingPage}

                loading={listingsLoading}

                noun="listings"

              />

            </>

          )}

        </section>



        {/* User management */}

        <section>

          <SectionTitle

            action={

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">

                {userPagination.total} total users

              </span>

            }

          >

            User Management

          </SectionTitle>



          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_200px]">

            <input

              type="search"

              value={userSearchInput}

              onChange={(event) => setUserSearchInput(event.target.value)}

              placeholder="Search name, email, phone or organization..."

              className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"

            />



            <select

              value={userRole}

              onChange={(event) => {

                setUserPage(1);

                setUserRole(event.target.value);

              }}

              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"

            >

              {USER_ROLES.map((role) => (

                <option key={role} value={role}>

                  {role === 'ALL' ? 'All roles' : role}

                </option>

              ))}

            </select>

          </div>



          {usersError && (

            <div

              role="alert"

              className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"

            >

              {usersError}

              <button

                onClick={loadUsers}

                className="ml-3 font-bold underline"

              >

                Retry

              </button>

            </div>

          )}



          {usersLoading ? (

            <div className="rounded-2xl bg-white p-10 text-center text-gray-500">

              Loading users...

            </div>

          ) : (

            <>

              <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">

                <table className="w-full min-w-[850px] text-left text-sm">

                  <thead className="bg-gray-50 text-xs uppercase text-gray-500">

                    <tr>

                      <th className="px-4 py-4">User</th>

                      <th className="px-4 py-4">Role</th>

                      <th className="px-4 py-4">Profile</th>

                      <th className="px-4 py-4">Verification</th>

                      <th className="px-4 py-4">Registered</th>

                      <th className="px-4 py-4">Actions</th>

                    </tr>

                  </thead>



                  <tbody className="divide-y divide-gray-100">

                    {managedUsers.map((item) => (

                      <tr key={item.id} className="hover:bg-gray-50">

                        <td className="px-4 py-4">

                          <p className="font-semibold text-gray-900">

                            {item.name}

                          </p>

                          <p className="mt-1 break-all text-xs text-gray-500">

                            {item.email}

                          </p>

                          <p className="mt-1 text-xs text-gray-400">

                            {item.phone || 'No phone'}

                          </p>

                        </td>



                        <td className="px-4 py-4">

                          <RoleBadge role={item.role} />

                        </td>



                        <td className="px-4 py-4">

                          {item.donor && (

                            <>

                              <p className="font-medium">

                                {item.donor.orgName}

                              </p>

                              <p className="mt-1 text-xs text-gray-500">

                                {item.donor.donorType}

                              </p>

                            </>

                          )}



                          {item.ngo && (

                            <>

                              <p className="font-medium">

                                {item.ngo.ngoName}

                              </p>

                              <p className="mt-1 text-xs text-gray-500">

                                Capacity: {item.ngo.capacityPerDay}/day

                              </p>

                            </>

                          )}



                          {item.agent && (

                            <>

                              <p className="font-medium">

                                {item.agent.vehicleType}

                              </p>

                              <p className="mt-1 text-xs text-gray-500">

                                {item.agent.isAvailable

                                  ? 'Available'

                                  : 'Unavailable'}

                              </p>

                            </>

                          )}



                          {!item.donor && !item.ngo && !item.agent && '—'}

                        </td>



                        <td className="px-4 py-4">

                          {item.role === 'NGO' ? (

                            <span

                              className={`rounded-full px-3 py-1 text-xs font-bold ${

                                item.ngo?.isVerified

                                  ? 'bg-green-100 text-green-800'

                                  : 'bg-amber-100 text-amber-800'

                              }`}

                            >

                              {item.ngo?.isVerified ? 'Verified' : 'Pending'}

                            </span>

                          ) : (

                            '—'

                          )}

                        </td>



                        <td className="px-4 py-4 text-xs text-gray-500">

                          {formatDate(item.createdAt)}

                        </td>



                        <td className="px-4 py-4">

                          <div className="flex flex-wrap gap-2">

                            <button

                              onClick={() => openUserDetails(item.id)}

                              className="rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-gray-50"

                            >

                              Details

                            </button>



                            {item.role === 'NGO' && item.ngo && (

                              <button

                                onClick={() => updateNGOVerification(item)}

                                disabled={updatingUserId === item.id}

                                className={`rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50 ${

                                  item.ngo.isVerified

                                    ? 'bg-red-600 hover:bg-red-700'

                                    : 'bg-green-600 hover:bg-green-700'

                                }`}

                              >

                                {updatingUserId === item.id

                                  ? 'Updating...'

                                  : item.ngo.isVerified

                                    ? 'Revoke'

                                    : 'Verify NGO'}

                              </button>

                            )}

                          </div>

                        </td>

                      </tr>

                    ))}



                    {!managedUsers.length && !usersError && (

                      <tr>

                        <td

                          colSpan={6}

                          className="px-4 py-12 text-center text-gray-500"

                        >

                          No users found. Try a different search or role.

                        </td>

                      </tr>

                    )}

                  </tbody>

                </table>

              </div>



              <Pagination

                pagination={userPagination}

                page={userPage}

                setPage={setUserPage}

                loading={usersLoading}

                noun="users"

              />

            </>

          )}

        </section>



        {/* Delivery management */}

        <section>

          <SectionTitle

            action={

              <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">

                {deliveryPagination.total} total deliveries

              </span>

            }

          >

            Delivery Management

          </SectionTitle>



          <p className="mb-4 text-sm text-gray-500">

            Track deliveries, food quantities, participants, timestamps and

            proof-of-delivery photos.

          </p>



          <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px]">

            <input

              type="search"

              value={deliverySearchInput}

              onChange={(event) =>

                setDeliverySearchInput(event.target.value)

              }

              placeholder="Search food, donor, NGO or agent..."

              className="min-w-0 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm outline-none focus:border-green-500"

            />



            <select

              value={deliveryStatus}

              onChange={(event) => {

                setDeliveryPage(1);

                setDeliveryStatus(event.target.value);

              }}

              className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm"

            >

              {DELIVERY_FILTERS.map((status) => (

                <option key={status} value={status}>

                  {status === 'ALL' ? 'All delivery statuses' : status}

                </option>

              ))}

            </select>

          </div>



          {deliveriesError && (

            <div

              role="alert"

              className="mb-4 rounded-xl bg-red-50 p-4 text-sm text-red-700"

            >

              {deliveriesError}

              <button

                onClick={loadDeliveries}

                className="ml-3 font-bold underline"

              >

                Retry

              </button>

            </div>

          )}



          {deliveriesLoading ? (

            <div className="rounded-2xl bg-white p-10 text-center text-gray-500">

              Loading deliveries...

            </div>

          ) : (

            <>

              <div className="space-y-4">

                {deliveries.map((delivery) => {

                  const listing = delivery.match?.listing;

                  const donor = listing?.donor;

                  const ngo = delivery.match?.ngo;

                  const agent = delivery.agent;

                  const proofUrl = getProofPhotoUrl(

                    delivery.proofPhotoUrl

                  );



                  return (

                    <article

                      key={delivery.id}

                      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5"

                    >

                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">

                        <div className="min-w-0">

                          <h3 className="break-words font-bold text-gray-900">

                            {(listing?.foodTypes ?? []).join(', ') ||

                              'Food delivery'}

                          </h3>



                          <p className="mt-1 text-sm text-gray-500">

                            {listing?.quantityKg ?? '—'} kg ·{' '}

                            {listing?.vehicleNeeded ?? 'Vehicle unavailable'}

                          </p>



                          <p className="mt-2 break-all text-xs text-gray-400">

                            Delivery ID: {delivery.id}

                          </p>

                        </div>



                        <span

                          className={`w-fit rounded-full px-3 py-1 text-xs font-bold ${

                            DELIVERY_STATUS_STYLES[delivery.status] ||

                            'bg-gray-100 text-gray-700'

                          }`}

                        >

                          {delivery.status}

                        </span>

                      </div>



                      <div className="mt-4 grid grid-cols-1 gap-4 border-t border-gray-100 pt-4 sm:grid-cols-2 lg:grid-cols-3">

                        <div>

                          <p className="text-xs font-semibold uppercase text-gray-400">

                            Delivery agent

                          </p>

                          <p className="mt-1 font-semibold text-gray-800">

                            {agent?.user?.name || 'Not available'}

                          </p>

                          <p className="mt-1 break-all text-xs text-gray-500">

                            {agent?.user?.email || 'No email'}

                          </p>

                          <p className="mt-1 text-xs text-gray-500">

                            {agent?.user?.phone || 'No phone'}

                          </p>

                        </div>



                        <div>

                          <p className="text-xs font-semibold uppercase text-gray-400">

                            Donor

                          </p>

                          <p className="mt-1 font-semibold text-gray-800">

                            {donor?.orgName ||

                              donor?.user?.name ||

                              'Not available'}

                          </p>

                          <p className="mt-1 break-all text-xs text-gray-500">

                            {donor?.user?.email || 'No email'}

                          </p>

                        </div>



                        <div>

                          <p className="text-xs font-semibold uppercase text-gray-400">

                            Receiving NGO

                          </p>

                          <p className="mt-1 font-semibold text-gray-800">

                            {ngo?.ngoName || 'Not available'}

                          </p>

                          <p className="mt-1 break-all text-xs text-gray-500">

                            {ngo?.user?.email || 'No email'}

                          </p>

                        </div>

                      </div>



                      <div className="mt-4 grid grid-cols-1 gap-3 rounded-xl bg-gray-50 p-3 text-sm sm:grid-cols-3">

                        <div>

                          <p className="text-xs text-gray-400">Created</p>

                          <p className="mt-1 font-medium text-gray-700">

                            {formatDate(delivery.createdAt)}

                          </p>

                        </div>



                        <div>

                          <p className="text-xs text-gray-400">Picked up</p>

                          <p className="mt-1 font-medium text-gray-700">

                            {formatDate(delivery.pickedUpAt)}

                          </p>

                        </div>



                        <div>

                          <p className="text-xs text-gray-400">Delivered</p>

                          <p className="mt-1 font-medium text-gray-700">

                            {formatDate(delivery.deliveredAt)}

                          </p>

                        </div>

                      </div>



                      <div className="mt-4 flex flex-wrap items-center gap-3">

                        {proofUrl ? (

                          <a

                            href={proofUrl}

                            target="_blank"

                            rel="noopener noreferrer"

                            className="inline-flex items-center gap-2 rounded-lg bg-green-50 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-green-100"

                          >

                            View proof photo ↗

                          </a>

                        ) : (

                          <span className="rounded-lg bg-gray-100 px-4 py-2 text-sm text-gray-500">

                            No proof photo uploaded

                          </span>

                        )}



                        {delivery.match?.id && (

                          <span className="break-all text-xs text-gray-400">

                            Match ID: {delivery.match.id}

                          </span>

                        )}

                      </div>

                    </article>

                  );

                })}



                {!deliveries.length && !deliveriesError && (

                  <div className="rounded-2xl border border-dashed bg-white p-10 text-center">

                    <p className="font-semibold text-gray-700">

                      No deliveries found

                    </p>

                    <p className="mt-1 text-sm text-gray-500">

                      Try a different search or delivery status.

                    </p>

                  </div>

                )}

              </div>



              <Pagination

                pagination={deliveryPagination}

                page={deliveryPage}

                setPage={setDeliveryPage}

                loading={deliveriesLoading}

                noun="deliveries"

              />

            </>

          )}

        </section>



        <footer className="border-t border-gray-200 py-4 text-center text-xs text-gray-400">

          FoodBridge Admin Dashboard · Users, listings and deliveries

        </footer>

      </main>



      {/* Listing details modal */}

      {(listingDetailLoading || listingDetailError || selectedListing) && (

        <div

          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {

              setSelectedListing(null);

              setListingDetailError('');

            }

          }}

        >

          <div className="my-4 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">

            <div className="mb-4 flex items-center justify-between gap-4">

              <h2 className="text-xl font-black">Listing Details</h2>

              <button

                onClick={() => {

                  setSelectedListing(null);

                  setListingDetailError('');

                }}

                aria-label="Close listing details"

                className="rounded-lg px-3 py-1 text-xl hover:bg-gray-100"

              >

                ×

              </button>

            </div>



            {listingDetailLoading && <p>Loading details...</p>}



            {listingDetailError && (

              <p

                role="alert"

                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"

              >

                {listingDetailError}

              </p>

            )}



            {selectedListing && (

              <>

                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">

                  <h3 className="text-lg font-bold">

                    {(selectedListing.foodTypes ?? []).join(', ') ||

                      'Food listing'}

                  </h3>

                  <span

                    className={`rounded-full px-3 py-1 text-xs font-bold ${

                      STATUS_STYLES[selectedListing.status] ||

                      'bg-gray-100'

                    }`}

                  >

                    {selectedListing.status}

                  </span>

                </div>



                {selectedListing.photoUrl && (

                  <img

                    src={getProofPhotoUrl(selectedListing.photoUrl)}

                    alt="Food listing"

                    className="mb-4 max-h-64 w-full rounded-xl bg-gray-50 object-contain"

                  />

                )}



                <dl className="divide-y divide-gray-100">

                  <DetailRow label="Listing ID">

                    {selectedListing.id}

                  </DetailRow>

                  <DetailRow label="Food types">

                    {(selectedListing.foodTypes ?? []).join(', ')}

                  </DetailRow>

                  <DetailRow label="Quantity">

                    {selectedListing.quantityKg} kg

                  </DetailRow>

                  <DetailRow label="Vehicle needed">

                    {selectedListing.vehicleNeeded}

                  </DetailRow>

                  <DetailRow label="Pickup timing">

                    {selectedListing.pickupTiming}

                  </DetailRow>

                  <DetailRow label="Expiry duration">

                    {selectedListing.expiryHours} hours

                  </DetailRow>

                  <DetailRow label="Created at">

                    {formatDate(selectedListing.createdAt)}

                  </DetailRow>

                  <DetailRow label="Expected expiry">

                    {detailExpiry

                      ? detailExpiry.toLocaleString()

                      : 'Not available'}

                  </DetailRow>

                  <DetailRow label="Donor organization">

                    {selectedListing.donor?.orgName}

                  </DetailRow>

                  <DetailRow label="Donor name">

                    {selectedListing.donor?.user?.name}

                  </DetailRow>

                  <DetailRow label="Donor email">

                    {selectedListing.donor?.user?.email}

                  </DetailRow>

                  <DetailRow label="Donor phone">

                    {selectedListing.donor?.user?.phone}

                  </DetailRow>

                  <DetailRow label="Donor type">

                    {selectedListing.donor?.donorType}

                  </DetailRow>

                  <DetailRow label="Donor trust score">

                    {selectedListing.donor?.trustScore}

                  </DetailRow>

                  <DetailRow label="Match ID">

                    {selectedListing.match?.id}

                  </DetailRow>

                  <DetailRow label="Match status">

                    {selectedListing.match?.status}

                  </DetailRow>

                  <DetailRow label="NGO">

                    {selectedListing.match?.ngo?.ngoName}

                  </DetailRow>

                  <DetailRow label="NGO contact">

                    {selectedListing.match?.ngo?.user?.name}

                  </DetailRow>

                  <DetailRow label="Delivery status">

                    {selectedListing.match?.delivery?.status}

                  </DetailRow>

                  <DetailRow label="Delivery agent">

                    {selectedListing.match?.delivery?.agent?.user?.name}

                  </DetailRow>

                  <DetailRow label="Delivered at">

                    {formatDate(

                      selectedListing.match?.delivery?.deliveredAt

                    )}

                  </DetailRow>

                  <DetailRow label="Proof photo">

                    {selectedListing.match?.delivery?.proofPhotoUrl ? (

                      <a

                        href={getProofPhotoUrl(

                          selectedListing.match.delivery.proofPhotoUrl

                        )}

                        target="_blank"

                        rel="noopener noreferrer"

                        className="font-semibold text-green-700 underline"

                      >

                        View proof photo

                      </a>

                    ) : (

                      'No proof photo available'

                    )}

                  </DetailRow>

                </dl>



                {selectedListing.status === 'LISTED' && (

                  <button

                    onClick={() => expireListing(selectedListing)}

                    disabled={updatingListingId === selectedListing.id}

                    className="mt-5 w-full rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50"

                  >

                    {updatingListingId === selectedListing.id

                      ? 'Updating...'

                      : 'Mark listing as expired'}

                  </button>

                )}

              </>

            )}

          </div>

        </div>

      )}



      {/* User details modal */}

      {(userDetailLoading || userDetailError || selectedUser) && (

        <div

          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 sm:items-center"

          onMouseDown={(event) => {

            if (event.target === event.currentTarget) {

              setSelectedUser(null);

              setUserDetailError('');

            }

          }}

        >

          <div className="my-4 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-xl sm:p-7">

            <div className="mb-4 flex items-center justify-between gap-4">

              <div>

                <h2 className="text-xl font-black">User Details</h2>

                <p className="mt-1 text-sm text-gray-500">

                  Account and role-specific information

                </p>

              </div>



              <button

                onClick={() => {

                  setSelectedUser(null);

                  setUserDetailError('');

                }}

                aria-label="Close user details"

                className="rounded-lg px-3 py-1 text-xl hover:bg-gray-100"

              >

                ×

              </button>

            </div>



            {userDetailLoading && <p>Loading user details...</p>}



            {userDetailError && (

              <p

                role="alert"

                className="rounded-lg bg-red-50 p-3 text-sm text-red-700"

              >

                {userDetailError}

              </p>

            )}



            {selectedUser && (

              <>

                <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gray-50 p-4">

                  <div>

                    <h3 className="text-lg font-bold">

                      {selectedUser.name}

                    </h3>

                    <p className="mt-1 break-all text-sm text-gray-500">

                      {selectedUser.email}

                    </p>

                  </div>

                  <RoleBadge role={selectedUser.role} />

                </div>



                <dl className="divide-y divide-gray-100">

                  <DetailRow label="User ID">{selectedUser.id}</DetailRow>

                  <DetailRow label="Full name">

                    {selectedUser.name}

                  </DetailRow>

                  <DetailRow label="Email">{selectedUser.email}</DetailRow>

                  <DetailRow label="Phone">{selectedUser.phone}</DetailRow>

                  <DetailRow label="Role">{selectedUser.role}</DetailRow>

                  <DetailRow label="Registered">

                    {formatDate(selectedUser.createdAt)}

                  </DetailRow>



                  {selectedUser.donor && (

                    <>

                      <DetailRow label="Organization">

                        {selectedUser.donor.orgName}

                      </DetailRow>

                      <DetailRow label="Donor type">

                        {selectedUser.donor.donorType}

                      </DetailRow>

                      <DetailRow label="Trust score">

                        {selectedUser.donor.trustScore}

                      </DetailRow>

                    </>

                  )}



                  {selectedUser.ngo && (

                    <>

                      <DetailRow label="NGO name">

                        {selectedUser.ngo.ngoName}

                      </DetailRow>

                      <DetailRow label="Daily capacity">

                        {selectedUser.ngo.capacityPerDay}

                      </DetailRow>

                      <DetailRow label="Food preferences">

                        {(selectedUser.ngo.foodPreferences ?? []).join(', ')}

                      </DetailRow>

                      <DetailRow label="Night operations">

                        {selectedUser.ngo.nightOperations ? 'Yes' : 'No'}

                      </DetailRow>

                      <DetailRow label="Verification status">

                        {selectedUser.ngo.isVerified

                          ? 'Verified'

                          : 'Not verified'}

                      </DetailRow>

                    </>

                  )}



                  {selectedUser.agent && (

                    <>

                      <DetailRow label="Vehicle type">

                        {selectedUser.agent.vehicleType}

                      </DetailRow>

                      <DetailRow label="Availability">

                        {selectedUser.agent.isAvailable

                          ? 'Available'

                          : 'Unavailable'}

                      </DetailRow>

                      <DetailRow label="Rating">

                        {selectedUser.agent.rating}

                      </DetailRow>

                    </>

                  )}

                </dl>



                {selectedUser.role === 'NGO' && selectedUser.ngo && (

                  <button

                    onClick={() => updateNGOVerification(selectedUser)}

                    disabled={updatingUserId === selectedUser.id}

                    className={`mt-5 w-full rounded-xl px-4 py-3 font-bold text-white disabled:opacity-50 ${

                      selectedUser.ngo.isVerified

                        ? 'bg-red-600 hover:bg-red-700'

                        : 'bg-green-600 hover:bg-green-700'

                    }`}

                  >

                    {updatingUserId === selectedUser.id

                      ? 'Updating verification...'

                      : selectedUser.ngo.isVerified

                        ? 'Revoke NGO verification'

                        : 'Verify NGO'}

                  </button>

                )}

              </>

            )}

          </div>

        </div>

      )}

    </div>

  );

}
