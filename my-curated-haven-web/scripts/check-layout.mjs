import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { setTimeout as delay } from "node:timers/promises";

const base = process.env.BASE_URL ?? "http://127.0.0.1:3456";
const chromePath =
  process.env.CHROME_PATH ??
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9333;
const shotDir = "/tmp/mch-phase1-shots";
const widths = [320, 375, 390, 768, 1280];
const pages = ["/", "/about", "/support", "/features"];
const failures = [];

function fail(message) {
  failures.push(message);
}

const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--disable-gpu",
    "--no-first-run",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=/tmp/mch-phase1-chrome-${Date.now()}`,
    "about:blank",
  ],
  { stdio: "ignore" },
);

try {
  let version;
  for (let attempt = 0; attempt < 25; attempt += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${port}/json/version`).then((response) => response.json());
      break;
    } catch {
      await delay(200);
    }
  }
  if (!version) throw new Error("Chrome DevTools did not start");

  const ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });

  let nextId = 0;
  const pending = new Map();
  ws.addEventListener("message", (event) => {
    const message = JSON.parse(event.data);
    if (!message.id || !pending.has(message.id)) return;
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  });

  const send = (method, params = {}, sessionId) => {
    const id = ++nextId;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, sessionId }));
    });
  };

  const created = await send("Target.createTarget", { url: "about:blank" });
  const attached = await send("Target.attachToTarget", {
    targetId: created.targetId,
    flatten: true,
  });
  const sessionId = attached.sessionId;
  const page = (method, params) => send(method, params, sessionId);

  await page("Page.enable");
  await page("Runtime.enable");
  await mkdir(shotDir, { recursive: true });

  const evaluate = async (expression) => {
    const result = await page("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (result.exceptionDetails) {
      throw new Error(JSON.stringify(result.exceptionDetails));
    }
    return result.result.value;
  };

  const open = async (path) => {
    await page("Page.navigate", { url: `${base}${path}` });
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const state = await evaluate(`({
      ready: document.readyState,
      href: location.href
    })`);
      if (
        (state.ready === "interactive" || state.ready === "complete") &&
        state.href.startsWith(`${base}${path === "/" ? "/" : path}`)
      ) {
        return;
      }
      await delay(100);
    }
    throw new Error(`Timed out loading ${path}`);
  };

  for (const width of widths) {
    await page("Emulation.setDeviceMetricsOverride", {
      width,
      height: 900,
      deviceScaleFactor: 1,
      mobile: width < 768,
    });

    for (const path of pages) {
      await open(path);
      const metrics = await evaluate(`({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      })`);
      if (metrics.scrollWidth > metrics.clientWidth + 1) {
        fail(`${path} at ${width}px overflows ${metrics.scrollWidth} > ${metrics.clientWidth}`);
      }
    }

    await open("/");
    if (width < 768) {
      const opened = await evaluate(`(async () => {
        const button = document.querySelector("button[aria-controls]");
        if (!button) return "missing-button";
        button.click();
        for (let i = 0; i < 10; i += 1) {
          if (button.getAttribute("aria-expanded") === "true") return "true";
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return button.getAttribute("aria-expanded");
      })()`);
      if (opened !== "true") fail(`menu at ${width}px did not expand (${opened})`);

      const openOverflow = await evaluate(`({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth
      })`);
      if (openOverflow.scrollWidth > openOverflow.clientWidth + 1) {
        fail(`open menu at ${width}px overflows`);
      }

      const closed = await evaluate(`(async () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        const button = document.querySelector("button[aria-controls]");
        for (let i = 0; i < 10; i += 1) {
          if (button.getAttribute("aria-expanded") === "false") return "false";
          await new Promise((resolve) => setTimeout(resolve, 50));
        }
        return button.getAttribute("aria-expanded");
      })()`);
      if (closed !== "false") fail(`menu at ${width}px did not close on Escape (${closed})`);
    }

    if (width === 390 || width === 1280) {
      await evaluate(`(async () => {
        const images = [...document.images];
        await Promise.all(images.map((image) => image.complete ? null : new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        })));
      })()`);
      const shot = await page("Page.captureScreenshot", { format: "png" });
      await writeFile(`${shotDir}/home-${width}.png`, Buffer.from(shot.data, "base64"));
    }
  }

  await page("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 900,
    deviceScaleFactor: 1,
    mobile: true,
  });
  for (const [path, name] of [
    ["/support", "support"],
    ["/features", "unavailable"],
  ]) {
    await open(path);
    const shot = await page("Page.captureScreenshot", { format: "png" });
    await writeFile(`${shotDir}/${name}-390.png`, Buffer.from(shot.data, "base64"));
  }

  ws.close();
} finally {
  chrome.kill();
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log(`Layout checks passed. Screenshots in ${shotDir}`);
