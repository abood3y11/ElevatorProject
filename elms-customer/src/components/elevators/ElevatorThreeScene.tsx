import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, Vibration, View } from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import * as FileSystem from "expo-file-system";
import { Asset } from "expo-asset";
import { ElevatorFloor } from "../../types/models";
import { useAppTheme } from "../../theme/useAppTheme";

// ────────────────────────────────────────────────────────────
//  ضع ملف elevator.glb داخل: assets/models/elevator.glb
// ────────────────────────────────────────────────────────────
const GLB_ASSET = require("../../../assets/models/elevator.glb");

interface NormalizedFloor extends ElevatorFloor {
  index: number;
  y: number;
}

interface ElevatorThreeSceneProps {
  floors: ElevatorFloor[];
  elevatorName?: string;
  initialFloorId?: string;
  showTopHud?: boolean;
}

const MIN_FLOORS = 2;
const MAX_FLOORS = 12;
const DEFAULT_FLOOR_STEP = 3;
const SCENE_BACKGROUND = "#eef4f1";

export function ElevatorThreeScene({
  floors,
  elevatorName,
  initialFloorId,
  showTopHud = true,
}: ElevatorThreeSceneProps) {
  const appTheme = useAppTheme();
  const styles = useMemo(() => createStyles(appTheme), [appTheme]);
  const webViewRef = useRef<WebView>(null);

  // ── تحميل الـ GLB كـ base64 ────────────────────────────────
  const [glbBase64, setGlbBase64] = useState<string | null>(null);
  const [glbReady, setGlbReady] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const asset = await Asset.fromModule(GLB_ASSET).downloadAsync();
        const uri = asset.localUri ?? asset.uri;
        const base64 = await FileSystem.readAsStringAsync(uri, {
          encoding: "base64",
        });
        setGlbBase64(base64);
        setGlbReady(true);
      } catch (err) {
        console.warn("GLB load error:", err);
        // إذا فشل التحميل، يعرض النموذج الإجرائي fallback
        setGlbReady(true);
      }
    })();
  }, []);

  // ── Normalize floors ───────────────────────────────────────
  const normalizedFloors = useMemo<NormalizedFloor[]>(() => {
    const fallbackFloors = Array.from({ length: MIN_FLOORS }, (_, index) => ({
      id: `fallback-${index + 1}`,
      label: String(index + 1),
      order: index + 1,
      y: index * DEFAULT_FLOOR_STEP,
    }));

    const sourceFloors =
      floors.length >= MIN_FLOORS
        ? [...floors].sort((a, b) => a.order - b.order).slice(0, MAX_FLOORS)
        : fallbackFloors;

    let lastY = -DEFAULT_FLOOR_STEP;
    return sourceFloors.map((floor, index) => {
      const resolvedY =
        typeof floor.y === "number" ? floor.y : lastY + DEFAULT_FLOOR_STEP;
      lastY = resolvedY;
      return { ...floor, index: index + 1, y: resolvedY };
    });
  }, [floors]);

  const totalFloors = normalizedFloors.length;
  const firstFloor = normalizedFloors[0];
  const initialFloor =
    normalizedFloors.find((f) => f.id === initialFloorId) ?? firstFloor;

  const [currentFloorId, setCurrentFloorId] = useState(initialFloor.id);
  const [targetFloorId, setTargetFloorId] = useState(initialFloor.id);
  const [alarmMode, setAlarmMode] = useState(false);

  const currentFloor =
    normalizedFloors.find((f) => f.id === currentFloorId) ?? firstFloor;
  const targetFloor =
    normalizedFloors.find((f) => f.id === targetFloorId) ?? firstFloor;
  const reversedFloors = [...normalizedFloors].reverse();

  const sceneHtml = useMemo(() => {
    if (!glbReady) return null;
    return buildSceneHtml(normalizedFloors, initialFloor.id, glbBase64);
  }, [normalizedFloors, initialFloor.id, glbBase64, glbReady]);

  const initializedFloorRef = useRef(false);
  const lastFloorRef = useRef(initialFloor.id);

  useEffect(() => {
    const resetFloor =
      normalizedFloors.find((f) => f.id === initialFloorId) ??
      normalizedFloors[0];
    setCurrentFloorId(resetFloor.id);
    setTargetFloorId(resetFloor.id);
    setAlarmMode(false);
    initializedFloorRef.current = false;
    lastFloorRef.current = resetFloor.id;
  }, [normalizedFloors, initialFloorId]);

  const setFloor = (floorId: string) => {
    const floor = normalizedFloors.find((f) => f.id === floorId);
    if (!floor) return;
    setTargetFloorId(floor.id);
    webViewRef.current?.postMessage(
      JSON.stringify({
        type: "set-target-floor",
        floorId: floor.id,
        floorIndex: floor.index,
      })
    );
  };

  const moveUp = () => {
    const next = normalizedFloors[targetFloor.index];
    if (next) setFloor(next.id);
  };

  const moveDown = () => {
    const previous = normalizedFloors[targetFloor.index - 2];
    if (previous) setFloor(previous.id);
  };

  const toggleAlarm = () => {
    const next = !alarmMode;
    setAlarmMode(next);
    webViewRef.current?.postMessage(
      JSON.stringify({ type: "set-alarm-mode", enabled: next })
    );
  };

  const onMessage = (event: WebViewMessageEvent) => {
    try {
      const payload = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        floor?: number;
        floorId?: string;
      };

      if (payload.type === "floor-change") {
        let nextFloor = normalizedFloors[0];
        if (typeof payload.floorId === "string") {
          nextFloor =
            normalizedFloors.find((f) => f.id === payload.floorId) ??
            normalizedFloors[0];
        } else if (typeof payload.floor === "number") {
          nextFloor =
            normalizedFloors.find((f) => f.index === payload.floor) ??
            normalizedFloors[0];
        }

        setCurrentFloorId(nextFloor.id);
        setTargetFloorId(nextFloor.id);

        if (!initializedFloorRef.current) {
          initializedFloorRef.current = true;
          lastFloorRef.current = nextFloor.id;
          return;
        }
        if (nextFloor.id !== lastFloorRef.current) {
          lastFloorRef.current = nextFloor.id;
          Vibration.vibrate([0, 70, 35, 90]);
        }
      }
    } catch {
      // Ignore malformed payloads
    }
  };

  if (!glbReady || !sceneHtml) {
    return (
      <View style={[styles.wrap, styles.loadingWrap]}>
        <Text style={styles.loadingText}>جاري تحميل النموذج ثلاثي الأبعاد…</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html: sceneHtml }}
        style={[StyleSheet.absoluteFillObject, styles.webview]}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        allowFileAccess
        allowUniversalAccessFromFileURLs
        mixedContentMode="always"
        onMessage={onMessage}
      />

      {/* HUD */}
      {showTopHud ? <View style={styles.topHud}>
        <View style={styles.titleWrap}>
          <Text style={styles.title}>{elevatorName ?? "مصعد"}</Text>
          <Text style={styles.touchHint}>اسحب لتحريك الكاميرا • اضغط للتكبير</Text>
        </View>
        <Text style={styles.tag}>ELMS 3D</Text>
      </View> : null}

      {/* Bottom Panel */}
      <View style={styles.bottomPanel}>
        <View style={styles.controlsAndMapRow}>
          <View style={styles.controlsColumn}>
            <View style={styles.stateRow}>
              <Text style={styles.stateText}>الدور الحالي: {currentFloor.label}</Text>
              <Text style={styles.stateText}>الهدف: {targetFloor.label}</Text>
            </View>

            <View style={styles.directionRow}>
              <Pressable
                onPress={moveUp}
                disabled={targetFloor.index >= totalFloors}
                style={[
                  styles.directionButton,
                  targetFloor.index >= totalFloors && styles.disabledButton,
                ]}
              >
                <Text style={styles.directionButtonText}>أعلى ▲</Text>
              </Pressable>
              <Pressable
                onPress={moveDown}
                disabled={targetFloor.index <= 1}
                style={[
                  styles.directionButton,
                  targetFloor.index <= 1 && styles.disabledButton,
                ]}
              >
                <Text style={styles.directionButtonText}>أسفل ▼</Text>
              </Pressable>
            </View>

            <View style={styles.alarmRow}>
              <Pressable
                onPress={toggleAlarm}
                style={[styles.alarmButton, alarmMode && styles.alarmButtonActive]}
              >
                <Text style={[styles.alarmText, alarmMode && styles.alarmTextActive]}>
                  {alarmMode ? "إيقاف الإنذار 🔴" : "تشغيل الإنذار 🔔"}
                </Text>
              </Pressable>
            </View>

            <Text style={styles.floorsLabel}>الأدوار</Text>
            <View style={styles.floorsWrap}>
              {reversedFloors.map((floor) => {
                const active = targetFloorId === floor.id;
                return (
                  <Pressable
                    key={floor.id}
                    onPress={() => setFloor(floor.id)}
                    style={[styles.floorButton, active && styles.floorButtonActive]}
                  >
                    <Text
                      style={[
                        styles.floorButtonText,
                        active && styles.floorButtonTextActive,
                      ]}
                    >
                      {floor.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Mini Map */}
          <View style={styles.miniMapWrap}>
            <Text style={styles.mapTitle}>Mini Map</Text>
            <View style={styles.mapRail}>
              {reversedFloors.map((floor) => {
                const isCurrent = floor.id === currentFloorId;
                const isTarget = floor.id === targetFloorId;
                return (
                  <View key={`map-${floor.id}`} style={styles.mapFloorRow}>
                    <View
                      style={[
                        styles.mapDot,
                        isCurrent && styles.mapDotCurrent,
                        isTarget && styles.mapDotTarget,
                      ]}
                    />
                    <Text style={styles.mapFloorText}>{floor.label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
//  buildSceneHtml — Three.js + GLTFLoader
// ──────────────────────────────────────────────────────────────
function buildSceneHtml(
  floors: NormalizedFloor[],
  initialFloorId: string,
  glbBase64: string | null
) {
  const sceneFloors = floors.map((floor, index) => ({
    id: floor.id,
    label: floor.label,
    index: floor.index,
    y: typeof floor.y === "number" ? floor.y : index * DEFAULT_FLOOR_STEP,
  }));

  // إذا كان الـ GLB موجود، نضمّنه كـ data URI
  const glbDataUri = glbBase64
    ? `data:model/gltf-binary;base64,${glbBase64}`
    : null;

  return `
<!doctype html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <style>
    html,body{margin:0;width:100%;height:100%;overflow:hidden;background:${SCENE_BACKGROUND};touch-action:none;}
    #stage{width:100%;height:100%;}
    #loading{
      position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
      color:#4F8EF7;font-family:sans-serif;font-size:14px;text-align:center;
    }
  </style>
</head>
<body>
<div id="stage"></div>
<div id="loading">⟳ جاري تحميل النموذج…</div>

<script src="https://unpkg.com/three@0.160.0/build/three.min.js"></script>
<script src="https://unpkg.com/three@0.160.0/examples/js/loaders/GLTFLoader.js"></script>

<script>
// ── البيانات القادمة من React Native ──────────────────────
const FLOORS        = ${JSON.stringify(sceneFloors)};
const FLOOR_COUNT   = FLOORS.length;
const BASE_Y        = 0.8;
const CABIN_HEIGHT  = 2.25;
const GLB_DATA_URI  = ${glbBase64 ? `"${glbDataUri}"` : "null"};
const INITIAL_FLOOR = getFloorById('${escapeForScript(initialFloorId)}');

// ── الحالة ─────────────────────────────────────────────────
let currentFloor      = INITIAL_FLOOR.index;
let targetFloor       = INITIAL_FLOOR.index;
let lastBroadcastFloor= INITIAL_FLOOR.index;
let alarmMode         = false;
let audioContext      = null;

// ── الكاميرا ───────────────────────────────────────────────
let yaw = 0.0, pitch = 0.20, distance = 10;
let dragging = false, lastX = 0, lastY = 0, pinchDistance = null;

// ── Helpers ────────────────────────────────────────────────
function getFloorByIndex(i){ return FLOORS.find(f=>f.index===i)||FLOORS[0]; }
function getFloorById(id)  { return FLOORS.find(f=>f.id===id)  ||FLOORS[0]; }
function floorBaseY(i)     { return BASE_Y + getFloorByIndex(i).y; }
function floorCenterY(i)   { return floorBaseY(i) + CABIN_HEIGHT/2; }
function clamp(v,mn,mx)    { return Math.max(mn,Math.min(mx,v)); }
function postApp(payload)  {
  if(window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(payload));
}

// ── Renderer & Scene ───────────────────────────────────────
const stage    = document.getElementById('stage');
const scene    = new THREE.Scene();
scene.background = new THREE.Color(${SCENE_BACKGROUND.replace('#','0x')});
scene.fog      = new THREE.Fog(0x0d1117, 15, 120);

const renderer = new THREE.WebGLRenderer({antialias:true});
renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
renderer.setSize(stage.clientWidth, stage.clientHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputEncoding    = THREE.sRGBEncoding;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
stage.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(54, stage.clientWidth/stage.clientHeight, 0.1, 500);

// ── الإضاءة ────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.55));

const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
sunLight.position.set(5, 20, 8);
sunLight.castShadow = true;
scene.add(sunLight);

const fillLight = new THREE.DirectionalLight(0x4F8EF7, 0.5);
fillLight.position.set(-6, 8, -4);
scene.add(fillLight);

// ── عناصر إضافية في المشهد (شافت + أرضية) ─────────────────
const highestY  = floorBaseY(FLOOR_COUNT);
const shaftH    = highestY + CABIN_HEIGHT + 4;

// الشافت wireframe
const shaftMesh = new THREE.Mesh(
  new THREE.BoxGeometry(3.9, shaftH, 3.9),
  new THREE.MeshPhysicalMaterial({
    color:0x111B2E, wireframe:true,
    emissive:0x1A2845, emissiveIntensity:0.4,
    transparent:true, opacity:0.85
  })
);
shaftMesh.position.y = shaftH/2;
scene.add(shaftMesh);

// أرضيات الطوابق
const floorMat = new THREE.MeshStandardMaterial({color:0x243656, roughness:0.7, metalness:0.3});
const lineMat  = new THREE.MeshBasicMaterial({color:0x4F8EF7});
for(const fl of FLOORS){
  const y = floorBaseY(fl.index);
  const slab = new THREE.Mesh(new THREE.BoxGeometry(3.2,0.08,3.2), floorMat);
  slab.position.y = y; scene.add(slab);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(3.0,0.02,0.05), lineMat);
  strip.position.set(0, y+0.06, 1.4); scene.add(strip);
}

// ── متغيرات الكابينة ────────────────────────────────────────
let cabinGroup   = null;   // سيُملأ من GLB أو fallback
let doorL        = null;
let doorR        = null;
let cabinLight   = null;
let cabinStrip   = null;
let alarmLight   = null;
let alarmBeacon  = null;
let doorOpenAmt  = 0;
let cabinLoaded  = false;

// ── تحميل GLB ──────────────────────────────────────────────
function setupCabinLights(group){
  cabinLight = new THREE.PointLight(0xffe8c0, 1.2, 8);
  cabinLight.position.set(0, 0.8, 0);
  group.add(cabinLight);

  cabinStrip = new THREE.PointLight(0xffd580, 0.6, 5);
  cabinStrip.position.set(0, 0.2, -0.5);
  group.add(cabinStrip);

  alarmLight = new THREE.PointLight(0xEF4444, 0, 14);
  alarmLight.position.set(0, 1.0, 0.5);
  group.add(alarmLight);
}

function findDoorsInGLB(group){
  // يبحث عن أوبجكت اسمه door_L و door_R بالضبط كما في الـ Blender script
  group.traverse(obj=>{
    if(obj.isMesh){
      if(obj.name==='cab_door_L' || obj.name==='door_L') doorL = obj;
      if(obj.name==='cab_door_R' || obj.name==='door_R') doorR = obj;
    }
  });
}

if(GLB_DATA_URI){
  const loader = new THREE.GLTFLoader();
  loader.load(
    GLB_DATA_URI,
    (gltf)=>{
      cabinGroup = gltf.scene;

      // تمكين الظلال على كل mesh
      cabinGroup.traverse(obj=>{
        if(obj.isMesh){
          obj.castShadow    = true;
          obj.receiveShadow = true;
          // تفعيل encoding للمواد
          if(obj.material && obj.material.map){
            obj.material.map.encoding = THREE.sRGBEncoding;
          }
        }
      });

      findDoorsInGLB(cabinGroup);
      setupCabinLights(cabinGroup);

      cabinGroup.position.y = floorCenterY(INITIAL_FLOOR.index);
      scene.add(cabinGroup);

      // تشغيل الأنيميشن المدمج من Blender (فتح/إغلاق الأبواب)
      if(gltf.animations && gltf.animations.length > 0){
        window._mixer = new THREE.AnimationMixer(cabinGroup);
        gltf.animations.forEach(clip=>{
          const action = window._mixer.clipAction(clip);
          action.play();
        });
      }

      cabinLoaded = true;
      document.getElementById('loading').style.display='none';
    },
    (progress)=>{
      const pct = progress.total>0 ? Math.round(progress.loaded/progress.total*100) : '…';
      const el = document.getElementById('loading');
      if(el) el.textContent = 'تحميل النموذج ' + pct + '%';
    },
    (err)=>{
      console.warn('GLB load failed, using fallback:', err);
      buildFallbackCabin();
    }
  );
} else {
  buildFallbackCabin();
}

// ── Fallback إذا لم يوجد GLB ───────────────────────────────
function buildFallbackCabin(){
  cabinGroup = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, CABIN_HEIGHT, 2.25),
    new THREE.MeshStandardMaterial({color:0x00D4AA, roughness:0.34, metalness:0.58})
  );
  cabinGroup.add(body);

  const dMat = new THREE.MeshStandardMaterial({color:0x4F8EF7, metalness:0.68, roughness:0.35});
  doorL = new THREE.Mesh(new THREE.BoxGeometry(1.0,2.0,0.05), dMat);
  doorR = doorL.clone();
  doorL.position.set(-0.5,-0.05,1.13);
  doorR.position.set( 0.5,-0.05,1.13);
  cabinGroup.add(doorL, doorR);

  setupCabinLights(cabinGroup);
  cabinGroup.position.y = floorCenterY(INITIAL_FLOOR.index);
  scene.add(cabinGroup);

  cabinLoaded = true;
  document.getElementById('loading').style.display='none';
}

// ── Counterweight & Ropes ──────────────────────────────────
const cwMesh = new THREE.Mesh(
  new THREE.BoxGeometry(0.82,2.2,0.82),
  new THREE.MeshStandardMaterial({color:0x6B7D9C, roughness:0.66, metalness:0.72})
);
cwMesh.position.set(-1.26, floorCenterY(FLOOR_COUNT+1-INITIAL_FLOOR.index), 0);
scene.add(cwMesh);

const ropeMat = new THREE.LineBasicMaterial({color:0xA8B8D1});
const ropeCabin   = new THREE.Line(new THREE.BufferGeometry(), ropeMat);
const ropeCounter = new THREE.Line(new THREE.BufferGeometry(), ropeMat);
scene.add(ropeCabin, ropeCounter);

// ── صوت ───────────────────────────────────────────────────
function ensureAudio(){
  if(!audioContext){
    const Ctx=window.AudioContext||window.webkitAudioContext;
    if(Ctx) audioContext=new Ctx();
  }
  if(audioContext && audioContext.state==='suspended') audioContext.resume();
}
function playBeep(freq,dur){
  ensureAudio(); if(!audioContext) return;
  const osc=audioContext.createOscillator();
  const gain=audioContext.createGain();
  osc.type='sine'; osc.frequency.value=freq;
  gain.gain.setValueAtTime(0.001,audioContext.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.06,audioContext.currentTime+0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001,audioContext.currentTime+dur);
  osc.connect(gain); gain.connect(audioContext.destination);
  osc.start(); osc.stop(audioContext.currentTime+dur+0.01);
}
function playArrival(){ playBeep(820,0.14); }
function playAlarmPulse(){ playBeep(540,0.09); }

// ── Messages from React Native ────────────────────────────
function handleMessage(e){
  try{
    const msg=JSON.parse(e.data||'{}');
    if(msg.type==='set-target-floor'){
      ensureAudio();
      if(typeof msg.floorId==='string') targetFloor=getFloorById(msg.floorId).index;
      else if(typeof msg.floorIndex==='number') targetFloor=clamp(Math.round(msg.floorIndex),1,FLOOR_COUNT);
    }
    if(msg.type==='set-alarm-mode'){ alarmMode=!!msg.enabled; ensureAudio(); }
  }catch(_){}
}
document.addEventListener('message',handleMessage);
window.addEventListener('message',handleMessage);

// ── Pointer / Touch ────────────────────────────────────────
const cnv=renderer.domElement;
cnv.addEventListener('pointerdown',e=>{ dragging=true; lastX=e.clientX; lastY=e.clientY; ensureAudio(); });
cnv.addEventListener('pointermove',e=>{
  if(!dragging||pinchDistance!==null) return;
  yaw  -=(e.clientX-lastX)*0.0058;
  pitch=clamp(pitch-(e.clientY-lastY)*0.0038,-0.35,1.1);
  lastX=e.clientX; lastY=e.clientY;
});
const stop=()=>{dragging=false;};
['pointerup','pointercancel','pointerleave'].forEach(ev=>cnv.addEventListener(ev,stop));
cnv.addEventListener('wheel',e=>{e.preventDefault();distance=clamp(distance+e.deltaY*0.008,3,20);},{passive:false});
cnv.addEventListener('touchstart',e=>{
  if(e.touches.length===2) pinchDistance=touchDist(e.touches[0],e.touches[1]);
},{passive:false});
cnv.addEventListener('touchmove',e=>{
  if(e.touches.length===2&&pinchDistance!==null){
    const d=touchDist(e.touches[0],e.touches[1]);
    distance=clamp(distance+(pinchDistance-d)*0.012,3,20);
    pinchDistance=d;
  }
},{passive:false});
cnv.addEventListener('touchend',e=>{ if(e.touches.length<2) pinchDistance=null; });
function touchDist(a,b){ return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY); }

// ── Animation Loop ─────────────────────────────────────────
let followY     = floorCenterY(INITIAL_FLOOR.index);
let worldAngle  = 0;
let alarmTick   = 0;
let lastT       = performance.now();
const lookTarget= new THREE.Vector3();
const rA        = new THREE.Vector3();
const rB        = new THREE.Vector3();

function animate(){
  requestAnimationFrame(animate);
  const now=performance.now();
  const delta=(now-lastT)/1000; lastT=now;

  if(window._mixer) window._mixer.update(delta);

  if(cabinLoaded){
    // حركة الكابينة
    const targetY=floorCenterY(targetFloor);
    cabinGroup.position.y+=(targetY-cabinGroup.position.y)*0.08;

    // الموازن
    const cwTarget=floorCenterY(FLOOR_COUNT+1-targetFloor);
    cwMesh.position.y+=(cwTarget-cwMesh.position.y)*0.08;

    // الحبال
    rA.set(0,   shaftH+1.62,0.8); rB.set(0,  cabinGroup.position.y+CABIN_HEIGHT/2,0);
    ropeCabin.geometry.setFromPoints([rA,rB]);
    rA.set(-0.8,shaftH+1.62,0.8); rB.set(-1.26,cwMesh.position.y+1.1,0);
    ropeCounter.geometry.setFromPoints([rA,rB]);

    const moving=Math.abs(cabinGroup.position.y-targetY)>0.03;

    // الأبواب (فقط إذا لم يوجد أنيميشن Blender)
    if(!window._mixer && doorL && doorR){
      const wantOpen=moving?0:1;
      doorOpenAmt+=(wantOpen-doorOpenAmt)*0.12;
      doorL.position.x=-0.5-(doorOpenAmt*0.28);
      doorR.position.x= 0.5+(doorOpenAmt*0.28);
    }

    // وصول للطابق
    if(!moving){
      currentFloor=targetFloor;
      if(lastBroadcastFloor!==currentFloor){
        lastBroadcastFloor=currentFloor;
        postApp({type:'floor-change', floor:currentFloor, floorId:getFloorByIndex(currentFloor).id});
        playArrival();
      }
    }

    // وضع الإنذار
    if(alarmLight){
      if(alarmMode){
        const pulse=(Math.sin(now*0.018)+1)*0.5;
        alarmLight.intensity=2.5*pulse;
        if(cabinLight){ cabinLight.color.setHex(0xFFCDD2); cabinLight.intensity=0.9+0.5*pulse; }
        if(cabinStrip){ cabinStrip.color.setHex(0xEF4444); cabinStrip.intensity=0.8+0.4*pulse; }
        if(alarmBeacon){ alarmBeacon.material.emissiveIntensity=0.6+0.8*pulse; }
        alarmTick++;
        if(alarmTick%42===0) playAlarmPulse();
      } else {
        alarmLight.intensity=0;
        if(cabinLight){ cabinLight.color.setHex(0xffe8c0); cabinLight.intensity=1.2; }
        if(cabinStrip){ cabinStrip.color.setHex(0xffd580); cabinStrip.intensity=0.6; }
        alarmTick=0;
      }
    }
  }

  // الكاميرا
  followY+=(((cabinLoaded?cabinGroup.position.y:floorCenterY(targetFloor))+CABIN_HEIGHT*0.2)-followY)*0.08;
  lookTarget.set(0, followY, 0);
  camera.position.x=lookTarget.x+distance*Math.sin(yaw)*Math.cos(pitch);
  camera.position.z=lookTarget.z+distance*Math.cos(yaw)*Math.cos(pitch);
  camera.position.y=lookTarget.y+distance*Math.sin(pitch);
  camera.lookAt(lookTarget);

  worldAngle+=0.0008;
  shaftMesh.rotation.y=Math.sin(worldAngle)*0.08;

  renderer.render(scene,camera);
}
animate();

// إرسال الطابق الابتدائي
postApp({type:'floor-change', floor:INITIAL_FLOOR.index, floorId:INITIAL_FLOOR.id});

window.addEventListener('resize',()=>{
  camera.aspect=stage.clientWidth/stage.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(stage.clientWidth,stage.clientHeight);
});
</script>
</body>
</html>`;
}

function escapeForScript(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

// ──────────────────────────────────────────────────────────────
//  Styles
// ──────────────────────────────────────────────────────────────
function createStyles(appTheme: ReturnType<typeof useAppTheme>) {
  return StyleSheet.create({
    wrap:            { flex: 1, backgroundColor: SCENE_BACKGROUND },
    loadingWrap:     { alignItems: "center", justifyContent: "center" },
    loadingText:     { color: appTheme.colors.accent, fontSize: 15, fontWeight: "600" },
    webview:         { backgroundColor: SCENE_BACKGROUND },
    topHud: {
      position: "absolute", top: 12, right: 12, left: 12,
      flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center",
      backgroundColor: appTheme.isDark ? "rgba(22,33,29,0.48)" : "rgba(255,255,255,0.84)",
      borderWidth: 1, borderColor: appTheme.isDark ? "rgba(139,183,216,0.25)" : "rgba(15,107,92,0.18)", borderRadius: 12,
      paddingHorizontal: 10, paddingVertical: 8,
    },
    titleWrap:       { alignItems: "flex-end", flexShrink: 1 },
    tag:             { color: appTheme.colors.accent, fontSize: 11, fontWeight: "700" },
    title:           { color: appTheme.colors.textPrimary, fontSize: 14, fontWeight: "700", textAlign: "right" },
    touchHint:       { color: appTheme.colors.textMuted, fontSize: 10, textAlign: "right" },
    bottomPanel: {
      position: "absolute", right: 12, left: 12, bottom: 12,
      borderRadius: 14, borderWidth: 1, borderColor: appTheme.isDark ? "rgba(40,67,58,0.72)" : "rgba(15,107,92,0.16)",
      backgroundColor: appTheme.isDark ? "rgba(22,33,29,0.56)" : "rgba(255,255,255,0.88)", padding: 10, gap: 8,
    },
    controlsAndMapRow:  { flexDirection: "row-reverse", gap: 10, alignItems: "stretch" },
    controlsColumn:     { flex: 1, gap: 8 },
    stateRow:           { flexDirection: "row-reverse", justifyContent: "space-between" },
    stateText:          { color: appTheme.colors.textPrimary, fontSize: 12, fontWeight: "600", textAlign: "right" },
    directionRow:       { flexDirection: "row-reverse", gap: 8 },
    directionButton: {
      flex: 1, borderRadius: 10, borderWidth: 1,
      borderColor: `${appTheme.colors.info}88`, backgroundColor: `${appTheme.colors.info}1F`,
      alignItems: "center", paddingVertical: 9,
    },
    disabledButton:     { opacity: 0.40 },
    directionButtonText:{ color: appTheme.colors.textPrimary, fontSize: 12, fontWeight: "800" },
    alarmRow:           { alignItems: "flex-end" },
    alarmButton: {
      borderRadius: 10, borderWidth: 1,
      borderColor: "rgba(245,158,11,0.7)", backgroundColor: "rgba(245,158,11,0.22)",
      paddingVertical: 7, paddingHorizontal: 12,
    },
    alarmButtonActive:  { borderColor: "rgba(239,68,68,0.86)", backgroundColor: "rgba(239,68,68,0.32)" },
    alarmText:          { color: "#F59E0B", fontSize: 12, fontWeight: "700", textAlign: "right" },
    alarmTextActive:    { color: "#ffffff" },
    floorsLabel:        { color: appTheme.colors.textMuted, fontSize: 12, textAlign: "right" },
    floorsWrap:         { flexDirection: "row-reverse", flexWrap: "wrap", gap: 8 },
    floorButton: {
      minWidth: 42, height: 36, borderRadius: 10, borderWidth: 1,
      borderColor: appTheme.isDark ? "rgba(40,67,58,0.82)" : "rgba(15,107,92,0.14)", backgroundColor: appTheme.isDark ? "rgba(27,40,35,0.72)" : "rgba(255,255,255,0.92)",
      alignItems: "center", justifyContent: "center", paddingHorizontal: 10,
    },
    floorButtonActive:      { borderColor: "rgba(0,212,170,0.85)", backgroundColor: "rgba(0,212,170,0.28)" },
    floorButtonText:        { color: appTheme.colors.textMuted, fontSize: 13, fontWeight: "800" },
    floorButtonTextActive:  { color: appTheme.isDark ? "#ffffff" : appTheme.colors.accent },
    miniMapWrap: {
      width: 78, borderRadius: 10, borderWidth: 1,
      borderColor: appTheme.isDark ? "rgba(139,183,216,0.32)" : "rgba(15,107,92,0.14)", backgroundColor: appTheme.isDark ? "rgba(27,40,35,0.62)" : "rgba(255,255,255,0.9)",
      paddingVertical: 8, paddingHorizontal: 6, alignItems: "center", gap: 4,
    },
    mapTitle:    { color: appTheme.colors.accent, fontSize: 10, fontWeight: "700" },
    mapRail:     { width: "100%", gap: 4 },
    mapFloorRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 4 },
    mapDot: {
      width: 10, height: 10, borderRadius: 5,
      borderWidth: 1, borderColor: "rgba(136,153,180,0.65)", backgroundColor: "rgba(136,153,180,0.18)",
    },
    mapDotCurrent:  { borderColor: "rgba(0,212,170,0.95)", backgroundColor: "rgba(0,212,170,0.9)" },
    mapDotTarget:   { borderColor: "rgba(245,158,11,0.95)", backgroundColor: "rgba(245,158,11,0.9)" },
    mapFloorText:   { color: appTheme.colors.textMuted, fontSize: 11, fontWeight: "700" },
  });
}
