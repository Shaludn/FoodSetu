import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { io } from 'socket.io-client';
import LiveMap from '../../components/LiveMap';

export default function NGODashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [matches, setMatches] = useState([]);
  const [agentLocation, setAgentLocation] = useState(null);
  const socketRef = useRef(null);

  const fetchMatches = () => {
    api
      .get('/matches/my-matches')
      .then((res) => setMatches(res.data))
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

  useEffect(() => {
    fetchMatches();
  }, []);

  // Join delivery room when accepted match found
  useEffect(() => {
    const accepted = matches.find(
      (m) => m.status === 'ACCEPTED' && m.delivery
    );
    if (accepted && socketRef.current) {
      socketRef.current.emit('join_delivery', accepted.delivery.id);
    }
  }, [matches]);

  const respond = async (matchId, status) => {
    try {
      await api.patch(`/matches/${matchId}/respond`, { status });
      fetchMatches();
    } catch (err) {
      alert('Failed to respond');
    }
  };

  const accepted = matches.filter((m) => m.status === 'ACCEPTED').length;
  const pending = matches.filter((m) => m.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-blue-50">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <h1 className="text-xl font-black text-blue-700">🌱 FoodBridge</h1>
        <div className="flex gap-4 items-center">
          <button
            onClick={() => navigate('/ngo/profile')}
            className="text-sm text-blue-600 font-semibold hover:underline"
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
            {user?.name} 🏢
          </h2>
          <p className="text-gray-500 mt-1">NGO Dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-blue-600 text-white rounded-2xl p-4">
            <div className="text-3xl font-black">{matches.length}</div>
            <div className="text-blue-100 text-xs mt-1">Total Matches</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-black text-green-600">{accepted}</div>
            <div className="text-gray-500 text-xs mt-1">Accepted</div>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="text-3xl font-black text-yellow-600">{pending}</div>
            <div className="text-gray-500 text-xs mt-1">Pending</div>
          </div>
        </div>

        {/* Live Map */}
        {agentLocation && (
          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">
            <h3 className="font-bold text-gray-700 mb-3">
              🚴 Agent Live Location
            </h3>
            <LiveMap
              agentLat={agentLocation.lat}
              agentLng={agentLocation.lng}
            />
            <div className="mt-3 flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm text-green-600 font-semibold">
                Agent is on the way to you
              </span>
            </div>
          </div>
        )}

        {/* Match Requests */}
        <h3 className="font-bold text-gray-700 mb-3">
          Incoming Match Requests
        </h3>
        {matches.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
            <div className="text-4xl mb-3">📭</div>
            <div className="text-gray-500">
              No match requests yet. Check back soon!
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map((match) => (
              <div
                key={match.id}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="font-bold text-gray-800">
                      {match.listing?.foodTypes?.join(', ')}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {match.listing?.quantityKg} kg ·{' '}
                      {match.listing?.vehicleNeeded}
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      From: {match.listing?.donor?.user?.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(match.notifiedAt).toLocaleString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      match.status === 'PENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : match.status === 'ACCEPTED'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {match.status}
                  </span>
                </div>

                {/* Delivery status */}
                {match.status === 'ACCEPTED' && match.delivery && (
                  <div className="bg-green-50 rounded-xl px-4 py-2 mb-3">
                    <div className="text-sm font-bold text-green-700">
                      🚴 Agent Assigned
                    </div>
                    <div className="text-xs text-green-600 mt-1">
                      Delivery status:{' '}
                      <span className="font-semibold">
                        {match.delivery?.status}
                      </span>
                    </div>
                  </div>
                )}

                {match.status === 'PENDING' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => respond(match.id, 'ACCEPTED')}
                      className="flex-1 bg-green-600 text-white py-2 rounded-xl font-bold hover:bg-green-700 transition"
                    >
                      ✅ Accept
                    </button>
                    <button
                      onClick={() => respond(match.id, 'DECLINED')}
                      className="flex-1 border-2 border-red-400 text-red-500 py-2 rounded-xl font-bold hover:bg-red-50 transition"
                    >
                      ❌ Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}