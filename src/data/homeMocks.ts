/**
 * Mock home data for testing and scan simulation
 */

import type { ChipData } from '../components/home/HeroCleanCard';
import type { CategoryBundle } from '../components/home/CategoryTilesGrid';

export interface MonthData {
  key: string;
  label: string;
  year: number;
  count: number;
  previewUris?: string[];
}

export interface HomeData {
  progress: number;
  spaceReadyMB: number;
  chips: ChipData[];
  bundles: CategoryBundle[];
  months: MonthData[];
  totalPhotos: number;
  totalVideos: number;
  lastScanDate?: Date;
}

/**
 * Generate random fake preview URIs
 */
const generatePreviewUris = (count: number): string[] => {
  const uris: string[] = [];
  for (let i = 0; i < Math.min(count, 3); i++) {
    uris.push(`https://picsum.photos/seed/${Math.random()}/200`);
  }
  return uris;
};

/**
 * Generate mock chips data
 */
const generateChipsData = (): ChipData[] => [
  {
    id: 'todo',
    label: 'Todo',
    count: Math.floor(Math.random() * 500) + 1200,
  },
  {
    id: 'screenshots',
    label: 'Screenshots',
    count: Math.floor(Math.random() * 200) + 150,
  },
  {
    id: 'blurry',
    label: 'Blurry',
    count: Math.floor(Math.random() * 50) + 30,
  },
  {
    id: 'similar',
    label: 'Similar',
    count: Math.floor(Math.random() * 100) + 80,
  },
  {
    id: 'videos',
    label: 'Videos',
    count: Math.floor(Math.random() * 30) + 20,
  },
];

/**
 * Generate mock bundles data
 */
const generateBundlesData = (): CategoryBundle[] => [
  {
    key: 'duplicados',
    title: 'Duplicados',
    icon: null,
    count: Math.floor(Math.random() * 150) + 100,
    locked: true,
  },
  {
    key: 'borrosas',
    title: 'Borrosas',
    icon: null,
    count: Math.floor(Math.random() * 50) + 20,
    locked: false,
  },
  {
    key: 'pantallazos',
    title: 'Pantallazos',
    icon: null,
    count: Math.floor(Math.random() * 200) + 200,
    locked: false,
  },
  {
    key: 'rafaga',
    title: 'En ráfaga',
    icon: null,
    count: Math.floor(Math.random() * 80) + 50,
    locked: false,
  },
  {
    key: 'whatsapp',
    title: 'WhatsApp/Telegram',
    icon: null,
    count: Math.floor(Math.random() * 500) + 300,
    locked: false,
  },
  {
    key: 'videos_largos',
    title: 'Vídeos largos',
    icon: null,
    count: Math.floor(Math.random() * 20) + 10,
    locked: false,
  },
  {
    key: 'archivos_grandes',
    title: 'Archivos grandes',
    icon: null,
    count: Math.floor(Math.random() * 40) + 20,
    locked: false,
  },
  {
    key: 'recibos',
    title: 'Recibos/Docs',
    icon: null,
    count: Math.floor(Math.random() * 60) + 40,
    locked: false,
  },
];

/**
 * Generate mock months data
 */
const generateMonthsData = (): MonthData[] => {
  const months = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  return Array.from({ length: 5 }, (_, i) => {
    const monthIndex = (currentMonth - i + 12) % 12;
    const yearOffset = Math.floor((currentMonth - i) / 12);
    const year = currentYear - yearOffset - 1;
    const count = Math.floor(Math.random() * 100) + 20;

    return {
      key: `${year}-${monthIndex}`,
      label: months[monthIndex],
      year,
      count,
      previewUris: generatePreviewUris(count),
    };
  });
};

/**
 * Generate initial home data
 */
export const generateHomeData = (): HomeData => {
  const chips = generateChipsData();
  const bundles = generateBundlesData();

  // Calculate space based on counts
  const totalItems = chips.reduce((sum, chip) => sum + chip.count, 0);
  const avgSizeMB = 3.5; // Average size per item in MB
  const spaceReadyMB = Math.round(totalItems * avgSizeMB * 0.3); // 30% can be cleaned

  return {
    progress: 0,
    spaceReadyMB,
    chips,
    bundles,
    months: generateMonthsData(),
    totalPhotos: Math.floor(Math.random() * 5000) + 10000,
    totalVideos: Math.floor(Math.random() * 500) + 200,
    lastScanDate: undefined,
  };
};

/**
 * Simulate scanning with progressive updates
 */
export const simulateScan = async (
  onProgress?: (progress: number, data: HomeData) => void
): Promise<HomeData> => {
  // Random delay between 400-800ms
  const totalDuration = Math.random() * 400 + 400;
  const steps = 10;
  const stepDuration = totalDuration / steps;

  let currentData = generateHomeData();

  for (let i = 0; i <= steps; i++) {
    const progress = i / steps;
    currentData = {
      ...currentData,
      progress,
      lastScanDate: i === steps ? new Date() : undefined,
    };

    // Update progress callback
    onProgress?.(progress, currentData);

    if (i < steps) {
      await new Promise((resolve) => setTimeout(resolve, stepDuration));
    }
  }

  return currentData;
};

/**
 * Get fresh mock data without scanning
 */
export const getInstantMockData = (): HomeData => {
  const data = generateHomeData();
  return {
    ...data,
    progress: 1.0,
    lastScanDate: new Date(),
  };
};
