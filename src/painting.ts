import fs from "fs";
import { PNG, PackerOptions } from "pngjs";

const RGBS = [
  0x000000, 0xffffff, 0xd4d7d9, 0x898d90, 0x784102, 0xd26500, 0xff8a00,
  0xffde2f, 0x159800, 0x8de763, 0x58eaf4, 0x059df2, 0x034cba, 0x9503c9,
  0xd90041, 0xff9fab,
];

interface Painting {
  colors: number[];
  raw: {
    rgbs: number[];
    alphas: number[];
    grays: number[];
  }
  height: number;
  width: number;
}

export const fetchPainting = (path: string): Painting => {
  const png = readPNG(path);
  const height = png.height;
  const width = png.width;
  const colors = [];
  const rgbs = [];
  const grays = [];
  const alphas = [];

  for (const i of Array(height * width).keys()) {
    const idx = i * 4;
    const r = png.data[idx];
    const g = png.data[idx + 1];
    const b = png.data[idx + 2];
    const a = png.data[idx + 3];
    const rgb = (r << 16) + (g << 8) + b

    colors.push(RGBS.indexOf(rgb));

    rgbs.push(rgb);
    alphas.push(a);
    grays.push(gray(r, g, b));
  }
  return {colors, raw: {rgbs, alphas, grays}, height, width};
}

export const steps = (painting: Painting): number[] => {
  return [];
  
}

// helpers

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
}

const gray = (r: number, g: number, b: number): number => (r*299 + g*587 + b*114);


// console.log(fetchPainting(process.argv[2]))
