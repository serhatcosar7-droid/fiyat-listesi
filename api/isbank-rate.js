const ISBANK_RATE_URL = "https://www.isbank.com.tr/doviz-kurlari";
const JINA_READER_URL = "https://r.jina.ai/" + ISBANK_RATE_URL;

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  try {
    const directResult = await fetchAndParse(ISBANK_RATE_URL, "Isbank direct");

    if (directResult.rate) {
      return sendRate(response, directResult.rate, directResult.source);
    }

    const readerResult = await fetchAndParse(JINA_READER_URL, "Jina Reader");

    if (readerResult.rate) {
      return sendRate(response, readerResult.rate, readerResult.source);
    }

    return response.status(502).json({
      error: "USD rate could not be read.",
      detail: `${directResult.error || "Direct read failed."} ${readerResult.error || "Fallback read failed."}`
    });
  } catch (error) {
    return response.status(500).json({
      error: "Rate fetch failed.",
      detail: error.message
    });
  }
};

async function fetchAndParse(url, source) {
  try {
    const rateResponse = await fetch(url, {
      cache: "no-store",
      headers: {
        "accept": "text/html,text/plain,application/xhtml+xml",
        "accept-language": "tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) fiyat-listesi-rate-fetcher"
      }
    });

    if (!rateResponse.ok) {
      return { error: `${source}: HTTP ${rateResponse.status}` };
    }

    const text = await rateResponse.text();
    const rate = parseIsbankUsdRate(text);
    return rate ? { rate, source } : { error: `${source}: USD row not found.` };
  } catch (error) {
    return { error: `${source}: ${error.message}` };
  }
}

function sendRate(response, rate, source) {
  return response.status(200).json({
    source,
    currency: "USD",
    buy: rate.buy,
    sell: rate.sell,
    updatedAt: new Date().toISOString()
  });
}

function parseIsbankUsdRate(html) {
  const normalizedText = html.replace(/\s+/g, " ");
  const match = normalizedText.match(/USD\s+Amerikan\s+Dolar[\u0131i]\s+([\d.,]+)\s+([\d.,]+)/i);

  if (!match) {
    return null;
  }

  const rate = {
    buy: parseTurkishNumber(match[1]),
    sell: parseTurkishNumber(match[2])
  };

  if (!Number.isFinite(rate.buy) || !Number.isFinite(rate.sell)) {
    return null;
  }

  return rate;
}

function parseTurkishNumber(value) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}
