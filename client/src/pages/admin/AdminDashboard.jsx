import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);

  useEffect(() => {
    api.get('/listings/all')
      .then((res) => setListings(res.data))
      .catch(() => {});
  }, []);

  const stats = {
    total: listings.length,
    matched: listings.filter((l) => l.status === 'MATCHED').length,
    listed: listings.filter((l) => l.status === 'LISTED').length,
    expired: listings.filter((l) => l.status === 'EXPIRED').length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl font-black text-gray-800">
          🌱 FoodBridge Admin
        </h1>
        <button
          onClick={() => {
            logout();
            navigate('/');
          }}
          className="text-sm text-gray-500 hover:text-red-500"
        >
          Logout
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="grid grid-cols-2 gap-4 mb-6 md:grid-cols-4">
          {[
            { label: 'Total', value: stats.total, color: 'bg-gray-800 text-white' },
            { label: 'Active', value: stats.listed, color: 'bg-yellow-500 text-white' },
            { label: 'Matched', value: stats.matched, color: 'bg-green-600 text-white' },
            { label: 'Expired', value: stats.expired, color: 'bg-red-500 text-white' },
          ].map((stat) => (
            <div key={stat.label} className={`${stat.color} rounded-2xl p-4`}>
              <div className="text-3xl font-black">{stat.value}</div>
              <div className="text-sm opacity-80 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <h3 className="font-bold text-gray-700 mb-3">All Listings</h3>
        <div className="space-y-3">
          {listings.map((listing) => (
            <div
              key={listing.id}
              className="bg-white rounded-2xl p-4 shadow-sm"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold text-gray-800">
                    {listing.foodTypes?.join(', ')}
                  </div>
                  <div className="text-sm text-gray-500 mt-1">
                    {listing.quantityKg} kg · {listing.vehicleNeeded} ·{' '}
                    {listing.donor?.user?.name}
                  </div>
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    listing.status === 'LISTED'
                      ? 'bg-yellow-100 text-yellow-700'
                      : listing.status === 'MATCHED'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {listing.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}