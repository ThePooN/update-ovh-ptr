import { createHash } from "crypto";

const appKey = process.env.OVH_APP_KEY;
const secretKey = process.env.OVH_SECRET_KEY;
const consumerKey = process.env.OVH_CONSUMER_KEY;

const reverse = process.env.DESIRED_REVERSE;

const currentIP = process.env.IP_ADDRESS || (await (await fetch("https://ipinfo.io/json")).json()).ip;
console.log(`Current IP address is ${currentIP}`);

function sha1(str: string): string {
  const hash = createHash("sha1");
  hash.update(str);
  return hash.digest("hex");
}

function ovh(method: string, url: string, body?: string | object, extraHeaders: {[k: string]: string} = {}) {
  if (typeof body === "object") {
    body = JSON.stringify(body);
    extraHeaders["Content-Type"] = "application/json";
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const toHash = `${secretKey}+${consumerKey}+${method}+${url}+${body || ""}+${timestamp}`;
  const signature = `$1$${sha1(toHash)}`;

  return fetch(url, {
    method,
    body,
    headers: {
      "X-Ovh-Application": appKey,
      "X-Ovh-Consumer": consumerKey,
      "X-Ovh-Timestamp": `${timestamp}`,
      "X-Ovh-Signature": signature,
      ...extraHeaders,
    }
  });
}

const reverseFetchCall = await ovh("GET", `https://api.ovh.com/1.0/ip/${currentIP}/reverse/${currentIP}`);
if (reverseFetchCall.status === 200) {
  console.log(`This node's PTR is already defined to ${(await reverseFetchCall.json()).reverse}`);
  process.exit(0);
}
if (reverseFetchCall.status !== 404) {
  console.log(`Failed to fetch PTR for ${currentIP}: ${await reverseFetchCall.text()}`);
  process.exit(1);
}

const reverseSetCall = await ovh("POST", `https://api.ovh.com/1.0/ip/${currentIP}/reverse`, {
  ipReverse: currentIP,
  reverse,
});
if (reverseSetCall.status === 200) {
  console.log(`This node's PTR has been updated to ${reverse}`);
  process.exit(0);
}
console.log(`Failed to update PTR for ${currentIP}: ${await reverseSetCall.text()}`);
process.exit(1);
