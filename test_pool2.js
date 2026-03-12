const processPage = async (i) => {
  console.log(`Start ${i}`);
  await new Promise(r => setTimeout(r, Math.random() * 500));
  if (i === 3) throw new Error("Fail 3");
  console.log(`End ${i}`);
};

const run = async () => {
  const maxPages = 10;
  const concurrencyLimit = 4;
  const executing = new Set();
  const results = [];

  try {
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
    console.log("Success");
  } catch (err) {
    console.error("Caught:", err.message);
  }
};

run();
