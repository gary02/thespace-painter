import fs from "fs";
import { PNG, PackerOptions } from "pngjs";

interface Painting {
  colors: number[];
  height: number;
  width: number;
}

export const fetchPainting = (path: string): Painting => {
  const png = readPNG(path);
  const height = png.height;
  const width = png.width;
  const colors = [];
  for (const i of Array(height * width).keys()) {
    const idx = i * 4;
    const rgb = (png.data[idx] << 16) + (png.data[idx + 1] << 8) + png.data[idx + 2]
    colors.push(rgb);
  }
  return {colors, height, width};
}

// helpers

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
}
