import fs from "fs";
import { PNG, PackerOptions } from "pngjs";

interface Painting {
  colors: number[];
  height: number;
  width: number;
}

export const fetchPainting = (path: string): Painting => {
  const png = readPNG(path);
  const colors = [0x000000, 0x000000, 0x000000, 0x000000];
  const height = png.height;
  const width = png.width;
  return {colors, height, width};
}

// helpers

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
}

const getColors = (png: PNG) => {
} 
