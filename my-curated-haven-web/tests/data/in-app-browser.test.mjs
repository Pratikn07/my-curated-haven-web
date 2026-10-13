// Sign-in hides Google inside Instagram's and Facebook's in-app browsers, where Google refuses OAuth.
import assert from "node:assert/strict";
import test from "node:test";
import { isInAppBrowser } from "../../src/lib/auth/in-app-browser.ts";

test("Instagram and Facebook in-app browsers are recognised", () => {
  assert.equal(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.29.92 (iPhone15,2; iOS 18_0; en_US)"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/129.0 Mobile Safari/537.36 Instagram 350.0.0.40.81 Android"), true);
  assert.equal(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/480.0.0.40.108;]"), true);
});

test("ordinary browsers and a missing user agent are not", () => {
  assert.equal(isInAppBrowser("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1"), false);
  assert.equal(isInAppBrowser("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36"), false);
  assert.equal(isInAppBrowser(null), false);
  assert.equal(isInAppBrowser(""), false);
});
