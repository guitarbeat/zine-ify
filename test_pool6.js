const run = async () => {
  const p1 = Promise.reject(new Error("Fail"));
  const e1 = p1.finally(() => console.log("finally"));

  try {
    await Promise.race([e1]);
  } catch (err) {
    console.error("Caught in race:", err.message);
  }
};
run();
