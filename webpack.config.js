const path = require("path");

module.exports = (env) => {
  let _mode, _entry, _externals;
  let _output = {
    path: path.resolve(__dirname, "out"),
  };

  _entry = "./src/cli.ts";
  _output.filename = "bot.js";
  _externals = ["electron-fetch", "bufferutil", "utf-8-validate"];

  if (env.production) {
    _mode = "production";
  } else {
    _mode = "development";
  }

  return {
    mode: _mode,
    entry: _entry,
    target: "node14",
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
      ],
    },
    resolve: {
      mainFields: ["main", "module"],
      extensions: [".tsx", ".ts", ".js"],
    },
    externals: _externals,
    output: _output,
  };
};
