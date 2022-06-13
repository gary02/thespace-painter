import fs from "fs";
import { PNG, PackerOptions } from "pngjs";


interface Painting {
  colors: number[];

  alphas: number[];
  grayscales: number[];

  height: number;
  width: number;
}

export const fetchPainting = (path: string): Painting => {
  const png = readPNG(path);
  const height = png.height;
  const width = png.width;
  const colors = [];
  const rgbs = [];
  const grayscales = [];
  const alphas = [];

  for (const i of Array(height * width).keys()) {
    const idx = i * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    const rgb = (r << 16) + (g << 8) + b
    colors.push(rgb);
    alphas.push(a);
    grayscales.push(grayscale(r, g, b));
  }
  return {colors, alphas, grayscales, height, width};
}

export const blackFirst = (painting: Painting): number[] => {
  const grayscaleEntries = [];
  for (const element of painting.grayscales.entries()) {
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

const grayscale = (r: number, g: number, b: number): number => (r*299 + g*587 + b*114);

//const p = fetchPainting(process.argv[2])
//const steps = blackFirst(p);
//console.log(p.height)
//console.log(p.width)
//console.log(steps.length)
