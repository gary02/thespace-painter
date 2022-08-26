import type { Coordinate } from "./utils";

import fs from "fs";
import { ethers } from "ethers";
import { PNG } from "pngjs";

import {
  CLI_USAGE,
  CLI_USAGE_PAINT,
  CLI_COMMANDS,
  BASE_OUT_DIR,
  MODES,
  COLORS,
} from "./constants";
import {
  fetchPainting,
  convert16color,
  stroll,
  blackFirst,
  randomPick,
} from "./painting";
import { TheSpace, fetchCanvasPng } from "./thespace";
import { paint as _paint } from "./painter";
import { hash } from "./utils";

const cli = () => {
  const getImagePathOrPrintHelp = (help: string): string | never => {
    let imagePath;
    for (const i of Array(process.argv.length - 3).keys()) {
      const item = process.argv[3 + i];
      if (item.startsWith("-")) {
        continue;
      }
      imagePath = item;
      break;
    }
    if (imagePath === undefined) {
      console.info(help);
      process.exit(1);
    }
    return imagePath;
  };
  const getModeOrPrintHelp = (help: string): string | never => {
    let mode;
    for (const i of Array(process.argv.length - 3).keys()) {
      const item = process.argv[3 + i];
      if (item.startsWith("--mode=")) {
        mode = item.split("=")[1];
        break;
      }
    }
    if (mode === undefined) {
      mode = "stroll";
    }
    if (MODES.indexOf(mode) === -1) {
      console.info(help);
      process.exit(1);
    }
    return mode;
  };

  const getOffsetOrPrintHelp = (help: string): Coordinate | never => {
    const pattern = /\d+,\d+/;
    let offset;
    for (const i of Array(process.argv.length - 3).keys()) {
      const item = process.argv[3 + i];
      if (item.startsWith("--offset=")) {
        const _offset = item.split("=")[1];
        if (pattern.test(_offset)) {
          offset = _offset;
        } else {
          console.info(help);
          process.exit(1);
        }
        break;
      }
    }
    if (offset === undefined) {
      offset = "1,1";
    }
    const [x, y] = offset.split(",");
    return [parseInt(x), parseInt(y)];
  };
  const getLabelPointsOrPrintHelp = (help: string): Coordinate[] | never => {
    const pattern = /\d+,\d+/;
    const points = [];
    for (const i of Array(process.argv.length - 3).keys()) {
      const item = process.argv[3 + i];
      if (item.startsWith("--stroll-label-point=") || item.startsWith("-p=")) {
        const point = item.split("=")[1];
        if (pattern.test(point)) {
          points.push(point);
        } else {
          console.info(help);
          process.exit(1);
        }
      }
    }
    return points
      .map((p) => p.split(","))
      .map((i) => [parseInt(i[0]), parseInt(i[1])]);
  };
  const getIntervalOrPrintHelp = (help: string): number | never => {
    const pattern = /\d+/;
    let interval;
    for (const i of Array(process.argv.length - 3).keys()) {
      const item = process.argv[3 + i];
      if (item.startsWith("--interval=")) {
        const _interval = item.split("=")[1];
        if (pattern.test(_interval)) {
          interval = _interval;
        } else {
          console.info(help);
          process.exit(1);
        }
        break;
      }
    }
    if (interval === undefined) {
      interval = "1";
    }
    return parseInt(interval);
  };

  const count = process.argv.length;
  if (count <= 2) {
    console.info(CLI_USAGE);
    process.exit(1);
  }

  const command = process.argv[2];
  if (CLI_COMMANDS.indexOf(command) === -1) {
    console.info(CLI_USAGE);
    process.exit(1);
  }

  if (command === "paint") {
    paint(
      getImagePathOrPrintHelp(CLI_USAGE_PAINT),
      getModeOrPrintHelp(CLI_USAGE_PAINT),
      getOffsetOrPrintHelp(CLI_USAGE_PAINT),
      getIntervalOrPrintHelp(CLI_USAGE_PAINT),
      getLabelPointsOrPrintHelp(CLI_USAGE_PAINT)
    ).catch((error) => {console.error(error)});
  } else if (command === "preview") {
    preview(
      getImagePathOrPrintHelp(CLI_USAGE),
      getModeOrPrintHelp(CLI_USAGE),
      getLabelPointsOrPrintHelp(CLI_USAGE)
    );
  } else if (command === "dryrun") {
    dryrun(
      getImagePathOrPrintHelp(CLI_USAGE),
      getOffsetOrPrintHelp(CLI_USAGE_PAINT)
    );
  } else {
    preprocess(getImagePathOrPrintHelp(CLI_USAGE));
  }
};

const paint = async (
  path: string,
  mode: string,
  offset: Coordinate,
  interval: number,
  labelPoints: Coordinate[]
) => {
  const thespaceAddr = process.env.THESPACE_ADDRESS;
  const snapperAddr = process.env.SNAPPER_ADDRESS;
  const privateKey = process.env.PRIVATE_KEY;
  const rpcUrl = process.env.PROVIDER_RPC_HTTP_URL;
  const cdnDomain = process.env.SNAPSHOT_CDN_DOMAIN;
  const _maxPrice = process.env.MAX_PRICE;
  const _maxGasPrice = process.env.MAX_GAS_PRICE;
  let maxPrice = _maxPrice !== undefined ? parseInt(_maxPrice) : undefined;
  let maxGasPrice =
    _maxGasPrice !== undefined ? parseInt(_maxGasPrice) : undefined;

  if (thespaceAddr === undefined) {
    console.error("error: please set THESPACE_ADDRESS env");
    process.exit(1);
  }
  if (snapperAddr === undefined) {
    console.error("error: please set SNAPPER_ADDRESS env");
    process.exit(1);
  }
  if (privateKey === undefined) {
    console.error("error: please set PRIVATE_KEY env");
    process.exit(1);
  }
  if (cdnDomain === undefined) {
    console.error("error: please set SNAPSHOT_CDN_DOMAIN env");
    process.exit(1);
  }
  if (rpcUrl === undefined) {
    console.error("error: please set PROVIDER_RPC_HTTP_URL env");
    process.exit(1);
  }
  if (maxPrice === undefined) {
    maxPrice = 10;
  }
  if (maxGasPrice === undefined) {
    maxGasPrice = 60;
  }

  console.log("fetching painting data...");
  const painting = fetchPainting(readPNG(path));
  console.log("fetching canvas data...");

  if (hasInvalidColors(painting.colors)) {
    console.error(
      "error: this image contains invalid colors. You can use `preprocess` subcommand to convert it to valid image"
    );
    process.exit(1);
  }

  let steps = [];
  if (mode === "randomPick") {
    steps = randomPick(painting);
  } else if (mode === "blackFirst") {
    steps = blackFirst(painting);
  } else {
    if (labelPoints.length > 0) {
      steps = stroll(
        painting,
        labelPoints.map((i) => [i[0] - 1, i[1] - 1])
      );
    } else {
      steps = stroll(painting);
    }
  }

  const thespace = new TheSpace(privateKey, rpcUrl, thespaceAddr, snapperAddr, cdnDomain);
  console.time("init thespace");
  await thespace.init();
  console.timeEnd("init thespace");

  await _paint(
    painting,
    steps,
    offset,
    interval,
    maxPrice!,
    maxGasPrice!,
    thespace
  );
};

const preview = (path: string, mode: string, labelPoints: Coordinate[]) => {
  const painting = fetchPainting(readPNG(path));
  let steps = [];
  if (mode === "randomPick") {
    steps = randomPick(painting);
  } else if (mode === "blackFirst") {
    steps = blackFirst(painting);
  } else {
    if (labelPoints.length > 0) {
      steps = stroll(
        painting,
        labelPoints.map((i) => [i[0] - 1, i[1] - 1])
      );
    } else {
      steps = stroll(painting);
    }
  }

  let filename = hash(path) + "-" + mode;
  if (labelPoints.length > 0) {
    filename = filename + `-label(${labelPoints})`;
  }
  const outDir = BASE_OUT_DIR + filename;

  if (!fs.existsSync(BASE_OUT_DIR)) {
    fs.mkdirSync(BASE_OUT_DIR);
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir);
  }

  const png = new PNG({ width: painting.width, height: painting.height });
  for (const [i, step] of steps.entries()) {
    const color = painting.colors[step];
    const idx = step * 4;
    png.data[idx] = (color >> 16) & 0xff;
    png.data[idx + 1] = (color >> 8) & 0xff;
    png.data[idx + 2] = color & 0xff;
    png.data[idx + 3] = 0xff;

    fs.writeFileSync(
      outDir + "/" + String(i + 1).padStart(10, "0") + ".png",
      PNG.sync.write(png)
    );
  }

  console.info(
    `done, try run "feh --keep-zoom-vp --force-aliasing -Z -S name -D 0.005 './${outDir}/'" to preview painting process if feh app installed`
  );
};

const dryrun = async (path: string, offset: Coordinate) => {
  const snapperAddr = process.env.SNAPPER_ADDRESS;
  const rpcUrl = process.env.PROVIDER_RPC_HTTP_URL;
  const cdnDomain = process.env.SNAPSHOT_CDN_DOMAIN;
  if (snapperAddr === undefined) {
    console.error("error: please set SNAPPER_ADDRESS env");
    process.exit(1);
  }
  if (rpcUrl === undefined) {
    console.error("error: please set PROVIDER_RPC_HTTP_URL env");
    process.exit(1);
  }
  if (cdnDomain === undefined) {
    console.error("error: please set SNAPSHOT_CDN_DOMAIN env");
    process.exit(1);
  }

  const outFilePath = BASE_OUT_DIR + hash(path) + "-dryrun.png";

  const canvasPng = await fetchCanvasPng(snapperAddr, rpcUrl, cdnDomain);

  if (!fs.existsSync(BASE_OUT_DIR)) {
    fs.mkdirSync(BASE_OUT_DIR);
  }

  fs.createReadStream(path)
    .pipe(new PNG())
    .on("parsed", function () {
      for (let row = 0; row < this.height; row++) {
        for (let column = 0; column < this.width; column++) {
          const index = (row * this.width + column) * 4;
          if (this.data[index + 3] !== 0) {
            this.bitblt(
              canvasPng,
              column,
              row,
              1,
              1,
              offset[0] + column,
              offset[1] + row - 1
            );
          }
        }
      }
      fs.writeFileSync(outFilePath, PNG.sync.write(canvasPng));
      console.log(`\nPlease view \x1b[4m${outFilePath}\x1b[4m\n`);
    });
};

const preprocess = (path: string) => {
  const png = readPNG(path);
  convert16color(png);
  if (hasInvalidColors(fetchPainting(png).colors)) {
    console.error(
      "error: preprocess failed, still has invalied colors"
    );
    process.exit(1);
  }

  const outFilePath = BASE_OUT_DIR + hash(path) + ".png";

  if (!fs.existsSync(BASE_OUT_DIR)) {
    fs.mkdirSync(BASE_OUT_DIR);
  }
  fs.writeFileSync(outFilePath, PNG.sync.write(png));
  console.info(`output to './${outFilePath}'`);
};

// helpers

const hasInvalidColors = (colors: number[]): boolean => {
  for (const c of colors) {
    if (COLORS.indexOf(c) === -1) {
      return true;
    }
  }
  return false;
};

const readPNG = (path: string) => {
  const data: Buffer = fs.readFileSync(path);
  return PNG.sync.read(data);
};

cli();
