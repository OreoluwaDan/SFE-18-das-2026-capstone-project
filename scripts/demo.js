// Run with: npm run demo
import { DomainError } from '../src/domain/errors.js';
import {
  createStore,
  createEvent,
  addTier,
  bookTickets,
  cancelBooking,
  findBookingByReference,
  joinWaitlist,
  peekNextOnWaitlist,
} from '../src/domain/inventory.js';

const store = createStore();

const event = createEvent(store, {
  title: 'Lagos Tech Meetup',
  city: 'Lagos',
  venue: 'Yaba Hub',
  startsAt: '2026-12-05T17:00:00Z',
});
const tier = addTier(store, event.id, { name: 'General', priceCents: 500_000, capacity: 3 });
const seatsLeft = () => tier.capacity - store.tiers.get(tier.id).sold;

console.log(`1. "${event.title}" has ${seatsLeft()} seats in ${tier.name}.`);

const adaBooking = bookTickets(store, tier.id, 'Ada', 2);
console.log(`2. Ada books 2. Seats left: ${seatsLeft()}`);

try {
  bookTickets(store, tier.id, 'Bayo', 2);
} catch (error) {
  if (!(error instanceof DomainError)) throw error;
  console.log(`3. Bayo asks for 2 and is refused: ${error.code} (${error.message})`);
}

bookTickets(store, tier.id, 'Bayo', 1);
console.log(`4. Bayo books 1. Seats left: ${seatsLeft()}. SOLD OUT.`);

for (const [name, quantity] of [['Chidi', 2], ['Dayo', 1]]) {
  const { position } = joinWaitlist(store, tier.id, name, quantity);
  console.log(`5. ${name} joins the waitlist for ${quantity} at position ${position}.`);
}

const found = findBookingByReference(store, adaBooking.reference);
console.log(
  `6. Found ${found.reference}: ${found.userId}, ${found.quantity} tickets, ` +
    `${found.amountCents} kobo, ${found.status}`,
);

cancelBooking(store, adaBooking.reference);
console.log(`7. Ada cancels. Seats left: ${seatsLeft()}`);

console.log(`8. Next in line: ${peekNextOnWaitlist(store, tier.id).userId}`);