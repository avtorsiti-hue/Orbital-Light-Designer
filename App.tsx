import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { CelestialObject, AppSettings, OrbitGroup, Language, SavedConfig, PanelPositions, Track, ObjectType } from './types';

const generateId = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
};

const hueToHex = (h: number): string => {
  h = (h + 360) % 360;
  h /= 360;
  const s = 0.7, l = 0.5;
  let r, g, b;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    if (t < 0) t += 1; if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  r = f(h + 1/3); g = f(h); b = f(h - 1/3);
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

const hexToHue = (hex: string): number => {
  let r = 0, g = 0, b = 0;
  let cleanHex = hex;
  if (hex.length === 9) cleanHex = hex.substring(0, 7);
  
  if (cleanHex.length === 4) {
    r = parseInt(cleanHex[1] + cleanHex[1], 16);
    g = parseInt(cleanHex[2] + cleanHex[2], 16);
    b = parseInt(cleanHex[3] + cleanHex[3], 16);
  } else if (cleanHex.length === 7) {
    r = parseInt(cleanHex.substring(1, 3), 16);
    g = parseInt(cleanHex.substring(3, 5), 16);
    b = parseInt(cleanHex.substring(5, 7), 16);
  }
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0;
  if (max !== min) {
    const d = max - min;
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return Math.round(h * 360);
};

interface LightingDesign {
  id: string;
  name: string;
  core: Partial<CelestialObject>;
  sats: Partial<CelestialObject>;
  wave: { amp: number; freq: number; phase: number };
  accent: string;
}

const translations = {
  ru: {
    settings: "НАСТРОЙКИ",
    language: "ЯЗЫК",
    objects: "ОБЪЕКТЫ",
    appearance: "СТИЛЬ",
    orbit: "ДВИЖЕНИЕ",
    creation: "СОЗДАНИЕ",
    name: "ИМЯ",
    save: "СОХРАНИТЬ",
    size: "РАЗМЕР",
    glow: "СВЕТ",
    distance: "РАДИУС",
    speed: "СКОРОСТЬ",
    volume: "ЗВУК",
    panel_opacity: "ПРОЗРАЧНОСТЬ",
    panel_hue: "ЦВЕТ ПАНЕЛИ",
    accent_hue: "ЦВЕТ АКЦЕНТА",
    border_hue: "ЦВЕТ ГРАНИЦЫ",
    object_hue: "ЦВЕТ ОБЪЕКТА",
    saved_list: "СОХРАНЕНИЯ",
    config_name: "ИМЯ ПРЕСЕТА",
    add_satellites: "СПУТНИКИ",
    music: "МУЗЫКА",
    player: "ПЛЕЕР",
    playlist: "ПЛЕЙЛИСТ",
    add_track: "ФАЙЛ",
    empty_playlist: "ПУСТО",
    create: "СОЗДАТЬ",
    bg_image: "ФОН",
    rotation: "ВРАЩЕНИЕ",
    zoom_slider_hue: "ЦВЕТ ЗУМА",
    orbit_level: "ОРБИТА",
    sat_count: "КОЛ-ВО",
    visibility: "ВИДИМОСТЬ",
    add_circle: "КРУГ",
    add_sphere: "ШАР",
    add_image: "PNG",
    add_point: "ТОЧКА",
    add_line: "ЛИНИЯ",
    shape: "ФОРМА",
    add_group: "ДОБАВИТЬ ГРУППУ",
    graph: "ГРАФИК",
    amplitude: "АМПЛИТУДА",
    frequency: "ЧАСТОТА",
    phase: "ФАЗА",
    tail: "ХВОСТ",
    sync_bpm: "СИНХР. BPM",
    detecting: "ПОИСК...",
    record: "ЗАПИСЬ",
    stop: "СТОП",
    hide_ui: "СКРЫТЬ",
    show_ui: "ПОКАЗАТЬ",
    designer: "LIGHTING DESIGNER",
    designer_desc: "Анализ аудио и авто-настройка визуалов",
    next_design: "СОЗДАТЬ",
    apply_design: "ИСТОРИЯ (7)",
    mode_smooth: "Симбиоз",
    mode_impulse: "Импульс",
    mode_chaos: "Хаос",
    procedural_names: ["Сверхновая", "Пульсар", "Квазар", "Туманность", "Горизонт", "Сингулярность", "Эхо", "Шторм", "Закат", "Рассвет", "Матрица", "Фантом", "Зенит", "Астра", "Призма"]
  },
  en: {
    settings: "SETTINGS",
    language: "LANG",
    objects: "OBJECTS",
    appearance: "STYLE",
    orbit: "MOVE",
    creation: "CREATION",
    name: "NAME",
    save: "SAVE",
    size: "SIZE",
    glow: "GLOW",
    distance: "RADIUS",
    speed: "SPEED",
    volume: "VOL",
    panel_opacity: "OPACITY",
    panel_hue: "PANEL HUE",
    accent_hue: "ACCENT HUE",
    border_hue: "BORDER HUE",
    object_hue: "OBJECT HUE",
    saved_list: "SAVES",
    config_name: "PRESET NAME",
    add_satellites: "SATELLITES",
    music: "MUSIC",
    player: "PLAYER",
    playlist: "PLAYLIST",
    add_track: "FILE",
    empty_playlist: "EMPTY",
    create: "CREATE",
    bg_image: "BG",
    rotation: "ROTATION",
    zoom_slider_hue: "ZOOM COLOR",
    orbit_level: "ORBIT",
    sat_count: "COUNT",
    visibility: "VISIBILITY",
    add_circle: "CIRCLE",
    add_sphere: "SPHERE",
    add_image: "PNG",
    add_point: "POINT",
    add_line: "LINE",
    shape: "SHAPE",
    add_group: "ADD GROUP",
    graph: "GRAPH",
    amplitude: "AMPLITUDE",
    frequency: "FREQUENCY",
    phase: "PHASE",
    tail: "TAIL",
    sync_bpm: "SYNC BPM",
    detecting: "DETECTING...",
    record: "RECORD",
    stop: "STOP",
    hide_ui: "HIDE",
    show_ui: "SHOW",
    designer: "LIGHTING DESIGNER",
    designer_desc: "Audio analysis & auto-visual setup",
    next_design: "CREATE",
    apply_design: "HISTORY (7)",
    mode_smooth: "Smooth",
    mode_impulse: "Impulse",
    mode_chaos: "Chaos",
    procedural_names: ["Supernova", "Pulsar", "Quasar", "Nebula", "Horizon", "Singularity", "Echo", "Storm", "Sunset", "Sunrise", "Matrix", "Phantom", "Zenith", "Astra", "Prism"]
  }
};

const useDraggable = (initialPos: { x: number; y: number }, isRight = false) => {
  const [pos, setPos] = useState(initialPos);
  const startRef = useRef({ x: 0, y: 0, initialX: 0, initialY: 0 });

  const handleDragStart = (clientX: number, clientY: number, target: HTMLElement) => {
    const handle = target.classList.contains('drag-handle') ? target : target.closest('.drag-handle');
    if (!handle || ['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName) || target.closest('button') || target.closest('input') || target.closest('select')) return;

    startRef.current = { x: clientX, y: clientY, initialX: pos.x, initialY: pos.y };

    const onMove = (moveX: number, moveY: number) => {
      const dx = moveX - startRef.current.x;
      const dy = moveY - startRef.current.y;
      setPos({
        x: isRight ? startRef.current.initialX - dx : startRef.current.initialX + dx,
        y: startRef.current.initialY + dy,
      });
    };

    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onEnd = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onEnd);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onEnd);
  };

  return { pos, setPos, onMouseDown: (e: React.MouseEvent) => handleDragStart(e.clientX, e.clientY, e.target as HTMLElement) };
};

const MiniSlider: React.FC<{ label?: string, value: number, min: number, max: number, step?: number, onChange: (val: number) => void, onFinalChange?: () => void }> = ({ label, value, min, max, step = 1, onChange, onFinalChange }) => (
  <div className="flex flex-col gap-0.5 mb-1.5">
    {label && <label className="text-[7px] uppercase opacity-40 font-black tracking-tighter">{label}</label>}
    <div className="flex items-center gap-1.5">
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} onMouseUp={onFinalChange} className="flex-grow h-0.5" />
      <input 
        type="number" 
        step={step} 
        value={value % 1 === 0 ? value : parseFloat(value.toFixed(2))} 
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (!isNaN(v)) onChange(v);
        }}
        onBlur={onFinalChange}
        className="bg-transparent text-[8px] font-mono opacity-60 w-10 text-right outline-none border-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" 
      />
    </div>
  </div>
);

const NumericStepper: React.FC<{ value: number, min: number, max: number, onChange: (val: number) => void }> = ({ value, min, max, onChange }) => (
  <div className="flex items-center bg-white/5 border border-white/10 rounded-lg overflow-hidden p-0.5 gap-0.5">
    <button onClick={() => onChange(Math.max(min, value - 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-all text-white/50 hover:text-white"><i className="fas fa-minus text-[8px]"></i></button>
    <input type="number" value={value} onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v)) onChange(Math.min(max, Math.max(min, v))); }} className="w-10 bg-transparent text-center text-[10px] font-black outline-none border-none" />
    <button onClick={() => onChange(Math.min(max, value + 1))} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 transition-all text-white/50 hover:text-white"><i className="fas fa-plus text-[8px]"></i></button>
  </div>
);

// Helper for drawing stars
const StarSVG: React.FC<{ fill: string, size: number, outline?: boolean, className?: string }> = ({ fill, size, outline, className }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
    <path
      d="M50 2L63 38H100L70 60L83 96L50 74L17 96L30 60L0 38H37L50 2Z"
      fill={outline ? 'none' : fill}
      stroke={outline ? fill : 'none'}
      strokeWidth={outline ? '6' : '0'}
    />
  </svg>
);

const App: React.FC = () => {
  const [objects, setObjects] = useState<CelestialObject[]>([]);
  const [groups, setGroups] = useState<OrbitGroup[]>([]);
  const [history, setHistory] = useState<{o: CelestialObject[], g: OrbitGroup[]}[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedObjectId, setSelectedObjectId] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isObjectDragging, setIsObjectDragging] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isUiHidden, setIsUiHidden] = useState(false);
  const [isDesignerOpen, setIsDesignerOpen] = useState(false);
  const [designerMode, setDesignerMode] = useState<'smooth' | 'impulse' | 'chaos'>('smooth');
  
  const [suggestedDesigns, setSuggestedDesigns] = useState<LightingDesign[]>([]);

  const [satelliteCount, setSatelliteCount] = useState(1);
  const [satelliteRadius, setSatelliteRadius] = useState(50);
  const [satelliteSpeed, setSatelliteSpeed] = useState(0);
  const [satelliteHue, setSatelliteHue] = useState(180);
  const [satelliteVisibility, setSatelliteVisibility] = useState(100);
  const [satelliteSize, setSatelliteSize] = useState(10);
  const [satelliteGlow, setSatelliteGlow] = useState(0);
  const [satelliteTail, setSatelliteTail] = useState(0);

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  const [isGraphOpen, setIsGraphOpen] = useState(false);
  const [waveParams, setWaveParams] = useState({ amp: 0, freq: 1, phase: 0 });

  const [settings, setSettings] = useState<AppSettings>({ panelColor: '#0a0a0a', accentColor: '#3b82f6', borderColor: '#ffffff22', panelOpacity: 0.42, backgroundColor: '#050505', backgroundImage: null, zoom: 1, language: 'ru', volume: 0.5, zoomSliderColor: '#ffffff' });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isObjectListOpen, setIsObjectListOpen] = useState(false);
  const [activeParamBlock, setActiveParamBlock] = useState(0); 
  const [time, setTime] = useState(0);

  const [playlist, setPlaylist] = useState<Track[]>([]);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const [isBpmSyncing, setIsBpmSyncing] = useState(false);
  const lastBeatTimeRef = useRef<number>(0);
  const bpmHistoryRef = useRef<number[]>([]);
  const requestRef = useRef<number>();
  const [detectedBpm, setDetectedBpm] = useState(120);
  const currentHueRef = useRef<number>(180);

  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const lastTimeRef = useRef<number>(performance.now());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileInputSatRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const musicInputRef = useRef<HTMLInputElement>(null);
  const changeShapeInputRef = useRef<HTMLInputElement>(null);

  const mainControlsPos = useDraggable({ x: 20, y: 20 });
  const settingsPanelPos = useDraggable({ x: 100, y: 20 });
  const listPanelPos = useDraggable({ x: 100, y: 260 });
  const paramsPanelPos = useDraggable({ x: 20, y: 400 }, false);
  const graphPanelPos = useDraggable({ x: 350, y: 100 }, false);
  const designerPanelPos = useDraggable({ x: 450, y: 20 }, false);

  const t = translations[settings.language];

  const calculateAbsoluteState = useCallback((id: string): { x: number, y: number, rotation: number } => {
    const item = (objects.find(o => o.id === id) as any) || (groups.find(g => g.id === id) as any);
    if (!item) return { x: 0, y: 0, rotation: 0 };
    let r = item.orbitRadius;
    if (item.waveParams) r += item.waveParams.amp * Math.sin(item.waveParams.freq * item.currentAngle + item.waveParams.phase * (Math.PI / 180));
    let x = Math.cos(item.currentAngle) * r;
    let y = Math.sin(item.currentAngle) * r;
    
    let rotation = item.currentRotation || 0;
    if (item.type === 'line') {
        rotation = (item.currentAngle * 180 / Math.PI);
    }

    if (item.parentId) {
      const ps = calculateAbsoluteState(item.parentId as string);
      const rad = ps.rotation * (Math.PI / 180);
      const nx = x * Math.cos(rad) - y * Math.sin(rad);
      const ny = x * Math.sin(rad) + y * Math.cos(rad);
      x = ps.x + nx; y = ps.y + ny; 
      if (item.type !== 'line') rotation += ps.rotation;
    }
    return { x, y, rotation };
  }, [objects, groups]);

  const availableGroups = useMemo(() => {
    if (!selectedObjectId) return [];
    const children = objects.filter(o => o.parentId === selectedObjectId);
    const groupsMap = new Map<string, { id: string, radius: number, count: number, sample: CelestialObject }>();
    children.forEach(child => {
        const key = child.groupId || `legacy-${Math.round(child.orbitRadius)}`;
        if (!groupsMap.has(key)) groupsMap.set(key, { id: key, radius: child.orbitRadius, count: 0, sample: child });
        const g = groupsMap.get(key)!; g.count++;
    });
    return Array.from(groupsMap.values()).sort((a, b) => a.radius - b.radius);
  }, [objects, selectedObjectId]);

  const pushToHistory = useCallback((o: CelestialObject[], g: OrbitGroup[]) => {
    setHistory(prev => {
      const next = prev.slice(0, historyIndex + 1);
      next.push({ o: JSON.parse(JSON.stringify(o)), g: JSON.parse(JSON.stringify(g)) });
      if (next.length > 50) next.shift();
      setHistoryIndex(next.length - 1);
      return next;
    });
  }, [historyIndex]);

  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        audioContextRef.current = new AudioContext();
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        
        if (audioRef.current) {
            try {
                sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
            } catch (e) {
                console.log("Media element already connected");
            }
        }
    }
    if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
    }
  }, []);

  const analyzeBpm = useCallback(() => {
     if (!analyserRef.current || !isPlaying) return;
     
     const bufferLength = analyserRef.current.frequencyBinCount;
     const dataArray = new Uint8Array(bufferLength);
     analyserRef.current.getByteFrequencyData(dataArray);

     let lowEnergy = 0; 
     for(let i = 0; i < 3; i++) lowEnergy += dataArray[i];
     lowEnergy /= 3;

     let midEnergy = 0; 
     for(let i = 4; i < 46; i++) midEnergy += dataArray[i];
     midEnergy /= 42;

     const now = performance.now();
     let isBeat = false;
     if (lowEnergy > 160 && (now - lastBeatTimeRef.current) > 250) {
         isBeat = true;
         if (lastBeatTimeRef.current > 0) {
             const interval = now - lastBeatTimeRef.current;
             const bpm = 60000 / interval;
             if (bpm >= 60 && bpm <= 240) {
                 bpmHistoryRef.current.push(bpm);
                 if (bpmHistoryRef.current.length > 8) bpmHistoryRef.current.shift();
                 const avgBpm = bpmHistoryRef.current.reduce((a, b) => a + b, 0) / bpmHistoryRef.current.length;
                 setDetectedBpm(Math.round(avgBpm));
             }
         }
         lastBeatTimeRef.current = now;
     }

     let weightedSum = 0;
     let totalMagnitude = 0;
     for (let i = 0; i < 120; i++) {
         const magnitude = dataArray[i];
         weightedSum += i * magnitude;
         totalMagnitude += magnitude;
     }

     if (totalMagnitude > 0) {
         const avgBin = weightedSum / totalMagnitude;
         const targetHue = Math.max(0, Math.min(300, (avgBin / 60) * 300));
         
         if (designerMode === 'smooth') {
             currentHueRef.current += (targetHue - currentHueRef.current) * 0.05;
         } else if (designerMode === 'impulse') {
             if (isBeat) currentHueRef.current = targetHue;
         } else if (designerMode === 'chaos') {
             if (midEnergy > 100) currentHueRef.current = (targetHue + Math.random() * 40 - 20) % 360;
         }

         const reactiveHex = hueToHex(currentHueRef.current);

         if (isBpmSyncing) {
             setObjects(prev => prev.map(o => {
                 if (o.id === selectedObjectId || o.parentId === selectedObjectId) {
                    let updates: any = { color: reactiveHex };
                    if (o.visibility < 0) updates.visibility = -detectedBpm;
                    return { ...o, ...updates };
                 }
                 return o;
             }));
         }
     }

     requestRef.current = requestAnimationFrame(analyzeBpm);
  }, [isBpmSyncing, isPlaying, selectedObjectId, designerMode, detectedBpm]);

  useEffect(() => {
      if (isPlaying) {
          requestRef.current = requestAnimationFrame(analyzeBpm);
      } else {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      }
      return () => {
          if (requestRef.current) cancelAnimationFrame(requestRef.current);
      };
  }, [isPlaying, analyzeBpm]);

  const toggleBpmSync = () => {
      const newState = !isBpmSyncing;
      setIsBpmSyncing(newState);
      if (newState) {
          initAudioContext();
          bpmHistoryRef.current = [];
          lastBeatTimeRef.current = 0;
      }
  };

  const applyDesign = useCallback((design: LightingDesign) => {
    if (!selectedObjectId) return;
    
    setObjects(prev => {
        const next = prev.map(o => {
            if (o.id === selectedObjectId) return { ...o, ...design.core };
            if (o.parentId === selectedObjectId) {
                const targetGroup = availableGroups[activeGroupIndex];
                const groupId = targetGroup?.id.startsWith('legacy-') ? undefined : targetGroup?.id;
                const legacyRadiusKey = targetGroup?.id.startsWith('legacy-') ? parseFloat(targetGroup.id.split('-')[1]) : null;
                const isTarget = groupId ? o.groupId === groupId : (legacyRadiusKey !== null && Math.abs(o.orbitRadius - legacyRadiusKey) < 0.5);
                
                if (isTarget) {
                    return { ...o, ...design.sats, waveParams: design.wave };
                }
            }
            return o;
        });
        return next;
    });
    setWaveParams(design.wave);
    pushToHistory(objects, groups);
  }, [selectedObjectId, availableGroups, activeGroupIndex, objects, groups]);

  const generateProceduralDesign = useCallback(() => {
    const bpm = detectedBpm || 120;
    const rhythmicSpeed = (bpm / 60) * 10;
    const timeSignatures = [1, 2, 4, 8];
    const getRandomRhythmicSpeed = () => {
        const k = timeSignatures[Math.floor(Math.random() * timeSignatures.length)];
        const direction = Math.random() > 0.5 ? 1 : -1;
        return (rhythmicSpeed / k) * direction;
    };

    const baseHue = Math.random() * 360;
    const isComplementary = Math.random() > 0.5;
    const satHue = isComplementary ? (baseHue + 180) % 360 : (baseHue + (Math.random() * 60 - 30) + 360) % 360;
    
    const types: ObjectType[] = ['circle', 'sphere', 'point', 'line', 'star', 'outlineStar', 'outlineCircle'];
    const chosenType = types[Math.floor(Math.random() * types.length)];

    const energy = isPlaying ? 1.5 : 1.0;
    const nameList = t.procedural_names;
    const randomName = `${nameList[Math.floor(Math.random() * nameList.length)]} ${Math.floor(Math.random() * 99)}`;

    const design: LightingDesign = {
      id: generateId(),
      name: randomName,
      accent: hueToHex(baseHue),
      core: {
        color: hueToHex(baseHue),
        glow: 150 + Math.random() * 300,
        visibility: -bpm,
        orbitSpeed: 0, 
        size: 5 + Math.random() * 50
      },
      sats: {
        type: chosenType,
        color: hueToHex(satHue),
        glow: 40 + Math.random() * 150,
        orbitSpeed: getRandomRhythmicSpeed(),
        tailLength: Math.random() > 0.3 ? 50 + Math.random() * 200 : 0,
        visibility: Math.random() > 0.7 ? -bpm : 100,
        size: (chosenType === 'line' || chosenType === 'star' || chosenType === 'outlineStar' || chosenType === 'outlineCircle') ? 40 + Math.random() * 120 : 4 + Math.random() * 25
      },
      wave: {
        amp: (Math.random() * 100 + 20) * energy,
        freq: [1, 2, 4, 8][Math.floor(Math.random() * 4)],
        phase: Math.random() * 360
      }
    };

    return design;
  }, [detectedBpm, isPlaying, t.procedural_names]);

  const handleGenerateAndApply = () => {
    if (!selectedObjectId) return;
    const next = generateProceduralDesign();
    applyDesign(next);
    setSuggestedDesigns(prev => [next, ...prev.slice(0, 6)]); 
  };

  useEffect(() => {
    if (isDesignerOpen && suggestedDesigns.length === 0) {
      handleGenerateAndApply();
    }
  }, [isDesignerOpen]);

  const handleToggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: { frameRate: { ideal: 60 } },
          audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
        } as any);
        const recorder = new MediaRecorder(stream, {
          mimeType: MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
        });
        chunksRef.current = [];
        recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
        recorder.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: 'video/webm' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = `orbital-sim-${Date.now()}.webm`; a.click();
          stream.getTracks().forEach(track => track.stop());
        };
        recorder.start();
        mediaRecorderRef.current = recorder;
        setIsRecording(true);
        stream.getVideoTracks()[0].onended = () => { if (isRecording) setIsRecording(false); };
      } catch (err) { console.error("Recording failed:", err); }
    }
  };

  const handleAddObject = (type: ObjectType = 'circle', image: string | null = null) => {
    const id = generateId();
    let size = 30;
    let glow = 0;
    if (type === 'image') size = 100;
    else if (type === 'point') { size = 1; glow = 10; }
    else if (type === 'line') { size = 80; glow = 20; }
    else if (type === 'star' || type === 'outlineStar') { size = 50; glow = 15; }
    else if (type === 'outlineCircle') { size = 50; glow = 10; }

    const newObj: CelestialObject = { 
      id, name: `${type.toUpperCase()}-${objects.length + 1}`, 
      description: '', color: '#ffffff', glow, opacity: 1, size, orbitRadius: 150 + (objects.length * 5), orbitSpeed: 0, orbitDirection: 1, currentAngle: Math.random() * Math.PI * 2, rotationSpeed: 0, rotationDirection: 1, currentRotation: 0, parentId: null, isPinned: false, visibility: 100, image, type, tailLength: 0
    };
    const nextO = [...objects, newObj]; setObjects(nextO); pushToHistory(nextO, groups); setSelectedObjectId(id); setIsAddMenuOpen(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, forSat = false) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) { if (forSat && selectedObjectId) handleSetSatellitesType(selectedObjectId, 'image', ev.target.result as string); else handleAddObject('image', ev.target.result as string); } };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleBGUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) setSettings(s => ({ ...s, backgroundImage: ev.target.result as string })); };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleMusicUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newTracks: Track[] = Array.from(e.target.files).map((file: File) => ({ id: generateId(), name: file.name.replace(/\.[^/.]+$/, ""), url: URL.createObjectURL(file) }));
      setPlaylist(prev => [...prev, ...newTracks]);
    }
  };

  const handleChangeShapeImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && selectedObjectId) {
      const reader = new FileReader();
      reader.onload = (ev) => { if (ev.target?.result) { const obj = objects.find(o => o.id === selectedObjectId); const newSize = obj && obj.size === 1 ? 30 : (obj ? obj.size : 30); updateItem(selectedObjectId, { type: 'image', image: ev.target.result as string, size: newSize }); } };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const playTrack = (index: number) => { if (index >= 0 && index < playlist.length) { setCurrentTrackIndex(index); setIsPlaying(true); initAudioContext(); } };
  const nextTrack = () => { if (playlist.length === 0) return; const nextIndex = (currentTrackIndex + 1) % playlist.length; playTrack(nextIndex); };

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = settings.volume;
      if (isPlaying) audioRef.current.play().catch(() => setIsPlaying(false));
      else audioRef.current.pause();
    }
  }, [isPlaying, currentTrackIndex, settings.volume]);

  const handleSetSatellitesType = (pid: string, type: ObjectType, image: string | null = null) => {
    if (!selectedObjectId || availableGroups.length === 0) return;
    const targetGroup = availableGroups[activeGroupIndex];
    if (!targetGroup) return;
    const groupId = targetGroup.id.startsWith('legacy-') ? undefined : targetGroup.id;
    const legacyRadiusKey = targetGroup.id.startsWith('legacy-') ? parseFloat(targetGroup.id.split('-')[1]) : null;
    setObjects(prev => prev.map(o => { 
      const isTarget = o.parentId === pid && (groupId ? o.groupId === groupId : Math.abs(o.orbitRadius - legacyRadiusKey!) < 0.5); 
      if (isTarget) { 
        let newSize = o.size; 
        if (type === 'point') newSize = 1; 
        else if (type === 'line' && o.size < 50) newSize = 80; 
        else if ((type === 'star' || type === 'outlineStar' || type === 'outlineCircle') && o.size < 10) newSize = 40;
        else if (o.size === 1) newSize = 10; 
        return { ...o, type, image, size: newSize }; 
      } 
      return o; 
    }));
  };

  const handleWaveChange = (key: 'amp' | 'freq' | 'phase', val: number) => { const newParams = { ...waveParams, [key]: val }; setWaveParams(newParams); batchUpdateSatellites({ waveParams: newParams }); };

  const handleAddGroup = () => {
    if (!selectedObjectId) return;
    let newR = 100;
    if (availableGroups.length > 0) { const maxR = Math.max(...availableGroups.map(g => g.radius)); newR = maxR + 50; }
    const newGroupId = generateId();
    const count = 5;
    const newObjs: CelestialObject[] = Array.from({ length: count }).map((_, i) => ({ id: generateId(), name: `S-${objects.length + i + 1}`, description: '', color: hueToHex(satelliteHue), glow: satelliteGlow, opacity: 1, size: satelliteSize, orbitRadius: newR, orbitSpeed: satelliteSpeed, orbitDirection: 1, currentAngle: (i / count) * Math.PI * 2, rotationSpeed: 0, rotationDirection: 1, currentRotation: 0, parentId: selectedObjectId!, groupId: newGroupId, isPinned: false, visibility: satelliteVisibility, type: 'circle', tailLength: satelliteTail }));
    setObjects(prev => [...prev, ...newObjs]); setActiveGroupIndex(availableGroups.length); 
  };

  const batchUpdateSatellites = useCallback((updates: Partial<CelestialObject>, isRadiusChange = false) => {
    if (!selectedObjectId || availableGroups.length === 0) return;
    const targetGroup = availableGroups[activeGroupIndex];
    if (!targetGroup) return;
    const groupId = targetGroup.id.startsWith('legacy-') ? undefined : targetGroup.id;
    const legacyRadiusKey = targetGroup.id.startsWith('legacy-') ? parseFloat(targetGroup.id.split('-')[1]) : null;
    setObjects(prev => { let changed = false; const next = prev.map(o => { const isTarget = o.parentId === selectedObjectId && (groupId ? o.groupId === groupId : Math.abs(o.orbitRadius - legacyRadiusKey!) < 0.5); if (isTarget) { changed = true; return { ...o, ...updates }; } return o; }); return changed ? next : prev; });
  }, [selectedObjectId, availableGroups, activeGroupIndex]);

  const updateSatelliteCount = useCallback((newCount: number) => {
    if (!selectedObjectId || availableGroups.length === 0) return;
    const targetGroup = availableGroups[activeGroupIndex];
    if (!targetGroup) return;
    const groupId = targetGroup.id.startsWith('legacy-') ? undefined : targetGroup.id;
    const legacyRadiusKey = targetGroup.id.startsWith('legacy-') ? parseFloat(targetGroup.id.split('-')[1]) : null;
    setObjects(prev => {
      const currentSats = prev.filter(o => { if (o.parentId !== selectedObjectId) return false; if (groupId) return o.groupId === groupId; return Math.abs(o.orbitRadius - legacyRadiusKey!) < 0.5; });
      const otherObjects = prev.filter(o => !currentSats.includes(o));
      let nextSats = [...currentSats];
      if (newCount > nextSats.length) {
         const sample = nextSats.length > 0 ? nextSats[0] : { color: hueToHex(satelliteHue), size: satelliteSize, glow: satelliteGlow, orbitSpeed: satelliteSpeed, visibility: satelliteVisibility, type: 'circle' as ObjectType, orbitRadius: targetGroup.radius, tailLength: satelliteTail };
         for(let i = nextSats.length; i < newCount; i++) { nextSats.push({ id: generateId(), name: `S-${prev.length + i + 1}`, description: '', color: (sample as any).color, glow: (sample as any).glow, opacity: 1, size: (sample as any).size, orbitRadius: (sample as any).orbitRadius, orbitSpeed: (sample as any).orbitSpeed, orbitDirection: 1, currentAngle: 0, rotationSpeed: 0, rotationDirection: 1, currentRotation: 0, parentId: selectedObjectId, groupId: groupId, isPinned: false, visibility: (sample as any).visibility, type: (sample as any).type || 'circle', image: (sample as any).image, waveParams: (sample as any).waveParams, tailLength: (sample as any).tailLength || 0 }); }
      } else { nextSats = nextSats.slice(0, newCount); }
      nextSats = nextSats.map((s, idx) => ({ ...s, currentAngle: (idx / nextSats.length) * Math.PI * 2 }));
      return [...otherObjects, ...nextSats];
    });
    setSatelliteCount(newCount);
  }, [selectedObjectId, availableGroups, activeGroupIndex, satelliteHue, satelliteSize, satelliteGlow, satelliteSpeed, satelliteVisibility, satelliteTail]);

  useEffect(() => {
    if (selectedObjectId && activeParamBlock === 2) {
      if (availableGroups.length > 0) {
        const idx = Math.min(activeGroupIndex, availableGroups.length - 1);
        if (idx !== activeGroupIndex) setActiveGroupIndex(idx);
        const group = availableGroups[idx];
        if (group) { setSatelliteRadius(group.radius); setSatelliteCount(group.count); setSatelliteSize(group.sample.size); setSatelliteSpeed(group.sample.orbitSpeed); setSatelliteHue(hexToHue(group.sample.color)); setSatelliteVisibility(group.sample.visibility); setSatelliteGlow(group.sample.glow); setSatelliteTail(group.sample.tailLength || 0); if (group.sample.waveParams) setWaveParams(group.sample.waveParams); else setWaveParams({ amp: 0, freq: 1, phase: 0 }); }
      } else { setSatelliteCount(0); setSatelliteRadius(100); }
    }
  }, [selectedObjectId, activeParamBlock, activeGroupIndex, availableGroups]); 

  const updateItem = (id: string, updates: any, final = false) => {
    let nO = [...objects], nG = [...groups];
    if (objects.find(o => o.id === id)) { nO = objects.map(o => id === o.id ? { ...o, ...updates } : o); setObjects(nO); }
    else if (groups.find(g => g.id === id)) { nG = groups.map(g => g.id === id ? { ...g, ...updates } : g); setGroups(nG); }
    if (final) pushToHistory(nO, nG);
  };

  const deleteObject = (id: string) => {
    const nO = objects.filter(o => o.id !== id && o.parentId !== id);
    const nG = groups.filter(g => g.id !== id && g.parentId !== id);
    setObjects(nO); setGroups(nG);
    if (selectedObjectId === id) setSelectedObjectId(null);
    pushToHistory(nO, nG);
  };

  useEffect(() => {
    const saved = localStorage.getItem('orbital_autosave');
    if (saved) { try { const parsed = JSON.parse(saved); if (parsed.o) setObjects(parsed.o); if (parsed.g) setGroups(parsed.g); if (parsed.s) setSettings(prev => ({ ...prev, ...parsed.s })); } catch (e) { console.error(e); } }
    setObjects(prev => { if (prev.length === 0) { const id = generateId(); const obj: CelestialObject = { id, name: settings.language === 'ru' ? 'Ядро' : 'Core', description: '', color: '#ffffff', glow: 300, opacity: 1, size: 1, orbitRadius: 0, orbitSpeed: 0, orbitDirection: 1, currentAngle: 0, rotationSpeed: 0, rotationDirection: 1, currentRotation: 0, parentId: null, isPinned: true, visibility: 100, type: 'point', tailLength: 0 }; pushToHistory([obj], []); return [obj]; } return prev; });
  }, []);

  const animate = useCallback((timestamp: number) => {
    const dt = (timestamp - lastTimeRef.current) / 1000; lastTimeRef.current = timestamp; setTime(timestamp);
    setObjects(os => os.map(o => ({ ...o, currentRotation: o.currentRotation + o.rotationSpeed * o.rotationDirection * dt * 50, currentAngle: o.isPinned ? o.currentAngle : o.currentAngle + o.orbitSpeed * 0.3 * dt })));
    setGroups(gs => gs.map(g => ({ ...g, currentRotation: g.currentRotation + g.rotationSpeed * g.rotationDirection * dt * 50, currentAngle: g.currentAngle + g.orbitSpeed * 0.3 * dt })));
    requestAnimationFrame(animate);
  }, []);
  useEffect(() => { const id = requestAnimationFrame(animate); return () => cancelAnimationFrame(id); }, [animate]);

  const selectedItem = useMemo(() => objects.find(o => o.id === selectedObjectId) || groups.find(g => g.id === selectedObjectId), [objects, groups, selectedObjectId]);
  const accentColorStyle = { '--slider-thumb': settings.accentColor } as React.CSSProperties;
  const panelStyle = { ...accentColorStyle, backgroundColor: `${settings.panelColor}${Math.floor(settings.panelOpacity * 255).toString(16).padStart(2, '0')}`, borderColor: settings.borderColor };

  const getVisibilityOpacity = (val: number) => { if (val === undefined || val === null) return 1; if (val >= 0) return val / 100; const bpm = Math.abs(val); const interval = 60000 / bpm; return (time % interval) < (interval / 2) ? 1 : 0; };

  const handleObjectDragStart = (id: string, startX: number, startY: number) => {
    setIsObjectDragging(true); setSelectedObjectId(id);
    const onMove = (clientX: number, clientY: number) => {
      const rect = document.body.getBoundingClientRect();
      const centerX = rect.width / 2 + pan.x; const centerY = rect.height / 2 + pan.y;
      let dx = (clientX - centerX) / settings.zoom; let dy = (clientY - centerY) / settings.zoom;
      const item = objects.find(o => o.id === id); if (item && item.parentId) { const ps = calculateAbsoluteState(item.parentId as string); dx -= ps.x; dy -= ps.y; }
      const radius = Math.sqrt(dx * dx + dy * dy); const angle = Math.atan2(dy, dx);
      setObjects(prev => prev.map(o => o.id === id ? { ...o, orbitRadius: radius, currentAngle: angle } : o));
    };
    const onMouseMove = (e: MouseEvent) => onMove(e.clientX, e.clientY);
    const onEnd = () => { setIsObjectDragging(false); pushToHistory(objects, groups); document.removeEventListener('mousemove', onMouseMove); document.removeEventListener('mouseup', onEnd); };
    document.addEventListener('mousemove', onMouseMove); document.addEventListener('mouseup', onEnd);
  };

  const getWavePath = () => { const width = 240; const height = 60; const centerY = height / 2; let d = `M 0 ${centerY}`; for(let x = 0; x <= width; x++) { const angle = (x / width) * 2 * Math.PI; const displayAmp = Math.min(25, waveParams.amp / 4); const y = centerY - displayAmp * Math.sin(waveParams.freq * angle + waveParams.phase * (Math.PI / 180)); d += ` L ${x} ${y}`; } return d; };

  const getTrailPath = (obj: CelestialObject, parentState: { x: number, y: number, rotation: number }) => {
    if (Math.abs(obj.orbitSpeed) < 0.01) return "";
    const segments = 20; const totalAngleDeg = obj.tailLength * 0.6; if (totalAngleDeg < 1) return "";
    const totalAngleRad = totalAngleDeg * (Math.PI / 180);
    const direction = Math.sign(obj.orbitSpeed) || 1; 
    const absAngleBase = obj.currentAngle + (parentState.rotation * Math.PI / 180);
    const startWidth = (obj.size + obj.glow) / 2;
    const polyLeft: {x: number, y: number}[] = []; const polyRight: {x: number, y: number}[] = [];
    for (let i = 0; i <= segments; i++) {
      const progress = i / segments; const angleOffset = direction * totalAngleRad * progress; const theta = absAngleBase - angleOffset; const localTheta = theta - (parentState.rotation * Math.PI / 180);
      let r = obj.orbitRadius; if (obj.waveParams) r += obj.waveParams.amp * Math.sin(obj.waveParams.freq * localTheta + obj.waveParams.phase * (Math.PI / 180));
      const x = r * Math.cos(theta); const y = r * Math.sin(theta); const nx = Math.cos(theta); const ny = Math.sin(theta);
      const currentWidth = startWidth * (1 - progress); polyLeft.push({ x: x + nx * currentWidth, y: y + ny * currentWidth }); polyRight.push({ x: x - nx * currentWidth, y: y - ny * currentWidth });
    }
    let d = `M ${polyLeft[0].x} ${polyLeft[0].y}`; for (let i = 1; i < polyLeft.length; i++) d += ` L ${polyLeft[i].x} ${polyLeft[i].y}`; for (let i = polyRight.length - 1; i >= 0; i--) d += ` L ${polyRight[i].x} ${polyRight[i].y}`; d += " Z"; return d;
  };

  return (
    <div className={`relative w-screen h-screen overflow-hidden flex select-none bg-black text-white text-xs font-sans`} style={{ backgroundImage: settings.backgroundImage ? `url(${settings.backgroundImage})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', ...accentColorStyle }}>
      <style>{`
        @keyframes pulse-red { 0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); } 70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); } 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); } }
        .recording-pulse { animation: pulse-red 2s infinite; background-color: #ef4444 !important; color: white !important; }
        .mood-card { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
        .mood-card:hover { transform: translateY(-2px); background: rgba(255, 255, 255, 0.1); }
        .suggestion-main { background: linear-gradient(135deg, rgba(255,255,255,0.1), rgba(255,255,255,0.02)); border: 1px solid rgba(255,255,255,0.1); border-radius: 1.5rem; overflow: hidden; position: relative; }
        .suggestion-main::after { content: ''; position: absolute; inset: 0; background: radial-gradient(circle at 100% 0%, var(--suggestion-accent, #3b82f6) 0%, transparent 40%); opacity: 0.15; pointer-events: none; }
        .active-mode { background: white !important; color: black !important; border-color: white !important; }
        
        /* Thumbnails Grid Styles */
        .shape-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        .thumbnail-btn {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          transition: all 0.15s;
          color: rgba(255, 255, 255, 0.6);
        }
        .thumbnail-btn:hover {
          background: rgba(255, 255, 255, 0.15);
          color: white;
          transform: scale(1.05);
        }
        .thumbnail-btn.active {
          background: var(--slider-thumb, #ffffff);
          color: black;
          border-color: white;
        }
        .thumbnail-btn i { font-size: 14px; }
      `}</style>
      <input type="file" ref={fileInputRef} className="hidden" accept="image/png" onChange={(e) => handleImageUpload(e, false)} />
      <input type="file" ref={fileInputSatRef} className="hidden" accept="image/png" onChange={(e) => handleImageUpload(e, true)} />
      <input type="file" ref={bgInputRef} className="hidden" accept="image/*" onChange={handleBGUpload} />
      <input type="file" ref={musicInputRef} className="hidden" accept="audio/*" multiple onChange={handleMusicUpload} />
      <input type="file" ref={changeShapeInputRef} className="hidden" accept="image/png" onChange={(e) => handleChangeShapeImage(e)} />
      {currentTrackIndex !== -1 && playlist[currentTrackIndex] && <audio ref={audioRef} src={playlist[currentTrackIndex].url} onEnded={nextTrack} />}

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${settings.zoom})` }}>
        {groups.map(g => { const s = calculateAbsoluteState(g.id); const op = getVisibilityOpacity(g.visibility !== undefined ? g.visibility : 100); return <div key={g.id} className="absolute cursor-pointer pointer-events-auto" onMouseDown={() => setSelectedObjectId(g.id)} style={{ left: `calc(50% + ${s.x}px)`, top: `calc(50% + ${s.y}px)`, width: `10px`, height: `10px`, border: `1px dashed ${g.color}44`, borderRadius: '50%', transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`, backgroundColor: selectedObjectId === g.id ? `${g.color}33` : 'transparent', opacity: op }} /> })}
        {objects.map(obj => { 
          const s = calculateAbsoluteState(obj.id); const op = getVisibilityOpacity(obj.visibility !== undefined ? obj.visibility : 100);
          
          let element;
          const objectStyle: React.CSSProperties = {
            left: `calc(50% + ${s.x}px)`, 
            top: `calc(50% + ${s.y}px)`, 
            width: `${obj.size}px`, 
            height: `${obj.size}px`, 
            transform: `translate(-50%, -50%) rotate(${s.rotation}deg)`, 
            opacity: op,
            position: 'absolute',
            pointerEvents: 'auto',
            cursor: 'pointer'
          };

          if (obj.type === 'line') {
            element = (
              <div 
                className="cursor-pointer pointer-events-auto" 
                onMouseDown={(e) => { e.stopPropagation(); handleObjectDragStart(obj.id, e.clientX, e.clientY); }} 
                style={{ 
                  ...objectStyle,
                  height: `2px`, 
                  background: obj.color,
                  boxShadow: obj.glow > 0 ? `0 0 ${obj.glow}px ${obj.color}` : 'none', 
                }} 
              />
            );
          } else if (obj.type === 'star' || obj.type === 'outlineStar') {
            element = (
              <div 
                onMouseDown={(e) => { e.stopPropagation(); handleObjectDragStart(obj.id, e.clientX, e.clientY); }}
                style={{ ...objectStyle }}
              >
                <StarSVG 
                  fill={obj.color} 
                  size={obj.size} 
                  outline={obj.type === 'outlineStar'} 
                  className={obj.glow > 0 ? 'drop-shadow-glow' : ''}
                  style={obj.glow > 0 ? { filter: `drop-shadow(0 0 ${obj.glow}px ${obj.color})` } : {}}
                />
              </div>
            );
          } else if (obj.type === 'outlineCircle') {
            element = (
              <div 
                onMouseDown={(e) => { e.stopPropagation(); handleObjectDragStart(obj.id, e.clientX, e.clientY); }} 
                style={{ 
                  ...objectStyle,
                  background: 'transparent',
                  border: `2px solid ${obj.color}`,
                  borderRadius: '50%',
                  boxShadow: obj.glow > 0 ? `0 0 ${obj.glow}px ${obj.color}` : 'none', 
                }} 
              />
            );
          } else {
            let backgroundStyle = obj.type === 'image' && obj.image ? `url(${obj.image})` : obj.type === 'sphere' ? `radial-gradient(circle at 30% 30%, ${obj.color}, #000)` : obj.color;
            element = (
              <div 
                className="cursor-pointer pointer-events-auto" 
                onMouseDown={(e) => { e.stopPropagation(); handleObjectDragStart(obj.id, e.clientX, e.clientY); }} 
                style={{ 
                  ...objectStyle,
                  background: backgroundStyle, 
                  backgroundSize: 'cover', 
                  backgroundPosition: 'center', 
                  borderRadius: obj.type === 'image' ? '0' : '50%', 
                  boxShadow: obj.glow > 0 ? `0 0 ${obj.glow}px ${obj.glow / 2}px ${obj.color}` : 'none', 
                }} 
              />
            );
          }

          let parentState = obj.parentId ? calculateAbsoluteState(obj.parentId as string) : { x: 0, y: 0, rotation: 0 };
          return (
            <React.Fragment key={obj.id}>
               {obj.tailLength > 0 && <div className="absolute" style={{ left: `calc(50% + ${parentState.x}px)`, top: `calc(50% + ${parentState.y}px)`, overflow: 'visible', width: 0, height: 0, zIndex: -1, opacity: op * 0.6 }}><svg style={{ overflow: 'visible' }}><path d={getTrailPath(obj, parentState)} fill={obj.color} style={{ filter: `blur(${Math.max(2, obj.glow/2)}px)` }} /></svg></div>}
               {element}
            </React.Fragment>
          );
        })}
      </div>

      {!isUiHidden && (
        <>
          <div className="absolute flex flex-col gap-3 z-[150] p-4 glass-panel rounded-[2rem] border shadow-2xl drag-handle" onMouseDown={mainControlsPos.onMouseDown} style={{ top: mainControlsPos.pos.y, left: mainControlsPos.pos.x, borderColor: settings.borderColor }}>
            <button onClick={() => setIsSettingsOpen(!isSettingsOpen)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isSettingsOpen ? 'text-white' : 'bg-white/5 hover:bg-white/10'}`} style={isSettingsOpen ? { backgroundColor: settings.accentColor } : {}}><i className="fas fa-cog text-lg"></i></button>
            <button onClick={() => setIsObjectListOpen(!isObjectListOpen)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isObjectListOpen ? 'text-white' : 'bg-white/5 hover:bg-white/10'}`} style={isObjectListOpen ? { backgroundColor: settings.accentColor } : {}}><i className="fas fa-list-ul text-lg"></i></button>
            <button onClick={() => setIsDesignerOpen(!isDesignerOpen)} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isDesignerOpen ? 'text-white' : 'bg-white/5 hover:bg-white/10'}`} style={isDesignerOpen ? { backgroundColor: settings.accentColor } : {}}><i className="fas fa-wand-magic-sparkles text-lg"></i></button>
            <button onClick={handleToggleRecording} className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${isRecording ? 'recording-pulse' : 'bg-white/5 hover:bg-white/10'}`} title={isRecording ? t.stop : t.record}><i className={`fas ${isRecording ? 'fa-stop' : 'fa-video'} text-lg`}></i></button>
            <div className="relative">
              <button onClick={() => setIsAddMenuOpen(!isAddMenuOpen)} className="w-12 h-12 rounded-2xl bg-white text-black flex items-center justify-center shadow-xl hover:scale-110 active:scale-90 transition-all"><i className="fas fa-plus text-xl"></i></button>
              {isAddMenuOpen && (
                <div className="absolute left-16 top-0 glass-panel border p-3 rounded-2xl shadow-2xl z-[300]" style={panelStyle}>
                  <div className="shape-grid">
                    <button onClick={() => handleAddObject('circle')} className="thumbnail-btn" title={t.add_circle}><i className="fas fa-circle"></i></button>
                    <button onClick={() => handleAddObject('sphere')} className="thumbnail-btn" title={t.add_sphere}><i className="fas fa-globe"></i></button>
                    <button onClick={() => handleAddObject('star')} className="thumbnail-btn" title="Star"><StarSVG fill="currentColor" size={16}/></button>
                    <button onClick={() => handleAddObject('outlineStar')} className="thumbnail-btn" title="Outline Star"><StarSVG fill="currentColor" size={16} outline/></button>
                    <button onClick={() => handleAddObject('outlineCircle')} className="thumbnail-btn" title="Outline Circle"><i className="far fa-circle"></i></button>
                    <button onClick={() => handleAddObject('point')} className="thumbnail-btn" title={t.add_point}><i className="fas fa-dot-circle"></i></button>
                    <button onClick={() => handleAddObject('line')} className="thumbnail-btn" title={t.add_line}><i className="fas fa-minus rotate-45"></i></button>
                    <button onClick={() => fileInputRef.current?.click()} className="thumbnail-btn" title={t.add_image}><i className="fas fa-image"></i></button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {isDesignerOpen && (
            <div className={`absolute glass-panel rounded-[2rem] p-6 border z-[200] shadow-2xl flex flex-col gap-4 w-80 max-h-[85vh]`} style={{ ...panelStyle, left: designerPanelPos.pos.x, top: designerPanelPos.pos.y }}>
              <div className="drag-handle flex flex-col border-b border-white/5 pb-3 shrink-0" onMouseDown={designerPanelPos.onMouseDown}>
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-black tracking-[0.2em] text-white text-[10px] uppercase">{t.designer}</h2>
                  <button onClick={() => setIsDesignerOpen(false)} className="opacity-30 hover:opacity-100"><i className="fas fa-times text-[10px]"></i></button>
                </div>
                <p className="text-[7px] font-bold opacity-40 uppercase tracking-tighter">{t.designer_desc}</p>
              </div>

              <div className="flex flex-col gap-2 p-1 bg-white/5 rounded-2xl border border-white/5 shrink-0">
                  <div className="grid grid-cols-3 gap-1">
                    <button onClick={() => setDesignerMode('smooth')} className={`py-2 rounded-xl text-[7px] font-black uppercase transition-all border border-transparent ${designerMode === 'smooth' ? 'active-mode' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}>{t.mode_smooth}</button>
                    <button onClick={() => setDesignerMode('impulse')} className={`py-2 rounded-xl text-[7px] font-black uppercase transition-all border border-transparent ${designerMode === 'impulse' ? 'active-mode' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}>{t.mode_impulse}</button>
                    <button onClick={() => setDesignerMode('chaos')} className={`py-2 rounded-xl text-[7px] font-black uppercase transition-all border border-transparent ${designerMode === 'chaos' ? 'active-mode' : 'hover:bg-white/5 opacity-50 hover:opacity-100'}`}>{t.mode_chaos}</button>
                  </div>
              </div>
              
              <div className="flex flex-col gap-2 shrink-0">
                <button 
                  onClick={handleGenerateAndApply}
                  className="w-full py-4 rounded-3xl bg-white text-black font-black uppercase text-[11px] transition-all flex items-center justify-center gap-2 shadow-2xl shadow-white/10 active:scale-95 group"
                >
                  <i className="fas fa-magic group-hover:rotate-45 transition-transform"></i> {t.next_design}
                </button>
              </div>

              <div className="flex flex-col gap-1.5 overflow-y-auto no-scrollbar pr-1 max-h-48 border-t border-white/5 pt-3">
                  <div className="text-[7px] font-black opacity-30 uppercase mb-1 tracking-widest">{t.apply_design}</div>
                  {suggestedDesigns.map((design) => (
                    <button key={design.id} onClick={() => applyDesign(design)} className="mood-card flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5 group text-left transition-all active:bg-white/10">
                      <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-white/60 truncate w-32">{design.name}</span>
                        <span className="text-[6px] opacity-20 uppercase font-bold tracking-tighter">{design.sats.type} / {(design.wave.amp/10).toFixed(0)} E</span>
                      </div>
                      <div className="flex gap-1.5">
                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: design.core.color }} />
                        <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: design.sats.color }} />
                      </div>
                    </button>
                  ))}
              </div>
              
              <div className="mt-auto pt-3 border-t border-white/5 shrink-0 flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-[6px] font-black opacity-30 uppercase tracking-widest">Spectral Beat</span>
                  <span className="text-[13px] font-mono font-black text-white">{detectedBpm} <span className="text-[6px] opacity-30 tracking-tight">BPM</span></span>
                </div>
                <div className="flex gap-1 items-end h-7">
                  {[...Array(12)].map((_, i) => (
                    <div 
                        key={i} 
                        className="w-1.5 bg-white/10 rounded-full transition-all duration-75" 
                        style={{ 
                            height: isPlaying ? `${Math.random() * 100}%` : '20%', 
                            backgroundColor: settings.accentColor,
                            opacity: 0.3 + (i / 12) * 0.7
                        }} 
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {isSettingsOpen && (
            <div className={`absolute glass-panel rounded-[2rem] p-6 border z-[200] shadow-2xl flex flex-col gap-4 w-64 max-h-[85vh] overflow-y-auto no-scrollbar`} style={{ ...panelStyle, left: settingsPanelPos.pos.x, top: settingsPanelPos.pos.y }}>
              <div className="drag-handle flex items-center justify-between border-b border-white/5 pb-2" onMouseDown={settingsPanelPos.onMouseDown}><h2 className="font-black tracking-[0.2em] opacity-40 text-[8px] uppercase">{t.settings}</h2><button onClick={() => setIsSettingsOpen(false)} className="opacity-30 hover:opacity-100"><i className="fas fa-times text-[10px]"></i></button></div>
              <div className="space-y-4">
                <div className="flex gap-1.5"><button onClick={() => setSettings(s => ({...s, language: 'ru'}))} className={`flex-grow py-2 rounded-lg text-[8px] font-black ${settings.language === 'ru' ? 'text-white' : 'bg-white/5'}`} style={settings.language === 'ru' ? { backgroundColor: settings.accentColor } : {}}>RU</button><button onClick={() => setSettings(s => ({...s, language: 'en'}))} className={`flex-grow py-2 rounded-lg text-[8px] font-black ${settings.language === 'en' ? 'text-white' : 'bg-white/5'}`} style={settings.language === 'en' ? { backgroundColor: settings.accentColor } : {}}>EN</button></div>
                <MiniSlider label={t.panel_opacity} min={0.1} max={1} step={0.01} value={settings.panelOpacity} onChange={v => setSettings(s => ({ ...s, panelOpacity: v }))} /><MiniSlider label={t.panel_hue} min={0} max={360} value={hexToHue(settings.panelColor)} onChange={v => setSettings(s => ({ ...s, panelColor: hueToHex(v) }))} /><MiniSlider label={t.accent_hue} min={0} max={360} value={hexToHue(settings.accentColor)} onChange={v => setSettings(s => ({ ...s, accentColor: hueToHex(v) }))} /><MiniSlider label={t.border_hue} min={0} max={360} value={hexToHue(settings.borderColor)} onChange={v => setSettings(s => ({ ...s, borderColor: hueToHex(v) + '44' }))} />
                <div className="h-px bg-white/5 my-2" /><div className="flex flex-col gap-2"><label className="text-[7px] uppercase opacity-40 font-black tracking-tighter">{t.bg_image}</label><button onClick={() => bgInputRef.current?.click()} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase transition-all border border-white/5">{settings.backgroundImage ? "ИЗМЕНИТЬ ФОН" : "ВЫБРАТЬ ФОН"}</button>{settings.backgroundImage && <button onClick={() => setSettings(s => ({...s, backgroundImage: null}))} className="text-[7px] opacity-30 hover:opacity-100 uppercase font-black text-center">УДАЛИТЬ ФОН</button>}</div>
                <div className="h-px bg-white/5 my-2" /><div className="flex flex-col gap-2"><div className="flex items-center justify-between"><label className="text-[7px] uppercase opacity-40 font-black tracking-tighter">{t.music}</label><button onClick={() => musicInputRef.current?.click()} className="text-[7px] opacity-40 hover:opacity-100 uppercase font-black">{t.add_track}</button></div><MiniSlider label={t.volume} min={0} max={1} step={0.01} value={settings.volume} onChange={v => setSettings(s => ({...s, volume: v}))} /><div className="max-h-32 overflow-y-auto no-scrollbar space-y-1">{playlist.length === 0 ? <div className="text-[8px] opacity-20 text-center py-4 font-black uppercase">{t.empty_playlist}</div> : playlist.map((track, idx) => <div key={track.id} onClick={() => playTrack(idx)} className={`p-2 rounded-lg text-[8px] font-black truncate cursor-pointer transition-all ${currentTrackIndex === idx ? 'bg-white text-black' : 'bg-white/5 hover:bg-white/10'}`}>{track.name}</div>)}</div>{playlist.length > 0 && <div className="flex flex-col gap-2 mt-1"><div className="flex gap-2"><button onClick={() => setIsPlaying(!isPlaying)} className="flex-grow py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[8px] font-black uppercase">{isPlaying ? <i className="fas fa-pause"></i> : <i className="fas fa-play"></i>}</button><button onClick={nextTrack} className="flex-grow py-2 rounded-lg bg-white/10 hover:bg-white/20 text-[8px] font-black uppercase"><i className="fas fa-step-forward"></i></button></div><button onClick={toggleBpmSync} className={`w-full py-2.5 rounded-xl text-[8px] font-black uppercase transition-all flex items-center justify-center gap-2 ${isBpmSyncing ? 'bg-white text-black animate-pulse' : 'bg-white/10 hover:bg-white/20'}`}><i className="fas fa-bolt"></i> {isBpmSyncing ? t.detecting : t.sync_bpm}</button></div>}</div>
              </div>
            </div>
          )}

          {isGraphOpen && (
             <div className="absolute glass-panel rounded-[1.5rem] p-4 border z-[260] shadow-2xl flex flex-col gap-3 w-64" style={{ ...panelStyle, left: graphPanelPos.pos.x, top: graphPanelPos.pos.y }}>
                 <div className="drag-handle flex items-center justify-between border-b border-white/10 pb-2" onMouseDown={graphPanelPos.onMouseDown}><h2 className="font-black tracking-[0.2em] opacity-40 text-[8px] uppercase">{t.graph}</h2><button onClick={() => setIsGraphOpen(false)} className="opacity-30 hover:opacity-100"><i className="fas fa-times text-[10px]"></i></button></div>
                 <div className="bg-black/20 rounded-lg h-16 border border-white/5 flex items-center justify-center overflow-hidden"><svg width="100%" height="100%" viewBox="0 0 240 60" preserveAspectRatio="none"><path d={getWavePath()} fill="none" stroke={settings.accentColor} strokeWidth="2" /></svg></div>
                 <div className="space-y-2"><MiniSlider label={t.amplitude} min={-100} max={100} value={waveParams.amp} onChange={v => handleWaveChange('amp', v)} /><MiniSlider label={t.frequency} min={0} max={20} step={1} value={waveParams.freq} onChange={v => handleWaveChange('freq', v)} /><MiniSlider label={t.phase} min={0} max={360} value={waveParams.phase} onChange={v => handleWaveChange('phase', v)} /></div>
             </div>
          )}

          {isObjectListOpen && (
            <div className={`absolute glass-panel rounded-[2rem] p-6 border z-[200] shadow-2xl flex flex-col gap-4 w-64 max-h-96`} style={{ ...panelStyle, left: listPanelPos.pos.x, top: listPanelPos.pos.y }}>
              <div className="drag-handle flex items-center justify-between border-b border-white/5 pb-2" onMouseDown={listPanelPos.onMouseDown}><h2 className="font-black tracking-[0.2em] opacity-40 text-[8px] uppercase">{t.objects}</h2><button onClick={() => setIsObjectListOpen(false)} className="opacity-30 hover:opacity-100"><i className="fas fa-times text-[10px]"></i></button></div>
              <div className="flex-grow overflow-y-auto no-scrollbar space-y-1.5 pr-1">{objects.map(obj => <div key={obj.id} onClick={() => setSelectedObjectId(obj.id)} className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${selectedObjectId === obj.id ? 'bg-white/20' : 'bg-white/5 hover:bg-white/10'}`} style={selectedObjectId === obj.id ? { borderColor: settings.accentColor } : { borderColor: 'transparent' }}><div className="flex items-center gap-2 truncate"><div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: obj.color }} /><span className="font-black text-[9px] truncate">{obj.name}</span></div><button onClick={(e) => { e.stopPropagation(); deleteObject(obj.id); }} className="w-6 h-6 flex items-center justify-center opacity-20 hover:opacity-100 text-red-500"><i className="fas fa-trash-alt text-[8px]"></i></button></div>)}</div>
            </div>
          )}

          {selectedItem && (
            <div className={`absolute glass-panel rounded-[1.5rem] p-4 border z-[250] shadow-2xl flex flex-col gap-3 w-72 max-h-[85vh] overflow-y-auto no-scrollbar`} style={{ ...panelStyle, left: paramsPanelPos.pos.x, top: paramsPanelPos.pos.y }}>
              <div className="drag-handle flex items-center justify-between border-b border-white/10 pb-2" onMouseDown={paramsPanelPos.onMouseDown}><div className="flex items-center gap-2"><div className="w-5 h-5 rounded-full shrink-0 shadow-inner" style={{ backgroundColor: selectedItem.color, border: '1px solid rgba(255,255,255,0.1)' }} /><input className="bg-transparent border-none text-[10px] font-black outline-none uppercase w-20 truncate" value={selectedItem.name} onChange={e => updateItem(selectedItem.id, { name: e.target.value })} /></div><div className="flex gap-1 items-center">{[0,1,2].map(idx => <button key={idx} onClick={() => setActiveParamBlock(idx)} className={`w-6 h-6 rounded-lg transition-all ${activeParamBlock === idx ? 'text-white' : 'bg-white/5 opacity-30 hover:opacity-100'}`} style={activeParamBlock === idx ? { backgroundColor: settings.accentColor } : {}}><i className={`fas fa-${['palette', 'sync', 'satellite'][idx]} text-[8px]`}></i></button>)}<div className="w-px h-4 bg-white/10 mx-1" /><button onClick={() => setSelectedObjectId(null)} className="opacity-30 hover:opacity-100"><i className="fas fa-times text-[10px]"></i></button></div></div>
              <div className="py-1">
                {activeParamBlock === 0 ? <div className="space-y-4 animate-in fade-in">{'type' in selectedItem && (<div className="flex flex-col gap-2"><label className="text-[7px] uppercase opacity-40 font-black tracking-tighter">{t.shape}</label>
                <div className="shape-grid">
                  <button onClick={() => updateItem(selectedItem.id, { type: 'circle' })} className={`thumbnail-btn ${selectedItem.type === 'circle' ? 'active' : ''}`}><i className="fas fa-circle"></i></button>
                  <button onClick={() => updateItem(selectedItem.id, { type: 'sphere' })} className={`thumbnail-btn ${selectedItem.type === 'sphere' ? 'active' : ''}`}><i className="fas fa-globe"></i></button>
                  <button onClick={() => updateItem(selectedItem.id, { type: 'star' })} className={`thumbnail-btn ${selectedItem.type === 'star' ? 'active' : ''}`}><StarSVG fill="currentColor" size={14}/></button>
                  <button onClick={() => updateItem(selectedItem.id, { type: 'outlineStar' })} className={`thumbnail-btn ${selectedItem.type === 'outlineStar' ? 'active' : ''}`}><StarSVG fill="currentColor" size={14} outline/></button>
                  <button onClick={() => updateItem(selectedItem.id, { type: 'outlineCircle' })} className={`thumbnail-btn ${selectedItem.type === 'outlineCircle' ? 'active' : ''}`}><i className="far fa-circle"></i></button>
                  <button onClick={() => updateItem(selectedItem.id, { type: 'point' })} className={`thumbnail-btn ${selectedItem.type === 'point' ? 'active' : ''}`}><i className="fas fa-dot-circle"></i></button>
                  <button onClick={() => updateItem(selectedItem.id, { type: 'line' })} className={`thumbnail-btn ${selectedItem.type === 'line' ? 'active' : ''}`}><i className="fas fa-minus rotate-45"></i></button>
                  <button onClick={() => changeShapeInputRef.current?.click()} className={`thumbnail-btn ${selectedItem.type === 'image' ? 'active' : ''}`}><i className="fas fa-image"></i></button>
                </div>
                </div>)}<MiniSlider label={t.object_hue} min={0} max={360} value={hexToHue(selectedItem.color)} onChange={v => updateItem(selectedItem.id, { color: hueToHex(v) })} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.glow} min={0} max={300} value={(selectedItem as any).glow} onChange={v => updateItem(selectedItem.id, { glow: v })} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.tail} min={0} max={200} value={(selectedItem as any).tailLength || 0} onChange={v => updateItem(selectedItem.id, { tailLength: v })} onFinalChange={() => pushToHistory(objects, groups)} /><div className="flex flex-col gap-0.5 mb-1.5"><div className="flex items-center justify-between"><label className="text-[7px] uppercase opacity-40 font-black tracking-tighter">{t.visibility}</label><button onClick={() => updateItem(selectedItem.id, { visibility: (selectedItem.visibility ?? 100) >= 0 ? -60 : 100 })} className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded transition-all ${(selectedItem.visibility ?? 100) < 0 ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>{(selectedItem.visibility ?? 100) < 0 ? "BPM" : "%"}</button></div>{(selectedItem.visibility ?? 100) < 0 ? (<MiniSlider min={60} max={240} step={1} value={Math.abs(selectedItem.visibility!)} onChange={v => updateItem(selectedItem.id, { visibility: -v })} onFinalChange={() => pushToHistory(objects, groups)} />) : (<MiniSlider min={0} max={100} value={selectedItem.visibility ?? 100} onChange={v => updateItem(selectedItem.id, { visibility: v })} onFinalChange={() => pushToHistory(objects, groups)} />)}</div></div> : activeParamBlock === 1 ? <div className="space-y-2 animate-in fade-in"><MiniSlider label={t.size} min={1} max={1000} value={(selectedItem as any).size || 10} onChange={v => updateItem(selectedItem.id, { size: v })} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.distance} min={0} max={2500} value={selectedItem.orbitRadius} onChange={v => updateItem(selectedItem.id, { orbitRadius: v })} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.speed} min={-400} max={400} step={0.01} value={selectedItem.orbitSpeed} onChange={v => updateItem(selectedItem.id, { orbitSpeed: v })} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.rotation} min={-20} max={20} step={0.01} value={selectedItem.rotationSpeed * selectedItem.rotationDirection} onChange={v => updateItem(selectedItem.id, { rotationSpeed: Math.abs(v), rotationDirection: v < 0 ? -1 : 1 })} onFinalChange={() => pushToHistory(objects, groups)} /></div> : <div className="space-y-3 animate-in fade-in pb-2"><div className="flex flex-col gap-2"><label className="text-[7px] uppercase opacity-40 font-black tracking-tighter">{t.add_satellites}</label>{availableGroups.length > 0 && (<div className="flex flex-wrap gap-1 mb-2 bg-white/5 p-2 rounded-xl">{availableGroups.map((g, i) => (<button key={i} onClick={() => setActiveGroupIndex(i)} className={`px-2 py-1 rounded text-[7px] font-black transition-all ${activeGroupIndex === i ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>{t.orbit_level} {i + 1}</button>))}<button onClick={handleAddGroup} className="px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-[7px] font-black"><i className="fas fa-plus"></i></button></div>)}<MiniSlider label={t.distance} min={0} max={1000} step={1} value={satelliteRadius} onChange={(v) => { setSatelliteRadius(v); batchUpdateSatellites({ orbitRadius: v }, true); }} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.size} min={1} max={300} step={1} value={satelliteSize} onChange={(v) => { setSatelliteSize(v); batchUpdateSatellites({ size: v }); }} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.glow} min={0} max={200} step={1} value={satelliteGlow} onChange={(v) => { setSatelliteGlow(v); batchUpdateSatellites({ glow: v }); }} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.tail} min={0} max={200} step={1} value={satelliteTail} onChange={(v) => { setSatelliteTail(v); batchUpdateSatellites({ tailLength: v }); }} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.speed} min={-400} max={400} step={0.1} value={satelliteSpeed} onChange={(v) => { setSatelliteSpeed(v); batchUpdateSatellites({ orbitSpeed: v }); }} onFinalChange={() => pushToHistory(objects, groups)} /><MiniSlider label={t.object_hue} min={0} max={360} value={satelliteHue} onChange={(v) => { setSatelliteHue(v); batchUpdateSatellites({ color: hueToHex(v) }); }} onFinalChange={() => pushToHistory(objects, groups)} /><div className="flex flex-col gap-0.5 mb-1.5"><div className="flex items-center justify-between"><label className="text-[7px] uppercase opacity-40 font-black tracking-tighter">{t.visibility}</label><button onClick={() => { const newVal = satelliteVisibility >= 0 ? -60 : 100; setSatelliteVisibility(newVal); batchUpdateSatellites({ visibility: newVal }); }} className={`text-[7px] font-black uppercase px-1.5 py-0.5 rounded transition-all ${satelliteVisibility < 0 ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20'}`}>{satelliteVisibility < 0 ? "BPM" : "%"}</button></div>{satelliteVisibility < 0 ? (<MiniSlider min={60} max={240} step={1} value={Math.abs(satelliteVisibility)} onChange={v => { setSatelliteVisibility(-v); batchUpdateSatellites({ visibility: -v }); }} onFinalChange={() => pushToHistory(objects, groups)} />) : (<MiniSlider min={0} max={100} value={satelliteVisibility} onChange={v => { setSatelliteVisibility(v); batchUpdateSatellites({ visibility: v }); }} onFinalChange={() => pushToHistory(objects, groups)} />)}</div><div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center justify-between bg-white/5 p-2 rounded-xl"><label className="text-[7px] opacity-40 font-black uppercase">{t.sat_count}</label><NumericStepper value={satelliteCount} min={0} max={100} onChange={updateSatelliteCount} /></div>
                    <div className="shape-grid">
                      <button onClick={() => handleSetSatellitesType(selectedItem.id, 'circle')} className="thumbnail-btn" title={t.add_circle}><i className="fas fa-circle"></i></button>
                      <button onClick={() => handleSetSatellitesType(selectedItem.id, 'sphere')} className="thumbnail-btn" title={t.add_sphere}><i className="fas fa-globe"></i></button>
                      <button onClick={() => handleSetSatellitesType(selectedItem.id, 'star')} className="thumbnail-btn" title="Star"><StarSVG fill="currentColor" size={14}/></button>
                      <button onClick={() => handleSetSatellitesType(selectedItem.id, 'outlineStar')} className="thumbnail-btn" title="Outline Star"><StarSVG fill="currentColor" size={14} outline/></button>
                      <button onClick={() => handleSetSatellitesType(selectedItem.id, 'outlineCircle')} className="thumbnail-btn" title="Outline Circle"><i className="far fa-circle"></i></button>
                      <button onClick={() => handleSetSatellitesType(selectedItem.id, 'point')} className="thumbnail-btn" title={t.add_point}><i className="fas fa-dot-circle"></i></button>
                      <button onClick={() => handleSetSatellitesType(selectedItem.id, 'line')} className="thumbnail-btn" title={t.add_line}><i className="fas fa-minus rotate-45"></i></button>
                      <button onClick={() => fileInputSatRef.current?.click()} className="thumbnail-btn" title={t.add_image}><i className="fas fa-image"></i></button>
                    </div>
                    <button onClick={() => setIsGraphOpen(!isGraphOpen)} className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-[8px] font-black uppercase transition-all border border-white/5 flex items-center justify-center gap-2"><i className="fas fa-wave-square"></i> {t.graph}</button>{availableGroups.length === 0 && <button onClick={handleAddGroup} className="w-full py-2.5 rounded-xl text-[8px] font-black uppercase transition-all" style={{ backgroundColor: settings.accentColor }}>{t.add_group}</button>}</div></div></div>}
              </div>
            </div>
          )}
          <div className="zoom-slider-container" style={accentColorStyle}><input type="range" min="0.1" max="5" step="0.01" value={settings.zoom} onChange={e => setSettings(s => ({ ...s, zoom: parseFloat(e.target.value)}))} className="vertical-slider" /></div>
        </>
      )}
      <button onClick={() => setIsUiHidden(!isUiHidden)} className="absolute bottom-6 left-6 w-12 h-12 rounded-full glass-panel border flex items-center justify-center transition-all z-[300] opacity-40 hover:opacity-100 hover:scale-110 active:scale-95 shadow-lg" style={{ borderColor: settings.borderColor }} title={isUiHidden ? t.show_ui : t.hide_ui}><i className={`fas ${isUiHidden ? 'fa-eye' : 'fa-eye-slash'} text-sm`}></i></button>
    </div>
  );
};

export default App;
