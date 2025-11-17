// Konfigurasi Google Sheets
const SHEET_ID = '1uPaO-QgPml4A3sSH1IWIBPY9jj8uI71clhDRr1ukuhU'; // Ganti dengan ID Google Sheet Anda
const API_KEY = 'AIzaSyDf9ufn2jucINx8ZNOskW_5I69eXNSP2A4'; // Ganti dengan API Key Anda
const SHEET_NAME = 'TradingData';

// Variabel global
let tradingData = [];
let lineChart, pieChart;

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    // Setup event listeners
    setupEventListeners();
    
    // Load data dari Google Sheets
    await loadData();
    
    // Tampilkan data di home
    updateHomeSummary();
    
    // Tampilkan data di report
    displayTradingData();
}

function setupEventListeners() {
    // Navigation
    document.getElementById('homeBtn').addEventListener('click', () => showSection('home'));
    document.getElementById('addBtn').addEventListener('click', () => showSection('add-data'));
    document.getElementById('reportBtn').addEventListener('click', () => showSection('report'));
    
    // Form submission
    document.getElementById('tradingForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    
    // Filters
    document.getElementById('applyFilters').addEventListener('click', applyFilters);
    document.getElementById('resetFilters').addEventListener('click', resetFilters);
    
    // Modal
    document.querySelector('.close').addEventListener('click', closeModal);
    document.getElementById('cancelEdit').addEventListener('click', closeModal);
    
    // Close modal ketika klik di luar modal
    window.addEventListener('click', (event) => {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeModal();
        }
    });
}

function showSection(sectionId) {
    // Sembunyikan semua section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Tampilkan section yang dipilih
    document.getElementById(sectionId).classList.add('active');
    
    // Update tombol navigasi aktif
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`#${sectionId}Btn`).classList.add('active');
    
    // Jika pindah ke home, update summary dan chart
    if (sectionId === 'home') {
        updateHomeSummary();
    }
}

// Fungsi untuk load data dari Google Sheets
async function loadData() {
    try {
        // URL untuk mengambil data dari Google Sheets
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?key=${API_KEY}`;
        
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.values && data.values.length > 1) {
            // Konversi data dari array ke objek
            tradingData = data.values.slice(1).map(row => {
                return {
                    id: row[0],
                    tanggalMasuk: row[1],
                    tanggalKeluar: row[2],
                    kodeSaham: row[3],
                    hargaMasuk: parseFloat(row[4]),
                    hargaKeluar: parseFloat(row[5]),
                    feeBroker: parseFloat(row[6]),
                    metodeTrading: row[7],
                    catatan: row[8],
                    profitLoss: parseFloat(row[9])
                };
            });
        } else {
            tradingData = [];
        }
    } catch (error) {
        console.error('Error loading data from Google Sheets:', error);
        // Fallback ke localStorage jika Google Sheets tidak tersedia
        const savedData = localStorage.getItem('tradingData');
        if (savedData) {
            tradingData = JSON.parse(savedData);
        }
    }
}

// Fungsi untuk save data ke Google Sheets
async function saveData() {
    try {
        // Format data untuk Google Sheets
        const values = [
            ['ID', 'Tanggal Masuk', 'Tanggal Keluar', 'Kode Saham', 'Harga Masuk', 'Harga Keluar', 'Fee Broker', 'Metode Trading', 'Catatan', 'Profit/Loss']
        ];
        
        tradingData.forEach(item => {
            values.push([
                item.id,
                item.tanggalMasuk,
                item.tanggalKeluar,
                item.kodeSaham,
                item.hargaMasuk,
                item.hargaKeluar,
                item.feeBroker,
                item.metodeTrading,
                item.catatan,
                item.profitLoss
            ]);
        });
        
        // URL untuk update data di Google Sheets
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${SHEET_NAME}?valueInputOption=RAW&key=${API_KEY}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                values: values
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save data to Google Sheets');
        }
    } catch (error) {
        console.error('Error saving data to Google Sheets:', error);
        // Fallback ke localStorage
        localStorage.setItem('tradingData', JSON.stringify(tradingData));
    }
}

// Fungsi untuk menghitung profit/loss
function calculateProfitLoss(hargaMasuk, hargaKeluar, feeBroker) {
    const totalFee = (hargaMasuk + hargaKeluar) * (feeBroker / 100);
    const profitLoss = (hargaKeluar - hargaMasuk) - totalFee;
    return Math.round(profitLoss * 100) / 100; // Bulatkan ke 2 desimal
}

// Fungsi untuk generate ID unik
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Handler untuk form submission
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Ambil nilai dari form
    const formData = {
        id: generateId(),
        tanggalMasuk: document.getElementById('tanggalMasuk').value,
        tanggalKeluar: document.getElementById('tanggalKeluar').value,
        kodeSaham: document.getElementById('kodeSaham').value.toUpperCase(),
        hargaMasuk: parseFloat(document.getElementById('hargaMasuk').value),
        hargaKeluar: parseFloat(document.getElementById('hargaKeluar').value),
        feeBroker: parseFloat(document.getElementById('feeBroker').value),
        metodeTrading: document.getElementById('metodeTrading').value,
        catatan: document.getElementById('catatan').value
    };
    
    // Hitung profit/loss
    formData.profitLoss = calculateProfitLoss(
        formData.hargaMasuk, 
        formData.hargaKeluar, 
        formData.feeBroker
    );
    
    // Tambahkan ke array data
    tradingData.push(formData);
    
    // Simpan data
    await saveData();
    
    // Reset form
    document.getElementById('tradingForm').reset();
    
    // Tampilkan notifikasi
    alert('Data trading berhasil disimpan!');
    
    // Update tampilan
    updateHomeSummary();
    displayTradingData();
    
    // Kembali ke home
    showSection('home');
}

// Update summary di home
function updateHomeSummary() {
    if (tradingData.length === 0) {
        document.getElementById('totalPL').textContent = 'Rp 0';
        document.getElementById('winRate').textContent = '0%';
        document.getElementById('totalTrades').textContent = '0';
        document.getElementById('maxProfit').textContent = 'Rp 0';
        
        // Reset chart jika ada
        if (lineChart) lineChart.destroy();
        if (pieChart) pieChart.destroy();
        return;
    }
    
    // Hitung total profit/loss
    const totalPL = tradingData.reduce((sum, item) => sum + item.profitLoss, 0);
    document.getElementById('totalPL').textContent = formatCurrency(totalPL);
    document.getElementById('totalPL').className = `pl-value ${totalPL >= 0 ? 'positive' : 'negative'}`;
    
    // Hitung win rate
    const winningTrades = tradingData.filter(item => item.profitLoss > 0).length;
    const winRate = (winningTrades / tradingData.length) * 100;
    document.getElementById('winRate').textContent = `${winRate.toFixed(1)}%`;
    
    // Total trading
    document.getElementById('totalTrades').textContent = tradingData.length;
    
    // Profit terbesar
    const maxProfit = Math.max(...tradingData.map(item => item.profitLoss));
    document.getElementById('maxProfit').textContent = formatCurrency(maxProfit);
    document.getElementById('maxProfit').className = `pl-value ${maxProfit >= 0 ? 'positive' : 'negative'}`;
    
    // Update chart
    updateCharts();
}

// Format currency (Rupiah)
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Update chart
function updateCharts() {
    // Line chart - Profit/Loss per bulan
    const monthlyData = {};
    
    tradingData.forEach(item => {
        const month = item.tanggalMasuk.substring(0, 7); // Format YYYY-MM
        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }
        monthlyData[month] += item.profitLoss;
    });
    
    const months = Object.keys(monthlyData).sort();
    const monthlyPL = months.map(month => monthlyData[month]);
    
    const lineCtx = document.getElementById('lineChart').getContext('2d');
    
    if (lineChart) lineChart.destroy();
    
    lineChart = new Chart(lineCtx, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Profit/Loss',
                data: monthlyPL,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('Rp', 'Rp ');
                        }
                    }
                }
            }
        }
    });
    
    // Pie chart - Distribusi metode trading
    const methodCount = {};
    
    tradingData.forEach(item => {
        if (!methodCount[item.metodeTrading]) {
            methodCount[item.metodeTrading] = 0;
        }
        methodCount[item.metodeTrading]++;
    });
    
    const methods = Object.keys(methodCount);
    const methodData = methods.map(method => methodCount[method]);
    
    const colors = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
    
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    
    if (pieChart) pieChart.destroy();
    
    pieChart = new Chart(pieCtx, {
        type: 'pie',
        data: {
            labels: methods,
            datasets: [{
                data: methodData,
                backgroundColor: colors.slice(0, methods.length)
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

// Tampilkan data di report
function displayTradingData(filteredData = null) {
    const dataToDisplay = filteredData || tradingData;
    const tableBody = document.getElementById('tradingTableBody');
    
    tableBody.innerHTML = '';
    
    if (dataToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center;">Tidak ada data trading</td></tr>';
        return;
    }
    
    dataToDisplay.forEach(item => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${formatDate(item.tanggalMasuk)}</td>
            <td>${formatDate(item.tanggalKeluar)}</td>
            <td>${item.kodeSaham}</td>
            <td>${formatCurrency(item.hargaMasuk)}</td>
            <td>${formatCurrency(item.hargaKeluar)}</td>
            <td>${item.feeBroker}%</td>
            <td>${item.metodeTrading}</td>
            <td class="${item.profitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(item.profitLoss)}</td>
            <td>${item.catatan || '-'}</td>
            <td>
                <button class="action-btn edit-btn" data-id="${item.id}">Edit</button>
                <button class="action-btn delete-btn" data-id="${item.id}">Hapus</button>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Tambahkan event listener untuk tombol edit dan hapus
    document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            openEditModal(id);
        });
    });
    
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.target.getAttribute('data-id');
            deleteTradingData(id);
        });
    });
}

// Format tanggal
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID');
}

// Filter data
function applyFilters() {
    const metode = document.getElementById('filterMetode').value;
    const bulan = document.getElementById('filterBulan').value;
    const saham = document.getElementById('filterSaham').value.toUpperCase();
    
    let filteredData = tradingData;
    
    if (metode) {
        filteredData = filteredData.filter(item => item.metodeTrading === metode);
    }
    
    if (bulan) {
        filteredData = filteredData.filter(item => item.tanggalMasuk.startsWith(bulan));
    }
    
    if (saham) {
        filteredData = filteredData.filter(item => item.kodeSaham.includes(saham));
    }
    
    displayTradingData(filteredData);
}

function resetFilters() {
    document.getElementById('filterMetode').value = '';
    document.getElementById('filterBulan').value = '';
    document.getElementById('filterSaham').value = '';
    
    displayTradingData();
}

// Modal functions
function openEditModal(id) {
    const data = tradingData.find(item => item.id === id);
    
    if (!data) return;
    
    document.getElementById('editId').value = data.id;
    document.getElementById('editTanggalMasuk').value = data.tanggalMasuk;
    document.getElementById('editTanggalKeluar').value = data.tanggalKeluar;
    document.getElementById('editKodeSaham').value = data.kodeSaham;
    document.getElementById('editHargaMasuk').value = data.hargaMasuk;
    document.getElementById('editHargaKeluar').value = data.hargaKeluar;
    document.getElementById('editFeeBroker').value = data.feeBroker;
    document.getElementById('editMetodeTrading').value = data.metodeTrading;
    document.getElementById('editCatatan').value = data.catatan || '';
    
    document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('editId').value;
    const index = tradingData.findIndex(item => item.id === id);
    
    if (index === -1) return;
    
    // Update data
    tradingData[index] = {
        id: id,
        tanggalMasuk: document.getElementById('editTanggalMasuk').value,
        tanggalKeluar: document.getElementById('editTanggalKeluar').value,
        kodeSaham: document.getElementById('editKodeSaham').value.toUpperCase(),
        hargaMasuk: parseFloat(document.getElementById('editHargaMasuk').value),
        hargaKeluar: parseFloat(document.getElementById('editHargaKeluar').value),
        feeBroker: parseFloat(document.getElementById('editFeeBroker').value),
        metodeTrading: document.getElementById('editMetodeTrading').value,
        catatan: document.getElementById('editCatatan').value,
        profitLoss: calculateProfitLoss(
            parseFloat(document.getElementById('editHargaMasuk').value),
            parseFloat(document.getElementById('editHargaKeluar').value),
            parseFloat(document.getElementById('editFeeBroker').value)
        )
    };
    
    // Simpan perubahan
    await saveData();
    
    // Tutup modal
    closeModal();
    
    // Update tampilan
    updateHomeSummary();
    displayTradingData();
    
    // Tampilkan notifikasi
    alert('Data trading berhasil diupdate!');
}

// Hapus data trading
async function deleteTradingData(id) {
    if (!confirm('Apakah Anda yakin ingin menghapus data ini?')) {
        return;
    }
    
    tradingData = tradingData.filter(item => item.id !== id);
    
    // Simpan perubahan
    await saveData();
    
    // Update tampilan
    updateHomeSummary();
    displayTradingData();
    
    // Tampilkan notifikasi
    alert('Data trading berhasil dihapus!');

}

