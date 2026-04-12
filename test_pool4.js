const processPage = async (i) => {
  await new Promise(r => setTimeout(r, Math.random() * 500));
  if (i === 3) throw new Error("Fail 3");
};

const run = async () => {
  const maxPages = 10;
  const concurrencyLimit = 4;
  const executing = new Set();
  const results = [];

  for (let i = 1; i <= maxPages; i++) {
    const p = processPage(i);
    // Suppress unhandled rejections
    p.catch(() => {});
    results.push(p);

    // Create tracking promise that doesn't propagate the error to Promise.race
    // wait, if we catch it, Promise.race won't fail fast!

    const e = p.finally(() => executing.delete(e));
    executing.add(e);

    if (executing.size >= concurrencyLimit) {
      // If we use executing which has finally without catch, Promise.race WILL fail fast
      // but wait, does Promise.race fail fast if one of the promises in executing throws?
      // Yes, if p throws, e throws too (finally passes through errors).
      await Promise.race(executing);
    }
  }

  await Promise.all(results);
};

run().catch(e => console.error("Caught:", e.message));
