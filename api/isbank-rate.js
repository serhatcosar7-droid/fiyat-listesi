const ISBANK_RATE_URL = "https://www.isbank.com.tr/doviz-kurlari";

module.exports = async function handler(request, response) {
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  try {
    const rateResponse = await fetch(ISBANK_RATE_URL, {
      headers: {
        "user-agent": "Mozilla/5.0 fiyat-listesi-rate-fetcher"
      }
    });

    if (!rateResponse.ok) {
      return response.status(502).json({
        error: "İş Bankası kur sayfasına ulaşılamadı."
      });
    }

    const html = await rateResponse.text();
    const parsedRate = parseIsbankUsdRate(html);

    if (!parsedRate) {
      return response.status(502).json({
        error: "USD kuru İş Bankası sayfasından okunamadı."
      });
    }

    return response.status(200).json({
      source: "İş Bankası",
      currency: "USD",
      buy: parsedRate.buy,
      sell: parsedRate.sell,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    return response.status(500).json({
      error: "Kur bilgisi alınırken hata oluştu."
    });
  }
};

function parseIsbankUsdRate(html) {
  const normalizedText = html.replace(/\s+/g, " ");
  const match = normalizedText.match(/USD\s+Amerikan Doları\s+([\d.,]+)\s+([\d.,]+)/i);

  if (!match) {
    return null;
  }

  return {
    buy: parseTurkishNumber(match[1]),
    sell: parseTurkishNumber(match[2])
  };
}

function parseTurkishNumber(value) {
  return Number(value.replace(/\./g, "").replace(",", "."));
}
