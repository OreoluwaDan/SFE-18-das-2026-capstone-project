// First-in-first-out queue built as a linked list.
// We keep both ends and a count, so no operation has to walk the list: all O(1).
export class Queue {
  #head = null; // next to leave
  #tail = null; // last to join
  #size = 0;

  get size() {
    return this.#size;
  }

  enqueue(value) {
    const node = { value, next: null };
    if (this.#tail === null) {
      this.#head = node;
    } else {
      this.#tail.next = node;
    }
    this.#tail = node;
    this.#size += 1;
  }

  // Removes and returns the first value, or undefined if the queue is empty.
  dequeue() {
    if (this.#head === null) return undefined;
    const { value, next } = this.#head;
    this.#head = next;
    if (this.#head === null) this.#tail = null;
    this.#size -= 1;
    return value;
  }

  // Returns the first value without removing it.
  peek() {
    return this.#head?.value;
  }
}