import {
  useEffect,
  useState,
  useRef,
} from 'react';

import {
  useAuth,
} from '../../context/AuthContext';

import {
  useNavigate,
} from 'react-router-dom';

import api from '../../utils/api';

import {
  io,
} from 'socket.io-client';

import LiveMap from '../../components/LiveMap';


export default function DonorDashboard() {

  const {
    user,
    logout,
  } = useAuth();

  const navigate =
    useNavigate();


  // ==========================================
  // STATE
  // ==========================================

  const [
    listings,
    setListings,
  ] = useState([]);


  const [
    agentLocation,
    setAgentLocation,
  ] = useState(null);


  const [
    activeDeliveryId,
    setActiveDeliveryId,
  ] = useState(null);


  const [
    deliveryStatus,
    setDeliveryStatus,
  ] = useState(null);


  const [
    donorLocation,
    setDonorLocation,
  ] = useState(null);


  const socketRef =
    useRef(null);


  // IMPORTANT:
  // Keeps latest delivery ID available
  // inside socket callbacks.

  const activeDeliveryIdRef =
    useRef(null);


  // ==========================================
  // KEEP REF UPDATED
  // ==========================================

  useEffect(() => {

    activeDeliveryIdRef.current =
      activeDeliveryId;

  }, [
    activeDeliveryId,
  ]);


  // ==========================================
  // FETCH LISTINGS
  // ==========================================

  const fetchListings =
    async () => {

      try {

        const res =
          await api.get(
            '/listings/mine'
          );

        console.log(
          '📦 DONOR LISTINGS:',
          res.data
        );

        setListings(
          res.data
        );

      } catch (err) {

        console.error(
          '❌ Failed to fetch listings:',
          err
        );

      }

    };


  // ==========================================
  // GET DONOR LOCATION
  // ==========================================

  useEffect(() => {

    if (
      !navigator.geolocation
    ) {

      console.error(
        '❌ Geolocation unavailable'
      );

      return;

    }


    const watchId =
      navigator.geolocation.watchPosition(

        (position) => {

          const lat =
            position.coords.latitude;

          const lng =
            position.coords.longitude;


          console.log(
            '📦 DONOR LOCATION:',
            lat,
            lng
          );


          setDonorLocation({
            lat,
            lng,
          });

        },


        (error) => {

          console.error(
            '❌ Donor location error:',
            error.code,
            error.message
          );

        },


        {
          enableHighAccuracy: true,
          maximumAge: 10000,
          timeout: 20000,
        }

      );


    return () => {

      navigator.geolocation.clearWatch(
        watchId
      );

    };

  }, []);


  // ==========================================
  // SOCKET CONNECTION
  // ==========================================

  useEffect(() => {

    console.log(
      '🔌 Creating donor socket...'
    );


    const socket =
      io(
        'http://localhost:5000',
        {
          transports: [
            'websocket',
            'polling',
          ],
        }
      );


    socketRef.current =
      socket;


    // ========================================
    // CONNECT
    // ========================================

    socket.on(
      'connect',
      () => {

        console.log(
          '✅ DONOR SOCKET CONNECTED:',
          socket.id
        );


        // If a delivery already exists,
        // immediately join its room.

        const deliveryId =
          activeDeliveryIdRef.current;


        if (deliveryId) {

          console.log(
            '🚪 Joining delivery:',
            deliveryId
          );


          socket.emit(
            'join_delivery',
            deliveryId
          );

        }

      }
    );


    // ========================================
    // RIDER LOCATION
    // ========================================

    socket.on(
      'location_update',
      ({
        deliveryId,
        lat,
        lng,
      }) => {

        console.log(
          '📍 DONOR RECEIVED RIDER LOCATION:',
          deliveryId,
          lat,
          lng
        );


        // Ignore invalid coordinates

        const latitude =
          Number(lat);

        const longitude =
          Number(lng);


        if (
          !Number.isFinite(latitude) ||
          !Number.isFinite(longitude)
        ) {

          console.error(
            '❌ Invalid rider coordinates'
          );

          return;

        }


        // Ignore another delivery

        const currentDeliveryId =
          activeDeliveryIdRef.current;


        if (
          currentDeliveryId &&
          deliveryId &&
          String(deliveryId) !==
            String(currentDeliveryId)
        ) {

          console.log(
            '🚫 Ignoring location from another delivery'
          );

          return;

        }


        console.log(
          '🚴 SETTING RIDER LOCATION:',
          latitude,
          longitude
        );


        setAgentLocation({
          lat: latitude,
          lng: longitude,
        });

      }
    );


    // ========================================
    // DELIVERY STATUS
    // ========================================

    socket.on(
      'delivery_status_update',
      ({
        deliveryId,
        status,
      }) => {

        console.log(
          '📦 DONOR DELIVERY STATUS:',
          deliveryId,
          status
        );


        const currentDeliveryId =
          activeDeliveryIdRef.current;


        if (
          currentDeliveryId &&
          deliveryId &&
          String(deliveryId) !==
            String(currentDeliveryId)
        ) {

          return;

        }


        setDeliveryStatus(
          status
        );


        // ====================================
        // PICKED UP
        // ====================================

        if (
          status === 'PICKED_UP'
        ) {

          console.log(
            '📦 ORDER COLLECTED'
          );


          // Rider no longer needs
          // to be shown to donor.

          setAgentLocation(
            null
          );

        }


        // ====================================
        // DELIVERED
        // ====================================

        if (
          status === 'DELIVERED'
        ) {

          console.log(
            '🎉 DELIVERY COMPLETED'
          );


          setAgentLocation(
            null
          );

          setActiveDeliveryId(
            null
          );

          activeDeliveryIdRef.current =
            null;

        }


        // Refresh data

        fetchListings();

      }
    );


    // ========================================
    // DISCONNECT
    // ========================================

    socket.on(
      'disconnect',
      (reason) => {

        console.log(
          '❌ DONOR SOCKET DISCONNECTED:',
          reason
        );

      }
    );


    // ========================================
    // SOCKET ERROR
    // ========================================

    socket.on(
      'connect_error',
      (error) => {

        console.error(
          '❌ DONOR SOCKET ERROR:',
          error.message
        );

      }
    );


    // ========================================
    // CLEANUP
    // ========================================

    return () => {

      console.log(
        '🧹 Cleaning donor socket'
      );


      socket.disconnect();

      socketRef.current =
        null;

    };

  }, []);


  // ==========================================
  // INITIAL FETCH
  // ==========================================

  useEffect(() => {

    fetchListings();

  }, []);


  // ==========================================
  // FIND ACTIVE DELIVERY
  // ==========================================

  useEffect(() => {

    console.log(
      '🔎 Searching for active delivery...'
    );


    const activeListing =
      listings.find(
        (listing) => {

          const delivery =
            listing.match?.delivery;


          if (!delivery) {

            return false;

          }


          console.log(
            '📦 Checking delivery:',
            delivery
          );


          const status =
            delivery.status;


          return (
            listing.status === 'MATCHED' &&
            (
              status === 'ASSIGNED' ||
              status === 'PICKED_UP' ||
              status === 'IN_TRANSIT'
            )
          );

        }
      );


    if (
      activeListing
    ) {

      const delivery =
        activeListing.match.delivery;


      const deliveryId =
        delivery.id;


      console.log(
        '🚴 ACTIVE DELIVERY FOUND:',
        deliveryId
      );


      console.log(
        '📦 DELIVERY STATUS:',
        delivery.status
      );


      setActiveDeliveryId(
        deliveryId
      );


      activeDeliveryIdRef.current =
        deliveryId;


      setDeliveryStatus(
        delivery.status
      );


      // Join room if socket is ready

      if (
        socketRef.current &&
        socketRef.current.connected
      ) {

        console.log(
          '🚪 DONOR JOINING ROOM:',
          `delivery_${deliveryId}`
        );


        socketRef.current.emit(
          'join_delivery',
          deliveryId
        );

      }

    } else {

      console.log(
        'ℹ️ No active delivery found'
      );

    }

  }, [
    listings,
  ]);


  // ==========================================
  // JOIN DELIVERY WHEN ID CHANGES
  // ==========================================

  useEffect(() => {

    if (
      !activeDeliveryId
    ) {

      return;

    }


    if (
      !socketRef.current
    ) {

      return;

    }


    console.log(
      '🚪 Joining delivery room:',
      activeDeliveryId
    );


    socketRef.current.emit(
      'join_delivery',
      activeDeliveryId
    );


  }, [
    activeDeliveryId,
  ]);


  // ==========================================
  // FIND ACTIVE LISTING
  // ==========================================

  const activeListing =
    listings.find(
      (listing) => {

        const delivery =
          listing.match?.delivery;


        if (!delivery) {

          return false;

        }


        return (
          listing.status === 'MATCHED' &&
          (
            delivery.status === 'ASSIGNED' ||
            delivery.status === 'PICKED_UP' ||
            delivery.status === 'IN_TRANSIT'
          )
        );

      }
    );


  // ==========================================
  // CURRENT STATUS
  // ==========================================

  const currentStatus =
    deliveryStatus ||
    activeListing?.match?.delivery?.status;


  // ==========================================
  // MAP ONLY FOR ASSIGNED
  // ==========================================

  const showMap =
    currentStatus ===
    'ASSIGNED';


  // ==========================================
  // STATUS ICON
  // ==========================================

  const statusIcon =
    (status) => {

      if (
        status === 'LISTED'
      ) {

        return '⏳';

      }


      if (
        status === 'MATCHED'
      ) {

        return '🚴';

      }


      if (
        status === 'EXPIRED'
      ) {

        return '❌';

      }


      return '•';

    };


  // ==========================================
  // STATUS COLOR
  // ==========================================

  const statusColor =
    (status) => {

      if (
        status === 'LISTED'
      ) {

        return 'bg-yellow-100 text-yellow-700';

      }


      if (
        status === 'MATCHED'
      ) {

        return 'bg-blue-100 text-blue-700';

      }


      if (
        status === 'EXPIRED'
      ) {

        return 'bg-red-100 text-red-700';

      }


      return 'bg-gray-100 text-gray-700';

    };


  // ==========================================
  // LOGOUT
  // ==========================================

  const handleLogout =
    () => {

      if (
        socketRef.current
      ) {

        socketRef.current.disconnect();

      }


      logout();

      navigate('/');

    };


  // ==========================================
  // UI
  // ==========================================

  return (

    <div className="min-h-screen bg-green-50">


      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">

        <h1 className="text-xl font-black text-green-700">

          🌱 FoodBridge

        </h1>


        <div className="flex gap-4 items-center">

          <button
            onClick={() =>
              navigate(
                '/donor/profile'
              )
            }
            className="text-sm text-green-600 font-semibold hover:underline"
          >

            ✏️ Profile

          </button>


          <button
            onClick={
              handleLogout
            }
            className="text-sm text-gray-500 hover:text-red-500"
          >

            Logout

          </button>

        </div>

      </div>


      {/* ================================= */}
      {/* MAIN */}
      {/* ================================= */}

      <div className="max-w-2xl mx-auto px-4 py-6">


        {/* WELCOME */}

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">

          <h2 className="text-2xl font-bold text-gray-800">

            Hi, {user?.name} 👋

          </h2>


          <p className="text-gray-500 mt-1">

            Thank you for helping reduce food waste!

          </p>

        </div>


        {/* ================================= */}
        {/* STATS */}
        {/* ================================= */}

        <div className="grid grid-cols-3 gap-3 mb-4">

          <div className="bg-green-600 text-white rounded-2xl p-4">

            <div className="text-3xl font-black">

              {listings.length}

            </div>

            <div className="text-green-100 text-xs mt-1">

              Total Donations

            </div>

          </div>


          <div className="bg-white rounded-2xl p-4 shadow-sm">

            <div className="text-3xl font-black text-blue-600">

              {
                listings.filter(
                  (l) =>
                    l.status ===
                    'MATCHED'
                ).length
              }

            </div>

            <div className="text-gray-500 text-xs mt-1">

              Matched

            </div>

          </div>


          <div className="bg-white rounded-2xl p-4 shadow-sm">

            <div className="text-3xl font-black text-yellow-600">

              {
                listings.filter(
                  (l) =>
                    l.status ===
                    'LISTED'
                ).length
              }

            </div>

            <div className="text-gray-500 text-xs mt-1">

              Pending

            </div>

          </div>

        </div>


        {/* ==================================== */}
        {/* RIDER COMING TO DONOR */}
        {/* ==================================== */}

        {showMap && (

          <div className="bg-white rounded-2xl p-4 shadow-sm mb-4">


            <div className="flex justify-between items-center mb-3">

              <div>

                <h3 className="font-bold text-gray-700">

                  🚴 Rider is coming to collect your food

                </h3>


                <p className="text-xs text-gray-400 mt-1">

                  You can watch the rider's live location below.

                </p>

              </div>


              <div className="flex items-center gap-2">

                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>

                <span className="text-xs text-green-600 font-bold">

                  LIVE

                </span>

              </div>

            </div>


            {/* ================================= */}
            {/* MAP */}
            {/* ================================= */}

            <LiveMap

              agentLat={
                agentLocation?.lat
              }

              agentLng={
                agentLocation?.lng
              }

              destinationLat={
                donorLocation?.lat
              }

              destinationLng={
                donorLocation?.lng
              }

              destinationName="Your pickup location"

              destination="DONOR"

            />


            {/* ================================= */}
            {/* WAITING FOR GPS */}
            {/* ================================= */}

            {!agentLocation && (

              <div className="mt-3 bg-yellow-50 rounded-xl p-3">

                <div className="flex items-center gap-2">

                  <div className="w-3 h-3 bg-yellow-500 rounded-full animate-pulse"></div>

                  <span className="text-sm font-semibold text-yellow-700">

                    Waiting for rider GPS...

                  </span>

                </div>

              </div>

            )}

          </div>

        )}


        {/* ==================================== */}
        {/* ORDER COLLECTED */}
        {/* ==================================== */}

        {currentStatus ===
          'PICKED_UP' && (

          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">

            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">

              <div className="text-4xl mb-3">

                📦❤️

              </div>


              <h3 className="text-lg font-black text-green-700">

                Order Collected!

              </h3>


              <p className="text-sm text-green-700 mt-2 leading-6">

                Your food has been collected by the rider.

                The rider is now proceeding to deliver it
                to the needy ones. ❤️

              </p>


              <div className="mt-4 bg-white rounded-xl p-3">

                <div className="text-xs text-gray-400">

                  Delivery status

                </div>


                <div className="font-bold text-green-700 mt-1">

                  📦 PICKED UP

                </div>

              </div>

            </div>

          </div>

        )}


        {/* ==================================== */}
        {/* IN TRANSIT */}
        {/* ==================================== */}

        {currentStatus ===
          'IN_TRANSIT' && (

          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">

            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">

              <div className="text-4xl mb-3">

                🚗❤️

              </div>


              <h3 className="text-lg font-black text-blue-700">

                Your food is on its way!

              </h3>


              <p className="text-sm text-blue-700 mt-2 leading-6">

                The rider has collected your food and
                is proceeding to deliver it to the needy ones.

              </p>


              <div className="mt-4">

                <span className="bg-blue-100 text-blue-700 px-3 py-2 rounded-full text-xs font-bold">

                  🚴 IN TRANSIT

                </span>

              </div>

            </div>

          </div>

        )}


        {/* ==================================== */}
        {/* DELIVERED */}
        {/* ==================================== */}

        {currentStatus ===
          'DELIVERED' && (

          <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">

            <div className="bg-green-50 border border-green-200 rounded-2xl p-5">

              <div className="text-4xl mb-3">

                🎉❤️

              </div>


              <h3 className="text-lg font-black text-green-700">

                Food Delivered Successfully!

              </h3>


              <p className="text-sm text-green-700 mt-2">

                Your donation has reached the people who needed it.

                Thank you for making a difference! 🌱

              </p>

            </div>

          </div>

        )}


        {/* ==================================== */}
        {/* DONATE */}
        {/* ==================================== */}

        <button
          onClick={() =>
            navigate(
              '/donor/create-listing'
            )
          }
          className="w-full bg-green-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-green-700 transition mb-6 shadow-sm"
        >

          + Donate Food Now

        </button>


        {/* ==================================== */}
        {/* RECENT DONATIONS */}
        {/* ==================================== */}

        <h3 className="font-bold text-gray-700 mb-3">

          Recent Donations

        </h3>


        {listings.length ===
          0 ? (

          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">

            <div className="text-4xl mb-3">

              🍽️

            </div>


            <div className="text-gray-500">

              No donations yet.

            </div>

          </div>

        ) : (

          <div className="space-y-3">

            {listings.map(
              (listing) => (

              <div
                key={listing.id}
                className="bg-white rounded-2xl p-4 shadow-sm"
              >

                <div className="flex justify-between items-start">

                  <div>

                    <div className="font-bold text-gray-800">

                      {statusIcon(
                        listing.status
                      )}

                      {' '}

                      {listing.foodTypes?.join(
                        ', '
                      )}

                    </div>


                    <div className="text-sm text-gray-500 mt-1">

                      {listing.quantityKg}
                      {' '}kg ·{' '}

                      {listing.vehicleNeeded}

                    </div>


                    <div className="text-xs text-gray-400 mt-1">

                      {new Date(
                        listing.createdAt
                      ).toLocaleDateString(
                        'en-IN',
                        {
                          day:
                            'numeric',
                          month:
                            'short',
                          year:
                            'numeric',
                          hour:
                            '2-digit',
                          minute:
                            '2-digit',
                        }
                      )}

                    </div>

                  </div>


                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${statusColor(
                      listing.status
                    )}`}
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