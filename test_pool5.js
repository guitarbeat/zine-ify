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
    results.push(p);

    const e = p.finally(() => executing.delete(e));
    executing.add(e);

    if (executing.size >= concurrencyLimit) {
      await Promise.race(executing);
    }
  }

  await Promise.all(results);
};

run().catch(e => console.error("Caught:", e.message));
