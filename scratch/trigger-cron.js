async function tryTrigger(secret) {
  const url = "http://127.0.0.1:3000/api/cron/followup-notifications";
  console.log(`Trying trigger with secret: ${secret.slice(0, 10)}...`);

  // 1. Try x-cron-secret header
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "x-cron-secret": secret
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`SUCCESS with x-cron-secret! Response:`, JSON.stringify(data, null, 2));
      return true;
    }
    console.log(`x-cron-secret failed with status: ${res.status}`);
  } catch (err) {
    console.log(`x-cron-secret error:`, err.message);
  }

  // 2. Try Authorization Bearer header
  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${secret}`
      }
    });
    if (res.ok) {
      const data = await res.json();
      console.log(`SUCCESS with Authorization Bearer! Response:`, JSON.stringify(data, null, 2));
      return true;
    }
    console.log(`Bearer failed with status: ${res.status}`);
  } catch (err) {
    console.log(`Bearer error:`, err.message);
  }

  return false;
}

async function main() {
  const secret1 = "bimaheadquarter-cron-9xK7mP4sV8qL2nR5aT1w";
  const secret2 = "InsureDesk_BHQ_2026_7mK9#Xv41!QaP82$LdR6@Np5";

  if (await tryTrigger(secret1)) return;
  if (await tryTrigger(secret2)) return;

  console.log("All trigger attempts failed.");
}

main();
