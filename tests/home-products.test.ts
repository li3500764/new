import assert from "node:assert/strict";
import test from "node:test";

import { resolveHomeProductSelection, type HomeServiceGroup } from "../src/lib/home-products";

const groups: HomeServiceGroup[] = [
  {
    id: "social",
    label: "Social",
    items: [
      {
        id: "p1",
        slug: "social-1",
        cover: "01",
        category: "Social",
        name: "Social One",
        subtitle: "Fast",
        summary: "Summary",
        deliveryNote: "Soon",
        priceLabel: "1.00 USDT",
        stock: "100",
        averageTime: "5m",
        tags: [],
      },
      {
        id: "p2",
        slug: "social-2",
        cover: "02",
        category: "Social",
        name: "Social Two",
        subtitle: "Steady",
        summary: "Summary",
        deliveryNote: "Soon",
        priceLabel: "2.00 USDT",
        stock: "80",
        averageTime: "10m",
        tags: [],
      },
    ],
  },
  {
    id: "media",
    label: "Media",
    items: [
      {
        id: "p3",
        slug: "media-1",
        cover: "03",
        category: "Media",
        name: "Media One",
        subtitle: "Stable",
        summary: "Summary",
        deliveryNote: "Soon",
        priceLabel: "3.00 USDT",
        stock: "60",
        averageTime: "15m",
        tags: [],
      },
    ],
  },
];

test("home product selection returns all items when no category is chosen", () => {
  const selection = resolveHomeProductSelection(groups);

  assert.equal(selection.activeGroupId, "all");
  assert.equal(selection.totalItems, 3);
  assert.deepEqual(
    selection.visibleItems.map((item) => item.id),
    ["p1", "p2", "p3"],
  );
});

test("home product selection returns the full category list without pagination", () => {
  const selection = resolveHomeProductSelection(groups, "social");

  assert.equal(selection.activeGroupId, "social");
  assert.equal(selection.totalItems, 2);
  assert.deepEqual(
    selection.visibleItems.map((item) => item.id),
    ["p1", "p2"],
  );
});

test("home product selection falls back to all items for an invalid category", () => {
  const selection = resolveHomeProductSelection(groups, "missing");

  assert.equal(selection.activeGroupId, "all");
  assert.equal(selection.totalItems, 3);
  assert.deepEqual(
    selection.visibleItems.map((item) => item.id),
    ["p1", "p2", "p3"],
  );
});
