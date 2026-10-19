import test from "node:test";
import assert from "node:assert/strict";
import { cleanTrackingUrl, trackingLink } from "./couriers.ts";

test("pasted tracking links must be https web addresses", () => {
  assert.equal(cleanTrackingUrl("https://www.dtdc.in/track?no=D123"), "https://www.dtdc.in/track?no=D123");
  assert.equal(cleanTrackingUrl("  https://bluedart.com/x  "), "https://bluedart.com/x");
  assert.equal(cleanTrackingUrl("http://example.com/track"), null);
  assert.equal(cleanTrackingUrl("javascript:alert(1)"), null);
  assert.equal(cleanTrackingUrl("https://user:pw@example.com/"), null);
  assert.equal(cleanTrackingUrl("https://localhost/x"), null);
  assert.equal(cleanTrackingUrl("https://e.com/" + "a".repeat(600)), null);
  assert.equal(cleanTrackingUrl(""), null);
});

test("tracking link prefers the pasted link, then known couriers", () => {
  assert.equal(trackingLink("DTDC", "D123", "https://www.dtdc.in/t/D123"), "https://www.dtdc.in/t/D123");
  assert.equal(trackingLink("Delhivery", "DLV1234567890"), "https://www.delhivery.com/track/package/DLV1234567890");
  assert.equal(trackingLink("shiprocket", "SR99"), "https://shiprocket.co/tracking/SR99");
  assert.equal(trackingLink("India Post", "EE123456789IN"), null);
  assert.equal(trackingLink(null, "X"), null);
});
