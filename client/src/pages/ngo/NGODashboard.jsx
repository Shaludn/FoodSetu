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





export default function NGODashboard() {



  const {

    user,

    logout,

  } = useAuth();

  // NGOReceiver profile ID: must match bestNGO.id on the backend.
  const ngoProfileId =
    user?.ngo?.id ||
    user?.ngoId ||
    user?.ngoReceiver?.id ||
    user?.nGOReceiver?.id;



  const navigate =

    useNavigate();





  // ==========================================

  // STATE

  // ==========================================



  const [

    matches,

    setMatches,

  ] = useState([]);

  // Real-time NGO notifications
  const [notifications, setNotifications] = useState([]);
  useEffect(() => {
  console.log('📋 Notifications state changed:', notifications);
}, [notifications]);





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

    ngoLocation,

    setNgoLocation,

  ] = useState(null);





  // ==========================================

  // SOCKET REFS

  // ==========================================



  const socketRef =

    useRef(null);



  const activeDeliveryIdRef =

    useRef(null);





  // ==========================================

  // KEEP ACTIVE DELIVERY REF UPDATED

  // ==========================================



  useEffect(() => {



    activeDeliveryIdRef.current =

      activeDeliveryId;



  }, [

    activeDeliveryId,

  ]);





  // ==========================================

  // FETCH MATCHES

  // ==========================================



  const fetchMatches =

    async () => {



      try {



        const res =

          await api.get(

            '/matches/my-matches'

          );



        console.log(

          '🏢 NGO matches:',

          res.data

        );



        setMatches(

          res.data

        );



      } catch (err) {



        console.error(

          '❌ NGO matches error:',

          err

        );



      }



    };





  // ==========================================

  // NGO LOCATION

  // ==========================================



  useEffect(() => {



    if (!navigator.geolocation) {



      console.error(

        '❌ Geolocation is not supported by this browser.'

      );



      return;

    }



    console.log(

      '🏢 Starting NGO location tracking...'

    );





    const watchId =

      navigator.geolocation.watchPosition(



        (position) => {



          const lat =

            position.coords.latitude;



          const lng =

            position.coords.longitude;





          console.log(

            '🏢 NGO LOCATION:',

            lat,

            lng

          );





          setNgoLocation({

            lat,

            lng,

          });



        },





        (error) => {



          console.error(

            '❌ NGO location error:',

            error.code,

            error.message

          );





          if (error.code === 1) {



            console.error(

              '⚠️ Location permission denied. Please allow location access for localhost.'

            );



          }



          if (error.code === 2) {



            console.error(

              '⚠️ NGO location is unavailable.'

            );



          }



          if (error.code === 3) {



            console.error(

              '⚠️ NGO location request timed out.'

            );



          }



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

      '🔌 Connecting NGO to Socket.IO...'

    );





    socketRef.current =

      io('http://localhost:5000');





    // ========================================

    // SOCKET CONNECTED

    // ========================================



    socketRef.current.on(
      'connect',
      () => {
        console.log(
          '🏢 NGO connected:',
          socketRef.current.id
        );
      }
    );

   socketRef.current.on('new_match', (notification) => {
  console.log('🔔 NEW NGO MATCH RECEIVED:', notification);

  setNotifications((previous) => {
    const updated = [
      {
        ...notification,
        receivedAt: new Date().toISOString(),
      },
      ...previous.filter(
        (item) => item.matchId !== notification.matchId
      ),
    ];

    console.log('📋 Updated notifications:', updated);
    return updated;
  });

  fetchMatches();
});




    // ========================================

    // RIDER LOCATION

    // ========================================



    socketRef.current.on(

      'location_update',



      ({

        deliveryId,

        lat,

        lng,

      }) => {



        console.log(

          '📍 NGO RIDER LOCATION:',

          deliveryId,

          lat,

          lng

        );





        // Ignore location from another delivery



        if (

          activeDeliveryIdRef.current &&

          deliveryId &&

          String(deliveryId) !==

            String(

              activeDeliveryIdRef.current

            )

        ) {



          console.log(

            '⚠️ Ignoring location from another delivery'

          );



          return;



        }





        const latitude =

          Number(lat);



        const longitude =

          Number(lng);





        if (

          !Number.isFinite(latitude) ||

          !Number.isFinite(longitude)

        ) {



          console.error(

            '❌ Invalid rider coordinates:',

            lat,

            lng

          );



          return;



        }





        setAgentLocation({

          lat: latitude,

          lng: longitude,

        });



      }

    );





    // ========================================

    // DELIVERY STATUS UPDATE

    // ========================================



    socketRef.current.on(

      'delivery_status_update',



      ({

        deliveryId,

        status,

      }) => {



        console.log(

          '🏢 NGO DELIVERY STATUS:',

          deliveryId,

          status

        );





        // Ignore another delivery



        if (

          activeDeliveryIdRef.current &&

          deliveryId &&

          String(deliveryId) !==

            String(

              activeDeliveryIdRef.current

            )

        ) {



          console.log(

            '⚠️ Ignoring status from another delivery'

          );



          return;



        }





        // Update status immediately



        setDeliveryStatus(

          status

        );





        // Refresh match data



        fetchMatches();





        // ====================================

        // ASSIGNED

        // ====================================



        if (

          status === 'ASSIGNED'

        ) {



          console.log(

            '🚴 Rider assigned - waiting for pickup'

          );



        }





        // ====================================

        // PICKED UP

        // ====================================



        if (

          status === 'PICKED_UP'

        ) {



          console.log(

            '📦 Food picked up - rider heading to NGO'

          );



        }





        // ====================================

        // IN TRANSIT

        // ====================================



        if (

          status === 'IN_TRANSIT'

        ) {



          console.log(

            '🚴 Rider is in transit to NGO'

          );



        }





        // ====================================

        // DELIVERED

        // ====================================



        if (

          status === 'DELIVERED'

        ) {



          console.log(

            '✅ Delivery completed'

          );





          setAgentLocation(

            null

          );





          setDeliveryStatus(

            null

          );





          setActiveDeliveryId(

            null

          );



        }



      }

    );





    // ========================================

    // SOCKET DISCONNECT

    // ========================================



    socketRef.current.on(

      'disconnect',



      (reason) => {



        console.log(

          '🔌 NGO socket disconnected:',

          reason

        );



      }

    );





    // ========================================

    // CLEANUP

    // ========================================



    return () => {



      console.log(

        '🔌 Disconnecting NGO socket...'

      );





      if (

        socketRef.current

      ) {



        socketRef.current.off('new_match');
        socketRef.current.off('connect');
        socketRef.current.disconnect();



        socketRef.current =

          null;



      }



    };



  }, []);





  // Join/rejoin the NGO notification room when the profile ID is available.
  useEffect(() => {
    const socket = socketRef.current;

    if (!socket || !ngoProfileId) {
      if (!ngoProfileId) {
        console.warn('⚠️ NGO profile ID not available yet; notification room not joined.');
      }
      return;
    }

    const joinNGORoom = () => {
      socket.emit('join_ngo', { ngoId: String(ngoProfileId) }, (response) => {
        if (response?.ok) {
          console.log('🔔 Joined NGO notification room:', response.room);
        } else {
          console.error('❌ Failed to join NGO notification room:', response);
        }
      });
    };

    if (socket.connected) joinNGORoom();
    socket.on('connect', joinNGORoom);

    return () => {
      socket.off('connect', joinNGORoom);
    };
  }, [ngoProfileId]);


  // ==========================================

  // INITIAL FETCH

  // ==========================================



  useEffect(() => {



    fetchMatches();



  }, []);





  // ==========================================

  // FIND ACTIVE DELIVERY

  // ==========================================



  useEffect(() => {



    const active =

      matches.find(

        (match) => {



          return (



            match.status ===

              'ACCEPTED'



            &&



            match.delivery



            &&



            (

              match.delivery.status ===

                'ASSIGNED'



              ||



              match.delivery.status ===

                'PICKED_UP'



              ||



              match.delivery.status ===

                'IN_TRANSIT'

            )



          );



        }

      );





    // ========================================

    // ACTIVE DELIVERY FOUND

    // ========================================



    if (active) {



      const deliveryId =

        active.delivery.id;





      console.log(

        '🏢 Active NGO delivery:',

        deliveryId

      );





      setActiveDeliveryId(

        deliveryId

      );





      setDeliveryStatus(

        active.delivery.status

      );



    }



    // ========================================

    // NO ACTIVE DELIVERY

    // ========================================



    else {



      setActiveDeliveryId(

        null

      );



      setDeliveryStatus(

        null

      );



      setAgentLocation(

        null

      );



    }



  }, [

    matches,

  ]);





  // ==========================================

  // JOIN DELIVERY ROOM

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



      console.log(

        '⚠️ Socket not ready yet'

      );



      return;



    }





    console.log(

      '🏢 NGO joining delivery room:',

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

  // ACTIVE MATCH

  // ==========================================



  const activeMatch =

    matches.find(

      (match) => {



        return (



          match.status ===

            'ACCEPTED'



          &&



          match.delivery



          &&



          (

            match.delivery.status ===

              'ASSIGNED'



            ||



            match.delivery.status ===

              'PICKED_UP'



            ||



            match.delivery.status ===

              'IN_TRANSIT'

          )



        );



      }

    );





  // ==========================================

  // CURRENT STATUS

  // ==========================================



  const currentStatus =

    deliveryStatus ||

    activeMatch?.delivery?.status;





  // ==========================================

  // NGO MAP CONDITION

  //

  // MAP ONLY FOR:

  // PICKED_UP

  // IN_TRANSIT

  // ==========================================



  const showMap =

    currentStatus ===

      'PICKED_UP'



    ||



    currentStatus ===

      'IN_TRANSIT';





  // ==========================================

  // RESPOND TO MATCH

  // ==========================================



  const respond =

    async (

      matchId,

      status

    ) => {



      try {



        await api.patch(

          `/matches/${matchId}/respond`,

          {

            status,

          }

        );





        console.log(

          '✅ Match response:',

          status

        );





        fetchMatches();



      } catch (err) {



        console.error(

          '❌ Match response error:',

          err

        );





        alert(

          'Failed to respond'

        );



      }



    };





  // ==========================================

  // COUNTS

  // ==========================================



  const accepted =

    matches.filter(

      (m) =>

        m.status ===

        'ACCEPTED'

    ).length;





  const pending =

    matches.filter(

      (m) =>

        m.status ===

        'PENDING'

    ).length;





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



    <div className="min-h-screen bg-blue-50">





      {/* =====================================

          HEADER

      ====================================== */}



      <div

        className="

          bg-white

          shadow-sm

          px-6

          py-4

          flex

          justify-between

          items-center

          sticky

          top-0

          z-10

        "

      >



        <h1

          className="

            text-xl

            font-black

            text-blue-700

          "

        >



          🌱 FoodBridge



        </h1>





        <div

          className="

            flex

            gap-4

            items-center

          "

        >



          <button

            onClick={() =>

              navigate(

                '/ngo/profile'

              )

            }



            className="

              text-sm

              text-blue-600

              font-semibold

              hover:underline

            "

          >



            ✏️ Profile



          </button>





          <button

            onClick={

              handleLogout

            }



            className="

              text-sm

              text-gray-500

              hover:text-red-500

            "

          >



            Logout



          </button>



        </div>



      </div>





      {/* =====================================

          MAIN

      ====================================== */}



      <div

        className="

          max-w-2xl

          mx-auto

          px-4

          py-6

        "

      >





        {/* ===================================

            WELCOME

        ==================================== */}



        <div

          className="

            bg-white

            rounded-2xl

            p-6

            shadow-sm

            mb-4

          "

        >



          <h2

            className="

              text-2xl

              font-bold

              text-gray-800

            "

          >



            {user?.name} 🏢



          </h2>





          <p

            className="

              text-gray-500

              mt-1

            "

          >



            NGO Dashboard



          </p>



        </div>





        {/* ===================================

            STATS

        ==================================== */}



        <div

          className="

            grid

            grid-cols-3

            gap-3

            mb-4

          "

        >



          {/* TOTAL */}



          <div

            className="

              bg-blue-600

              text-white

              rounded-2xl

              p-4

            "

          >



            <div

              className="

                text-3xl

                font-black

              "

            >



              {matches.length}



            </div>





            <div

              className="

                text-blue-100

                text-xs

                mt-1

              "

            >



              Total Matches



            </div>



          </div>





          {/* ACCEPTED */}



          <div

            className="

              bg-white

              rounded-2xl

              p-4

              shadow-sm

            "

          >



            <div

              className="

                text-3xl

                font-black

                text-green-600

              "

            >



              {accepted}



            </div>





            <div

              className="

                text-gray-500

                text-xs

                mt-1

              "

            >



              Accepted



            </div>



          </div>





          {/* PENDING */}



          <div

            className="

              bg-white

              rounded-2xl

              p-4

              shadow-sm

            "

          >



            <div

              className="

                text-3xl

                font-black

                text-yellow-600

              "

            >



              {pending}



            </div>





            <div

              className="

                text-gray-500

                text-xs

                mt-1

              "

            >



              Pending



            </div>



          </div>



        </div>





        {/* ===================================

            NGO LIVE MAP

        ==================================== */}



        {showMap && (



          <div

            className="

              bg-white

              rounded-2xl

              p-4

              shadow-sm

              mb-4

            "

          >





            {/* MAP HEADER */}



            <div

              className="

                flex

                justify-between

                items-center

                mb-3

              "

            >



              <div>



                <h3

                  className="

                    font-bold

                    text-gray-700

                  "

                >



                  🚴 Rider Live Location



                </h3>





                <p

                  className="

                    text-xs

                    text-gray-400

                    mt-1

                  "

                >



                  Your food delivery is on its way.



                </p>



              </div>





              <div

                className="

                  flex

                  items-center

                  gap-2

                "

              >



                <div

                  className="

                    w-3

                    h-3

                    bg-green-500

                    rounded-full

                    animate-pulse

                  "

                ></div>





                <span

                  className="

                    text-xs

                    text-green-600

                    font-bold

                  "

                >



                  LIVE



                </span>



              </div>



            </div>





            {/* =================================

                LIVE MAP

            ================================== */}



            <LiveMap



              agentLat={

                agentLocation?.lat

              }



              agentLng={

                agentLocation?.lng

              }



              destinationLat={

                ngoLocation?.lat

              }



              destinationLng={

                ngoLocation?.lng

              }



              destinationName="Your NGO"



              destination="NGO"



            />





            {/* =================================

                RIDER WAITING

            ================================== */}



            {!agentLocation && (



              <div

                className="

                  mt-3

                  bg-yellow-50

                  rounded-xl

                  p-3

                "

              >



                <div

                  className="

                    flex

                    items-center

                    gap-2

                  "

                >



                  <div

                    className="

                      w-3

                      h-3

                      bg-yellow-500

                      rounded-full

                      animate-pulse

                    "

                  ></div>





                  <span

                    className="

                      text-sm

                      text-yellow-700

                      font-semibold

                    "

                  >



                    Waiting for rider location...



                  </span>



                </div>



              </div>



            )}





            {/* =================================

                NGO LOCATION WAITING

            ================================== */}



            {!ngoLocation && (



              <div

                className="

                  mt-3

                  bg-red-50

                  border

                  border-red-200

                  rounded-xl

                  p-3

                "

              >



                <div

                  className="

                    text-sm

                    text-red-700

                    font-semibold

                  "

                >



                  📍 Waiting for NGO location...



                </div>





                <div

                  className="

                    text-xs

                    text-red-600

                    mt-1

                  "

                >



                  Please allow location access

                  in your browser.



                </div>



              </div>



            )}



          </div>



        )}





        {/* ===================================

            ASSIGNED

        ==================================== */}



        {currentStatus ===

          'ASSIGNED' && (



          <div

            className="

              bg-white

              rounded-2xl

              p-5

              shadow-sm

              mb-4

            "

          >



            <div

              className="

                bg-yellow-50

                border

                border-yellow-200

                rounded-2xl

                p-5

              "

            >



              <div

                className="

                  text-4xl

                  mb-3

                "

              >



                🚴



              </div>





              <h3

                className="

                  text-lg

                  font-black

                  text-yellow-700

                "

              >



                Rider is collecting your food



              </h3>





              <p

                className="

                  text-sm

                  text-yellow-700

                  mt-2

                "

              >



                The rider is currently travelling

                to the donor's pickup location.



              </p>





              <div

                className="mt-4"

              >



                <span

                  className="

                    bg-yellow-100

                    text-yellow-700

                    px-3

                    py-2

                    rounded-full

                    text-xs

                    font-bold

                  "

                >



                  🚴 ASSIGNED



                </span>



              </div>



            </div>



          </div>



        )}





        {/* ===================================

            PICKED UP

        ==================================== */}



        {currentStatus ===

          'PICKED_UP' && (



          <div

            className="

              bg-white

              rounded-2xl

              p-5

              shadow-sm

              mb-4

            "

          >



            <div

              className="

                bg-green-50

                border

                border-green-200

                rounded-2xl

                p-5

              "

            >



              <div

                className="

                  text-4xl

                  mb-3

                "

              >



                📦❤️



              </div>





              <h3

                className="

                  text-lg

                  font-black

                  text-green-700

                "

              >



                Food has been collected!



              </h3>





              <p

                className="

                  text-sm

                  text-green-700

                  mt-2

                "

              >



                The rider has collected the donated

                food and is now proceeding toward

                your NGO.



              </p>



            </div>



          </div>



        )}





        {/* ===================================

            INCOMING MATCH REQUESTS

        ==================================== */}



        {/* REAL-TIME NOTIFICATIONS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-700">🔔 Notifications</h3>
            {notifications.length > 0 && (
              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-700">
                {notifications.length} new
              </span>
            )}
          </div>

          {notifications.length === 0 ? (
            <p className="text-sm text-gray-500">
              No new notifications. New donation matches will appear here while you are online.
            </p>
          ) : (
            <div className="space-y-3">
              {notifications.map((notification) => (
                <div
                  key={notification.matchId}
                  className="rounded-xl border border-blue-100 bg-blue-50 p-3"
                >
                  <p className="font-semibold text-gray-800">
                    {notification.message || 'A new donation has been matched with your NGO.'}
                  </p>
                  {notification.foodTypes?.length > 0 && (
                    <p className="mt-1 text-sm text-gray-600">
                      Food: {notification.foodTypes.join(', ')}
                    </p>
                  )}
                  {notification.quantityKg != null && (
                    <p className="text-sm text-gray-600">
                      Quantity: {notification.quantityKg} kg
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-400">
                    {notification.receivedAt
                      ? new Date(notification.receivedAt).toLocaleTimeString('en-IN')
                      : 'Just now'}
                  </p>
                </div>
              ))}
              <button
                type="button"
                onClick={() => setNotifications([])}
                className="text-sm font-semibold text-blue-600 hover:underline"
              >
                Clear notifications
              </button>
            </div>
          )}
        </div>

        <h3

          className="

            font-bold

            text-gray-700

            mb-3

          "

        >



          Incoming Match Requests



        </h3>





        {matches.length === 0 ? (



          <div

            className="

              bg-white

              rounded-2xl

              p-8

              text-center

              shadow-sm

            "

          >



            <div

              className="

                text-4xl

                mb-3

              "

            >



              📭



            </div>





            <div

              className="

                text-gray-500

              "

            >



              No match requests yet.



            </div>



          </div>



        ) : (



          <div

            className="

              space-y-4

            "

          >



            {matches.map(

              (match) => (



                <div

                  key={

                    match.id

                  }



                  className="

                    bg-white

                    rounded-2xl

                    p-5

                    shadow-sm

                  "

                >





                  {/* =================================

                      MATCH HEADER

                  ================================== */}



                  <div

                    className="

                      flex

                      justify-between

                      items-start

                      mb-3

                    "

                  >



                    <div>



                      <div

                        className="

                          font-bold

                          text-gray-800

                        "

                      >



                        {

                          match.listing?.foodTypes?.join(

                            ', '

                          )

                        }



                      </div>





                      <div

                        className="

                          text-sm

                          text-gray-500

                          mt-1

                        "

                      >



                        {

                          match.listing?.quantityKg

                        }



                        {' '}kg ·{' '}



                        {

                          match.listing?.vehicleNeeded

                        }



                      </div>





                      <div

                        className="

                          text-xs

                          text-gray-400

                          mt-1

                        "

                      >



                        From:{' '}



                        {

                          match.listing?.donor?.user?.name

                        }



                      </div>





                      <div

                        className="

                          text-xs

                          text-gray-400

                        "

                      >



                        {

                          new Date(

                            match.notifiedAt

                          ).toLocaleString(

                            'en-IN',

                            {

                              day:

                                'numeric',



                              month:

                                'short',



                              hour:

                                '2-digit',



                              minute:

                                '2-digit',

                            }

                          )

                        }



                      </div>



                    </div>





                    {/* STATUS */}



                    <span

                      className={`

                        text-xs

                        font-bold

                        px-3

                        py-1

                        rounded-full



                        ${

                          match.status ===

                          'PENDING'



                            ? 'bg-yellow-100 text-yellow-700'



                            : match.status ===

                              'ACCEPTED'



                            ? 'bg-green-100 text-green-700'



                            : 'bg-red-100 text-red-700'

                        }

                      `}

                    >



                      {

                        match.status

                      }



                    </span>



                  </div>





                  {/* =================================

                      DELIVERY INFORMATION

                  ================================== */}



                  {

                    match.status ===

                      'ACCEPTED'



                    &&



                    match.delivery



                    && (



                      <div

                        className="

                          bg-green-50

                          rounded-xl

                          px-4

                          py-3

                          mb-3

                        "

                      >



                        <div

                          className="

                            text-sm

                            font-bold

                            text-green-700

                          "

                        >



                          🚴 Agent Assigned



                        </div>





                        <div

                          className="

                            text-xs

                            text-green-600

                            mt-1

                          "

                        >



                          Delivery status:{' '}



                          <span

                            className="

                              font-semibold

                            "

                          >



                            {

                              match.delivery.status

                            }



                          </span>



                        </div>



                      </div>



                    )

                  }





                  {/* =================================

                      BUTTONS

                  ================================== */}



                  {

                    match.status ===

                      'PENDING'



                    && (



                      <div

                        className="

                          flex

                          gap-3

                        "

                      >



                        {/* ACCEPT */}



                        <button

                          onClick={() =>

                            respond(

                              match.id,

                              'ACCEPTED'

                            )

                          }



                          className="

                            flex-1

                            bg-green-600

                            text-white

                            py-2

                            rounded-xl

                            font-bold

                            hover:bg-green-700

                            transition

                          "

                        >



                          ✅ Accept



                        </button>





                        {/* DECLINE */}



                        <button

                          onClick={() =>

                            respond(

                              match.id,

                              'DECLINED'

                            )

                          }



                          className="

                            flex-1

                            border-2

                            border-red-400

                            text-red-500

                            py-2

                            rounded-xl

                            font-bold

                            hover:bg-red-50

                            transition

                          "

                        >



                          ❌ Decline



                        </button>



                      </div>



                    )

                  }



                </div>



              )

            )}



          </div>



        )}



      </div>



    </div>



  );



}