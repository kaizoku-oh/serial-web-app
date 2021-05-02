'use strict';

let port;

const serialConfig = {
  dataBits: 8,
  stopBits: 1,
  parity: "none",
  bufferSize: 1024,
  flowControl: "none",
  baudRate: 115200
}

window.addEventListener('DOMContentLoaded', (event) => {
  console.log('DOM fully loaded and parsed');
  if ("serial" in navigator) {
    console.log("The Web Serial API is supported");
  } else {
    console.warn("The Web Serial API is not supported");
  }
});

async function connect() {
  // Prompt user to select any serial port.
  console.log("Prompt user to select any serial port");
  port = await navigator.serial.requestPort();
  // Wait for the serial port to open.
  console.log("Wait for the serial port to open");
  await port.open(serialConfig);
}

async function disconnect() {
  console.log("Closing serial port");
  await port.close();
}

async function clickConnect() {
  await connect();
}

async function clickDisconnect() {
  await disconnect();
}