import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const FOOD_PREFERENCES = [
  'Vegetarian Only',
  'Non-Veg Accepted',
  'No Seafood',
  'No Eggs',
  'Sweets / Desserts',
  'Dry Food Only',
  'Any Food',
];

export default function NGOProfile() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    ngoName: '',
    capacityPerDay: '',
    foodPreferences: [],
    nightOperations: false,
    locationLat: '',
    locationLng: '',
  });

  // Load existing profile
  useEffect(() => {
    api.get('/matches/profile')
      .then((res) => {
        setForm({
          ngoName: res.data.ngoName || '',
          capacityPerDay: res.data.capacityPerDay || '',
          foodPreferences: res.data.foodPreferences || [],
          nightOperations: res.data.nightOperations || false,
          locationLat: res.data.user?.locationLat || '',
          locationLng: res.data.user?.locationLng || '',
        });
      })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  const togglePreference = (pref) => {
    setForm((prev) => ({
      ...prev,
      foodPreferences: prev.foodPreferences.includes(pref)
        ? prev.foodPreferences.filter((p) => p !== pref)
        : [...prev.foodPreferences, pref],
    }));
  };

  // Get current location
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
      await api.put('/matches/profile', form);
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
      <div className="min-h-screen bg-blue-50 flex items-center justify-center">
        <div className="text-gray-500">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-blue-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() => navigate('/dashboard')}
          className="text-blue-600 font-semibold mb-4"
        >
          Back to Dashboard
        </button>

        <h2 className="text-2xl font-black text-gray-800 mb-1">
          NGO Profile
        </h2>
        <p className="text-gray-500 mb-6">
          Complete your profile to receive food matches
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
          {/* NGO Name */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-2">
              NGO / Organisation Name
            </label>
            <input
              type="text"
              value={form.ngoName}
              onChange={(e) => setForm({ ...form, ngoName: e.target.value })}
              className="w-full border-2 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          {/* Capacity */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-2">
              Daily Capacity (meals per day)
            </label>
            <input
              type="number"
              min="1"
              value={form.capacityPerDay}
              onChange={(e) =>
                setForm({ ...form, capacityPerDay: e.target.value })
              }
              placeholder="e.g. 200"
              className="w-full border-2 rounded-xl px-4 py-2 focus:outline-none focus:border-blue-400"
              required
            />
          </div>

          {/* Food Preferences */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-3">
              Food Preferences
            </label>
            <div className="space-y-2">
              {FOOD_PREFERENCES.map((pref) => (
                <button
                  key={pref}
                  type="button"
                  onClick={() => togglePreference(pref)}
                  className={`w-full text-left px-4 py-3 rounded-xl border-2 font-semibold text-sm transition ${
                    form.foodPreferences.includes(pref)
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {form.foodPreferences.includes(pref) ? '✅ ' : ''}
                  {pref}
                </button>
              ))}
            </div>
          </div>

          {/* Night Operations */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-3">
              Night Operations
            </label>
            <div className="space-y-3">
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, nightOperations: true })
                }
                className={`w-full text-left px-4 py-4 rounded-xl border-2 font-semibold transition ${
                  form.nightOperations
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                🌙 Yes — We do night feeding / street outreach
                <div className="text-sm font-normal text-gray-500 mt-1">
                  We can receive food after 9 PM
                </div>
              </button>
              <button
                type="button"
                onClick={() =>
                  setForm({ ...form, nightOperations: false })
                }
                className={`w-full text-left px-4 py-4 rounded-xl border-2 font-semibold transition ${
                  !form.nightOperations
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                ☀️ No — Daytime operations only
                <div className="text-sm font-normal text-gray-500 mt-1">
                  We operate between 6 AM – 9 PM
                </div>
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="bg-white rounded-2xl p-5 shadow-sm">
            <label className="text-sm font-bold text-gray-600 block mb-3">
              Your Location
            </label>
            <button
              type="button"
              onClick={getLocation}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold mb-3 hover:bg-blue-700 transition"
            >
              📍 Use My Current Location
            </button>
            {form.locationLat && (
              <div className="bg-green-50 text-green-700 px-4 py-2 rounded-xl text-sm font-semibold">
                ✅ Location captured: {parseFloat(form.locationLat).toFixed(4)},{' '}
                {parseFloat(form.locationLng).toFixed(4)}
              </div>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
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
                  className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 mt-1"
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
                  className="w-full border-2 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 mt-1"
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : '✅ Save Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}