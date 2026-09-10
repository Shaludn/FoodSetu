import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';

const FOOD_OPTIONS = [
  'Rice',
  'Dal / Curry',
  'Roti / Bread',
  'Biryani',
  'Snacks',
  'Sweets',
  'Mixed / Other',
];

const getVehicle = (kg) => {
  if (!kg) return '';
  if (kg <= 30) return '🚴 Bike (up to 30kg)';
  if (kg <= 60) return '🛵 Scooter / Auto (30-60kg)';
  return '🚚 Tempo / Mini Truck (60kg+)';
};

export default function CreateListing() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    donorType: '',
    foodTypes: [],
    quantityKg: '',
    pickupTiming: 'NOW',
    expiryHours: 3,
  });

  const toggleFood = (food) => {
    setForm((prev) => ({
      ...prev,
      foodTypes: prev.foodTypes.includes(food)
        ? prev.foodTypes.filter((f) => f !== food)
        : [...prev.foodTypes, food],
    }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await api.post('/listings', {
        ...form,
        quantityKg: parseFloat(form.quantityKg),
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create listing');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-green-50 px-4 py-8">
      <div className="max-w-md mx-auto">
        <button
          onClick={() =>
            step === 1 ? navigate('/dashboard') : setStep(step - 1)
          }
          className="text-green-600 font-semibold mb-4"
        >
          Back
        </button>
        <h2 className="text-2xl font-black text-gray-800 mb-1">Donate Food</h2>
        <p className="text-gray-500 mb-6">Step {step} of 4</p>

        <div className="flex gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full ${s <= step ? 'bg-green-500' : 'bg-gray-200'}`}
            />
          ))}
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        {step === 1 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-4">
              What are you donating food from?
            </h3>
            <div className="space-y-3">
              {[
                { value: 'RESTAURANT', label: '🍽️ Restaurant' },
                { value: 'WEDDING', label: '💒 Wedding / Event' },
                { value: 'CLOUD_KITCHEN', label: '☁️ Cloud Kitchen' },
                { value: 'CATERER', label: '🍱 Caterer' },
                { value: 'EVENT', label: '🏢 Corporate Canteen' },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setForm({ ...form, donorType: opt.value });
                    setStep(2);
                  }}
                  className={`w-full text-left px-5 py-4 rounded-xl border-2 font-semibold transition ${
                    form.donorType === opt.value
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-4">
              What food is it?
            </h3>
            <div className="space-y-3 mb-6">
              {FOOD_OPTIONS.map((food) => (
                <button
                  key={food}
                  onClick={() => toggleFood(food)}
                  className={`w-full text-left px-5 py-3 rounded-xl border-2 font-semibold transition ${
                    form.foodTypes.includes(food)
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-green-300'
                  }`}
                >
                  {form.foodTypes.includes(food) ? '✅ ' : ''}
                  {food}
                </button>
              ))}
            </div>
            <button
              onClick={() => form.foodTypes.length > 0 && setStep(3)}
              disabled={form.foodTypes.length === 0}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {step === 3 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-4">
              How much food is it?
            </h3>
            <div className="mb-4">
              <label className="text-sm text-gray-500">Quantity (in kg)</label>
              <input
                type="number"
                min="1"
                placeholder="e.g. 45"
                value={form.quantityKg}
                onChange={(e) =>
                  setForm({ ...form, quantityKg: e.target.value })
                }
                className="w-full border-2 rounded-xl px-4 py-3 text-2xl font-bold mt-1 focus:outline-none focus:border-green-400"
              />
            </div>
            {form.quantityKg && (
              <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-6">
                <div className="text-sm text-gray-500">Vehicle auto-selected:</div>
                <div className="font-bold text-green-700 text-lg">
                  {getVehicle(parseFloat(form.quantityKg))}
                </div>
              </div>
            )}
            <button
              onClick={() => form.quantityKg > 0 && setStep(4)}
              disabled={!form.quantityKg || form.quantityKg <= 0}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}

        {step === 4 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-4">
              When can it be picked up?
            </h3>
            <div className="space-y-3 mb-6">
              <button
                onClick={() => setForm({ ...form, pickupTiming: 'NOW' })}
                className={`w-full text-left px-5 py-4 rounded-xl border-2 font-semibold transition ${
                  form.pickupTiming === 'NOW'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                🟢 Right Now
                <div className="text-sm font-normal text-gray-500 mt-1">
                  Agent will arrive shortly
                </div>
              </button>
              <button
                onClick={() =>
                  setForm({ ...form, pickupTiming: 'SCHEDULED_MORNING' })
                }
                className={`w-full text-left px-5 py-4 rounded-xl border-2 font-semibold transition ${
                  form.pickupTiming === 'SCHEDULED_MORNING'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                }`}
              >
                🌅 Later / Next Morning
                <div className="text-sm font-normal text-gray-500 mt-1">
                  Scheduled for 6 AM pickup
                </div>
              </button>
            </div>
            <div className="mb-6">
              <label className="text-sm text-gray-500">
                Food stays safe for how many hours?
              </label>
              <input
                type="number"
                min="1"
                max="24"
                value={form.expiryHours}
                onChange={(e) =>
                  setForm({ ...form, expiryHours: parseInt(e.target.value) })
                }
                className="w-full border-2 rounded-xl px-4 py-3 font-bold mt-1 focus:outline-none focus:border-green-400"
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-green-600 text-white py-3 rounded-xl font-bold disabled:opacity-40"
            >
              {loading ? 'Submitting...' : '✅ Submit Listing'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}