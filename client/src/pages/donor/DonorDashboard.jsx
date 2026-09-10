import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { io } from 'socket.io-client';
import LiveMap from '../../components/LiveMap';

export default function DonorDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState([]);
  const [agentLocation, setAgentLocation] = useState(null);
  const [activeDeliveryId, setActiveDeliveryId] = useState(null);
  const socketRef = useRef(null);

  const fetchListings = () => {
    api
      .get('/listings/mine')
      .then((res) => setListings(res.data))
      .catch(() => {});
  };

  // Connect socket
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');

    socketRef.current.on('location_update', ({ lat, lng }) => {
      setAgentLocation({ lat, lng });
    });

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, []);

  // Fetch listings
  useEffect(() => {
    fetchListings();
  }, []);

  // Join delivery room when active delivery found
  useEffect(() => {
    const activeListings = listings.filter(
      (l) => l.status === 'MATCHED' && l.match?.delivery
    );
    if (activeListings.length > 0) {
      const deliveryId = activeListings[0].match.delivery.id;
      setActiveDeliveryId(deliveryId);
      if (socketRef.current) {
        socketRef.current.emit('join_delivery', deliveryId);
      }
    }
  }, [listings]);

  const statusColor = (status) => {
    if (status === 'LISTED') return 'bg-yellow-100 text-yellow-700';
    if (status === 'MATCHED') return 'bg-blue-100 text-blue-700';
    if (status === 'EXPIRED') return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-700';
  };

  const statusIcon = (status) => {
    if (status === 'LISTED') return '⏳';
    if (status === 'MATCHED') return '🚴';
    if (status === 'EXPIRED') return '❌';
    return '•';
  };

  return (
    <div className="min-h-screen bg-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-black text-green-700">🌱 FoodBridge</h1>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => navigate('/donor/profile')}
            className="text-sm text-green-600 font-semibold hover:underline"
          >
            ✏️ Profile
          </button>
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
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Welcome */}
        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
          <h2 className="text-2xl font-bold text-gray-800">
            Hi, {user?.name} 👋
          </h2>
          <p className="text-gray-500 mt-1">
            Thank you for helping reduce food waste!
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-green-600 text-white rounded-2xl p-4">
            <div className="text-3xl font-black">{listings.length}</div>
            <div className="text-green-100 text-xs mt-1">Total Donations</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-black text-blue-600">
              {listings.filter((l) => l.status === 'MATCHED').length}
            </div>
            <div className="text-gray-500 text-xs mt-1">Matched</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-black text-yellow-600">
              {listings.filter((l) => l.status === 'LISTED').length}
            </div>
            <div className="text-gray-500 text-xs mt-1">Pending</div>
          </div>
        </div>

        {/* Live Tracking Map */}
        {agentLocation && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="font-bold text-gray-700 mb-3">
              🚴 Live Delivery Tracking
            </h3>
            <LiveMap
              agentLat={agentLocation.lat}
              agentLng={agentLocation.lng}
            />
            <div className="mt-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-semibold">
                Agent is on the way
              </span>
            </div>
          </div>
        )}

        {/* Donate Button */}
        <button
          onClick={() => navigate('/donor/create-listing')}
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition mb-6 shadow-sm"
        >
          + Donate Food Now
        </button>

        {/* Recent Listings */}
        <h3 className="font-bold text-gray-700 mb-3">Recent Donations</h3>
        {listings.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">🍽️</div>
            <div className="text-gray-500">
              No donations yet. Start by donating food!
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-bold text-gray-800">
                      {statusIcon(listing.status)}{' '}
                      {listing.foodTypes.join(', ')}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {listing.quantityKg} kg · {listing.vehicleNeeded}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {new Date(listing.createdAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor(listing.status)}`}
                  >
                    {listing.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}