import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { io } from 'socket.io-client';

export default function AgentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [deliveries, setDeliveries] = useState([]);
  const [isAvailable, setIsAvailable] = useState(true);
  const socketRef = useRef(null);
  const locationIntervalRef = useRef(null);

  const fetchDeliveries = () => {
    api
      .get('/deliveries/my-deliveries')
      .then((res) => setDeliveries(res.data))
      .catch(() => {});
  };

  const fetchProfile = () => {
    api
      .get('/deliveries/profile')
      .then((res) => setIsAvailable(res.data.isAvailable))
      .catch(() => {});
  };

  // Connect socket
  useEffect(() => {
    socketRef.current = io('http://localhost:5000');
    return () => {
      if (socketRef.current) socketRef.current.disconnect();
      if (locationIntervalRef.current)
        clearInterval(locationIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    fetchDeliveries();
    fetchProfile();
  }, []);

  const toggleAvailability = async () => {
    try {
      await api.patch('/deliveries/availability', {
        isAvailable: !isAvailable,
      });
      setIsAvailable(!isAvailable);
    } catch (err) {
      alert('Failed to update availability');
    }
  };

  // Start broadcasting GPS
  const startBroadcasting = (deliveryId) => {
    if (!navigator.geolocation) return;

    socketRef.current.emit('join_delivery', deliveryId);

    locationIntervalRef.current = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          socketRef.current.emit('agent_location', {
            deliveryId,
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          console.log(
            `📍 Broadcasting: ${pos.coords.latitude}, ${pos.coords.longitude}`
          );
        },
        (err) => console.error('GPS error:', err)
      );
    }, 5000);
  };

  const stopBroadcasting = () => {
    if (locationIntervalRef.current) {
      clearInterval(locationIntervalRef.current);
      locationIntervalRef.current = null;
    }
  };

  const updateStatus = async (deliveryId, status) => {
    try {
      await api.patch(`/deliveries/${deliveryId}/status`, { status });

      if (status === 'PICKED_UP') {
        startBroadcasting(deliveryId);
      }
      if (status === 'DELIVERED') {
        stopBroadcasting();
      }

      fetchDeliveries();
    } catch (err) {
      alert('Failed to update status');
    }
  };

  const completed = deliveries.filter((d) => d.status === 'DELIVERED').length;
  const active = deliveries.filter(
    (d) => d.status === 'ASSIGNED' || d.status === 'PICKED_UP' || d.status === 'IN_TRANSIT'
  ).length;

  return (
    <div className="min-h-screen bg-orange-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-black text-orange-700">🌱 FoodBridge</h1>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => navigate('/agent/profile')}
            className="text-sm text-orange-600 font-semibold hover:underline"
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
            Hey {user?.name} 🚴
          </h2>
          <p className="text-gray-500 mt-1">Delivery Agent Dashboard</p>
        </div>

        {/* Availability Toggle */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex justify-between items-center">
            <div>
              <div className="font-bold text-gray-800">
                Availability Status
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {isAvailable
                  ? '🟢 Online — accepting jobs'
                  : '🔴 Offline — not accepting jobs'}
              </div>
            </div>
            <button
              onClick={toggleAvailability}
              className={`px-5 py-2 rounded-xl font-bold text-sm transition ${
                isAvailable
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >
              {isAvailable ? 'Go Offline' : 'Go Online'}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-orange-600 text-white rounded-2xl p-4">
            <div className="text-3xl font-black">{deliveries.length}</div>
            <div className="text-orange-100 text-xs mt-1">Total</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-black text-blue-600">{active}</div>
            <div className="text-gray-500 text-xs mt-1">Active</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-black text-green-600">
              {completed}
            </div>
            <div className="text-gray-500 text-xs mt-1">Completed</div>
          </div>
        </div>

        {/* Deliveries */}
        <h3 className="font-bold text-gray-700 mb-3">My Deliveries</h3>
        {deliveries.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">📦</div>
            <div className="text-gray-500">No deliveries assigned yet.</div>
            <div className="text-sm text-gray-400 mt-2">
              Make sure you are online to receive jobs!
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {deliveries.map((delivery) => (
              <div
                key={delivery.id}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-gray-800">
                      {delivery.match?.listing?.foodTypes?.join(', ')}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {delivery.match?.listing?.quantityKg} kg ·{' '}
                      {delivery.match?.listing?.vehicleNeeded}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      📍 From:{' '}
                      {delivery.match?.listing?.donor?.user?.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      🏢 To: {delivery.match?.ngo?.user?.name}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      delivery.status === 'ASSIGNED'
                        ? 'bg-yellow-100 text-yellow-700'
                        : delivery.status === 'PICKED_UP'
                        ? 'bg-blue-100 text-blue-700'
                        : delivery.status === 'IN_TRANSIT'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >
                    {delivery.status}
                  </span>
                </div>

                {/* Progress bar */}
                <div className="flex gap-1 mb-3">
                  {['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].map(
                    (s) => (
                      <div
                        key={s}
                        className={`h-1.5 flex-1 rounded-full ${
                          ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
                            .indexOf(s) <=
                          ['ASSIGNED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED']
                            .indexOf(delivery.status)
                            ? 'bg-orange-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    )
                  )}
                </div>

                {/* Action buttons */}
                <div className="flex gap-2 flex-wrap">
                  {delivery.status === 'ASSIGNED' && (
                    <button
                      onClick={() =>
                        updateStatus(delivery.id, 'PICKED_UP')
                      }
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition"
                    >
                      📦 Mark Picked Up
                    </button>
                  )}
                  {delivery.status === 'PICKED_UP' && (
                    <button
                      onClick={() =>
                        updateStatus(delivery.id, 'IN_TRANSIT')
                      }
                      className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-600 transition"
                    >
                      🚗 Mark In Transit
                    </button>
                  )}
                  {delivery.status === 'IN_TRANSIT' && (
                    <button
                      onClick={() =>
                        updateStatus(delivery.id, 'DELIVERED')
                      }
                      className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 transition"
                    >
                      ✅ Mark Delivered
                    </button>
                  )}
                  {delivery.status === 'DELIVERED' && (
                    <span className="bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold text-sm">
                      ✅ Delivered
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}