const run = async () => {
  const p1 = new Promise((resolve, reject) => setTimeout(() => reject(new Error("Fail 1")), 100));
  // if p1 rejects, e1 will reject with the SAME reason, so Promise.race fails fast.
  const e1 = p1.finally(() => console.log("finally"));

  try {
    await Promise.race([e1]);
  } catch (err) {
    console.error("Caught in race:", err.message);
  }
};
run();
