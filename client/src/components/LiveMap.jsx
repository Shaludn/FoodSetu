import { useEffect, useRef } from 'react';

import {
  Map,
  Marker,
  NavigationControl,
  Popup,
} from 'maplibre-gl';

import 'maplibre-gl/dist/maplibre-gl.css';


export default function LiveMap({
  agentLat,
  agentLng,

  destinationLat,
  destinationLng,

  destinationName = 'Destination',

  destination = 'DONOR',
}) {

  const mapContainerRef =
    useRef(null);

  const mapRef =
    useRef(null);

  const riderMarkerRef =
    useRef(null);

  const destinationMarkerRef =
    useRef(null);

  const routeRequestRef =
    useRef(0);

  const mountedRef =
    useRef(true);


  // ==================================================
  // INITIALIZE MAP
  // ==================================================

  useEffect(() => {

    mountedRef.current = true;

    if (!mapContainerRef.current) {
      return;
    }


    console.log('🗺️ Initializing MapLibre...');


    const map =
      new Map({

        container:
          mapContainerRef.current,

        /*
         * IMPORTANT:
         * We are NOT using OpenFreeMap's vector style.
         *
         * We are creating a simple raster OSM map.
         */

        center: [
          77.5946,
          12.9716,
        ],

        zoom: 12,

        attributionControl: true,

        style: {

          version: 8,

          sources: {

            'osm-tiles': {

              type: 'raster',

              tiles: [

                'https://tile.openstreetmap.org/{z}/{x}/{y}.png',

              ],

              tileSize: 256,

              attribution:
                '© OpenStreetMap contributors',

            },

          },

          layers: [

            {

              id: 'osm-tiles',

              type: 'raster',

              source: 'osm-tiles',

              minzoom: 0,

              maxzoom: 19,

            },

          ],

        },

      });


    mapRef.current =
      map;


    // ==================================================
    // NAVIGATION CONTROLS
    // ==================================================

    map.addControl(
      new NavigationControl(),
      'top-right'
    );


    // ==================================================
    // MAP LOAD
    // ==================================================

    map.on(
      'load',
      () => {

        console.log(
          '✅ MAP LOADED SUCCESSFULLY'
        );

      }
    );


    map.on(
      'error',
      (event) => {

        console.error(
          '❌ MAP ERROR:',
          event
        );

      }
    );


    // ==================================================
    // CLEANUP
    // ==================================================

    return () => {

      mountedRef.current =
        false;


      routeRequestRef.current += 1;


      if (
        riderMarkerRef.current
      ) {

        riderMarkerRef.current.remove();

        riderMarkerRef.current =
          null;

      }


      if (
        destinationMarkerRef.current
      ) {

        destinationMarkerRef.current.remove();

        destinationMarkerRef.current =
          null;

      }


      if (
        mapRef.current
      ) {

        mapRef.current.remove();

        mapRef.current =
          null;

      }

    };

  }, []);


  // ==================================================
  // RIDER MARKER
  // ==================================================

  useEffect(() => {

    const map =
      mapRef.current;


    if (!map) {
      return;
    }


    if (
      agentLat === undefined ||
      agentLat === null ||
      agentLng === undefined ||
      agentLng === null
    ) {

      return;

    }


    const lat =
      Number(agentLat);

    const lng =
      Number(agentLng);


    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {

      return;

    }


    console.log(
      '🚴 Rider position:',
      lat,
      lng
    );


    // ==================================================
    // CREATE RIDER MARKER
    // ==================================================

    if (
      !riderMarkerRef.current
    ) {

      const riderElement =
        document.createElement(
          'div'
        );


      riderElement.style.width =
        '54px';

      riderElement.style.height =
        '54px';

      riderElement.style.borderRadius =
        '50%';

      riderElement.style.background =
        'white';

      riderElement.style.border =
        '3px solid #16a34a';

      riderElement.style.boxShadow =
        '0 4px 15px rgba(0,0,0,0.3)';

      riderElement.style.display =
        'flex';

      riderElement.style.alignItems =
        'center';

      riderElement.style.justifyContent =
        'center';

      riderElement.style.overflow =
        'hidden';


      // ==================================================
      // RIDER IMAGE
      // ==================================================

      riderElement.innerHTML = `

        <svg
          width="44"
          height="44"
          viewBox="0 0 100 100"
          xmlns="http://www.w3.org/2000/svg"
        >

          <!-- Helmet -->

          <circle
            cx="50"
            cy="30"
            r="20"
            fill="#2563eb"
          />

          <path
            d="M30 30 Q50 10 70 30"
            stroke="#1e40af"
            stroke-width="6"
            fill="none"
          />


          <!-- Face -->

          <circle
            cx="50"
            cy="38"
            r="12"
            fill="#f5c6a5"
          />


          <!-- Body -->

          <path
            d="M25 80 Q30 52 50 52 Q70 52 75 80 Z"
            fill="#16a34a"
          />


          <!-- Left arm -->

          <line
            x1="35"
            y1="60"
            x2="20"
            y2="72"
            stroke="#16a34a"
            stroke-width="8"
            stroke-linecap="round"
          />


          <!-- Right arm -->

          <line
            x1="65"
            y1="60"
            x2="80"
            y2="72"
            stroke="#16a34a"
            stroke-width="8"
            stroke-linecap="round"
          />

        </svg>

      `;


      // ==================================================
      // RIDER POPUP
      // ==================================================

      const riderPopup =
        new Popup({

          offset: 30,

          closeButton: false,

        }).setHTML(`

          <div
            style="
              font-family: Arial;
              padding: 5px;
            "
          >

            <strong>
              🚴 FoodBridge Rider
            </strong>

            <br/>

            <span
              style="
                color: #16a34a;
              "
            >

              ● Live location

            </span>

          </div>

        `);


      // ==================================================
      // ADD RIDER MARKER
      // ==================================================

      riderMarkerRef.current =
        new Marker({

          element:
            riderElement,

          anchor:
            'center',

        })

          .setLngLat([
            lng,
            lat,
          ])

          .setPopup(
            riderPopup
          )

          .addTo(map);


    }

    else {

      // ==================================================
      // MOVE EXISTING RIDER
      // ==================================================

      riderMarkerRef.current
        .setLngLat([
          lng,
          lat,
        ]);

    }


    // ==================================================
    // MOVE MAP TO RIDER
    // ==================================================

    map.easeTo({

      center: [
        lng,
        lat,
      ],

      duration: 800,

    });


  }, [
    agentLat,
    agentLng,
  ]);


  // ==================================================
  // DESTINATION MARKER
  // ==================================================

  useEffect(() => {

    const map =
      mapRef.current;


    if (!map) {
      return;
    }


    if (
      destinationLat === undefined ||
      destinationLat === null ||
      destinationLng === undefined ||
      destinationLng === null
    ) {

      return;

    }


    const lat =
      Number(destinationLat);

    const lng =
      Number(destinationLng);


    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {

      return;

    }


    console.log(
      '📍 Destination:',
      lat,
      lng
    );


    // ==================================================
    // REMOVE OLD DESTINATION MARKER
    // ==================================================

    if (
      destinationMarkerRef.current
    ) {

      destinationMarkerRef.current.remove();

      destinationMarkerRef.current =
        null;

    }


    // ==================================================
    // DESTINATION ELEMENT
    // ==================================================

    const destinationElement =
      document.createElement(
        'div'
      );


    destinationElement.style.width =
      '46px';

    destinationElement.style.height =
      '46px';

    destinationElement.style.borderRadius =
      '50%';

    destinationElement.style.background =
      '#dc2626';

    destinationElement.style.border =
      '3px solid white';

    destinationElement.style.boxShadow =
      '0 4px 12px rgba(0,0,0,0.3)';

    destinationElement.style.display =
      'flex';

    destinationElement.style.alignItems =
      'center';

    destinationElement.style.justifyContent =
      'center';

    destinationElement.style.fontSize =
      '22px';


    destinationElement.innerHTML =
      destination === 'NGO'
        ? '🏢'
        : '📦';


    // ==================================================
    // DESTINATION POPUP
    // ==================================================

    const title =
      destination === 'NGO'
        ? 'NGO Destination'
        : 'Pickup Location';


    const destinationPopup =
      new Popup({

        offset: 25,

        closeButton: false,

      }).setHTML(`

        <div
          style="
            font-family: Arial;
            padding: 5px;
          "
        >

          <strong>
            ${title}
          </strong>

          <br/>

          <span>
            ${destinationName}
          </span>

        </div>

      `);


    // ==================================================
    // ADD DESTINATION MARKER
    // ==================================================

    destinationMarkerRef.current =
      new Marker({

        element:
          destinationElement,

        anchor:
          'center',

      })

        .setLngLat([
          lng,
          lat,
        ])

        .setPopup(
          destinationPopup
        )

        .addTo(map);


  }, [
    destinationLat,
    destinationLng,
    destinationName,
    destination,
  ]);


  // ==================================================
  // ROUTE
  // ==================================================

  useEffect(() => {

    const map =
      mapRef.current;


    if (!map) {
      return;
    }


    if (
      agentLat === undefined ||
      agentLat === null ||
      agentLng === undefined ||
      agentLng === null ||
      destinationLat === undefined ||
      destinationLat === null ||
      destinationLng === undefined ||
      destinationLng === null
    ) {

      return;

    }


    const startLat =
      Number(agentLat);

    const startLng =
      Number(agentLng);

    const endLat =
      Number(destinationLat);

    const endLng =
      Number(destinationLng);


    if (
      !Number.isFinite(startLat) ||
      !Number.isFinite(startLng) ||
      !Number.isFinite(endLat) ||
      !Number.isFinite(endLng)
    ) {

      return;

    }


    const requestId =
      ++routeRequestRef.current;


    const getRoute =
      async () => {

        try {

          console.log(
            '🛣️ Requesting OSRM route...'
          );


          const url =
            `https://router.project-osrm.org/route/v1/driving/` +

            `${startLng},${startLat};` +

            `${endLng},${endLat}` +

            `?overview=full&geometries=geojson`;


          const response =
            await fetch(url);


          if (!response.ok) {

            throw new Error(
              `OSRM error: ${response.status}`
            );

          }


          const data =
            await response.json();


          if (
            !mountedRef.current
          ) {

            return;

          }


          if (
            requestId !==
            routeRequestRef.current
          ) {

            return;

          }


          if (
            !data.routes ||
            data.routes.length === 0
          ) {

            console.log(
              '⚠️ No route found'
            );

            return;

          }


          const route =
            data.routes[0].geometry;


          // ==================================================
          // ADD / UPDATE ROUTE SOURCE
          // ==================================================

          if (
            !map.getSource(
              'delivery-route'
            )
          ) {

            map.addSource(
              'delivery-route',
              {

                type: 'geojson',

                data: {

                  type: 'Feature',

                  properties: {},

                  geometry:
                    route,

                },

              }
            );

          }

          else {

            map
              .getSource(
                'delivery-route'
              )
              .setData({

                type: 'Feature',

                properties: {},

                geometry:
                  route,

              });

          }


          // ==================================================
          // ADD ROUTE LINE
          // ==================================================

          if (
            !map.getLayer(
              'delivery-route-line'
            )
          ) {

            map.addLayer({

              id:
                'delivery-route-line',

              type:
                'line',

              source:
                'delivery-route',

              layout: {

                'line-join':
                  'round',

                'line-cap':
                  'round',

              },

              paint: {

                'line-color':
                  '#16a34a',

                'line-width':
                  5,

                'line-opacity':
                  0.85,

              },

            });

          }


          console.log(
            '✅ OSRM route displayed'
          );


        }

        catch (error) {

          console.error(
            '❌ Route error:',
            error
          );

        }

      };


    // ==================================================
    // WAIT FOR MAP LOAD
    // ==================================================

    if (
      map.loaded()
    ) {

      getRoute();

    }

    else {

      map.once(
        'load',
        getRoute
      );

    }


  }, [
    agentLat,
    agentLng,
    destinationLat,
    destinationLng,
  ]);


  // ==================================================
  // UI
  // ==================================================

  const riderAvailable =
    agentLat !== undefined &&
    agentLat !== null &&
    agentLng !== undefined &&
    agentLng !== null;


  return (

    <div
      style={{
        position:
          'relative',

        width:
          '100%',

        height:
          '450px',

        borderRadius:
          '16px',

        overflow:
          'hidden',

        marginTop:
          '20px',

        background:
          '#e5e7eb',
      }}
    >

      {/* ==========================================
          MAP
      =========================================== */}

      <div
        ref={
          mapContainerRef
        }

        style={{
          width:
            '100%',

          height:
            '100%',
        }}
      />


      {/* ==========================================
          LIVE BADGE
      =========================================== */}

      {riderAvailable && (

        <div
          style={{
            position:
              'absolute',

            top:
              '15px',

            left:
              '15px',

            background:
              'white',

            padding:
              '8px 14px',

            borderRadius:
              '20px',

            boxShadow:
              '0 3px 12px rgba(0,0,0,0.2)',

            fontWeight:
              '600',

            fontSize:
              '13px',

            zIndex:
              10,
          }}
        >

          🟢 LIVE RIDER

        </div>

      )}


      {/* ==========================================
          WAITING
      =========================================== */}

      {!riderAvailable && (

        <div
          style={{
            position:
              'absolute',

            top:
              '15px',

            left:
              '15px',

            background:
              'white',

            padding:
              '8px 14px',

            borderRadius:
              '20px',

            boxShadow:
              '0 3px 12px rgba(0,0,0,0.2)',

            fontWeight:
              '600',

            fontSize:
              '13px',

            zIndex:
              10,
          }}
        >

          🕐 Waiting for rider location...

        </div>

      )}


      {/* ==========================================
          BOTTOM MESSAGE
      =========================================== */}

      <div
        style={{
          position:
            'absolute',

          bottom:
            '15px',

          left:
            '50%',

          transform:
            'translateX(-50%)',

          background:
            'white',

          padding:
            '10px 18px',

          borderRadius:
            '24px',

          boxShadow:
            '0 4px 15px rgba(0,0,0,0.25)',

          fontSize:
            '13px',

          fontWeight:
            '600',

          whiteSpace:
            'nowrap',

          zIndex:
            10,
        }}
      >

        {destination === 'NGO'

          ? '🚴 Rider heading to NGO'

          : '🚴 Rider heading to pickup'

        }

      </div>

    </div>

  );

}