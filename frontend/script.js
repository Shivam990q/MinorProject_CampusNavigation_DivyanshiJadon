// ================= USER ONBOARDING =================
document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("welcomeModal");
    const startBtn = document.getElementById("startBtn");

    // 1. Check if user exists. 
    // TIP: To test the database again, type localStorage.clear() in console and refresh.
    if (localStorage.getItem("campus_user_name")) {
        console.log("User already exists in LocalStorage. Skipping DB save.");
        modal.style.display = "none";
        return; // This stops the code here so the button logic below never runs
    }

    if (startBtn) {
        startBtn.onclick = function() {
            console.log("Start Button Clicked!"); // Check this in Console

            const name = document.getElementById("userName").value.trim();
            const role = document.getElementById("userRole").value;

            if (name && role) {
                // Send to MongoDB
                fetch("http://localhost:7000/api/users", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name: name, role: role })
                })
                .then(res => res.json())
                .then(data => {
                    console.log("✅ Database Sync:", data.message);
                    
                    // Save to local only AFTER successful DB response
                    localStorage.setItem("campus_user_name", name);
                    localStorage.setItem("campus_user_role", role);
                    
                    // UI Transitions
                    modal.style.opacity = "0";
                    setTimeout(() => modal.style.display = "none", 500);
                    
                    if (typeof voiceEnabled !== 'undefined' && voiceEnabled) {
                        speak(`Hello ${name}, welcome to the campus.`);
                    }
                })
                .catch(err => {
                    console.error("❌ Database Error:", err);
                    alert("Could not connect to server. Is your backend running?");
                });

            } else {
                alert("Please fill in all details!");
            }
        };
    }
});


// Initialize map
const map = L.map('map').setView([26.138246, 78.207349], 16);

L.tileLayer('https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
  maxZoom: 20,
  subdomains: ['mt0','mt1','mt2','mt3'],
  attribution: '© Google'
}).addTo(map);

let allLocations = []; 
let userLocation = null;
let routingControl = null;
let currentMarker = null;
let userMarker = null;
let gateMarker = null;
let destinationLatLng = null;
let lastLatLng = null;
let lastRouteUpdate = 0;

// NEW: Voice state and last instruction tracking
let voiceEnabled = false;
let lastSpokenInstruction = ""; // FIX: Prevents voice from repeating the same step

// ================= VOICE FUNCTION =================
function speak(text) {
  if (!voiceEnabled || text === lastSpokenInstruction) return;

  // Clear any current speaking to say the new instruction immediately
  window.speechSynthesis.cancel();
  
  const msg = new SpeechSynthesisUtterance(text);
  msg.lang = "en-IN";
  window.speechSynthesis.speak(msg);
  lastSpokenInstruction = text; 
}

// ================= SUPPORT FUNCTIONS =================
function getName(loc) {
  return loc.name || loc.room_name || "Unknown";
}

function getRoom(loc) {
  return loc.room || loc.room_no || "";
}

function normalizeBlock(block) {
  if (!block) return "";
  return block.toLowerCase().replace("block", "").trim();
}

// ================= FLOOR HELPER =================
function isGroundFloor(floor) {
  if (!floor) return true;

  const f = floor.toLowerCase();

  return (
    f.includes("ground") ||
    f === "g" ||
    f === "gf"
  );
}

// ================= SMOOTH LOCATION =================
function smoothPosition(newLatLng) {
  if (!lastLatLng) {
    lastLatLng = newLatLng;
    return newLatLng;
  }

  const smoothed = L.latLng(
    (lastLatLng.lat + newLatLng.lat) / 2,
    (lastLatLng.lng + newLatLng.lng) / 2
  );

  lastLatLng = smoothed;
  return smoothed;
}

// ================= REAL-TIME USER LOCATION =================
if (navigator.geolocation) {
  const userDotIcon = L.divIcon({
    html: `
      <div class="leaflet-user-marker">
        <div class="leaflet-user-pulse"></div>
        <div class="leaflet-user-dot"></div>
      </div>
    `,
    className: 'custom-user-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16]
  });

  navigator.geolocation.watchPosition(
    function(position) {
      // RELAX THE ACCURACY FILTER (Changed from 20 to 100 for testing)
      if (position.coords.accuracy > 100) {
          console.warn("High accuracy not available:", position.coords.accuracy);
          // Don't return, just log it so you know why it might be jumpy
      }

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      // Remove loading indicator
      const loader = document.getElementById("loading");
      if (loader) loader.style.display = 'none';

      const rawPoint = L.latLng(lat, lng);
      userLocation = smoothPosition(rawPoint);

      if (!userMarker) {
        userMarker = L.marker(userLocation, { 
            icon: userDotIcon,
            zIndexOffset: 1000 
        }).addTo(map);
        
        // Center only on first fix
        map.flyTo(userLocation, 18); 
      } else {
        userMarker.setLatLng(userLocation);
      }

      // Auto-reroute logic
      if (routingControl && destinationLatLng) {
        const dist = userLocation.distanceTo(destinationLatLng);
        if (dist > 15 && Date.now() - lastRouteUpdate > 5000) {
          lastRouteUpdate = Date.now();
          navigateTo(destinationLatLng.lat, destinationLatLng.lng);
        }
      }
    },
    function(error) {
      console.error("GPS Error Code:", error.code, error.message);
      document.getElementById("loading").innerText = "📍 GPS Signal Weak...";
    },
    {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 15000 // Increased timeout
    }
  );
}

// ================= FETCH DATA =================
fetch("http://localhost:7000/api/locations")
  .then(res => res.json())
  .then(data => {

    allLocations = data;

    data.forEach(loc => {

      if (
        loc.latitude != null &&
        loc.longitude != null &&
        (loc.type === "building" ||
         loc.type === "canteen" ||
         loc.type === "sports" ||
         loc.type === "facility" ||
         loc.type === "entry")
      ) {

        let markerOptions = {};

        if (loc.type === "entry") {
          markerOptions.icon = L.icon({
            iconUrl: "https://cdn-icons-png.flaticon.com/512/9131/9131546.png",
            iconSize: [35, 35]
          });
        }

        const marker = L.marker(
          [parseFloat(loc.latitude), parseFloat(loc.longitude)],
          markerOptions
        ).addTo(map);

        marker.bindPopup(`
          <b>${getName(loc)}</b><br>
          <button onclick="navigateTo(${loc.latitude}, ${loc.longitude})">
            Navigate
          </button>
        `);

        if (loc.type === "entry") {
          gateMarker = marker;
        }
      }

    });

  });

// ================= NAVIGATION =================
function navigateTo(lat, lng) {

  const start = userLocation ? userLocation : map.getCenter();

  destinationLatLng = L.latLng(lat, lng);

  if (routingControl) {
    map.removeControl(routingControl);
  }

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(start.lat, start.lng),
      L.latLng(lat, lng)
    ],
    routeWhileDragging: false,
    show: false,
    addWaypoints: false,
    draggableWaypoints: false,
    fitSelectedRoutes: false, // FIX: Map won't jump/zoom out automatically now

    router: L.Routing.osrmv1({
      serviceUrl: 'https://router.project-osrm.org/route/v1'
    }),

    createMarker: () => null

  })
  .on('routesfound', function(e) {

    const route = e.routes[0];
    const instructions = route.instructions;

    let filteredSteps = [];

    instructions.forEach((step) => {

      let text = step.text.toLowerCase();
      let direction = "";

      if (text.includes("left")) direction = "⬅️ Left";
      else if (text.includes("right")) direction = "➡️ Right";
      else if (text.includes("straight")) direction = "⬆️ Straight";
      else if (text.includes("destination")) direction = "🎯 Reached";

      if (direction !== "") {

        let distance = step.distance ? Math.round(step.distance) : 0;

        if (distance > 5 && direction !== "🎯 Reached") {
          direction += ` after ${distance}m`;
        }

        filteredSteps.push(direction);
      }

    });

    // remove duplicates
    let finalSteps = [];
    for (let i = 0; i < filteredSteps.length; i++) {
      if (filteredSteps[i] !== filteredSteps[i - 1]) {
        finalSteps.push(filteredSteps[i]);
      }
    }

    //  LIMIT steps for voice trigger (Top step only)
    if (finalSteps.length > 0) {
        const clean = finalSteps[0].replace(/[⬅️➡️⬆️🎯]/g, "");

if (clean !== lastSpokenInstruction) {
  speak(clean);
}
    }

    //  FIX: CLEAR AND UPDATE Place Details (No += growth)
    const detailsEl = document.getElementById("placeDetails");
    if (detailsEl) {
        detailsEl.innerHTML = `
          Route calculated.<br>
          <b>Current Step:</b> ${finalSteps[0] || "Arrived"}
        `;
    }

    // FIX: CLEAR AND UPDATE Direction Box (No += growth)
    const box = document.getElementById("directionBox");
    box.classList.remove("hidden");

    box.innerHTML = "<b>🧭 Directions</b>"; 

    finalSteps.forEach((step, index) => {
      box.innerHTML += `<div>${index + 1}. ${step}</div>`;
    });

  })
  .addTo(map);
}

// ================= SEARCH =================
const suggestionsBox = document.getElementById("suggestions");

document.getElementById("search").addEventListener("input", function () {

  let query = this.value.toLowerCase();
  suggestionsBox.innerHTML = "";

  if (!query) return;

  let results = allLocations.filter(loc => {

    const name = getName(loc).toLowerCase();
    const room = getRoom(loc).toString();
    const block = (loc.block || "").toLowerCase();

    return (
      name.includes(query) ||
      room.includes(query) ||
      block.includes(query)
    );
  });

  results.slice(0, 6).forEach(loc => {

    let div = document.createElement("div");
    div.className = "suggestion-item";

    div.innerHTML = `
      <b>${getName(loc)}</b><br>
      <small>${loc.block || ""} • ${loc.floor || ""} • ${getRoom(loc)}</small>
    `;

    div.addEventListener("click", function(e) {
      e.stopPropagation();
      selectLocation(loc);
    });

    suggestionsBox.appendChild(div);
  });
});

// SELECT LOCATION
function selectLocation(loc) {

  suggestionsBox.innerHTML = "";

  if (currentMarker) {
    map.removeLayer(currentMarker);
  }

  let lat = null;
  let lng = null;
  let building = null;

  if (loc.latitude != null && loc.longitude != null) {

    lat = parseFloat(loc.latitude);
    lng = parseFloat(loc.longitude);
    building = loc;

  } else {

    building = allLocations.find(b =>
      b.type === "building" &&
      normalizeBlock(b.block) === normalizeBlock(loc.block)
    );

    if (!building) {
      alert("❌ Block location not found");
      return;
    }

    lat = parseFloat(building.latitude);
    lng = parseFloat(building.longitude);
  }

  map.setView([lat, lng], 19);

  // MODERN RED PIN ICON
  currentMarker = L.marker([lat, lng], {
    icon: L.icon({
      iconUrl: "https://cdn-icons-png.flaticon.com/512/2776/2776067.png",
      iconSize: [40, 40]
    })
  })
    .addTo(map)
    .bindPopup(`<b>${getName(loc)}</b>`)
    .openPopup();

  let userBlock = null;

  if (userLocation) {
    let nearest = allLocations.find(b =>
      b.type === "building" &&
      Math.abs(b.latitude - userLocation.lat) < 0.0005 &&
      Math.abs(b.longitude - userLocation.lng) < 0.0005
    );

    if (nearest) {
      userBlock = nearest.block;
    }
  }

  let extraGuide = "";

  if (userBlock && normalizeBlock(userBlock) === normalizeBlock(loc.block)) {

    if (!isGroundFloor(loc.floor)) {
      extraGuide = `⬆️ Go to ${loc.floor} using stairs/lift`;
    } else {
      extraGuide = `📍 Destination is on ground floor`;
    }

  } else {

    extraGuide = `🧭 Navigate to ${loc.block} first`;

    if (!isGroundFloor(loc.floor)) {
      extraGuide += `<br>⬆️ Then go to ${loc.floor}`;
    } else {
      extraGuide += `<br>📍 Ground floor destination`;
    }
  }

  document.getElementById("infoPanel").classList.remove("hidden");

  document.getElementById("placeName").innerText = getName(loc);

  document.getElementById("placeDetails").innerHTML = `
    📍 Block: ${loc.block || "N/A"} <br>
    🏢 Floor: ${loc.floor || "N/A"} <br>
    🚪 Room: ${getRoom(loc) || "N/A"}
    <hr>
    ${extraGuide}
  `;

  document.getElementById("navigateBtn").onclick = function () {
    navigateTo(lat, lng);
  };
}

// ================= BUTTONS =================

document.getElementById("locateBtn").onclick = function () {

  if (userLocation) {
    map.flyTo([userLocation.lat, userLocation.lng], 18, {
      animate: true,
      duration: 1.2
    });
  } else {
    alert("Location not available yet...");
  }
};

document.getElementById("gateBtn").onclick = function () {

  if (!gateMarker) {
    alert("Gate not found");
    return;
  }

  const latlng = gateMarker.getLatLng();

  map.setView(latlng, 18);
  gateMarker.openPopup();

  navigateTo(latlng.lat, latlng.lng);
};

document.getElementById("clearRoute").onclick = function () {

  // STOP ALL VOICE
  window.speechSynthesis.cancel();
  lastSpokenInstruction = "";

  if (routingControl) {
    map.removeControl(routingControl);
    routingControl = null;
  }

  if (currentMarker) {
    map.removeLayer(currentMarker);
    currentMarker = null;
  }

  destinationLatLng = null;

  map.closePopup();
  document.getElementById("directionBox").classList.add("hidden");
  document.getElementById("infoPanel").classList.add("hidden");
};

// NEW VOICE BUTTON
document.getElementById("voiceBtn").onclick = function () {
  voiceEnabled = !voiceEnabled;
  this.innerText = voiceEnabled ? "🔊 ON" : "🔇 OFF";
};

// CLOSE PANEL
document.getElementById("closePanel").onclick = function () {
  document.getElementById("infoPanel").classList.add("hidden");
};

function unlockVoice() {
  const msg = new SpeechSynthesisUtterance(" ");
  window.speechSynthesis.speak(msg);
}