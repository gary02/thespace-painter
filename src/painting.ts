import { PNG, PackerOptions } from "pngjs";
import { COLORS } from "./constants";


type Index = number;
type Coordinate = [number, number];

type Color = number;

type RGB = [number, number, number];

interface Painting {
  colors: number[];
  alphas: number[];
  height: number;
  width: number;
}

export const fetchPainting = (png: PNG): Painting => {
  const height = png.height;
  const width = png.width;
  const colors = [];
  const rgbs = [];
  const alphas = [];

  for (const i of Array(height * width).keys()) {
    const idx = i * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    colors.push(rgb2color([r, g, b]));
    alphas.push(a);
  }
  return {colors, alphas, height, width};
}

export const convert16color = (png: PNG): PNG => {
  const rgbs = COLORS.map((c) => color2rgb(c))
  for (const i of Array(png.height * png.width).keys()) {
    const idx = i * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    if (a === 0) {
      continue;
    }
    const [nr, ng, nb] = closestRGB([r, g, b], rgbs);
    png.data[idx] = nr;
    png.data[idx + 1] = ng;
    png.data[idx + 2] = nb;
  }
  return png;
}

export const stroll = (painting: Painting): number[] => {
  const steps: Index[] = [];
  const hits: Set<Index> = new Set([-1]);

  const addStep = (step: Index) => {steps.push(step);hits.add(step);}

  let start = getStartIndex(painting, hits);
  while ( start !== null ) {
    addStep(start);
    let idx = getNearSameColorIndex(start, painting, hits);
    while (idx !== null) {
      addStep(idx);
      idx = getNearSameColorIndex(idx, painting, hits);
    }
    start = getStartIndex(painting, hits);
  }
  return steps;
}

export const blackFirst = (painting: Painting): number[] => {
  const grayscales = painting.colors.map((c) => grayscale(color2rgb(c)))
  const grayscaleEntries = [];
  for (const element of grayscales.entries()) {
    grayscaleEntries.push(element);
  }
  grayscaleEntries.sort((a, b) => a[1] - b[1]);

  const steps = [];
  for (const [idx, _] of grayscaleEntries) {
    if (painting.alphas[idx] > 0) {
      steps.push(idx);
    }
  }

  return steps;
}

export const randomPick = (painting: Painting): number[] => {
  const steps = [];
  for (const [idx, a] of painting.alphas.entries()) {
    if (a > 0) {
      steps.push(idx)
    }
  }
  return shuffle(steps);
}

// helpers

const getStartIndex = (painting: Painting, hits: Set<Index>): Index | null => {
  for (const [idx, a] of painting.alphas.entries()) {
    if (a > 0 && !hits.has(idx)) {
      return idx;
    }
  }
  return null;
}

const getNearSameColorIndex = (start: Index, painting: Painting, hits: Set<Index>): Index | null => {
  const color = painting.colors[start];
  const good = (idx: Index | null) => (idx !== null && !hits.has(idx) && painting.colors[idx] == color && painting.alphas[idx] > 0)
  let right: number | null = null;
  let lowerRight: number | null = null;
  let lower: number | null = null;
  let lowerLeft: number | null = null;
  let left: number | null = null;
  let upperLeft: number | null = null;
  let upper: number | null = null;
  let upperRight: number | null = null;

  const _right = getRight(start, painting.height, painting.width);
  if (good(_right)) {
    right = _right;
  }

  const _lowerRight = getLowerRight(start, painting.height, painting.width);
  if (good(_lowerRight)) {
    lowerRight = _lowerRight;
  }

  const _lower = getLower(start, painting.height, painting.width);
  if (good(_lower)) {
    lower = _lower;
  }

  const _lowerLeft = getLowerLeft(start, painting.height, painting.width);
  if (good(_lowerLeft)) {
    lowerLeft = _lowerLeft;
  }

  const _left = getLeft(start, painting.height, painting.width);
  if (good(_left)) {
    left = _left;
  }

  const _upperLeft = getUpperLeft(start, painting.height, painting.width);
  if (good(_upperLeft)) {
    upperLeft = _upperLeft;
  }
  const _upper = getUpper(start, painting.height, painting.width);
  if (good(_upper)) {
    upper = _upper;
  }

  const _upperRight = getUpperRight(start, painting.height, painting.width);
  if (good(_upperRight)) {
    upperRight = _upperRight;
  }

  return right || lowerRight || lower || lowerLeft || left || upperLeft || upper || upperRight;
}

const index2coordinate = (idx: Index, width: number): Coordinate => {
  return [idx % width, Math.floor(idx / width)];
}

const coordinate2index = (coord: Coordinate, width: number): Index => {
  return coord[1] * width + coord[0];
}

const getRight = (idx: Index, height: number, width: number): Index | null => {
  const [x, y] = index2coordinate(idx, width);
  if (x === width - 1) {
    return null;
  } else {
    return coordinate2index([x + 1, y], width);
  }
}

const getLeft = (idx: Index, height: number, width: number): Index | null => {
  const [x, y] = index2coordinate(idx, width);
  if (x === 0) {
    return null;
  } else {
    return coordinate2index([x - 1, y], width);
  }
}

const getUpper = (idx: Index, height: number, width: number): Index | null => {
  const [x, y] = index2coordinate(idx, width);
  if (y === 0) {
    return null;
  } else {
    return coordinate2index([x, y - 1], width);
  }
}

const getLower = (idx: Index, height: number, width: number): Index | null => {
  const [x, y] = index2coordinate(idx, width);
  if (y === height - 1) {
    return null;
  } else {
    return coordinate2index([x, y + 1], width);
  }
}

const getUpperRight = (idx: Index, height: number, width: number): Index | null => {
  const upper = getUpper(idx, height, width);
  return upper === null ? null : getRight(upper, height, width);
}

const getUpperLeft = (idx: Index, height: number, width: number): Index | null => {
  const upper = getUpper(idx, height, width);
  return upper === null ? null : getLeft(upper, height, width);
}

const getLowerRight = (idx: Index, height: number, width: number): Index | null => {
  const lower = getLower(idx, height, width);
  return lower === null ? null : getRight(lower, height, width);
}

const getLowerLeft = (idx: Index, height: number, width: number): Index | null => {
  const lower = getLower(idx, height, width);
  return lower === null ? null : getLeft(lower, height, width);
}

const closestRGB = (origin: RGB, candidates: RGB[]): RGB => {
  const diffs: [RGB, number][] = [];
  const [r, g, b] = origin;
  for (const [cr, cg, cb] of candidates) {
    diffs.push([
      [cr, cg, cb],
      ((r - cr)**2 + (g - cg)**2 + (b - cb)**2)
    ])
  }
  diffs.sort((a, b) => a[1] - b[1]);
  return diffs[0][0];
}

const color2rgb = (c: Color):RGB => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff]

const rgb2color = (rgb: RGB): Color => (rgb[0] << 16) + (rgb[1] << 8) + rgb[2]

const grayscale = (rgb: RGB): number => (rgb[0]*299 + rgb[1]*587 + rgb[2]*114);

const shuffle = (array: number[]): number[] => {
  let currentIndex = array.length,  randomIndex;

  // While there remain elements to shuffle.
  while (currentIndex != 0) {

    // Pick a remaining element.
    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex--;

    // And swap it with the current element.
    [array[currentIndex], array[randomIndex]] = [
      array[randomIndex], array[currentIndex]];
  }

  return array;
}
