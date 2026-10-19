import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../../utils/api';
import { io } from 'socket.io-client';

export default function AgentDashboard() {

  const { user, logout } = useAuth();

  const navigate = useNavigate();

  const [deliveries, setDeliveries] =
    useState([]);

  const [isAvailable, setIsAvailable] =
    useState(true);

  // Proof of delivery
  const [proofFiles, setProofFiles] = useState({});
  const [uploadingProofId, setUploadingProofId] = useState(null);


  // ==========================================
  // SOCKET
  // ==========================================

  const socketRef =
    useRef(null);


  // ==========================================
  // GPS WATCHER
  // ==========================================

  const locationWatchRef =
    useRef(null);


  // ==========================================
  // CURRENT DELIVERY
  // ==========================================

  const activeDeliveryRef =
    useRef(null);


  // ==========================================
  // FETCH DELIVERIES
  // ==========================================

  const fetchDeliveries = async () => {
    try {
      const res = await api.get('/deliveries/my-deliveries');
      console.log('🚴 Deliveries:', res.data);
      setDeliveries(res.data);
      return res.data;
    } catch (err) {
      console.error('❌ Failed to fetch deliveries:', err);
      throw err;
    }
  };


  // ==========================================
  // FETCH PROFILE
  // ==========================================

  const fetchProfile = () => {

    api
      .get('/deliveries/profile')
      .then((res) => {

        setIsAvailable(
          res.data.isAvailable
        );

      })
      .catch((err) => {

        console.error(
          '❌ Failed to fetch profile:',
          err
        );

      });

  };


  // ==========================================
  // SOCKET CONNECTION
  // ==========================================

  useEffect(() => {

    console.log(
      '🚴 Connecting Agent socket...'
    );


    socketRef.current =
      io('http://localhost:5000');


    socketRef.current.on(
      'connect',
      () => {

        console.log(
          '✅ Agent connected:',
          socketRef.current.id
        );


        // Rejoin active room
        if (
          activeDeliveryRef.current
        ) {

          socketRef.current.emit(
            'join_delivery',
            activeDeliveryRef.current
          );

        }

      }
    );


    socketRef.current.on(
      'disconnect',
      (reason) => {

        console.log(
          '❌ Agent disconnected:',
          reason
        );

      }
    );


    socketRef.current.on(
      'connect_error',
      (error) => {

        console.error(
          '❌ Socket error:',
          error
        );

      }
    );


    return () => {

      // Stop GPS

      if (
        locationWatchRef.current !== null
      ) {

        navigator.geolocation.clearWatch(
          locationWatchRef.current
        );

        locationWatchRef.current =
          null;

      }


      activeDeliveryRef.current =
        null;


      // Disconnect socket

      if (
        socketRef.current
      ) {

        socketRef.current.disconnect();

        socketRef.current =
          null;

      }

    };

  }, []);


  // ==========================================
  // INITIAL DATA
  // ==========================================

  useEffect(() => {

    fetchDeliveries();

    fetchProfile();

  }, []);


  // ==========================================
  // AVAILABILITY
  // ==========================================

  const toggleAvailability =
    async () => {

      try {

        await api.patch(
          '/deliveries/availability',
          {
            isAvailable:
              !isAvailable,
          }
        );


        setIsAvailable(
          !isAvailable
        );

      } catch (err) {

        console.error(
          err
        );

        alert(
          'Failed to update availability'
        );

      }

    };


  // ==========================================
  // START GPS BROADCAST
  // ==========================================

  const startBroadcasting =
    (deliveryId) => {

      console.log(
        '🚴 Starting GPS for:',
        deliveryId
      );


      // ========================================
      // GEOLOCATION CHECK
      // ========================================

      if (
        !navigator.geolocation
      ) {

        alert(
          'Geolocation is not supported by this browser.'
        );

        return;

      }


      // ========================================
      // SOCKET CHECK
      // ========================================

      if (
        !socketRef.current
      ) {

        console.error(
          '❌ Socket unavailable'
        );

        return;

      }


      // ========================================
      // DON'T START TWICE
      // ========================================

      if (
        activeDeliveryRef.current ===
        deliveryId
      ) {

        console.log(
          '📍 Already tracking:',
          deliveryId
        );

        return;

      }


      // ========================================
      // CLEAR OLD WATCHER
      // ========================================

      if (
        locationWatchRef.current !== null
      ) {

        navigator.geolocation.clearWatch(
          locationWatchRef.current
        );

        locationWatchRef.current =
          null;

      }


      // ========================================
      // SAVE ACTIVE DELIVERY
      // ========================================

      activeDeliveryRef.current =
        deliveryId;


      const socket =
        socketRef.current;


      // ========================================
      // JOIN ROOM
      // ========================================

      socket.emit(
        'join_delivery',
        deliveryId
      );


      console.log(
        '🚪 Joined:',
        `delivery_${deliveryId}`
      );


      // ========================================
      // WATCH GPS
      // ========================================

      const watchId =
        navigator.geolocation.watchPosition(

          (position) => {

            const lat =
              position.coords.latitude;

            const lng =
              position.coords.longitude;

            const accuracy =
              position.coords.accuracy;


            console.log(
              '📍 GPS UPDATE'
            );

            console.log(
              'Lat:',
              lat
            );

            console.log(
              'Lng:',
              lng
            );

            console.log(
              'Accuracy:',
              accuracy
            );


            if (
              !socket.connected
            ) {

              console.error(
                '❌ Socket disconnected'
              );

              return;

            }


            // =================================
            // SEND GPS
            // =================================

            socket.emit(
              'agent_location',
              {
                deliveryId,
                lat,
                lng,
              }
            );


            console.log(
              '✅ GPS SENT'
            );

          },


          (error) => {

            console.error(
              '❌ GPS ERROR:',
              error.code,
              error.message
            );


            if (
              error.code === 1
            ) {

              alert(
                'Please allow location access for live delivery tracking.'
              );

            }

          },


          {
            enableHighAccuracy:
              true,

            maximumAge:
              0,

            timeout:
              15000,
          }

        );


      locationWatchRef.current =
        watchId;


      console.log(
        '📡 GPS watcher:',
        watchId
      );

    };


  // ==========================================
  // STOP GPS
  // ==========================================

  const stopBroadcasting =
    () => {

      console.log(
        '🛑 Stopping GPS'
      );


      if (
        locationWatchRef.current !== null
      ) {

        navigator.geolocation.clearWatch(
          locationWatchRef.current
        );

        locationWatchRef.current =
          null;

      }


      activeDeliveryRef.current =
        null;


      console.log(
        '🛑 GPS stopped'
      );

    };


  // ==========================================
  // UPDATE DELIVERY STATUS
  // ==========================================

  const updateStatus =
    async (
      deliveryId,
      status
    ) => {

      try {

        console.log(
          '🔄 Status:',
          status
        );


        // ======================================
        // UPDATE DATABASE
        // ======================================

        await api.patch(
          `/deliveries/${deliveryId}/status`,
          {
            status,
          }
        );


        // ======================================
        // TELL DONOR + NGO
        // ======================================

        if (
          socketRef.current
        ) {

          socketRef.current.emit(
            'delivery_status_update',
            {
              deliveryId,
              status,
            }
          );


          console.log(
            '📡 Status sent to Donor + NGO'
          );

        }


        // ======================================
        // ASSIGNED
        // ======================================

        if (
          status === 'ASSIGNED'
        ) {

          console.log(
            '🚴 Rider is going to donor'
          );

          startBroadcasting(
            deliveryId
          );

        }


        // ======================================
        // PICKED UP
        // ======================================

        if (
          status === 'PICKED_UP'
        ) {

          console.log(
            '📦 ORDER COLLECTED'
          );

          console.log(
            '🚴 Proceeding to NGO'
          );

          // GPS continues

          startBroadcasting(
            deliveryId
          );

        }


        // ======================================
        // IN TRANSIT
        // ======================================

        if (
          status === 'IN_TRANSIT'
        ) {

          console.log(
            '🚗 Delivery in transit'
          );

          startBroadcasting(
            deliveryId
          );

        }


        // ======================================
        // DELIVERED
        // ======================================

        if (
          status === 'DELIVERED'
        ) {

          console.log(
            '✅ DELIVERY COMPLETE'
          );

          stopBroadcasting();

        }


        fetchDeliveries();

      } catch (err) {

        console.error(
          '❌ Failed to update status:',
          err
        );

        alert(
          'Failed to update status'
        );

      }

    };


  // ==========================================
  // UPLOAD PROOF OF DELIVERY
  // ==========================================

  const uploadProof = async (deliveryId) => {
    const file = proofFiles[deliveryId];

    if (!file) {
      alert('Please select a delivery photo first.');
      return;
    }

    if (!file.type || !file.type.startsWith('image/')) {
      alert('Please select an image file.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('The image must be 5 MB or smaller.');
      return;
    }

    const formData = new FormData();
    formData.append('proof', file);

    try {
      setUploadingProofId(deliveryId);
      // Let the browser/Axios set the multipart boundary automatically.
      const response = await api.post(
        `/deliveries/${deliveryId}/proof`,
        formData
      );

      console.log('Proof uploaded and delivery completed:', response.data);

      if (socketRef.current?.connected) {
        socketRef.current.emit('delivery_status_update', {
          deliveryId,
          status: 'DELIVERED',
        });
      }

      setProofFiles((previous) => {
        const next = { ...previous };
        delete next[deliveryId];
        return next;
      });

      try {
        await fetchDeliveries();
      } catch (refreshError) {
        // The upload already succeeded; keep the success state and log refresh issues.
        console.error('Delivery completed, but refreshing the list failed:', refreshError);
      }
      stopBroadcasting();
      alert('Proof uploaded. Delivery marked as delivered.');
    } catch (err) {
      console.error('Proof upload failed:', err);
      alert(err.response?.data?.message || 'Failed to upload proof of delivery.');
    } finally {
      setUploadingProofId(null);
    }
  };


  // ==========================================
  // AUTO START ACTIVE DELIVERY
  // ==========================================

  useEffect(() => {

    const activeDelivery =
      deliveries.find(
        (delivery) =>
          delivery.status ===
            'ASSIGNED' ||
          delivery.status ===
            'PICKED_UP' ||
          delivery.status ===
            'IN_TRANSIT'
      );


    if (
      activeDelivery
    ) {

      startBroadcasting(
        activeDelivery.id
      );

    } else {

      if (
        activeDeliveryRef.current
      ) {

        stopBroadcasting();

      }

    }

  }, [
    deliveries,
  ]);


  // ==========================================
  // STATISTICS
  // ==========================================

  const completed =
    deliveries.filter(
      (d) =>
        d.status ===
        'DELIVERED'
    ).length;


  const active =
    deliveries.filter(
      (d) =>
        d.status ===
          'ASSIGNED' ||
        d.status ===
          'PICKED_UP' ||
        d.status ===
          'IN_TRANSIT'
    ).length;


  // ==========================================
  // UI
  // ==========================================

  return (

    <div className="min-h-screen bg-orange-50">


      {/* HEADER */}

      <div className="bg-white shadow-sm px-6 py-4 flex justify-between items-center sticky top-0 z-10">

        <h1 className="text-xl font-black text-orange-700">
          🌱 FoodBridge
        </h1>


        <div className="flex gap-4 items-center">

          <button
            onClick={() =>
              navigate(
                '/agent/profile'
              )
            }
            className="text-sm text-orange-600 font-semibold hover:underline"
          >
            ✏️ Profile
          </button>


          <button
            onClick={() => {

              stopBroadcasting();

              logout();

              navigate('/');

            }}
            className="text-sm text-gray-500 hover:text-red-500"
          >
            Logout
          </button>

        </div>

      </div>


      {/* MAIN */}

      <div className="max-w-2xl mx-auto px-4 py-6">


        {/* WELCOME */}

        <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">

          <h2 className="text-2xl font-bold text-gray-800">

            Hey {user?.name} 🚴

          </h2>

          <p className="text-gray-500 mt-1">

            Delivery Agent Dashboard

          </p>

        </div>


        {/* AVAILABILITY */}

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
              onClick={
                toggleAvailability
              }
              className={`px-5 py-2 rounded-xl font-bold text-sm transition ${
                isAvailable
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
            >

              {isAvailable
                ? 'Go Offline'
                : 'Go Online'}

            </button>

          </div>

        </div>


        {/* STATS */}

        <div className="grid grid-cols-3 gap-3 mb-6">

          <div className="bg-orange-600 text-white rounded-2xl p-4">

            <div className="text-3xl font-black">

              {deliveries.length}

            </div>

            <div className="text-orange-100 text-xs mt-1">

              Total

            </div>

          </div>


          <div className="bg-white rounded-2xl p-4 shadow-sm">

            <div className="text-3xl font-black text-blue-600">

              {active}

            </div>

            <div className="text-gray-500 text-xs mt-1">

              Active

            </div>

          </div>


          <div className="bg-white rounded-2xl p-4 shadow-sm">

            <div className="text-3xl font-black text-green-600">

              {completed}

            </div>

            <div className="text-gray-500 text-xs mt-1">

              Completed

            </div>

          </div>

        </div>


        {/* DELIVERIES */}

        <h3 className="font-bold text-gray-700 mb-3">

          My Deliveries

        </h3>


        {deliveries.length === 0 ? (

          <div className="bg-white rounded-2xl p-8 text-center shadow-sm">

            <div className="text-4xl mb-3">

              📦

            </div>

            <div className="text-gray-500">

              No deliveries assigned yet.

            </div>

            <div className="text-sm text-gray-400 mt-2">

              Make sure you are online to receive jobs!

            </div>

          </div>

        ) : (

          <div className="space-y-4">

            {deliveries.map(
              (delivery) => (

              <div
                key={delivery.id}
                className="bg-white rounded-2xl p-5 shadow-sm"
              >

                <div className="flex justify-between items-start mb-3">

                  <div>

                    <div className="font-bold text-gray-800">

                      {delivery.match?.listing?.foodTypes?.join(
                        ', '
                      )}

                    </div>


                    <div className="text-sm text-gray-500 mt-1">

                      {delivery.match?.listing?.quantityKg}
                      {' '}kg ·{' '}

                      {delivery.match?.listing?.vehicleNeeded}

                    </div>


                    <div className="text-xs text-gray-400 mt-1">

                      📍 From:{' '}

                      {delivery.match?.listing?.donor?.user?.name}

                    </div>


                    <div className="text-xs text-gray-400">

                      🏢 To:{' '}

                      {delivery.match?.ngo?.user?.name}

                    </div>

                  </div>


                  <span
                    className={`text-xs font-bold px-3 py-1 rounded-full ${
                      delivery.status ===
                      'ASSIGNED'
                        ? 'bg-yellow-100 text-yellow-700'
                        : delivery.status ===
                          'PICKED_UP'
                        ? 'bg-blue-100 text-blue-700'
                        : delivery.status ===
                          'IN_TRANSIT'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                    }`}
                  >

                    {delivery.status}

                  </span>

                </div>


                {/* LIVE GPS */}

                {(delivery.status ===
                  'ASSIGNED' ||
                  delivery.status ===
                    'PICKED_UP' ||
                  delivery.status ===
                    'IN_TRANSIT') && (

                  <div className="bg-green-50 border border-green-100 rounded-xl p-3 mb-3">

                    <div className="flex items-center gap-2">

                      <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>

                      <span className="text-sm text-green-700 font-semibold">

                        📍 Live location sharing

                      </span>

                    </div>


                    <p className="text-xs text-green-600 mt-1">

                      {delivery.status ===
                        'ASSIGNED'

                        ? 'Rider is travelling to pickup location'

                        : 'Rider is travelling to NGO'}

                    </p>

                  </div>

                )}


                {/* PROGRESS */}

                <div className="flex gap-1 mb-3">

                  {[
                    'ASSIGNED',
                    'PICKED_UP',
                    'IN_TRANSIT',
                    'DELIVERED',
                  ].map(
                    (status) => {

                    const statuses = [
                      'ASSIGNED',
                      'PICKED_UP',
                      'IN_TRANSIT',
                      'DELIVERED',
                    ];


                    const currentIndex =
                      statuses.indexOf(
                        delivery.status
                      );


                    const statusIndex =
                      statuses.indexOf(
                        status
                      );


                    return (

                      <div
                        key={status}
                        className={`h-1.5 flex-1 rounded-full ${
                          statusIndex <=
                          currentIndex
                            ? 'bg-orange-500'
                            : 'bg-gray-200'
                        }`}
                      />

                    );

                  })}

                </div>


                {/* BUTTONS */}

                <div className="flex gap-2 flex-wrap">

                  {delivery.status ===
                    'ASSIGNED' && (

                    <button
                      onClick={() =>
                        updateStatus(
                          delivery.id,
                          'PICKED_UP'
                        )
                      }
                      className="bg-blue-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-blue-700 transition"
                    >

                      📦 Mark Picked Up

                    </button>

                  )}


                  {delivery.status ===
                    'PICKED_UP' && (

                    <button
                      onClick={() =>
                        updateStatus(
                          delivery.id,
                          'IN_TRANSIT'
                        )
                      }
                      className="bg-orange-500 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-600 transition"
                    >

                      🚗 Mark In Transit

                    </button>

                  )}


                  {delivery.status === 'IN_TRANSIT' && (
                    <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 space-y-3">
                      <div>
                        <p className="font-bold text-green-800">📸 Proof of Delivery</p>
                        <p className="text-sm text-green-700 mt-1">
                          Select a photo of the food delivered to the NGO. The delivery will be completed after the photo uploads successfully.
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif"
                        capture="environment"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            setProofFiles((previous) => ({ ...previous, [delivery.id]: file }));
                          }
                        }}
                        className="block w-full text-sm text-gray-700 file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:font-semibold file:text-green-700"
                      />
                      {proofFiles[delivery.id] && (
                        <p className="text-xs text-gray-600">Selected: {proofFiles[delivery.id].name}</p>
                      )}
                      <button
                        type="button"
                        onClick={() => uploadProof(delivery.id)}
                        disabled={!proofFiles[delivery.id] || uploadingProofId === delivery.id}
                        className="bg-green-600 text-white px-4 py-2 rounded-xl font-bold text-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50 transition"
                      >
                        {uploadingProofId === delivery.id ? 'Uploading proof...' : '📤 Upload Proof & Complete Delivery'}
                      </button>
                    </div>
                  )}

                  {delivery.status === 'DELIVERED' && (
                    <div className="w-full space-y-2">
                      <span className="inline-block bg-green-100 text-green-700 px-4 py-2 rounded-xl font-bold text-sm">
                        ✅ Delivered
                      </span>
                      {delivery.proofPhotoUrl && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Proof of delivery</p>
                          <a href={delivery.proofPhotoUrl} target="_blank" rel="noreferrer" className="text-sm text-blue-600 underline">
                            View uploaded photo
                          </a>
                        </div>
                      )}
                    </div>
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