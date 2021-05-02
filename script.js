'use strict';

let port;
let reader;
let inputDone;
let outputDone;
let inputStream;
let outputStream;

const log = document.getElementById('log');
const serialConfig = {
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 1024,
  flowControl: "none",
  baudRate: 115200
};

function updateScroll() {
  const element = document.getElementById('log');
  window.scrollTo(0, element.offsetHeight);
}

function onDataReceived(data) {
  if (data.counter) {
    console.log('Counter: ' + data.counter);
  }
}

async function readLoop() {
  while (true) {
    const { value, done } = await reader.read();
    if (value.counter) {
      onDataReceived(value);
      log.textContent += JSON.stringify(value) + '\r\n';
      updateScroll();
    } else {
      console.log('Cannot understand received data: ' + JSON.stringify(value));
    }
    if (done) {
      console.log('[readLoop] DONE', done);
      reader.releaseLock();
      break;
    }
  }
}

function writeToStream(...lines) {
  const writer = outputStream.getWriter();

  lines.forEach((line) => {
    console.log('[SEND]', line);
    writer.write(line + '\n');
  });
  writer.releaseLock();
}

async function setupRead() {
  let decoder = new TextDecoderStream();
  inputDone = port.readable.pipeTo(decoder.writable);
  inputStream = decoder.readable
    .pipeThrough(new TransformStream(new LineBreakTransformer()))
    .pipeThrough(new TransformStream(new JSONTransformer()));

  reader = inputStream.getReader();
}

async function setupWrite() {
  const encoder = new TextEncoderStream();

  outputDone = encoder.readable.pipeTo(port.writable);
  outputStream = encoder.writable;
}

async function connect() {
  if (!port) {
    console.log("Connecting to serial port");
    port = await navigator.serial.requestPort();
    await port.open(serialConfig);
  }
  else {
    console.log("Serial port already connected");
  }
  setupRead();
  setupWrite();
  writeToStream('\x03', 'echo(false);');
  readLoop();
}

async function disconnect() {
  if (reader) {
    await reader.cancel();
    await inputDone.catch(() => {});
    reader = null;
    inputDone = null;
  }
  if (outputStream) {
    await outputStream.getWriter().close();
    await outputDone;
    outputStream = null;
    outputDone = null;
  }
  await port.close();
  port = null;
}

window.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded and parsed');
  if ("serial" in navigator) {
    console.log("The Web Serial API is supported");
  } else {
    console.warn("The Web Serial API is not supported");
  }
});

navigator.serial.addEventListener('connect', e => {
  // Add |e.port| to the UI or automatically connect.
  console.log("Serial port " + e.port + "is open");
});

navigator.serial.addEventListener('disconnect', e => {
  // Remove |e.port| from the UI. If the device was open the
  // disconnection can also be observed as a stream error.
  console.log("Serial port " + e.port + "is closed");
});

const connectButton = document.getElementById("connect");
connectButton.addEventListener('click', () => {
  try {
    connect();
  } catch (e) {
    // The prompt has been dismissed without selecting a device.
    console.log("Exception yooo!");
  }
});

const disconnectButton = document.getElementById("disconnect");
disconnectButton.addEventListener('click', () => {
  try {
    disconnect();
  } catch (e) {
    console.log("Exception yooo!");
  }
});

const clearButton = document.getElementById("clear");
clearButton.addEventListener('click', () => {
  try {
    log.textContent = '';
  } catch (e) {
    console.log("Exception yooo!");
  }
});

class LineBreakTransformer {
  constructor() {
    // A container for holding stream data until a new line.
    this.container = '';
  }

  transform(chunk, controller) {
    // CODELAB: Handle incoming chunk
    this.container += chunk;
    const lines = this.container.split('\r\n');
    this.container = lines.pop();
    lines.forEach(line => controller.enqueue(line));
  }

  flush(controller) {
    // CODELAB: Flush the stream.
    controller.enqueue(this.container);
  }
}

class JSONTransformer {
  transform(chunk, controller) {
    try {
      controller.enqueue(JSON.parse(chunk));
    } catch (e) {
      controller.enqueue(chunk);
    }
  }
}