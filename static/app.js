// ===================== DOM ELEMENTS =====================
const tbody = document.querySelector('#lcd-table tbody');
const outOfStockBody = document.querySelector('#out-of-stock-table tbody');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('lcd-modal');
const modalClose = document.getElementById('modal-close');
const lcdForm = document.getElementById('lcd-form');
const modalTitle = document.getElementById('modal-title');
const formSubmitBtn = document.getElementById('form-submit-btn');
const categorySelect = document.getElementById('category-select');

// ===================== STATE VARIABLES =====================
let currentData = [];
let buyPricesVisible = false;
let buyPriceCache = {};
let currentCategory = 'lcd';
let api = `/api/${currentCategory}s`;
let sortColumn = null;
let sortDirection = 1; // 1 = asc, -1 = desc

// ===================== CATEGORY & MODAL =====================
function setCategory(category) {
  currentCategory = category;
  api = `/api/${currentCategory}s`;
  load();
  updateModalText();
}

function updateModalText() {
  const capital = currentCategory.charAt(0).toUpperCase() + currentCategory.slice(1);
  modalTitle.textContent = `Add ${capital}`;
  formSubmitBtn.textContent = `Add ${capital}`;
}

// ===================== DATA LOADING & RENDERING =====================
async function load() {
  const res = await fetch(api);
  currentData = await res.json();
  render(currentData);
}

function render(data) {
  // Filter by search box
  const filter = searchInput.value.toLowerCase().trim();
  let filtered = data.filter(item => {
    const model = item.model.toLowerCase();
    const manufacturer = item.manufacturer.toLowerCase();
    // Support 'manufacturer model' search
    const combined = `${manufacturer} ${model}`;
    return (
      model.includes(filter) ||
      manufacturer.includes(filter) ||
      combined.includes(filter)
    );
  });

  // Render main table
  tbody.innerHTML = filtered
    .map(l => {
      if (l.buy_price !== undefined) buyPriceCache[l.id] = l.buy_price;
      const displayBuyPrice = l.buy_price !== undefined ? l.buy_price : buyPriceCache[l.id];
      const displaySellPrice = l.sell_price !== undefined ? l.sell_price.toFixed(2) + ' DT' : '-';
      return `
      <tr>
        <td>${l.id}</td>
        <td>${l.manufacturer}</td>
        <td>${l.model}</td>
        <td class="buy-price-column">${displayBuyPrice !== undefined ? displayBuyPrice.toFixed(2) + ' DT' : '-'}</td>
        <td class="sell-price-column">${displaySellPrice}</td>
        <td>${l.quantity}</td>
        <td class="actions" style="text-align: center;">
          <button onclick="increment(${l.id})">➕</button>
          <button onclick="decrement(${l.id})">➖</button>
          <button onclick="edit(${l.id})">✏️</button>
          <button onclick="del(${l.id})">🗑️</button>
        </td>
      </tr>
      `;
    }).join('');

  // Render out-of-stock table
  outOfStockBody.innerHTML = data
    .filter(item => item.quantity === 0)
    .map(l => {
      if (l.buy_price !== undefined) buyPriceCache[l.id] = l.buy_price;
      const displayBuyPrice = l.buy_price !== undefined ? l.buy_price : buyPriceCache[l.id];
      const displaySellPrice = l.sell_price !== undefined ? l.sell_price.toFixed(2) + ' DT' : '-';
      return `
      <tr>
        <td>${l.id}</td>
        <td>${l.manufacturer}</td>
        <td>${l.model}</td>
        <td class="buy-price-column">${displayBuyPrice !== undefined ? displayBuyPrice.toFixed(2) + ' DT' : '-'}</td>
        <td class="sell-price-column">${displaySellPrice}</td>
        <td>${l.quantity}</td>
      </tr>
      `;
    }).join('');
}

// ===================== SEARCH & SORT =====================
searchInput.addEventListener('input', () => render(currentData));

document.querySelectorAll('#lcd-table th.sortable, #out-of-stock-table th.sortable').forEach(th => {
  th.addEventListener('click', handleSortClick);
});

function sortData(data, column, direction) {
  return [...data].sort((a, b) => {
    let valA = a[column];
    let valB = b[column];
    if (valA == null) valA = '';
    if (valB == null) valB = '';
    if (["id", "buy_price", "sell_price", "quantity", "qty"].includes(column)) {
      valA = Number(valA);
      valB = Number(valB);
      return (valA - valB) * direction;
    }
    valA = valA.toString().toLowerCase();
    valB = valB.toString().toLowerCase();
    if (valA < valB) return -1 * direction;
    if (valA > valB) return 1 * direction;
    return 0;
  });
}

function handleSortClick(e) {
  const th = e.target.closest('.sortable');
  if (!th) return;
  const column = th.getAttribute('data-sort');
  if (!column) return;
  if (sortColumn === column) {
    sortDirection *= -1;
  } else {
    sortColumn = column;
    sortDirection = 1;
  }
  const sortKey = column === 'qty' ? 'quantity' : column;
  const sorted = sortData(currentData, sortKey, sortDirection);
  render(sorted);
  updateSortIndicators();
}

function updateSortIndicators() {
  document.querySelectorAll('th.sortable').forEach(th => {
    th.classList.remove('sorted-asc', 'sorted-desc');
    if (th.getAttribute('data-sort') === sortColumn) {
      th.classList.add(sortDirection === 1 ? 'sorted-asc' : 'sorted-desc');
    }
  });
}

// ===================== MODAL LOGIC & FORM HANDLING =====================
function openModal(mode, item = null) {
  modal.style.display = 'block';
  modalTitle.textContent = mode === 'add' ? 'Add item' : 'Edit item';
  formSubmitBtn.textContent = mode === 'add' ? 'Add' : 'Save';
  lcdForm.setAttribute('data-mode', mode);
  // Hide or show buy price input based on buyPricesVisible
  const buyPriceInputGroup = document.getElementById('buy-price-input').closest('.form-group') || document.getElementById('buy-price-input').parentElement;
  if (buyPriceInputGroup) {
    buyPriceInputGroup.style.display = buyPricesVisible ? '' : 'none';
  }
  if (mode === 'edit' && item) {
    document.getElementById('lcd-id').value = item.id;
    document.getElementById('manufacturer-input').value = item.manufacturer;
    document.getElementById('model-input').value = item.model;
    document.getElementById('buy-price-input').value = item.buy_price ?? '';
    document.getElementById('sell-price-input').value = item.sell_price ?? '';
    document.getElementById('qty-input').value = item.quantity;
  } else {
    lcdForm.reset();
    document.getElementById('lcd-id').value = '';
  }
}

modalClose.onclick = () => { modal.style.display = 'none'; };
window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
document.getElementById('add-btn').onclick = () => openModal('add');
window.edit = function (id) {
  const item = currentData.find(x => x.id === id);
  openModal('edit', item);
};

lcdForm.onsubmit = async function (e) {
  e.preventDefault();
  const mode = lcdForm.getAttribute('data-mode');
  const id = document.getElementById('lcd-id').value;
  const manufacturer = document.getElementById('manufacturer-input').value;
  const model = document.getElementById('model-input').value;
  const buy_price = +document.getElementById('buy-price-input').value;
  const sell_price = +document.getElementById('sell-price-input').value;
  const quantity = +document.getElementById('qty-input').value;
  if (sell_price <= buy_price) {
    alert('Sell price must be greater than buy price.');
    return;
  }
  if (mode === 'add') {
    const response = await fetch(api, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manufacturer, model, buy_price, sell_price, quantity })
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data && data.error && data.error.toLowerCase().includes('unique')) {
        alert('Model already exists. Please use a different model name.');
        return;
      } else {
        alert('Error adding LCD.');
        return;
      }
    }
  } else {
    await fetch(`${api}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ manufacturer, model, buy_price, sell_price, quantity })
    });
  }
  modal.style.display = 'none';
  load();
}

// ===================== CRUD BUTTONS =====================
async function del(id) {
  if (!confirm('Delete?')) return;
  await fetch(`${api}/${id}`, { method: 'DELETE' });
  load();
}

async function increment(id) {
  const item = currentData.find(x => x.id === id);
  const buy_price = item.buy_price;
  const sell_price = item.sell_price;
  await fetch(`${api}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      manufacturer: item.manufacturer,
      model: item.model,
      buy_price,
      sell_price,
      quantity: item.quantity + 1
    })
  });
  load();
}

async function decrement(id) {
  const item = currentData.find(x => x.id === id);
  const newQty = item.quantity > 0 ? item.quantity - 1 : 0;
  const buy_price = item.buy_price;
  const sell_price = item.sell_price;
  await fetch(`${api}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      manufacturer: item.manufacturer,
      model: item.model,
      buy_price,
      sell_price,
      quantity: newQty
    })
  });
  load();
}

// ===================== BUY PRICE TOGGLE =====================
document.getElementById('toggle-buy-price').onclick = async () => {
  const btn = document.getElementById('toggle-buy-price');
  if (!buyPricesVisible) {
    const password = prompt('Enter password to view buy prices:');
    const res = await fetch(`/api/${currentCategory}s/secure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (!res.ok) {
      alert('Incorrect password.');
      return;
    }
    currentData = await res.json();
    document.body.classList.add('show-buy-price');
    buyPricesVisible = true;
    btn.textContent = '🙈 Hide Buy Prices';
    render(currentData);
  } else {
    document.body.classList.remove('show-buy-price');
    buyPricesVisible = false;
    btn.textContent = '👁️ Show Buy Prices';
    render(currentData);
  }
};

// ===================== EXPORT OUT-OF-STOCK =====================
function exportOutOfStockCSV() {
  const table = document.getElementById('out-of-stock-table');
  let csv = [];
  // Add header row
  let headerRow = [];
  for (let i = 0; i < table.rows[0].cells.length; i++) {
    headerRow.push('"' + table.rows[0].cells[i].innerText.replace(/"/g, '""') + '"');
  }
  csv.push(headerRow.join(','));
  // Add data rows
  for (let r = 1; r < table.rows.length; r++) {
    let row = table.rows[r];
    let rowData = [];
    for (let i = 0; i < row.cells.length; i++) {
      let cell = row.cells[i];
      if (cell.classList.contains('buy-price-column') && !buyPricesVisible) {
        rowData.push('"0"');
      } else {
        rowData.push('"' + cell.innerText.replace(/"/g, '""') + '"');
      }
    }
    csv.push(rowData.join(','));
  }
  const blob = new Blob([csv.join('\n')], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${currentCategory}_out_of_stock.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
document.getElementById('export-outofstock-btn').onclick = exportOutOfStockCSV;

// ===================== DARK MODE =====================
document.getElementById('dark-mode-btn').addEventListener('click', function () {
  document.body.classList.toggle('dark-mode');
  if (document.body.classList.contains('dark-mode')) {
    localStorage.setItem('lcd-dark-mode', '1');
    this.textContent = '☀️ Light Mode';
  } else {
    localStorage.removeItem('lcd-dark-mode');
    this.textContent = '🌙 Dark Mode';
  }
});
if (localStorage.getItem('lcd-dark-mode')) {
  document.body.classList.add('dark-mode');
  const btn = document.getElementById('dark-mode-btn');
  if (btn) btn.textContent = '☀️ Light Mode';
}

// ===================== IMPORT CSV =====================
function importCsvData(csvText) {
  let delimiter = csvText.includes('\t') ? '\t' : ',';
  const lines = csvText.split('\n').filter(Boolean);
  if (lines.length < 2) {
    alert('CSV file is empty or missing data.');
    return;
  }
  const rawHeaders = lines[0].split(new RegExp(delimiter)).map(h => h.replace(/"/g, '').trim().toLowerCase());
  const headers = rawHeaders.map(h => {
    if (h.replace(/\s|_/g, '') === 'manufacturer') return 'manufacturer';
    if (h.replace(/\s|_/g, '') === 'model') return 'model';
    if (h.replace(/\s|_/g, '') === 'buyprice') return 'buy_price';
    if (h.replace(/\s|_/g, '') === 'sellprice') return 'sell_price';
    if (h.replace(/\s|_/g, '') === 'qty' || h.replace(/\s|_/g, '') === 'quantity') return 'quantity';
    return h;
  });
  const modelIdx = headers.indexOf('model');
  const manufacturerIdx = headers.indexOf('manufacturer');
  const buyIdx = headers.indexOf('buy_price');
  const sellIdx = headers.indexOf('sell_price');
  const qtyIdx = headers.indexOf('quantity');
  if (modelIdx === -1 || manufacturerIdx === -1 || buyIdx === -1 || sellIdx === -1 || qtyIdx === -1) {
    alert('CSV header missing required columns.');
    return;
  }
  const existingModels = new Set(currentData.map(l => l.model.toLowerCase()));
  let success = 0, duplicate = 0, error = 0;
  let duplicateModels = [];
  let promises = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(new RegExp(delimiter)).map(cell => cell.replace(/"/g, '').trim());
    if (row.length < headers.length) { error++; continue; }
    const model = row[modelIdx]?.toLowerCase();
    if (!model || existingModels.has(model)) { duplicate++; if (model) duplicateModels.push(row[modelIdx]); continue; }
    const buy_price = parseFloat(row[buyIdx].replace(/DT|\s/g, ''));
    const sell_price = parseFloat(row[sellIdx].replace(/DT|\s/g, ''));
    const item = {
      manufacturer: row[manufacturerIdx],
      model: row[modelIdx],
      buy_price,
      sell_price,
      quantity: parseInt(row[qtyIdx], 10)
    };
    if (!item.manufacturer || !item.model || isNaN(item.buy_price) || isNaN(item.sell_price) || isNaN(item.quantity)) {
      error++;
      continue;
    }
    promises.push(
      fetch(`/api/${currentCategory}s`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item)
      })
        .then(res => {
          if (res.ok) {
            success++;
            existingModels.add(model);
          } else {
            duplicate++;
            duplicateModels.push(item.model);
          }
        })
        .catch(() => { error++; })
    );
  }
  Promise.all(promises).then(() => {
    let message = '';
    if (success) message += `Successfully added ${success} items.\n`;
    if (duplicate) message += `Skipped ${duplicate} duplicate items: ${duplicateModels.join(', ')}.\n`;
    if (error) message += `Encountered ${error} errors.`;
    alert(message.trim());
    load();
  });
}
document.getElementById('import-csv-btn').addEventListener('click', function () {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv';
  input.style.display = 'none';
  input.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const text = e.target.result;
      importCsvData(text);
    };
    reader.readAsText(file);
  });
  document.body.appendChild(input);
  input.click();
  document.body.removeChild(input);
});

// ===================== INIT =====================
document.addEventListener('DOMContentLoaded', () => {
  load();
});
if (categorySelect) {
  categorySelect.addEventListener('change', (e) => setCategory(e.target.value));
}

