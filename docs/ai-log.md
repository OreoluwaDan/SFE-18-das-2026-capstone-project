# AI log

## Build 1

### Prompt 1: Build 1 prompt (docs/build-1.md)
- **What we asked:** The lecturer's Build 1 prompt: domain modules, demo, lookup benchmark and package.json scripts. We approved the AI's plan before it coded. The AI had also read the lecturer's repository earlier in the chat.
- **What the AI returned:** package.json, errors.js, ids.js, waitlistQueue.js, inventory.js, demo.js and benchmark-lookup.js. It added a peekNextOnWaitlist function, and a NOT_SOLD_OUT check taken from Build 8's story S11. The AI also ran the demo, benchmark and temporary edge-case checks, which passed.
- **What was wrong (or "nothing was wrong"):** We found no errors when running the demo and benchmark. The prompt's function list had no way to name the next person on the waitlist. Known limits: a person can join a waitlist twice, and freed seats are not held for people waiting.
- **What we changed:** No code fixes. We accepted peekNextOnWaitlist, which names the next person without removing them, and the NOT_SOLD_OUT check.