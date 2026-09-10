import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

export default function AgentProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    vehicleType: 'BIKE',
    vehicleNumber: '',
    serviceArea: '',
    locationLat: '',
    locationLng: '',
  });

  useEffect(() => {
    api.get('/deliveries/profile')
      .then((res) => {
        setForm({
          vehicleType: res.data.vehicleType || 'BIKE',
          vehicleNumber: res.data.vehicleNumber || '',
          serviceArea: res.data.serviceArea || '',
          locationLat: res.data.user?.locationLat || '',
          locationLng: res.data.user?.locationLng || '',
        });
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const getLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setForm((prev) => ({
            ...prev,
            locationLat: pos.coords.latitude,
            locationLng: pos.coords.longitude,
          }));
        },
        () => {
          alert('Could not get location. Please enter manually.');
        }
      );
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.put('/deliveries/profile', form);
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <div className="min-h-screen bg-orange-50 flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-orange-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-orange-600 font-semibold mb-4"
        >
          Back to Dashboard
        </button>

        <h2 className="text-2xl font-black text-gray-800 mb-1">
          Agent Profile
        </h2>
        <p className="text-gray-500 mb-6">
          Complete your profile to receive delivery jobs
        </p>

        {success && (
          <div className="bg-green-50 text-green-600 px-4 py-3 rounded-xl mb-4 font-semibold">
            ✅ Profile updated successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Vehicle Type */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-3">
              Vehicle Type
            </label>
            <div className="space-y-3">
              {[
                {
                  value: 'BIKE',
                  label: '🚴 Bike',
                  desc: 'Up to 30 kg',
                },
                {
                  value: 'SCOOTER',
                  label: '🛵 Scooter / Auto',
                  desc: '30 to 60 kg',
                },
                {
                  value: 'TEMPO',
                  label: '🚚 Tempo / Mini Truck',
                  desc: '60 kg and above',
                },
              ].map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => setForm({ ...form, vehicleType: v.value })}
                  className={`w-full text-left px-4 py-4 rounded-xl border-2 font-semibold transition ${
                    form.vehicleType === v.value
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-orange-300'
                  }`}
                >
                  {form.vehicleType === v.value ? '✅ ' : ''}
                  {v.label}
                  <div className="text-sm font-normal text-gray-500 mt-1">
                    {v.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Vehicle Number */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-2">
              Vehicle Number
            </label>
            <input
              type="text"
              value={form.vehicleNumber}
              onChange={(e) =>
                setForm({ ...form, vehicleNumber: e.target.value })
              }
              placeholder="e.g. KA-05-1234"
              className="w-full border-2 rounded-xl px-4 py-2 focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* Service Area */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-2">
              Service Area
            </label>
            <input
              type="text"
              value={form.serviceArea}
              onChange={(e) =>
                setForm({ ...form, serviceArea: e.target.value })
              }
              placeholder="e.g. Bengaluru South"
              className="w-full border-2 rounded-xl px-4 py-2 focus:outline-none focus:border-orange-400"
            />
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-3">
              Your Current Location
            </label>
            <button
              type="button"
              onClick={getLocation}
              className="w-full bg-orange-600 text-white py-3 rounded-xl font-bold mb-3 hover:bg-orange-700 transition"
            >
              📍 Use My Current Location
            </button>
            {form.locationLat && (
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold mb-3">
                ✅ Location captured:{' '}
                {parseFloat(form.locationLat).toFixed(4)},{' '}
                {parseFloat(form.locationLng).toFixed(4)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500">
                  Latitude (manual)
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.locationLat}
                  onChange={(e) =>
                    setForm({ ...form, locationLat: e.target.value })
                  }
                  placeholder="12.9716"
                  className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 mt-1"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500">
                  Longitude (manual)
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.locationLng}
                  onChange={(e) =>
                    setForm({ ...form, locationLng: e.target.value })
                  }
                  placeholder="77.5946"
                  className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400 mt-1"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-orange-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-orange-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : '✅ Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}