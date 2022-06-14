import fs from "fs";
import { PNG, PackerOptions } from "pngjs";


interface Painting {
  colors: number[];

  alphas: number[];

  height: number;
  width: number;
}

export const fetchPainting = (path: string): Painting => {
  const png = readPNG(path);
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
    colors.push(rgb2color(r, g, b));
    alphas.push(a);
  }
  return {colors, alphas, height, width};
}

export const blackFirst = (painting: Painting): number[] => {
  const grayscales = painting.colors.map((c) => grayscale(...color2rgb(c)))
  const grayscaleEntries = [];
  for (const element of grayscales.entries()) {
    grayscaleEntries.push(element);
  }
  grayscaleEntries.sort((a, b) => a[1] - b[1]);

  const steps = [];
  for (const [idx, _] of grayscaleEntries) {
    if (painting.alphas[idx] > 0) {
      steps.push(idx)
    }
  }

  return steps;
}

// helpers

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
}

const color2rgb = (c:number):[number, number, number] => [(c >> 16) & 0xff, (c >> 8) & 0xff, c & 0xff]

const rgb2color = (r: number, g: number, b: number): number => (r << 16) + (g << 8) + b

const grayscale = (r: number, g: number, b: number): number => (r*299 + g*587 + b*114);
