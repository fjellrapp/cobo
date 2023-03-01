export const isError = (e: unknown): e is Error => {
  return e instanceof Error;
};
