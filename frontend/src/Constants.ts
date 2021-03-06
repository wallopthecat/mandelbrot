export const WsUrl = "ws://localhost:9002";
export const TileSize = 64;
export const LeafletBound = 1024;
export const MaxIteration = 1019; // Prime so that %256 never gets black
export const PredictionAccuracy = 4;

// Maximum number of regions to display to the user.
// If more are delivered by the backend, grouping will occur.
export const MAX_DISPLAY_REGIONS = 4;
// (real, imaginary) bounds of the complex plane
// x/-x and y/-y have to be the same (symmetric)
export const bounds = [4, 4];

export const NodeCount = 0;

// Color set for Groups
export const ColorSet = [
  "#B08BEB",
  "#4661EE",
  "#EC5657",
  "#1BCDD1",
  "#3EA0DD",
  "#F5A52A",
  "#23BFAA",
  "#FAA586",
  "#EB8CC6"
];

// All available balancer types
interface Balancer {
  key: string;
  title: string;
  description: string;
}
export const Balancers: Balancer[] = [
  {
    key: "naiveRecursive",
    title: "Recursive Naive Balancer",
    description: "TODO: add doc"
  },
  {
    key: "predictionRecursive",
    title: "Recursive Prediction Balancer",
    description: "TODO: add doc"
  },
  {
    key: "naive",
    title: "Naive Balancer",
    description: "Divides the visible region into rectangles of equal size."
  },
  {
    key: "column",
    title: "Column Balancer",
    description: "Divides the visible region along the x Axis into columns."
  },
  {
    key: "prediction",
    title: "Prediction Balancer",
    description: "Uses a low resolution of the mandelbrot set to determine an optimal division."
  },
];

// Implementations supported by the backend
interface Implementation {
  key: string;
  title: string;
  description: string;
}
export const Implementations: Implementation[] = [
  {
    key: "mandelbrot32",
    title: "32 bit float",
    description: "TODO: add doc"
  },
  {
    key: "mandelbrot64",
    title: "64 bit float",
    description: "TODO: add doc"
  },
  {
    key: "mandelbrotsimd32",
    title: "SIMD 32 bit",
    description: "TODO: add doc"
  },
  {
    key: "mandelbrotsimd64",
    title: "SIMD 64 bit",
    description: "TODO: add doc"
  },
  {
    key: "mandelbrot",
    title: "80 bit float",
    description: "TODO: add doc"
  },
];
