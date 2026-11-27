// Run with: npm run benchmark
// Looks up the same references with Array.find and with Map.get.
import { randomInt } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { createStore, createEvent, addTier, bookTickets } from '../src/domain/inventory.js';

const BOOKINGS = 100_000;
const LOOKUPS = 500;

const store = createStore();
const event = createEvent(store, {
  title: 'Benchmark',
  city: 'Lagos',
  startsAt: '2026-12-05T17:00:00Z',
});
const tier = addTier(store, event.id, { name: 'General', priceCents: 100, capacity: BOOKINGS });
for (let i = 0; i < BOOKINGS; i += 1) {
  bookTickets(store, tier.id, `user-${i}`, 1);
}

// The same bookings, held two ways.
const map = store.bookingsByReference;
const array = [...map.values()];
const wanted = Array.from({ length: LOOKUPS }, () => array[randomInt(array.length)].reference);

function time(label, lookup) {
  let found = 0;
  const start = performance.now();
  for (const reference of wanted) {
    // Checking the result stops the lookup being skipped as unused work.
    if (lookup(reference)?.reference === reference) found += 1;
  }
  const milliseconds = performance.now() - start;
  console.log(`${label.padEnd(11)} ${milliseconds.toFixed(3)} ms  (found ${found}/${LOOKUPS})`);
  return milliseconds;
}

console.log(`${LOOKUPS} lookups among ${BOOKINGS} bookings`);
const arrayTime = time('Array.find', (reference) => array.find((b) => b.reference === reference));
const mapTime = time('Map.get', (reference) => map.get(reference));
console.log(`Map.get was about ${Math.round(arrayTime / mapTime)} times faster in this run.`);