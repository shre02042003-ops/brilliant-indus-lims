const path = require("path");
const dns = require("dns");
const { Agent, fetch: undiciFetch, setGlobalDispatcher } = require("undici");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { createClient } = require("@supabase/supabase-js");

dns.setDefaultResultOrder("ipv4first");

function cleanEnv(value) {
  return String(value || "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

function lookupViaPublicDns(hostname, options, callback) {
  const resolver = new dns.Resolver();
  resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

  const done = (err, addresses, family) => {
    if (err) return callback(err);
    if (options && options.all) {
      return callback(
        null,
        addresses.map((address) => ({ address, family })),
      );
    }
    callback(null, addresses[0], family);
  };

  resolver.resolve4(hostname, (err4, ipv4) => {
    if (!err4 && ipv4 && ipv4.length) {
      return done(null, ipv4, 4);
    }
    resolver.resolve6(hostname, (err6, ipv6) => {
      if (!err6 && ipv6 && ipv6.length) {
        return done(null, ipv6, 6);
      }
      callback(err4 || err6 || new Error(`ENOTFOUND ${hostname}`));
    });
  });
}

setGlobalDispatcher(
  new Agent({
    connect: {
      lookup: lookupViaPublicDns,
    },
  }),
);

const supabaseUrl = cleanEnv(process.env.SUPABASE_URL);
const supabaseAnonKey = cleanEnv(process.env.SUPABASE_ANON_KEY);
const supabaseServiceKey = cleanEnv(process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabaseKey = supabaseServiceKey || supabaseAnonKey;

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_ANON_KEY. Set them in server/.env",
  );
}

let parsedUrl;
try {
  parsedUrl = new URL(supabaseUrl);
} catch {
  throw new Error(
    "SUPABASE_URL is not a valid URL. Copy Project URL from Supabase → Project Settings → API.",
  );
}

const supabaseOrigin = parsedUrl.origin;

lookupViaPublicDns(parsedUrl.hostname, {}, (err, address) => {
  if (err) {
    console.error(
      `Cannot resolve ${parsedUrl.hostname} via 8.8.8.8 (${err.code || err.message}). Check SUPABASE_URL.`,
    );
  } else {
    console.log(`Supabase DNS ok: ${parsedUrl.hostname} -> ${address}`);
  }
});

if (supabaseServiceKey) {
  console.log("Supabase auth: service role (RLS bypassed)");
} else {
  console.log(
    "Supabase auth: anon/publishable key (RLS applies). Inserts need table policies, or set SUPABASE_SERVICE_ROLE_KEY in server/.env.",
  );
}

const supabase = createClient(supabaseOrigin, supabaseKey, {
  global: { fetch: undiciFetch },
});

module.exports = supabase;
