// The booking rules, held in memory.
// Every function checks everything BEFORE it changes anything, so a failed
// call leaves the store exactly as it was.
// Functions return copies, so callers cannot change stored data by accident.

import { DomainError } from './errors.js';
import { newId, newReference } from './ids.js';
import { Queue } from './waitlistQueue.js';

const MAX_TICKETS_PER_BOOKING = 10;
// The largest price for which price * 10 is still an exact whole number.
const MAX_PRICE_CENTS = Math.floor(Number.MAX_SAFE_INTEGER / MAX_TICKETS_PER_BOOKING);
// Date, time and time zone, for example 2026-12-05T17:00:00Z
const ISO_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2})T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-]([01]\d|2[0-3]):[0-5]\d)$/;

function invalid(message) {
  return new DomainError('VALIDATION', message);
}

function requireStore(store) {
  const maps = ['events', 'tiers', 'bookingsByReference', 'waitlists'];
  if (!maps.every((name) => store?.[name] instanceof Map)) {
    throw invalid('A store made by createStore() is required');
  }
}

function requireObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw invalid('Details must be an object');
  }
  return value;
}

function requireText(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalid(`${field} is required`);
  }
  return value.trim();
}

function requireWholeNumber(value, field, min, max = Number.MAX_SAFE_INTEGER) {
  if (!Number.isSafeInteger(value) || value < min || value > max) {
    throw invalid(`${field} must be a whole number from ${min} to ${max}`);
  }
  return value;
}

function requireDate(value, field) {
  const match = typeof value === 'string' ? ISO_DATE_TIME.exec(value) : null;
  if (!match) {
    throw invalid(`${field} must be a date and time such as 2026-12-05T17:00:00Z`);
  }
  // JavaScript turns 30 February into 2 March, so check the calendar ourselves.
  const [year, month, day] = match.slice(1, 4).map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  if (calendar.getUTCMonth() !== month - 1 || calendar.getUTCDate() !== day) {
    throw invalid(`${field} is not a real date`);
  }
  return value;
}

function requireQuantity(quantity) {
  return requireWholeNumber(quantity, 'quantity', 1, MAX_TICKETS_PER_BOOKING);
}

// Looks up an id in one of the store's Maps.
function findById(map, id, label) {
  requireText(id, `${label} id`);
  const record = map.get(id);
  if (!record) throw new DomainError('NOT_FOUND', `${label} not found`);
  return record;
}

function findStoredBooking(store, reference) {
  const key = requireText(reference, 'reference').toUpperCase();
  const booking = store.bookingsByReference.get(key);
  if (!booking) throw new DomainError('NOT_FOUND', 'Booking not found');
  return booking;
}

export function createStore() {
  return {
    events: new Map(), // event id -> event
    tiers: new Map(), // tier id -> tier
    bookingsByReference: new Map(), // reference -> booking
    waitlists: new Map(), // tier id -> Queue
  };
}

export function createEvent(store, details) {
  requireStore(store);
  const { title, city, venue = '', startsAt } = requireObject(details);
  if (typeof venue !== 'string') throw invalid('venue must be text');

  const event = {
    id: newId(),
    title: requireText(title, 'title'),
    city: requireText(city, 'city'),
    venue: venue.trim(),
    startsAt: requireDate(startsAt, 'startsAt'),
  };
  store.events.set(event.id, event);
  return { ...event };
}

export function addTier(store, eventId, details) {
  requireStore(store);
  findById(store.events, eventId, 'Event');
  const { name, priceCents, capacity } = requireObject(details);

  const tier = {
    id: newId(),
    eventId,
    name: requireText(name, 'name'),
    priceCents: requireWholeNumber(priceCents, 'priceCents', 0, MAX_PRICE_CENTS),
    capacity: requireWholeNumber(capacity, 'capacity', 1),
    sold: 0,
  };
  store.tiers.set(tier.id, tier);
  store.waitlists.set(tier.id, new Queue());
  return { ...tier };
}

export function bookTickets(store, tierId, userId, quantity) {
  requireStore(store);
  const tier = findById(store.tiers, tierId, 'Ticket tier');
  const buyer = requireText(userId, 'userId');
  requireQuantity(quantity);

  const seatsLeft = tier.capacity - tier.sold;
  if (quantity > seatsLeft) {
    throw new DomainError('SOLD_OUT', `Only ${seatsLeft} ticket(s) left in ${tier.name}`);
  }

  let reference = newReference();
  while (store.bookingsByReference.has(reference)) reference = newReference();

  const booking = {
    id: newId(),
    reference,
    userId: buyer,
    tierId,
    quantity,
    amountCents: tier.priceCents * quantity,
    status: 'pending',
  };

  // All checks have passed. Only now do we change the store.
  tier.sold += quantity;
  store.bookingsByReference.set(reference, booking);
  return { ...booking };
}

// O(1) on average: one Map lookup, however many bookings there are.
export function findBookingByReference(store, reference) {
  requireStore(store);
  return { ...findStoredBooking(store, reference) };
}

export function cancelBooking(store, reference) {
  requireStore(store);
  const booking = findStoredBooking(store, reference);
  if (booking.status === 'cancelled') {
    throw new DomainError('INVALID_STATE', 'This booking is already cancelled');
  }
  const tier = findById(store.tiers, booking.tierId, 'Ticket tier');

  tier.sold -= booking.quantity;
  booking.status = 'cancelled';
  return { ...booking };
}

export function joinWaitlist(store, tierId, userId, quantity) {
  requireStore(store);
  const tier = findById(store.tiers, tierId, 'Ticket tier');
  const person = requireText(userId, 'userId');
  requireQuantity(quantity);
  if (tier.sold < tier.capacity) {
    throw new DomainError('NOT_SOLD_OUT', 'This tier still has seats, so book them instead');
  }

  const queue = store.waitlists.get(tierId);
  queue.enqueue({ userId: person, quantity });
  return { position: queue.size };
}

// Names the person at the front of the line. It does not remove them or give
// them seats. Returns undefined if nobody is waiting.
export function peekNextOnWaitlist(store, tierId) {
  requireStore(store);
  findById(store.tiers, tierId, 'Ticket tier');
  const next = store.waitlists.get(tierId).peek();
  return next && { ...next };
}