/**
 * Read all data from stdin with a timeout to prevent hanging.
 */
export async function readStdin(timeoutMs: number = 5000): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    let resolved = false;

    const done = (result: string) => {
      if (!resolved) {
        resolved = true;
        resolve(result);
      }
    };

    // Timeout to prevent hanging if stdin never closes
    const timeout = setTimeout(() => {
      done(data);
    }, timeoutMs);

    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += String(chunk);
    });
    process.stdin.on("end", () => {
      clearTimeout(timeout);
      done(data);
    });
    process.stdin.on("error", () => {
      clearTimeout(timeout);
      done(data);
    });

    // Handle case where stdin is empty/closed
    if (process.stdin.isTTY) {
      clearTimeout(timeout);
      done("");
    }
  });
}
