import { useNavigate } from 'react-router-dom';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex flex-col items-center justify-center px-4">
      <div className="text-center max-w-2xl">
        <h1 className="text-5xl font-black text-green-700 mb-4">
          🌱 FoodBridge
        </h1>
        <p className="text-xl text-gray-600 mb-2">
          Connecting surplus food to those who need it
        </p>
        <p className="text-gray-500 mb-8">
          Real-time matching · Automated delivery · Zero waste
        </p>

        <div className="flex gap-4 justify-center mb-12">
          <button
            onClick={() => navigate('/register')}
            className="bg-green-600 text-white px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-700 transition"
          >
            Get Started
          </button>
          <button
            onClick={() => navigate('/login')}
            className="border-2 border-green-600 text-green-600 px-8 py-3 rounded-xl font-bold text-lg hover:bg-green-50 transition"
          >
            Login
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-3xl mb-2">🍽️</div>
            <div className="font-bold text-gray-700">78M Tonnes</div>
            <div className="text-sm text-gray-500">food wasted yearly</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-3xl mb-2">😔</div>
            <div className="font-bold text-gray-700">200M People</div>
            <div className="text-sm text-gray-500">go hungry every night</div>
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm">
            <div className="text-3xl mb-2">🚀</div>
            <div className="font-bold text-gray-700">60 Minutes</div>
            <div className="text-sm text-gray-500">food to delivery target</div>
          </div>
        </div>
      </div>
    </div>
  );
}