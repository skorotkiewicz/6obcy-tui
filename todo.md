```js
// spinner

import ora from "ora";
const spinner = ora();

spinner.start("Szukam rozmówcy...");
spinner.succeed(`Połączono z obcym...`);
```

```js
// Proxy

import SocksProxyAgent from "socks-proxy-agent";
const agent = new SocksProxyAgent("socks://91.121.168.6:7497");

const ws = new WebSocket(
  "wss://server.6obcy.pl:7001/6eio/?EIO=3&transport=websocket",
  {
    agent: agent,
    headers: {
      "User-Agent":
        "Mozilla Thunderbird " + Math.random().toString(36).substr(2, 9),
    },
    origin: "https://6obcy.org",
  }
);
```

```js
// Terminal Image

// import fs from "fs";
// import terminalImage from "./terminalImage";

// base64 = base64.replace("data:image/jpeg;base64,", "");
// const buffer = Buffer.from(base64, "base64");

// fs.writeFileSync("captcha.jpg", buffer);

// let captcha = blessed.image({
//   parent: box,
//   top: 0,
//   left: 0,
//   type: "overlay",
//   width: "center",
//   height: "center",
//   file: "./captcha.jpg",
// });

// screen.append(captcha);

// box.setContent(
//   await terminalImage.buffer(buffer, {
//     width: "200px",
//     height: "50px",
//     preserveAspectRatio: false,
//   })
// );
```
