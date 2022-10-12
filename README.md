
## Installation

use npm to install this project.

```
npm install
```

### Optional

feh: a image viewer use to view output from `preview` subcommand.

## Usage

```
Usage:
  npx ts-node src/cli.ts <SUBCOMMAND>

SUBCOMMANDS:
  - paint         Paint input image on TheSpace app.
  - dryrun        Ouput the final painting in the canvas.
  - preview       Ouput a series of png files to show how robot paint the target painting step by step.
  - preprocess    Convert image to valid 16-color png file for TheSpace app.

```

### paint

```
Usage:
  npx ts-node src/cli.ts paint <PNG PATH> [OPTIONS]

OPTIONS:
            --offset=<x,y>                  TheSpace canvas coordinate (1-base) to start paint the image, default 1,1
            --mode=<mode name>              The way to paint the image, valid mode: stroll (default), randomPick, blackFirst
  -p=<x,y>, --stroll-label-point=<x,y>      When in stroll mode, specify a series of pixel coordinates (1-base) to help paint process
            --interval=<seconds>            the interval between paint, default 1 second

ENVIRONMENT VALUES:
  THESPACE_ADDRESS                          TheSpace contract address to paint
  SNAPPER_ADDRESS                           TheSpace related Snapper contract address, used to fetch canvas
  PRIVATE_KEY                               Wallet private key
  PROVIDER_RPC_HTTP_URL                     RPC network endpoint
  MAX_PRICE                                 Max accepted pixel price in $Space
  MAX_GAS_PRICE                             Max accpeted gas price in wei

```

#### Example

Start paint in thespace app:

```bash
PROVIDER_RPC_HTTP_URL=https://matic-mumbai.chainstacklabs.com \
PRIVATE_KEY=******* \
THESPACE_ADDRESS=0x68f02A0552e6B9010F34680746cd17E9F98fEC65 \
SNAPPER_ADDRESS=0xc92c2944fe36ee4ddf7d160338ce2ef8c342c4ed \
npx ts-node src/cli.ts paint tests/data/test.png --offset=100,100
```
