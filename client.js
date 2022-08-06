import "dotenv/config";
import WebSocket from "ws";
import fetch from "node-fetch";
import colors from "colors/safe.js";
import blessed from "neo-blessed";
import open from "open";
import express from "express";

let ckey = null;
let timeoutType = null;
let ceid = 1;
let captchaID = "";
let captchaBase64 = "";
let reconnect = true;
let CAPI;

if (process.env.CAPTCHA2_API) CAPI = process.env.CAPTCHA2_API;
else CAPI = false;

const app = express();

colors.setTheme({
  info: "brightBlue",
  obcy: "green",
  bot: "blue",
  message: "grey",
  warn: "yellow",
  end: "red",
});

const ws = new WebSocket(
  "wss://server.6obcy.pl:7001/6eio/?EIO=3&transport=websocket",
  {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:102.0) Gecko/20100101 Firefox/102.0",
    },
    origin: "https://6obcy.org",
  }
);

ws.on("open", function open() {
  onConnected();
});

ws.on("close", function close() {
  messageList.addItem(colors.end("disconnected"));
  messageList.setScrollPerc(100);
  screen.render();
});

ws.on("message", function incoming(data) {
  _handleSocketMessage(data);
  const { pingInterval } = parseJson(data);
  if (pingInterval > 0) {
    setInterval(() => ws.send("2"), pingInterval);
  }
});

const _emitSocketEvent = (eventName, eventData) => {
  const eventObj = {
    ev_name: eventName,
    ev_data: eventData,
    ceid: ceid,
  };

  const eventStr = `4${JSON.stringify(eventObj)}`;
  ws.send(eventStr);
};

const disConnect = () => {
  _emitSocketEvent("_distalk", {
    ckey: ckey,
  });
};

const sendMessage = (msg) => {
  _emitSocketEvent("_pmsg", {
    ckey: ckey,
    msg,
    idn: 0,
  });

  messageList.addItem(colors.bot("Ja: ") + colors.message(msg));
  messageList.setScrollPerc(100);
  screen.render();

  Typing("false");
};

const startConversation = () => {
  _emitSocketEvent("_sas", {
    channel: "main",
    myself: {
      sex: 0,
      loc: 0,
    },
    preferences: {
      sex: 0,
      loc: 0,
    },
  });

  input.hide();

  box.setContent("");
  messageList.clearItems();

  messageList.addItem(colors.warn("Szukam rozmówcy..."));
  messageList.setScrollPerc(100);
  screen.render();
};

const _handleSocketMessage = (data) => {
  const msgData = parseJson(data);
  ceid++;

  switch (msgData.ev_name) {
    case "talk_s":
      _handleConversationStart(msgData);
      break;

    case "rmsg":
      _handleStrangerMessage(msgData);
      break;

    case "sdis":
      reconnect && startConversation();
      break;

    case "cn_acc":
      _handleCN(msgData);
      break;

    case "capissol":
      _handleResponseCaptcha(msgData);
      break;

    case "caprecvsas":
      _handleCaptacha(msgData);
      break;

    case "capchresp":
      _handleCaptacha(msgData);
      break;

    case "styp":
      _handleStrangerMessageTyp(msgData.ev_data);
      break;

    case "rtopic":
      _handleRandomQuestion(msgData);
      break;

    case "count":
      _handleCount(msgData.ev_data);
      break;
  }
};

const _handleCount = (count) => {
  countBox.setContent(count + " osób online");
  screen.render();
};

const _handleRandomQuestion = (msgData) => {
  messageList.addItem(colors.end(msgData.ev_data.topic));
  messageList.setScrollPerc(100);
  screen.render();
};

const _handleStrangerMessageTyp = (typ) => {
  if (typ) {
    box.setContent("Obcy pisze...");
  } else {
    box.setContent("");
  }
  screen.render();
};

const _handleResponseCaptcha = (msgData) => {
  if (captchaBase64.length === 0)
    ReportCaptcha(captchaID, msgData.ev_data.success);
};

const _handleConversationStart = (msgData) => {
  clearTimeout(timeoutType);
  input.show();
  input.focus();

  _emitSocketEvent("_begacked", {
    ckey: ckey,
  });

  ckey = msgData.ev_data.ckey;
  captchaBase64 = "";

  box.setContent("");
  messageList.clearItems();

  messageList.addItem(colors.warn("Połączono z obcym..."));
  messageList.setScrollPerc(100);
  screen.render();

  process.env.WELCOME && sendMessage(process.env.WELCOME);
};

const _handleStrangerMessage = (msgData) => {
  Typing("true");

  const uMsg = msgData.ev_data.msg;

  messageList.addItem(colors.obcy("Obcy: ") + colors.message(uMsg));
  messageList.setScrollPerc(100);
  screen.render();
};

const _handleCN = (msg) => {
  _emitSocketEvent("_cinfo", {
    hash: msg.ev_data.hash,
    dpa: true,
    caper: true,
  });
  input.hide();

  startConversation();
};

const _handleCaptacha = async (msg) => {
  let base64 = await msg.ev_data.tlce.data;

  if (CAPI) {
    SendCaptcha(base64);

    setTimeout(() => {
      messageList.addItem("trying to solve: " + captchaID);
      messageList.setScrollPerc(100);
      screen.render();

      AskForCaptcha(captchaID);
    }, 20000);
  } else {
    // TODO
    captchaBase64 = base64;
    input.show();
    input.focus();

    box.setContent("Wpisz kod z obrazka z strony która się otworzyła");
    await open("http://localhost:3000/captcha");
  }
};

const onConnected = () => {
  input.hide();

  messageList.addItem(`connected`);
  messageList.setScrollPerc(100);
  screen.render();
};

const parseJson = (str) => {
  return JSON.parse(str.slice(str.indexOf("{")));
};

const SendCaptcha = async (base64) => {
  await fetch("https://2captcha.com/in.php", {
    body:
      "method=base64&key=" +
      CAPI +
      "&body=" +
      encodeURIComponent(base64) +
      "&regsense=0&min_len=7",
    method: "POST",
  }).then((res) => {
    res.text().then((s) => {
      captchaID = s.substring(3);

      messageList.addItem(s, s.substring(3));
      messageList.setScrollPerc(100);
      screen.render();
    });
  });
};

const AskForCaptcha = (captchaId) => {
  fetch(
    "https://2captcha.com/res.php?key=" +
      CAPI +
      "&id=" +
      captchaId +
      "&action=get"
  ).then((res) => {
    res.text().then((s) => {
      let solved = s.substring(3);

      if (solved === "CHA_NOT_READY") {
        return setTimeout(() => {
          messageList.addItem("Captcha jeszcze nie gotowa, próbuje ponownie");
          messageList.setScrollPerc(100);
          screen.render();

          return AskForCaptcha(captchaID);
        }, 10000); // if not ready wait 10sec and ask again
      }

      SolveCaptcha(solved);
    });
  });
};

const ReportCaptcha = (cID, type) => {
  messageList.addItem(type ? "reportgood" : "reportbad", cID);
  messageList.setScrollPerc(100);
  screen.render();

  fetch(
    `http://2captcha.com/res.php?key=${CAPI}&action=${
      type ? "reportgood" : "reportbad"
    }&id=${cID}`
  ).then((res) => {
    res.text().then((s) => {
      if (type === false) NewCaptcha();
    });
  });
};

const SolveCaptcha = (solved) => {
  _emitSocketEvent("_capsol", {
    solution: solved,
  });

  startConversation();
};

const Typing = (typing) => {
  _emitSocketEvent("_mtyp", {
    ckey: ckey,
    val: typing,
  });
};

const SendTopic = () => {
  _emitSocketEvent("_randtopic", {
    ckey: ckey,
  });
};

const NewCaptcha = () => {
  _emitSocketEvent("_capch");
};

const StopConv = () => {
  reconnect = false;
  disConnect();

  box.setContent("");
  messageList.clearItems();

  messageList.addItem(colors.warn("Zakonczono, aby wznowić wpisz /start"));
  messageList.setScrollPerc(100);
  screen.render();
};

//
// TUI
//

const screen = blessed.screen({
  smartCSR: true,
  title: "6obcy TUI Chat",
});

const messageList = blessed.list({
  align: "left",
  mouse: true,
  keys: true,
  width: "100%",
  height: "85%",
  top: "0%",
  left: 0,
  scrollbar: {
    ch: " ",
    inverse: true,
  },
  items: [],
});

var box = blessed.box({
  top: "85%",
  left: 0,
  width: "80%",
  height: "5%",
  content: "",
});

var countBox = blessed.box({
  top: "85%",
  right: 0,
  width: "20%",
  height: "5%",
  content: "",
});

const input = blessed.textarea({
  top: "90%",
  height: "10%",
  inputOnFocus: true,
  style: {
    fg: "#787878",
    bg: "#454545",

    focus: {
      fg: "#f6f6f6",
      bg: "#353535",
    },
  },
});

input.key("enter", function () {
  var message = this.getValue();

  try {
    if (message === "/topic\n") {
      SendTopic();
    } else if (message === "/dis\n") {
      disConnect();
    } else if (message === "/start\n") {
      reconnect = true;
      startConversation();
    } else if (message === "/stop\n") {
      StopConv();
    } else {
      if (captchaBase64.length === 0) {
        if (message.length > 1) sendMessage(message);
      } else {
        SolveCaptcha(message);
      }
    }
  } catch (_err) {
  } finally {
    this.clearValue();
    screen.render();
  }
});

screen.key(["escape", "C-c"], function () {
  disConnect();
  return process.exit(0);
});

screen.append(messageList);
screen.append(box);
screen.append(countBox);
screen.append(input);

input.hide();

screen.render();

app.get("/captcha", function (req, res) {
  res.send(`<img src="${captchaBase64}" />`);
});

app.listen(3000);
