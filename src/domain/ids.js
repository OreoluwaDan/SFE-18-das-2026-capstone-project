import { randomInt, randomUUID } from 'node:crypto';

// No 0, O, 1, I or L: they are easy to confuse.
const REFERENCE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 8;


//create a new id to indentify unique user
export function newId() {
  return randomUUID();
}

//creates booking code for people
// randomInt picks every character with equal probability.
export function newReference() {
  let reference = '';
  for (let i = 0; i < REFERENCE_LENGTH; i += 1) {
    reference += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
  }
  return reference;
}