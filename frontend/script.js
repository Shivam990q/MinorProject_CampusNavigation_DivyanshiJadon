// ================= USER ONBOARDING =================
document.addEventListener("DOMContentLoaded", function() {
    const modal = document.getElementById("welcomeModal");
    const startBtn = document.getElementById("startBtn");

    // 1. Check if user exists. 

    if (localStorage.getItem("campus_user_name")) {
        console.log("User already exists in LocalStorage. Skipping DB save.");
        modal.style.display = "none";
        return; 
    }

    if (startBtn) {
        startBtn.onclick = function() {
            console.log("Start Button Clicked!"); 

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
                    console.log("Database Sync:", data.message);
                    
                    // Save to local 
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
                    console.error("Database Error:", err);
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
let isFirstFix = true;

// Voice state and last instruction tracking
let voiceEnabled = false;
let lastSpokenInstruction = "";

// ================= VOICE FUNCTION =================
function speak(text) {
  if (!voiceEnabled || text === lastSpokenInstruction) return;

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
    lastLatLng.lat + (newLatLng.lat - lastLatLng.lat) * 0.5,
    lastLatLng.lng + (newLatLng.lng - lastLatLng.lng) * 0.5
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
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      const accuracy = position.coords.accuracy;

      console.log(`📍 Current Signal: ${accuracy}m accuracy`);

      if (accuracy > 2000) {
        console.warn("Signal too imprecise, skipping update.");
        return;
      }

      const rawPoint = L.latLng(lat, lng);
      const loader = document.getElementById("loading");
      if (loader) loader.style.display = 'none';

      if (!userMarker) {
        userLocation = rawPoint;
        userMarker = L.marker(userLocation, { 
          icon: userDotIcon,
          zIndexOffset: 1000 
        }).addTo(map);

        map.flyTo(userLocation, 18);
        return;
      }

      const previous = userMarker.getLatLng();
      const movedDistance = previous.distanceTo(rawPoint);

      if (movedDistance < 3) return;

      userLocation = rawPoint;
      userMarker.setLatLng(userLocation);

      if (routingControl && destinationLatLng) {
        // Reroute only if we've moved significantly from the previous point
        if (movedDistance > 30) {
          navigateTo(destinationLatLng.lat, destinationLatLng.lng);
        }
      }
    },
    function(error) {
      console.error("GPS Error:", error.message);
      const loadEl = document.getElementById("loading");
      if (loadEl) loadEl.innerText = "📍 " + error.message;
    },
    {
      enableHighAccuracy: true,
      maximumAge: 5000,
      timeout: 20000 
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

  if (!userLocation) {
  alert("📍 Waiting for your location... Please wait.");
  return;
}

const start = userLocation;

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
    fitSelectedRoutes: false,

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

    // CLEAR AND UPDATE Place Details
    const detailsEl = document.getElementById("placeDetails");
    if (detailsEl) {
        detailsEl.innerHTML = `
          Route calculated.<br>
          <b>Current Step:</b> ${finalSteps[0] || "Arrived"}
        `;
    }

    // CLEAR AND UPDATE Direction Box
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

  // RED PIN ICON
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