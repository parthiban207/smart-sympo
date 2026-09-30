// agent-notes: { ctx: "Interactive College Street View & Hallway 3D Walkthrough with floor switching, directional arrow navigation, and hall interior visits", deps: ["lucide-react", "src/services/collegeStreetData.js", "src/context/AppContext.jsx"], state: "active", last: "antigravity@2026-09-30" }

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Compass,
  DoorOpen,
  Layers,
  MapPin,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  ChevronRight,
  Footprints,
  Sparkles,
  Users,
  CheckCircle2,
  SlidersHorizontal,
  Navigation,
  LogOut,
  Map as MapIcon,
  X,
  Building,
  Radio,
  Tv,
  Wifi,
} from 'lucide-react';
import {
  STREET_VIEW_NODES,
  getStreetViewNode,
  findClosestStreetNode,
  QUICK_STARTING_LOCATIONS,
} from '../services/collegeStreetData';
import { useApp } from '../context/AppContext';

export default function CollegeStreetView({
  initialNodeId = 'main_gate',
  userLocation = null,
  onSetUserLocation = null,
  onSwitchToTopView = null,
  destinationVenue = null,
}) {
  const { events = [] } = useApp();

  // Find initial node based on user location or initialNodeId
  const startingNode = useMemo(() => {
    if (initialNodeId && STREET_VIEW_NODES[initialNodeId]) {
      return STREET_VIEW_NODES[initialNodeId];
    }
    if (userLocation?.landmarkId) {
      const match = findClosestStreetNode(userLocation.landmarkId);
      if (match) return match;
    }
    if (userLocation?.coords) {
      return findClosestStreetNode(userLocation.coords);
    }
    return STREET_VIEW_NODES.main_gate;
  }, [initialNodeId, userLocation]);

  const [currentNodeId, setCurrentNodeId] = useState(startingNode.id);
  const [activeFloor, setActiveFloor] = useState(startingNode.floor);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(true);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [transitioning, setTransitioning] = useState(false);
  const [transitionText, setTransitionText] = useState('');
  const [facingAngle, setFacingAngle] = useState(0); // Pan/Look angle (-40 to +40 deg)
  const [stepCount, setStepCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const currentNode = useMemo(() => getStreetViewNode(currentNodeId), [currentNodeId]);

  // Keep active floor synchronized with current node
  useEffect(() => {
    setActiveFloor(currentNode.floor);
  }, [currentNode]);

  // Text to speech helper
  const speakInstruction = useCallback(
    (text) => {
      if (!('speechSynthesis' in window) || !isVoiceEnabled) return;
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05;
        utterance.pitch = 1.0;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('Speech synthesis error:', e);
      }
    },
    [isVoiceEnabled]
  );

  // Navigate to a new node with smooth transition
  const navigateToNode = useCallback(
    (targetId, transitionMessage = 'Walking forward...') => {
      if (!STREET_VIEW_NODES[targetId]) return;
      setTransitioning(true);
      setTransitionText(transitionMessage);
      setFacingAngle(0);

      if (navigator.vibrate) {
        navigator.vibrate(40);
      }

      setTimeout(() => {
        setCurrentNodeId(targetId);
        setStepCount((prev) => prev + 1);
        setTransitioning(false);

        const targetNode = STREET_VIEW_NODES[targetId];
        speakInstruction(targetNode.name);

        // Update global user location if callback is provided
        if (onSetUserLocation) {
          onSetUserLocation({
            coords: targetNode.coords,
            name: `${targetNode.name} (${targetNode.floorName})`,
            landmarkId: targetNode.id,
            isCustom: true,
          });
        }
      }, 350);
    },
    [onSetUserLocation, speakInstruction]
  );

  // Keyboard navigation support (Arrow keys & WASD)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (isLocationModalOpen) return;
      const conn = currentNode.connections || {};

      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        if (conn.forward) navigateToNode(conn.forward.targetId, 'Walking forward...');
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        if (conn.left) {
          navigateToNode(conn.left.targetId, 'Turning left...');
        } else {
          setFacingAngle((prev) => Math.max(-30, prev - 15));
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        if (conn.right) {
          navigateToNode(conn.right.targetId, 'Turning right...');
        } else {
          setFacingAngle((prev) => Math.min(30, prev + 15));
        }
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        if (conn.back) navigateToNode(conn.back.targetId, 'Turning around & stepping back...');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentNode, isLocationModalOpen, navigateToNode]);

  // Jump to specific floor landing
  const handleFloorJump = (floorNum) => {
    if (floorNum === activeFloor) return;
    if (floorNum === 0) {
      navigateToNode('tech_lobby_ground', 'Moving to Ground Floor Lobby...');
    } else if (floorNum === 1) {
      navigateToNode('tech_stairs_1f', 'Taking Stairs to 1st Floor Corridor...');
    } else if (floorNum === 2) {
      navigateToNode('tech_stairs_2f', 'Taking Stairs to 2nd Floor Seminar Wing...');
    }
  };

  // Find events occurring in the current hall/venue
  const hallEvents = useMemo(() => {
    if (!currentNode.venueId) return [];
    return events.filter(
      (ev) =>
        ev.venue_id === currentNode.venueId ||
        ev.venue?.toLowerCase().includes(currentNode.name.toLowerCase()) ||
        (currentNode.venueId === 'venue-hall-1' && (ev.venue || '').toLowerCase().includes('hall 1')) ||
        (currentNode.venueId === 'venue-hall-2' && (ev.venue || '').toLowerCase().includes('hall 2')) ||
        (currentNode.venueId === 'venue-hall-3' && (ev.venue || '').toLowerCase().includes('hall 3'))
    );
  }, [currentNode, events]);

  // Save selected location as user's persistent preferred starting point
  const handlePinAsMyStart = (node) => {
    try {
      localStorage.setItem('user_custom_start_location', JSON.stringify({
        id: node.id,
        name: node.name,
        coords: node.coords,
        floor: node.floor,
      }));
    } catch (e) {}

    if (onSetUserLocation) {
      onSetUserLocation({
        coords: node.coords,
        name: `${node.name} (${node.floorName})`,
        landmarkId: node.id,
        isCustom: true,
      });
    }
    setCurrentNodeId(node.id);
    setIsLocationModalOpen(false);
    speakInstruction(`Starting location set to ${node.name}`);
  };

  // Direction angle calculation
  const compassDirections = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const compassHeading = useMemo(() => {
    const totalAngle = (currentNode.heading + facingAngle + 360) % 360;
    const index = Math.round(totalAngle / 45) % 8;
    return { angle: totalAngle, label: compassDirections[index] };
  }, [currentNode.heading, facingAngle]);

  return (
    <div className={`relative w-full h-full flex flex-col bg-slate-950 text-white select-none overflow-hidden ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* ========================================================================= */}
      {/* TOP HUD: Navigation Status Bar & Location Picker */}
      {/* ========================================================================= */}
      <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-slate-950/90 via-slate-950/70 to-transparent p-3 sm:p-4 flex items-center justify-between pointer-events-auto">
        {/* Left: Location Banner & Customizer */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-xl">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div className="flex flex-col">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Current Location ({currentNode.floorName})
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white truncate max-w-[160px] sm:max-w-[280px]">
                {currentNode.name}
              </span>
            </div>
          </div>

          {/* "Change My Location" Wish Button */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/25 transition-all transform hover:scale-105"
            title="Set your location wish"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-200" />
            <span className="hidden sm:inline">Change Location</span>
            <span className="sm:hidden">Change</span>
          </button>
        </div>

        {/* Right: Controls & Top View Switcher */}
        <div className="flex items-center gap-2">
          {/* Audio narration toggle */}
          <button
            onClick={() => setIsVoiceEnabled((v) => !v)}
            className={`p-2 rounded-2xl backdrop-blur-md border transition ${
              isVoiceEnabled
                ? 'bg-slate-900/80 border-slate-700 text-emerald-400'
                : 'bg-slate-900/80 border-slate-700 text-slate-500'
            }`}
            title={isVoiceEnabled ? 'Voice Guidance On' : 'Voice Guidance Muted'}
          >
            {isVoiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen((f) => !f)}
            className="hidden sm:flex p-2 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-700 text-slate-300 hover:text-white transition"
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Switch to Top-Down Map View */}
          {onSwitchToTopView && (
            <button
              onClick={onSwitchToTopView}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 backdrop-blur-md border border-slate-700/80 text-white text-xs font-bold shadow-lg transition-all"
              title="Return to 2D / Satellite Top View"
            >
              <MapIcon className="w-3.5 h-3.5 text-indigo-400" />
              <span className="hidden sm:inline">Top View Map</span>
              <span className="sm:hidden">Map</span>
            </button>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FLOOR SWITCHER BAR (Ground Floor | 1st Floor | 2nd Floor) */}
      {/* ========================================================================= */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 flex items-center bg-slate-900/90 backdrop-blur-md p-1 rounded-2xl border border-slate-700/80 shadow-2xl pointer-events-auto">
        <span className="text-[10px] font-bold text-slate-400 uppercase px-2.5 flex items-center gap-1">
          <Layers className="w-3 h-3 text-indigo-400" />
          Floor:
        </span>
        {[
          { floor: 0, label: 'Ground Floor', tag: 'Hall 1 & Food' },
          { floor: 1, label: '1st Floor', tag: 'Hall 2 Lab' },
          { floor: 2, label: '2nd Floor', tag: 'Hall 3 Seminar' },
        ].map((item) => (
          <button
            key={item.floor}
            onClick={() => handleFloorJump(item.floor)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeFloor === item.floor
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
            }`}
          >
            <span>{item.label}</span>
            <span className="hidden md:inline text-[9px] px-1 py-0.2 rounded bg-black/30 text-indigo-200">
              {item.tag}
            </span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* 3D HALLWAY & STREET VIEW VIEWPORT */}
      {/* ========================================================================= */}
      <div className="relative flex-1 w-full h-full overflow-hidden flex items-center justify-center">
        {/* Dynamic Hallway Scene Canvas/Renderer */}
        <HallwayVisualScene
          node={currentNode}
          facingAngle={facingAngle}
          isInsideHall={currentNode.isHall}
        />

        {/* Transitioning overlay blur */}
        {transitioning && (
          <div className="absolute inset-0 z-30 bg-slate-950/70 backdrop-blur-md flex flex-col items-center justify-center animate-fade-in">
            <Footprints className="w-10 h-10 text-indigo-400 animate-bounce mb-2" />
            <p className="text-sm font-bold text-white tracking-wide">{transitionText}</p>
          </div>
        )}

        {/* ======================================================================= */}
        {/* INTERIOR HALL VISIT CARD (When inside a hall) */}
        {/* ======================================================================= */}
        {currentNode.isHall && (
          <div className="absolute bottom-24 sm:bottom-28 left-4 right-4 max-w-lg mx-auto z-20 bg-slate-900/95 backdrop-blur-xl border border-indigo-500/40 rounded-3xl p-4 sm:p-5 shadow-2xl text-left pointer-events-auto animate-fade-in">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  Inside Venue &bull; {currentNode.floorName}
                </span>
                <h3 className="text-base sm:text-lg font-black text-white mt-1">
                  {currentNode.name}
                </h3>
              </div>
              <button
                onClick={() => {
                  if (currentNode.connections?.back) {
                    navigateToNode(currentNode.connections.back.targetId, 'Stepping out to corridor...');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-600 flex items-center gap-1 transition"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Exit Hall</span>
              </button>
            </div>

            {/* Hall Specs */}
            {currentNode.interiorData && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 my-3 text-[11px]">
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 text-[10px] block">Capacity</span>
                  <span className="font-bold text-slate-200 flex items-center gap-1 mt-0.5">
                    <Users className="w-3 h-3 text-indigo-400" />
                    {currentNode.interiorData.capacity}
                  </span>
                </div>
                <div className="bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 text-[10px] block">Climate</span>
                  <span className="font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
                    <Radio className="w-3 h-3" />
                    {currentNode.interiorData.ac}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-1 bg-slate-800/80 p-2 rounded-xl border border-slate-700/60">
                  <span className="text-slate-400 text-[10px] block">Equipment</span>
                  <span className="font-bold text-slate-200 truncate flex items-center gap-1 mt-0.5" title={currentNode.interiorData.audioVisual}>
                    <Tv className="w-3 h-3 text-amber-400 shrink-0" />
                    Audio-Visual Active
                  </span>
                </div>
              </div>
            )}

            {/* Live Symposium Events in this Hall */}
            <div className="mt-3 pt-3 border-t border-slate-800">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1 mb-1.5">
                <Sparkles className="w-3 h-3 text-amber-400" />
                Scheduled Symposium Events in this Hall
              </span>
              {hallEvents.length > 0 ? (
                <div className="space-y-1.5 max-h-24 overflow-y-auto pr-1">
                  {hallEvents.map((ev) => (
                    <div
                      key={ev.id}
                      className="bg-indigo-950/40 border border-indigo-500/20 p-2 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="font-bold text-white truncate max-w-[240px]">
                        {ev.title || ev.name}
                      </div>
                      <span className="text-[10px] text-indigo-300 font-semibold shrink-0">
                        {ev.time || '10:00 AM'}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-slate-400 italic">
                  {currentNode.interiorData?.sessionName || 'General Symposium Session'} ({currentNode.interiorData?.scheduleTime || 'Ongoing'})
                </div>
              )}
            </div>
          </div>
        )}

        {/* ======================================================================= */}
        {/* HALL ENTRANCE ACTION (When standing outside a hall door) */}
        {/* ======================================================================= */}
        {currentNode.hasHallVisit && currentNode.hallTargetId && !currentNode.isHall && (
          <div className="absolute top-28 left-1/2 -translate-x-1/2 z-20 pointer-events-auto animate-bounce-subtle">
            <button
              onClick={() => navigateToNode(currentNode.hallTargetId, 'Stepping inside the hall...')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-indigo-600 text-white text-xs sm:text-sm font-black shadow-2xl shadow-amber-500/30 border border-amber-300/40 hover:scale-105 active:scale-95 transition-all"
            >
              <DoorOpen className="w-4 h-4" />
              <span>{currentNode.hallButtonLabel || '🚪 Step Inside & Visit Hall'}</span>
              <Sparkles className="w-3.5 h-3.5 text-yellow-200" />
            </button>
          </div>
        )}

        {/* ======================================================================= */}
        {/* STAIRCASE & FLOOR CHANGE BUTTONS */}
        {/* ======================================================================= */}
        {currentNode.connections?.upStairs && (
          <div className="absolute top-36 sm:top-32 right-4 sm:right-8 z-20 pointer-events-auto">
            <button
              onClick={() =>
                navigateToNode(
                  currentNode.connections.upStairs.targetId,
                  `Climbing stairs to Floor ${currentNode.connections.upStairs.targetFloor}...`
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold shadow-xl border border-emerald-400/40 hover:scale-105 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>{currentNode.connections.upStairs.label}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {currentNode.connections?.downStairs && (
          <div className="absolute top-36 sm:top-32 left-4 sm:left-8 z-20 pointer-events-auto">
            <button
              onClick={() =>
                navigateToNode(
                  currentNode.connections.downStairs.targetId,
                  `Walking down stairs to Floor ${currentNode.connections.downStairs.targetFloor}...`
                )
              }
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-teal-700 to-cyan-700 text-white text-xs font-extrabold shadow-xl border border-teal-400/40 hover:scale-105 transition-all"
            >
              <Layers className="w-4 h-4" />
              <span>{currentNode.connections.downStairs.label}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ======================================================================= */}
        {/* 3D DIRECTIONAL NAVIGATION ARROWS (Forward, Left, Right, Back) */}
        {/* ======================================================================= */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-1.5 pointer-events-auto">
          {/* Forward Arrow */}
          {currentNode.connections?.forward && (
            <button
              onClick={() => navigateToNode(currentNode.connections.forward.targetId, 'Walking forward...')}
              className="group flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600/90 hover:bg-indigo-500 active:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm shadow-2xl shadow-indigo-600/50 border border-indigo-400/40 hover:scale-110 transition-all"
              title="Walk Forward (Up Arrow or W)"
            >
              <ArrowUp className="w-5 h-5 text-indigo-200 group-hover:-translate-y-1 transition-transform" />
              <span>{currentNode.connections.forward.label || 'Walk Forward'}</span>
            </button>
          )}

          {/* Left, Back, Right Cross Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Turn Left */}
            {currentNode.connections?.left ? (
              <button
                onClick={() => navigateToNode(currentNode.connections.left.targetId, 'Turning left...')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-xl hover:scale-105 transition"
                title="Turn Left (Left Arrow or A)"
              >
                <ArrowLeft className="w-4 h-4 text-indigo-400" />
                <span className="hidden sm:inline">Turn Left</span>
              </button>
            ) : (
              <button
                onClick={() => setFacingAngle((prev) => Math.max(-30, prev - 15))}
                className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                title="Look Left"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}

            {/* Turn Around / Step Back */}
            {currentNode.connections?.back ? (
              <button
                onClick={() => navigateToNode(currentNode.connections.back.targetId, 'Stepping back...')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-xl hover:scale-105 transition"
                title="Turn Around (Down Arrow or S)"
              >
                <ArrowDown className="w-4 h-4 text-amber-400" />
                <span>Turn Around</span>
              </button>
            ) : (
              <div className="w-20" />
            )}

            {/* Turn Right */}
            {currentNode.connections?.right ? (
              <button
                onClick={() => navigateToNode(currentNode.connections.right.targetId, 'Turning right...')}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold border border-slate-700 shadow-xl hover:scale-105 transition"
                title="Turn Right (Right Arrow or D)"
              >
                <span className="hidden sm:inline">Turn Right</span>
                <ArrowRight className="w-4 h-4 text-indigo-400" />
              </button>
            ) : (
              <button
                onClick={() => setFacingAngle((prev) => Math.min(30, prev + 15))}
                className="p-2 rounded-xl bg-slate-900/70 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition"
                title="Look Right"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* ======================================================================= */}
        {/* BOTTOM-LEFT: Compass & Mini-Map Radar */}
        {/* ======================================================================= */}
        <div className="absolute bottom-6 left-4 z-20 hidden sm:flex flex-col gap-2 pointer-events-auto">
          {/* Compass Widget */}
          <div className="bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-700/80 shadow-xl flex items-center gap-2">
            <Compass
              className="w-4 h-4 text-emerald-400 transition-transform duration-300"
              style={{ transform: `rotate(${compassHeading.angle}deg)` }}
            />
            <span className="text-xs font-extrabold text-white">
              {compassHeading.label} ({Math.round(compassHeading.angle)}°)
            </span>
            <span className="text-[10px] text-slate-400 font-semibold ml-1">
              {stepCount} steps
            </span>
          </div>

          {/* Quick "Set as Starting Point" */}
          <button
            onClick={() => handlePinAsMyStart(currentNode)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-emerald-400 hover:text-emerald-300 text-[11px] font-bold shadow-lg transition"
            title="Fix this node as your starting point"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Set As My Starting Point</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* "CHANGE MY LOCATION WISH" QUICK MODAL */}
      {/* ========================================================================= */}
      {isLocationModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in pointer-events-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl text-left">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">
                    Set Your Starting Location
                  </h3>
                  <p className="text-xs text-slate-400">
                    Fix your starting point to anywhere on campus or switch floors
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* List of Quick Starting Points */}
            <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
              {QUICK_STARTING_LOCATIONS.map((loc) => {
                const isCurrent = loc.id === currentNodeId;
                return (
                  <button
                    key={loc.id}
                    onClick={() => {
                      const node = STREET_VIEW_NODES[loc.id];
                      if (node) handlePinAsMyStart(node);
                    }}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left transition-all ${
                      isCurrent
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/70 hover:bg-slate-800 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div>
                      <div className="text-xs sm:text-sm font-bold flex items-center gap-1.5">
                        <span>{loc.name}</span>
                        {isCurrent && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                            Current
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-slate-400">
                        {loc.building} &bull; {loc.floorName}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Tip: Your choice is automatically saved as your wish!
              </span>
              <button
                onClick={() => setIsLocationModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Hallway 3D Perspective Visual Scene (Corridor, Arch, Lab, Seminar, Food Court)
// ============================================================================
function HallwayVisualScene({ node, facingAngle = 0, isInsideHall = false }) {
  const { visualTheme } = node;

  return (
    <div
      className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden transition-transform duration-300"
      style={{ transform: `scale(1.02) rotate(${facingAngle * 0.15}deg)` }}
    >
      <svg
        viewBox="0 0 1000 650"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Ceiling Gradient */}
          <linearGradient id="ceilingGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Floor Gradient */}
          <linearGradient id="floorGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="40%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Sky Gradient for Outdoor */}
          <linearGradient id="outdoorSkyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e3a8a" />
            <stop offset="60%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#93c5fd" />
          </linearGradient>

          {/* Ground Grass / Pavement Gradient */}
          <linearGradient id="outdoorGroundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="50%" stopColor="#334155" />
            <stop offset="100%" stopColor="#1e293b" />
          </linearGradient>

          {/* Wall Gradients */}
          <linearGradient id="leftWallGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="rightWallGrad" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>

          {/* Glow Filters */}
          <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ------------------------------------------------------------- */}
        {/* 1. OUTDOOR ARCH / MAIN GATE SCENE */}
        {/* ------------------------------------------------------------- */}
        {visualTheme === 'outdoor_arch' && (
          <g>
            {/* Sky */}
            <rect x="0" y="0" width="1000" height="380" fill="url(#outdoorSkyGrad)" />
            {/* Distant Campus Trees & Foliage */}
            <path
              d="M0,380 Q120,330 250,380 T500,380 T750,380 T1000,380 L1000,420 L0,420 Z"
              fill="#064e3b"
              opacity="0.8"
            />
            {/* Ground Paved Boulevard */}
            <polygon points="0,650 350,380 650,380 1000,650" fill="url(#outdoorGroundGrad)" />
            {/* Side Lawns */}
            <polygon points="0,650 350,380 0,380" fill="#047857" opacity="0.9" />
            <polygon points="1000,650 650,380 1000,380" fill="#047857" opacity="0.9" />
            {/* Central Boulevard Path Lines */}
            <line x1="500" y1="380" x2="500" y2="650" stroke="#f8fafc" strokeWidth="4" strokeDasharray="18,14" opacity="0.6" />

            {/* Grand Campus Entrance Arch Structure */}
            <rect x="180" y="80" width="640" height="40" rx="8" fill="#1e1b4b" stroke="#6366f1" strokeWidth="3" />
            <rect x="220" y="120" width="80" height="260" fill="#312e81" stroke="#4f46e5" strokeWidth="2" />
            <rect x="700" y="120" width="80" height="260" fill="#312e81" stroke="#4f46e5" strokeWidth="2" />

            {/* Arch Top Banner */}
            <text x="500" y="106" textAnchor="middle" fill="#ffffff" fontSize="18" fontWeight="900" letterSpacing="2">
              COLLEGE OF ENGINEERING &bull; MAIN ENTRANCE
            </text>
            <rect x="300" y="140" width="400" height="44" rx="10" fill="#4f46e5" filter="url(#neonGlow)" />
            <text x="500" y="168" textAnchor="middle" fill="#ffffff" fontSize="15" fontWeight="800">
              SMARTSYMPO 2026 WELCOME DELEGATES
            </text>
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 2. ADMIN QUAD & REGISTRATION PLAZA SCENE */}
        {/* ------------------------------------------------------------- */}
        {visualTheme === 'admin_plaza' && (
          <g>
            <rect x="0" y="0" width="1000" height="350" fill="url(#outdoorSkyGrad)" />
            {/* Admin Building Facade */}
            <rect x="150" y="100" width="700" height="250" fill="#1e293b" stroke="#334155" strokeWidth="3" />
            {/* Pillars */}
            {[200, 320, 440, 560, 680, 800].map((x) => (
              <rect key={x} x={x} y="150" width="40" height="200" fill="#475569" stroke="#64748b" strokeWidth="1.5" />
            ))}
            {/* Paved Plaza Ground */}
            <polygon points="0,650 200,350 800,350 1000,650" fill="url(#outdoorGroundGrad)" />
            {/* Registration Booth Canopy */}
            <polygon points="320,240 680,240 720,280 280,280" fill="#4338ca" />
            <rect x="290" y="280" width="420" height="70" fill="#312e81" stroke="#6366f1" strokeWidth="2" />
            <text x="500" y="265" textAnchor="middle" fill="#ffffff" fontSize="14" fontWeight="900">
              REGISTRATION DESKS &bull; BADGE VERIFICATION
            </text>
            {/* Paved Tile Grid Lines */}
            <line x1="400" y1="350" x2="250" y2="650" stroke="#64748b" strokeWidth="2" opacity="0.4" />
            <line x1="600" y1="350" x2="750" y2="650" stroke="#64748b" strokeWidth="2" opacity="0.4" />
            <line x1="500" y1="350" x2="500" y2="650" stroke="#818cf8" strokeWidth="4" strokeDasharray="16,12" opacity="0.7" />
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 3. TECH BLOCK CORRIDORS (Ground Floor & 1st Floor) */}
        {/* ------------------------------------------------------------- */}
        {(visualTheme === 'tech_lobby' || visualTheme === 'tech_corridor_1f' || visualTheme === 'seminar_foyer') && (
          <g>
            {/* Ceiling with Recessed LED Grid */}
            <polygon points="0,0 1000,0 650,220 350,220" fill="url(#ceilingGrad)" />
            {[420, 500, 580].map((x) => (
              <line key={x} x1={x} y1="220" x2={x < 500 ? '200' : x > 500 ? '800' : '500'} y2="0" stroke="#38bdf8" strokeWidth="3" opacity="0.8" filter="url(#neonGlow)" />
            ))}

            {/* Left Corridor Wall */}
            <polygon points="0,0 350,220 350,470 0,650" fill="url(#leftWallGrad)" />
            {/* Right Corridor Wall */}
            <polygon points="1000,0 650,220 650,470 1000,650" fill="url(#rightWallGrad)" />

            {/* Hallway Floor with Reflective Tiles */}
            <polygon points="0,650 350,470 650,470 1000,650" fill="url(#floorGrad)" />
            {/* Floor perspective tile seams */}
            <line x1="420" y1="470" x2="200" y2="650" stroke="#64748b" strokeWidth="1.5" opacity="0.5" />
            <line x1="500" y1="470" x2="500" y2="650" stroke="#818cf8" strokeWidth="3" strokeDasharray="14,10" opacity="0.8" />
            <line x1="580" y1="470" x2="800" y2="650" stroke="#64748b" strokeWidth="1.5" opacity="0.5" />

            {/* End of Corridor (Archway / Glass Doors) */}
            <rect x="350" y="220" width="300" height="250" fill="#0284c7" opacity="0.25" stroke="#38bdf8" strokeWidth="3" />
            <rect x="420" y="270" width="160" height="200" fill="#0369a1" opacity="0.4" stroke="#7dd3fc" strokeWidth="2" />

            {/* Overhead Corridor Banner */}
            <rect x="250" y="180" width="500" height="42" rx="8" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2" filter="url(#neonGlow)" />
            <text x="500" y="206" textAnchor="middle" fill="#ffffff" fontSize="13" fontWeight="900" letterSpacing="1">
              {node.bannerText || 'TECH BLOCK CORRIDOR'}
            </text>

            {/* Left Wall Notice Board / Poster */}
            <polygon points="50,180 200,240 200,420 50,490" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <text x="120" y="320" fill="#38bdf8" fontSize="11" fontWeight="bold">AI LAB POSTERS</text>

            {/* Right Wall Door Frame (e.g. Hall 2 or Lab) */}
            <polygon points="950,150 800,230 800,450 950,520" fill="#0f172a" stroke="#a855f7" strokeWidth="2.5" />
            <polygon points="930,180 820,240 820,440 930,500" fill="#2e1065" opacity="0.8" />
            <text x="860" y="320" fill="#f3e8ff" fontSize="11" fontWeight="extrabold">ROOM 104</text>
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 4. AUDITORIUM INTERIOR (HALL 1) */}
        {/* ------------------------------------------------------------- */}
        {visualTheme === 'auditorium_interior' && (
          <g>
            {/* Auditorium Ceiling with Stage Spotlights */}
            <rect x="0" y="0" width="1000" height="260" fill="#090d16" />
            {[200, 350, 500, 650, 800].map((x) => (
              <circle key={x} cx={x} cy="60" r="16" fill="#fef08a" opacity="0.9" filter="url(#neonGlow)" />
            ))}

            {/* Grand Stage Backdrop */}
            <rect x="180" y="100" width="640" height="240" rx="12" fill="#1e1b4b" stroke="#6366f1" strokeWidth="3" />
            {/* LED Screen on Stage */}
            <rect x="240" y="120" width="520" height="180" rx="8" fill="#312e81" stroke="#818cf8" strokeWidth="2" filter="url(#neonGlow)" />
            <text x="500" y="195" textAnchor="middle" fill="#ffffff" fontSize="22" fontWeight="900" letterSpacing="2">
              SMARTSYMPO 2026 INAUGURAL KEYNOTE
            </text>
            <text x="500" y="235" textAnchor="middle" fill="#a5b4fc" fontSize="14" fontWeight="bold">
              PRESIDENTIAL ADDRESS &bull; HALL 1 MAIN AUDITORIUM
            </text>

            {/* Wooden Stage Floor */}
            <polygon points="0,480 180,340 820,340 1000,480" fill="#78350f" stroke="#b45309" strokeWidth="2" />
            {/* Speaker Podium */}
            <rect x="460" y="300" width="80" height="80" fill="#451a03" stroke="#d97706" strokeWidth="2" />

            {/* Tiered Audience Velvet Seating Rows */}
            <polygon points="0,650 0,480 1000,480 1000,650" fill="#4c0519" />
            {[500, 540, 580, 620].map((y) => (
              <line key={y} x1="0" y1={y} x2="1000" y2={y} stroke="#881337" strokeWidth="4" />
            ))}
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 5. COMPUTING LAB INTERIOR (HALL 2) */}
        {/* ------------------------------------------------------------- */}
        {visualTheme === 'computing_lab_interior' && (
          <g>
            <rect x="0" y="0" width="1000" height="240" fill="#090d16" />
            {/* Wall Smart Boards */}
            <rect x="250" y="60" width="500" height="160" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="3" filter="url(#neonGlow)" />
            <text x="500" y="130" textAnchor="middle" fill="#38bdf8" fontSize="18" fontWeight="900">
              HALL 2 &bull; HIGH-PERFORMANCE COMPUTING LAB
            </text>
            <text x="500" y="165" textAnchor="middle" fill="#94a3b8" fontSize="13" fontWeight="bold">
              120 GPU NODES &bull; LINUX KERNEL SANDBOX &bull; HACKATHON ARENA
            </text>

            {/* Anti-Static Tiled Floor */}
            <polygon points="0,650 200,240 800,240 1000,650" fill="url(#floorGrad)" />

            {/* Computer Workstation Desks Left Row */}
            <polygon points="50,650 220,320 380,320 220,650" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            {/* Computer Monitors */}
            <rect x="100" y="480" width="80" height="50" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            <rect x="180" y="400" width="60" height="40" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />

            {/* Computer Workstation Desks Right Row */}
            <polygon points="950,650 780,320 620,320 780,650" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <rect x="820" y="480" width="80" height="50" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />
            <rect x="760" y="400" width="60" height="40" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="2" />

            {/* Central Aisle Path */}
            <line x1="500" y1="240" x2="500" y2="650" stroke="#38bdf8" strokeWidth="4" strokeDasharray="14,10" opacity="0.7" />
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 6. SEMINAR ROOM INTERIOR (HALL 3) */}
        {/* ------------------------------------------------------------- */}
        {visualTheme === 'seminar_interior' && (
          <g>
            <rect x="0" y="0" width="1000" height="260" fill="#0f172a" />
            {/* Acoustic Wood Paneling */}
            <rect x="100" y="50" width="800" height="200" fill="#292524" stroke="#78716c" strokeWidth="2" />
            {/* Presentation Screen */}
            <rect x="280" y="70" width="440" height="150" rx="6" fill="#f8fafc" stroke="#e2e8f0" strokeWidth="3" filter="url(#neonGlow)" />
            <text x="500" y="145" textAnchor="middle" fill="#0f172a" fontSize="18" fontWeight="900">
              HALL 3 &bull; SEMINAR PRESENTATION ROOM
            </text>
            <text x="500" y="175" textAnchor="middle" fill="#475569" fontSize="13" fontWeight="bold">
              NATIONAL STUDENT TECHNICAL PAPER DEFENSE
            </text>

            {/* Carpet Floor */}
            <polygon points="0,650 200,260 800,260 1000,650" fill="#1e293b" />
            {/* Conference Executive Table */}
            <ellipse cx="500" cy="460" rx="280" ry="80" fill="#451a03" stroke="#b45309" strokeWidth="4" />
          </g>
        )}

        {/* ------------------------------------------------------------- */}
        {/* 7. CANTEEN / FOOD COURT INTERIOR & ENTRANCE */}
        {/* ------------------------------------------------------------- */}
        {(visualTheme === 'canteen_interior' || visualTheme === 'canteen_entrance') && (
          <g>
            <rect x="0" y="0" width="1000" height="280" fill="#0f172a" />
            {/* Food Counters */}
            <rect x="150" y="120" width="700" height="140" fill="#b45309" stroke="#f59e0b" strokeWidth="3" />
            <text x="500" y="180" textAnchor="middle" fill="#ffffff" fontSize="20" fontWeight="900">
              CAMPUS FOOD COURT &bull; BUFFET COUNTERS
            </text>
            <text x="500" y="215" textAnchor="middle" fill="#fef3c7" fontSize="14" fontWeight="bold">
              HOT LUNCH BUFFET &bull; REFRESHMENT BEVERAGES &bull; TOKENS
            </text>

            {/* Checkered Dining Tile Floor */}
            <polygon points="0,650 150,260 850,260 1000,650" fill="url(#floorGrad)" />
            {/* Dining Tables Left & Right */}
            <circle cx="200" cy="450" r="50" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
            <circle cx="800" cy="450" r="50" fill="#334155" stroke="#f59e0b" strokeWidth="2" />
          </g>
        )}
      </svg>
    </div>
  );
}
