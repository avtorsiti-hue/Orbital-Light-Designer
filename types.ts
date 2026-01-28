
export type ObjectType = 'circle' | 'sphere' | 'image' | 'point' | 'line' | 'star' | 'outlineStar' | 'outlineCircle';

export interface CelestialObject {
  id: string;
  name: string;
  description: string;
  color: string;
  glow: number;
  opacity: number;
  size: number;
  visibility: number; // 0: transparent, 100: opaque, 1-99: blink frequency
  image?: string | null; // Base64 or URL for PNG texture
  type: ObjectType;
  
  // Orbit/Movement
  orbitRadius: number;
  orbitSpeed: number; // Signed: positive for CW, negative for CCW
  orbitDirection: number; // 1 or -1
  currentAngle: number;
  
  // Rotation (around itself)
  rotationSpeed: number;
  rotationDirection: number; // 1 or -1
  currentRotation: number;
  
  // Hierarchy
  parentId: string | null; // Group ID
  groupId?: string; // Explicit Group Identifier
  isPinned: boolean;

  // Effects
  tailLength: number;

  // Trajectory
  waveParams?: {
    amp: number;
    freq: number;
    phase: number;
  };
}

export interface OrbitGroup {
  id: string;
  name: string;
  description: string;
  color: string;
  visibility: number;
  
  orbitRadius: number;
  orbitSpeed: number;
  orbitDirection: number;
  currentAngle: number;
  
  rotationSpeed: number;
  rotationDirection: number;
  currentRotation: number;
  
  childIds: string[]; 
  parentId: string | null; 
}

export type Language = 'ru' | 'en';

export interface AppSettings {
  panelColor: string;
  accentColor: string;
  borderColor: string;
  panelOpacity: number;
  backgroundColor: string;
  backgroundImage: string | null;
  zoom: number;
  language: Language;
  volume: number;
  zoomSliderColor: string;
}

export interface PanelPositions {
  settings: { x: number, y: number };
  list: { x: number, y: number };
  params: { x: number, y: number };
  mainControls: { x: number, y: number };
  player: { x: number, y: number };
}

export interface Track {
  id: string;
  name: string;
  url: string;
}

export interface SavedConfig {
  id: string;
  name: string;
  objects: CelestialObject[];
  groups: OrbitGroup[];
  positions?: PanelPositions;
  date: number;
}
