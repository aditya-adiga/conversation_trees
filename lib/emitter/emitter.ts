import { EventEmitter } from "events";

const globalForEmitter = globalThis as typeof globalThis & {
  __conversationTreeEmitter?: EventEmitter;
};

export const emitter =
  globalForEmitter.__conversationTreeEmitter ??= new EventEmitter();
