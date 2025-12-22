export interface Point {
  x: number;
  y: number;
}

export interface CanvasElement {
  id: string;
  type: 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text' | 'freedraw' | 'selection';
  x: number;
  y: number;
  width: number;
  height: number;
  angle: number;
  strokeColor: string;
  backgroundColor: string;
  fillStyle: 'solid' | 'hachure' | 'cross-hatch';
  strokeWidth: number;
  roughness: number;
  opacity: number;
  points?: Point[]; // For lines and freedraw
  text?: string; // For text elements
  fontSize?: number;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  arrowStart?: boolean;
  arrowEnd?: boolean;
  locked?: boolean;
  groupIds?: string[];
}

export interface AppState {
  viewBackgroundColor: string;
  currentItemStrokeColor: string;
  currentItemBackgroundColor: string;
  currentItemFillStyle: 'solid' | 'hachure' | 'cross-hatch';
  currentItemStrokeWidth: number;
  currentItemRoughness: number;
  currentItemOpacity: number;
  currentItemFontSize: number;
  currentItemFontFamily: string;
  currentItemTextAlign: 'left' | 'center' | 'right';
  currentItemArrowStart: boolean;
  currentItemArrowEnd: boolean;
  activeTool: {
    type: 'selection' | 'rectangle' | 'ellipse' | 'arrow' | 'line' | 'text' | 'freedraw' | 'eraser' | 'hand';
    locked: boolean;
  };
  selectedElementIds: Record<string, boolean>;
  zoom: {
    value: number;
  };
  scrollX: number;
  scrollY: number;
  gridSize: number | null;
  showGrid: boolean;
  theme: 'light' | 'dark';
  isViewModeEnabled: boolean;
  isZenModeEnabled: boolean;
  isGridModeEnabled: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  color: string;
  cursor?: Point;
}

export interface RoomData {
  id: number;
  slug: string;
  name: string;
  isPublic: boolean;
  adminId: string;
  members: User[];
  canvas?: {
    id: number;
    elements: CanvasElement[];
    version: number;
  };
}

export interface WSMessage {
  type: string;
  roomId?: string;
  [key: string]: any;
}

export const DEFAULT_APP_STATE: AppState = {
  viewBackgroundColor: '#ffffff',
  currentItemStrokeColor: '#000000',
  currentItemBackgroundColor: 'transparent',
  currentItemFillStyle: 'solid',
  currentItemStrokeWidth: 1,
  currentItemRoughness: 1,
  currentItemOpacity: 100,
  currentItemFontSize: 20,
  currentItemFontFamily: 'Virgil',
  currentItemTextAlign: 'left',
  currentItemArrowStart: false,
  currentItemArrowEnd: true,
  activeTool: {
    type: 'selection',
    locked: false,
  },
  selectedElementIds: {},
  zoom: {
    value: 1,
  },
  scrollX: 0,
  scrollY: 0,
  gridSize: null,
  showGrid: false,
  theme: 'light',
  isViewModeEnabled: false,
  isZenModeEnabled: false,
  isGridModeEnabled: false,
};

export const COLORS = {
  // Stroke colors
  black: '#000000',
  gray: '#6c757d',
  red: '#e03131',
  pink: '#e64980',
  grape: '#be4bdb',
  violet: '#7950f2',
  indigo: '#4c6ef5',
  blue: '#228be6',
  cyan: '#15aabf',
  teal: '#12b886',
  green: '#40c057',
  lime: '#82c91e',
  yellow: '#fab005',
  orange: '#fd7e14',
};

export const FONT_FAMILIES = {
  Virgil: 'Virgil, Segoe UI Emoji',
  Helvetica: 'Helvetica, Segoe UI Emoji',
  Cascadia: 'Cascadia, Segoe UI Emoji',
};

export const STROKE_WIDTHS = [1, 2, 4, 8];

export const FONT_SIZES = [16, 20, 28, 36];

export const ROUGHNESS_VALUES = [0, 1, 2];

export const ZOOM_STEP = 0.1;
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 30;
