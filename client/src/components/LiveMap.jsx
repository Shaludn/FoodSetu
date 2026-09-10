import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix leaflet marker icon issue in React
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: require('leaflet/dist/images/marker-icon-2x.png'),
  iconUrl: require('leaflet/dist/images/marker-icon.png'),
  shadowUrl: require('leaflet/dist/images/marker-shadow.png'),
});

// Vehicle icon (moving agent)
const vehicleIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/3774/3774278.png',
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

// Pickup icon (green)
const pickupIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

// Drop icon (red)
const dropIcon = new L.Icon({
  iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684912.png',
  iconSize: [35, 35],
  iconAnchor: [17, 35],
});

// Auto center map when agent moves
const MapUpdater = ({ center }) => {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
};

export default function LiveMap({
  agentLat,
  agentLng,
  pickupLat,
  pickupLng,
  dropLat,
  dropLng,
}) {
  const agentPosition = agentLat && agentLng
    ? [parseFloat(agentLat), parseFloat(agentLng)]
    : null;

  const pickupPosition = pickupLat && pickupLng
    ? [parseFloat(pickupLat), parseFloat(pickupLng)]
    : null;

  const dropPosition = dropLat && dropLng
    ? [parseFloat(dropLat), parseFloat(dropLng)]
    : null;

  const center = agentPosition || pickupPosition || [12.9716, 77.5946];

  // Draw route line between points
  const routePoints = [
    agentPosition,
    pickupPosition,
    dropPosition,
  ].filter(Boolean);

  return (
    <div style={{ height: '350px', borderRadius: '16px', overflow: 'hidden' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        {/* Map tiles — OpenStreetMap (free) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Auto center on agent */}
        {agentPosition && <MapUpdater center={agentPosition} />}

        {/* Agent marker — vehicle */}
        {agentPosition && (
          <Marker position={agentPosition} icon={vehicleIcon}>
            <Popup>
              🚴 Delivery Agent
              <br />
              <small>Live location</small>
            </Popup>
          </Marker>
        )}

        {/* Pickup marker */}
        {pickupPosition && (
          <Marker position={pickupPosition} icon={pickupIcon}>
            <Popup>
              🟢 Pickup Location
              <br />
              <small>Food is here</small>
            </Popup>
          </Marker>
        )}

        {/* Drop marker */}
        {dropPosition && (
          <Marker position={dropPosition} icon={dropIcon}>
            <Popup>
              🔴 Delivery Location
              <br />
              <small>NGO / Receiver</small>
            </Popup>
          </Marker>
        )}

        {/* Route line */}
        {routePoints.length > 1 && (
          <Polyline
            positions={routePoints}
            color="#16a34a"
            weight={4}
            opacity={0.8}
            dashArray="8 4"
          />
        )}
      </MapContainer>
    </div>
  );
}