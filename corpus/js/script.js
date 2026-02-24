const tableBody = document.getElementById('recordsTable');
const loading = document.getElementById('loading');
const mainTitle = document.getElementById('mainTitle');
const errorDiv = document.getElementById('error');
const errorMessage = document.getElementById('errorMessage');

// Get location from URL query parameter
function getLocationParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('location') || 'versailles';
}

// Check if info exists
async function checkInfoJson(btvId) {
    const url = `https://tile.ptm.huma-num.fr/tiles/ark/info_tiles/12148/${btvId}`;
    try {
        const response = await fetch(url, { method: 'GET' });
        return response.ok;
    } catch (e) {
        return false;
    }
}

// Extract btvId from URL
function extractBtvId(url) {
    const match = url.match(/btv1b([a-z0-9]+)/i);
    return match ? match[0] : null;
}

// Update UI for a row
function updateRow(row, exists, arkid) {
    const statusCell = row.querySelector('.status-cell');
    statusCell.innerHTML = exists
        ? `<i class="fas fa-check-circle text-green-500"></i> <a class="text-blue-600" href="https://app.ptm.huma-num.fr/galligeo/georef/?ark=${arkid}" target="_blank">Géoréférencé</a>`
        : `<i class="fas fa-times-circle text-red-500"></i> <a class="text-blue-600" href="https://app.ptm.huma-num.fr/galligeo?ark=${arkid}" target="_blank">Non géoréférencé</a>`;
}

// Load data from JSON file
async function loadData() {
    const location = getLocationParam();
    const jsonFile = `data/${location}.json`;

    try {
        const response = await fetch(jsonFile);
        if (!response.ok) {
            throw new Error(`Failed to load ${jsonFile}`);
        }
        const data = await response.json();
        return data;
    } catch (error) {
        throw new Error(`Error loading data: ${error.message}`);
    }
}

// Process all records
async function processRecords() {
    try {
        loading.classList.remove('hidden');
        errorDiv.classList.add('hidden');
        tableBody.innerHTML = '';

        // Load data from JSON
        const data = await loadData();

        // Set title
        mainTitle.textContent = data.title;
        document.title = `${data.title} - Corpus`;

        // Process records
        const records = data.records;
        for (const record of records) {
            const btvId = extractBtvId(record.identifier);
            if (!btvId) continue;

            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${record.date}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                    <a href="${record.identifier}" target="_blank" class="hover:underline">${btvId}</a>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm status-cell">
                    <div class="w-4 h-4 border-2 border-gray-300 border-t-transparent rounded-full spin mx-auto"></div>
                </td>
            `;
            tableBody.appendChild(row);

            const exists = await checkInfoJson(btvId);
            updateRow(row, exists, btvId);
        }

        loading.classList.add('hidden');
    } catch (error) {
        loading.classList.add('hidden');
        errorDiv.classList.remove('hidden');
        errorMessage.textContent = error.message;
        console.error(error);
    }
}

processRecords();
