// An expected failure, such as bad input or a sold-out tier.
// Code should check `code`; `message` is written for people.
export class DomainError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'DomainError';
    this.code = code;
  }
}