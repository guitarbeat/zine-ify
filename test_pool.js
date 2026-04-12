const processPage = async (i) => {
  console.log(`Start ${i}`);
  await new Promise(r => setTimeout(r, Math.random() * 1000));
  if (i === 5) throw new Error("Fail 5");
  console.log(`End ${i}`);
};

const maxPages = 10;
const run = async () => {
  const limit = 4;
  const executing = new Set();
  const results = [];

  for (let i = 1; i <= maxPages; i++) {
    const p = Promise.resolve().then(() => processPage(i));
    results.push(p);

    // Create a promise that just cleans itself up
    // using finally to ensure it cleans up on success or failure,
    // but without catching the error (we want the error to propagate)
    const e = p.finally(() => executing.delete(e));
    executing.add(e);

    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  await Promise.all(results);
};

run().catch(e => console.error("Caught:", e.message));
