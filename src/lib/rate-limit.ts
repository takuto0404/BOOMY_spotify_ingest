import PQueue from "p-queue";

export const createUserQueue = (concurrency: number) =>
  new PQueue({
    concurrency,
    autoStart: true
  });
