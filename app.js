// Bu iki sabit şifreyi değiştirmek için yeterlidir.
const LOGIN_PASSWORD = "334734";
const EDIT_PASSWORD = "483228";

const STORAGE_KEY = "meteksan-product-prices";
const RATE_STORAGE_KEY = "meteksan-isbank-usd-rate";
const ISBANK_RATE_URL = "https://www.isbank.com.tr/doviz-kurlari";
const RATE_PROXY_URL = "https://api.allorigins.win/raw?url=" + encodeURIComponent(ISBANK_RATE_URL);

const defaultProducts = [
  { id: createId(), name: "Karpit", cost: 0.75, sale: 1.00 },
  { id: createId(), name: "Kömür", cost: 0.45, sale: 0.70 },
  { id: createId(), name: "SG2 Kaynak Teli", cost: 1.20, sale: 1.60 },
  { id: createId(), name: "Asetik Asit", cost: 0.75, sale: 1.00 },
  { id: createId(), name: "Sitrik Asit", cost: 0.45, sale: 0.70 },
  { id: createId(), name: "Karabiber", cost: 1.10, sale: 1.50 },
  { id: createId(), name: "Zencefil", cost: 1.35, sale: 1.85 },
  { id: createId(), name: "Sodyum Benzoat", cost: 0.95, sale: 1.30 },
  { id: createId(), name: "Sodyum Bikarbonat", cost: 0.55, sale: 0.85 },
  { id: createId(), name: "MSG", cost: 1.05, sale: 1.45 }
];

const loginScreen = document.querySelector("#loginScreen");
const dashboard = document.querySelector("#dashboard");
const loginForm = document.querySelector("#loginForm");
const loginPassword = document.querySelector("#loginPassword");
const loginError = document.querySelector("#loginError");
const logoutButton = document.querySelector("#logoutButton");

const productForm = document.querySelector("#productForm");
const editingProductId = document.querySelector("#editingProductId");
const productName = document.querySelector("#productName");
const costPrice = document.querySelector("#costPrice");
const salePrice = document.querySelector("#salePrice");
const submitProductButton = document.querySelector("#submitProductButton");
const cancelEditButton = document.querySelector("#cancelEditButton");
const formMessage = document.querySelector("#formMessage");
const searchInput = document.querySelector("#searchInput");
const productTableBody = document.querySelector("#productTableBody");
const productCards = document.querySelector("#productCards");
const productCount = document.querySelector("#productCount");
const emptyState = document.querySelector("#emptyState");
const fetchRateButton = document.querySelector("#fetchRateButton");
const buyRate = document.querySelector("#buyRate");
const sellRate = document.querySelector("#sellRate");
const rateStatus = document.querySelector("#rateStatus");

const confirmModal = document.querySelector("#confirmModal");
const confirmForm = document.querySelector("#confirmForm");
const editPassword = document.querySelector("#editPassword");
const confirmError = document.querySelector("#confirmError");
const closeModalButton = document.querySelector("#closeModalButton");

let products = loadProducts();
let exchangeRate = loadExchangeRate();
let pendingAction = null;

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (loginPassword.value.trim() !== LOGIN_PASSWORD) {
    loginError.textContent = "Şifre hatalı";
    return;
  }

  loginError.textContent = "";
  loginPassword.value = "";
  loginScreen.classList.add("is-hidden");
  dashboard.classList.remove("is-hidden");
  renderProducts();
  fetchIsbankRate();
});

logoutButton.addEventListener("click", () => {
  dashboard.classList.add("is-hidden");
  loginScreen.classList.remove("is-hidden");
  loginPassword.focus();
});

productForm.addEventListener("submit", (event) => {
  event.preventDefault();
  formMessage.textContent = "";
  formMessage.classList.remove("error");

  const payload = getValidatedPayload();
  if (!payload) return;

  const id = editingProductId.value;
  const actionText = id ? "Ürün düzenleme işlemini onaylayın." : "Ürün ekleme işlemini onaylayın.";

  openConfirmModal(actionText, () => {
    if (id) {
      products = products.map((product) => product.id === id ? { ...product, ...payload } : product);
      showFormMessage("Ürün güncellendi.");
    } else {
      products = [{ id: createId(), ...payload }, ...products];
      showFormMessage("Ürün eklendi.");
    }

    saveProducts();
    resetProductForm();
    renderProducts();
  });
});

cancelEditButton.addEventListener("click", resetProductForm);

searchInput.addEventListener("input", renderProducts);
fetchRateButton.addEventListener("click", fetchIsbankRate);

productTableBody.addEventListener("click", handleProductAction);
productCards.addEventListener("click", handleProductAction);

renderExchangeRate();

confirmForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (editPassword.value.trim() !== EDIT_PASSWORD) {
    confirmError.textContent = "Düzenleme şifresi hatalı";
    return;
  }

  confirmError.textContent = "";
  closeConfirmModal();

  if (typeof pendingAction === "function") {
    pendingAction();
  }

  pendingAction = null;
});

closeModalButton.addEventListener("click", closeConfirmModal);

function loadProducts() {
  const savedProducts = localStorage.getItem(STORAGE_KEY);

  if (!savedProducts) {
    return defaultProducts;
  }

  try {
    const parsedProducts = JSON.parse(savedProducts);
    return Array.isArray(parsedProducts) ? parsedProducts : defaultProducts;
  } catch {
    return defaultProducts;
  }
}

function saveProducts() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products));
}

function loadExchangeRate() {
  const savedRate = localStorage.getItem(RATE_STORAGE_KEY);

  if (!savedRate) {
    return null;
  }

  try {
    return JSON.parse(savedRate);
  } catch {
    return null;
  }
}

function saveExchangeRate() {
  localStorage.setItem(RATE_STORAGE_KEY, JSON.stringify(exchangeRate));
}

function renderProducts() {
  const query = searchInput.value.trim().toLocaleLowerCase("tr-TR");
  const filteredProducts = products.filter((product) =>
    product.name.toLocaleLowerCase("tr-TR").includes(query)
  );

  productTableBody.innerHTML = filteredProducts.map(createTableRow).join("");
  productCards.innerHTML = filteredProducts.map(createProductCard).join("");
  productCount.textContent = `${filteredProducts.length} ürün`;
  emptyState.classList.toggle("is-hidden", filteredProducts.length > 0);
}

function createTableRow(product) {
  return `
    <tr>
      <td>${escapeHtml(product.name)}</td>
      <td>${createPriceHtml(product.cost)}</td>
      <td>${createPriceHtml(product.sale)}</td>
      <td>
        <div class="row-actions">
          <button class="secondary-button" type="button" data-action="edit" data-id="${product.id}">Düzenle</button>
          <button class="danger-button" type="button" data-action="delete" data-id="${product.id}">Sil</button>
        </div>
      </td>
    </tr>
  `;
}

function createProductCard(product) {
  return `
    <article class="product-card">
      <div class="card-title">${escapeHtml(product.name)}</div>
      <div class="card-prices">
        <div><span>Maliyet fiyatı</span>${createPriceHtml(product.cost)}</div>
        <div><span>Tavsiye edilen satış fiyatı</span>${createPriceHtml(product.sale)}</div>
      </div>
      <div class="row-actions">
        <button class="secondary-button" type="button" data-action="edit" data-id="${product.id}">Düzenle</button>
        <button class="danger-button" type="button" data-action="delete" data-id="${product.id}">Sil</button>
      </div>
    </article>
  `;
}

async function fetchIsbankRate() {
  fetchRateButton.disabled = true;
  rateStatus.textContent = "İş Bankası kuru alınıyor...";

  try {
    const response = await fetch(RATE_PROXY_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("Kur sayfasına ulaşılamadı.");
    }

    const html = await response.text();
    const parsedRate = parseIsbankUsdRate(html);

    if (!parsedRate) {
      throw new Error("USD kuru okunamadı.");
    }

    exchangeRate = {
      ...parsedRate,
      source: "İş Bankası",
      updatedAt: new Date().toISOString()
    };

    saveExchangeRate();
    renderExchangeRate();
    renderProducts();
  } catch (error) {
    rateStatus.textContent = "İş Bankası kuru otomatik alınamadı. Lütfen tekrar deneyin.";
  } finally {
    fetchRateButton.disabled = false;
  }
}

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

function renderExchangeRate() {
  if (!exchangeRate) {
    buyRate.textContent = "-";
    sellRate.textContent = "-";
    return;
  }

  buyRate.textContent = exchangeRate.buy ? formatRate(exchangeRate.buy) : "-";
  sellRate.textContent = formatRate(exchangeRate.sell);

  const updatedText = new Date(exchangeRate.updatedAt).toLocaleString("tr-TR");
  rateStatus.textContent = `${exchangeRate.source} satış kuru kullanılıyor. Güncelleme: ${updatedText}`;
}

function createPriceHtml(value) {
  const usdText = `<strong class="price">${formatPrice(value)} USD/kg</strong>`;

  if (!exchangeRate || !exchangeRate.sell) {
    return usdText;
  }

  const tryValue = Number(value) * exchangeRate.sell;
  return `${usdText}<span class="try-price">≈ ${formatTryPrice(tryValue)} TL/kg</span>`;
}

function handleProductAction(event) {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const product = products.find((item) => item.id === button.dataset.id);
  if (!product) return;

  if (button.dataset.action === "edit") {
    editingProductId.value = product.id;
    productName.value = product.name;
    costPrice.value = product.cost;
    salePrice.value = product.sale;
    submitProductButton.textContent = "Onayla";
    cancelEditButton.classList.remove("is-hidden");
    productName.focus();
    showFormMessage("Ürün bilgilerini düzenleyip Onayla butonuna basın.");
    return;
  }

  openConfirmModal(`${product.name} ürününü silmek için düzenleme şifresini girin.`, () => {
    products = products.filter((item) => item.id !== product.id);
    saveProducts();
    resetProductForm();
    renderProducts();
    showFormMessage("Ürün silindi.");
  });
}

function getValidatedPayload() {
  const name = productName.value.trim();
  const cost = Number(costPrice.value);
  const sale = Number(salePrice.value);

  if (!name || costPrice.value === "" || salePrice.value === "") {
    showFormError("Boş ürün adı veya boş fiyat girilemez.");
    return null;
  }

  if (!Number.isFinite(cost) || !Number.isFinite(sale) || cost < 0 || sale < 0) {
    showFormError("Maliyet ve tavsiye edilen fiyat sadece pozitif sayı olmalıdır.");
    return null;
  }

  return { name, cost, sale };
}

function openConfirmModal(description, action) {
  pendingAction = action;
  document.querySelector("#confirmDescription").textContent = description;
  editPassword.value = "";
  confirmError.textContent = "";
  confirmModal.classList.remove("is-hidden");
  editPassword.focus();
}

function closeConfirmModal() {
  confirmModal.classList.add("is-hidden");
  editPassword.value = "";
  confirmError.textContent = "";
}

function resetProductForm() {
  productForm.reset();
  editingProductId.value = "";
  submitProductButton.textContent = "Ürün Ekle";
  cancelEditButton.classList.add("is-hidden");
}

function showFormMessage(message) {
  formMessage.classList.remove("error");
  formMessage.textContent = message;
}

function showFormError(message) {
  formMessage.classList.add("error");
  formMessage.textContent = message;
}

function formatPrice(value) {
  return Number(value).toFixed(2);
}

function formatRate(value) {
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4
  });
}

function formatTryPrice(value) {
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
}

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}
