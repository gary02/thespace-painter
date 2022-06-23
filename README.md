
## Installation

use npm to install this project.

```
npm install
```

### Optional

feh: a image viewer use to view output from `preview` subcommand.

## Usage

### paint

Start paint in thespace app:

```bash
PROVIDER_RPC_HTTP_URL=https://matic-mumbai.chainstacklabs.com \
PRIVATE_KEY=******* \
THESPACE_ADDRESS=0x68f02A0552e6B9010F34680746cd17E9F98fEC65 \
SNAPPER_ADDRESS=0xc92c2944fe36ee4ddf7d160338ce2ef8c342c4ed \
npx ts-node src/cli.ts paint tests/data/test.png --offset=100,100
```

### preview

If you want to preview the painting process:

```bash
npx ts-node src/cli.ts preview tests/data/test.png
```
