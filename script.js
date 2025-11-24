// Konfigurasi Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5nymwb9rYMRCfPqrevTfXAch4KogtXQGB4HssHLKanBRHPrH6G2Vl6K1gSqEOs02i/exec';

// Variabel global
let tradingData = [];
let lineChart, pieChart, winRateChart, distributionChart;

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('=== INITIALIZING APP ===');
    
    // Setup event listeners
    setupEventListeners();
    
    console.log('Memuat data dari Google Sheets...');
    
    // Load data dari Google Sheets
    try {
        await loadData();
        console.log('✅ Data load completed dari Google Sheets');
        console.log('Total data:', tradingData.length);
    } catch (error) {
        console.error('❌ Gagal memuat data dari Google Sheets:', error);
        tradingData = [];
        console.log('🔄 Menggunakan data kosong');
    }
    
    // Tampilkan data
    updateHomeSummary();
    displayTradingData();
    
    // Setup performance tabs
    setupPerformanceTabs();
    
    console.log('=== APP INITIALIZATION COMPLETED ===');
}

function setupEventListeners() {
    // Navigation
    document.getElementById('homeBtn').addEventListener('click', () => showSection('home'));
    document.getElementById('addBtn').addEventListener('click', () => showSection('add-data'));
    document.getElementById('reportBtn').addEventListener('click', () => showSection('report'));
    document.getElementById('performanceBtn').addEventListener('click', () => showSection('performance'));
    
    // Form submission
    document.getElementById('tradingForm').addEventListener('submit', handleFormSubmit);
    document.getElementById('editForm').addEventListener('submit', handleEditSubmit);
    
    // // Tombol hitung otomatis
    // document.getElementById('calculateBtn').addEventListener('click', calculateAutoFeeForForm);
    // document.getElementById('calculateEditBtn').addEventListener('click', calculateAutoFeeForEdit);
    
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
    
    // ESC key untuk modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    
}

function showSection(sectionId) {
    console.log('Showing section:', sectionId);
    
    // Sembunyikan semua section
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Tampilkan section yang dipilih
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update tombol navigasi aktif
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const btn = document.querySelector(`#${sectionId}Btn`);
    if (btn) {
        btn.classList.add('active');
    }
    
    // Jika pindah ke home, update summary dan chart
    if (sectionId === 'home') {
        updateHomeSummary();
    }
    // Jika pindah ke performance, load data performance
    else if (sectionId === 'performance') {
        setTimeout(() => {
            displaySahamPerformance();
            displayMetodePerformance();
            displayTradingSummary();
        }, 100);
    }
}

// Fungsi untuk load data dari Google Apps Script
async function loadData() {
    try {
        console.log('🔄 Mengambil data dari Google Sheets...');
        
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Response dari server:', result);
        
        if (result.error) {
            console.warn('Server returned warning:', result.error);
            tradingData = [];
            return;
        }
        
        if (result.data && result.data.length > 0) {
            // Konversi data dari array ke objek - SESUAI STRUCTURE BARU
            tradingData = result.data.map((row, index) => {
                // Skip header row jika ada
                if (index === 0 && row[0] === 'ID') return null;
                
                return {
                    id: row[0] || generateId(),
                    tanggalMasuk: formatDateForInput(row[1]) || new Date().toISOString().split('T')[0],
                    tanggalKeluar: formatDateForInput(row[2]) || new Date().toISOString().split('T')[0],
                    kodeSaham: row[3] || 'UNKNOWN',
                    hargaMasuk: parseFloat(row[4]) || 0,
                    hargaKeluar: parseFloat(row[5]) || 0,
                    lot: parseInt(row[6]) || 1,
                    feeBuy: parseFloat(row[7]) || 0,
                    feeSell: parseFloat(row[8]) || 0,
                    totalFee: parseFloat(row[9]) || 0,
                    profitLoss: parseFloat(row[10]) || 0,
                    metodeTrading: row[11] || 'Scalping',
                    catatan: row[12] || ''
                };
            }).filter(item => item !== null); // Hapus null values
            
            console.log(`✅ Load ${tradingData.length} records berhasil dari Google Sheets`);
        } else {
            tradingData = [];
            console.log('ℹ️ Tidak ada data di Google Sheets');
        }
    } catch (error) {
        console.error('❌ Error loading data from server:', error);
        tradingData = [];
    }
}

// Fungsi untuk save data ke Google Apps Script
async function saveData() {
    console.log('💾 Menyimpan data ke Google Sheets...');
    
    try {
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                action: 'saveAllData',
                jsonData: JSON.stringify(tradingData)
            })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(`Google Sheets error: ${result.error}`);
        }
        
        console.log('✅ Data berhasil disimpan ke Google Sheets');
        return true;
        
    } catch (error) {
        console.error('❌ Gagal menyimpan ke Google Sheets:', error);
        alert('❌ Gagal menyimpan data ke Google Sheets!\n\nError: ' + error.message);
        return false;
    }
}

// Fungsi untuk generate ID unik
function generateId() {
    return 'TRX-' + Date.now();
}

// Fungsi untuk menghitung fee otomatis
function calculateAutoFee(hargaMasuk, hargaKeluar, lot) {
    const totalShares = lot * 100;
    const totalBuy = hargaMasuk * totalShares;
    const totalSell = hargaKeluar * totalShares;
    
    const feeBuy = Math.round(totalBuy * (0.1513 / 100));
    const feeSell = Math.round(totalSell * (0.25132 / 100));
    
    return {
        feeBuy: feeBuy,
        feeSell: feeSell,
        totalFee: feeBuy + feeSell
    };
}

// Fungsi untuk menghitung profit/loss
function calculateProfitLoss(hargaMasuk, hargaKeluar, lot, feeBuy, feeSell) {
    const totalShares = lot * 100;
    const totalBuy = hargaMasuk * totalShares;
    const totalSell = hargaKeluar * totalShares;
    
    let finalFeeBuy = feeBuy;
    let finalFeeSell = feeSell;
    
    // Jika fee kosong, hitung otomatis
    if (!feeBuy || feeBuy === 0 || !feeSell || feeSell === 0) {
        const autoFee = calculateAutoFee(hargaMasuk, hargaKeluar, lot);
        finalFeeBuy = autoFee.feeBuy;
        finalFeeSell = autoFee.feeSell;
    }
    
    const totalFee = finalFeeBuy + finalFeeSell;
    const profitLoss = totalSell - totalBuy - totalFee;
    
    return {
        profitLoss: Math.round(profitLoss),
        totalFee: totalFee,
        feeBuy: finalFeeBuy,
        feeSell: finalFeeSell,
        totalBuy: totalBuy,
        totalSell: totalSell
    };
}

// Setup auto calculation untuk form
function setupAutoCalculation() {
    const inputs = ['hargaMasuk', 'hargaKeluar', 'lot', 'feeBuy', 'feeSell'];
    
    inputs.forEach(inputId => {
        const input = document.getElementById(inputId);
        if (input) {
            
        }
    });
}

// Tombol hitung otomatis untuk form tambah
// ⭐⭐ UPDATE calculateAutoFeeForForm() ⭐⭐
function calculateAutoFeeForForm() {
    const hargaMasuk = parseFloat(document.getElementById('hargaMasuk').value) || 0;
    const hargaKeluar = parseFloat(document.getElementById('hargaKeluar').value) || 0;
    const lot = parseInt(document.getElementById('lot').value) || 1;
    
    if (hargaMasuk > 0 && hargaKeluar > 0) {
        const autoFee = calculateAutoFee(hargaMasuk, hargaKeluar, lot);
        
        document.getElementById('feeBuy').value = autoFee.feeBuy;
        document.getElementById('feeSell').value = autoFee.feeSell;
        //document.getElementById('totalFee').value = autoFee.totalFee;
        
        alert(`Fee otomatis telah dihitung:\nFee Beli: ${formatCurrency(autoFee.feeBuy)}\nFee Jual: ${formatCurrency(autoFee.feeSell)}\nTotal Fee: ${formatCurrency(autoFee.totalFee)}`);
    } else {
        alert('Harap isi harga masuk dan harga keluar terlebih dahulu!');
    }
}

// ⭐⭐ UPDATE calculateAutoFeeForEdit() ⭐⭐
function calculateAutoFeeForEdit() {
    const hargaMasuk = parseFloat(document.getElementById('editHargaMasuk').value) || 0;
    const hargaKeluar = parseFloat(document.getElementById('editHargaKeluar').value) || 0;
    const lot = parseInt(document.getElementById('editLot').value) || 1;
    
    if (hargaMasuk > 0 && hargaKeluar > 0) {
        const autoFee = calculateAutoFee(hargaMasuk, hargaKeluar, lot);
        
        document.getElementById('editFeeBuy').value = autoFee.feeBuy;
        document.getElementById('editFeeSell').value = autoFee.feeSell;
        document.getElementById('editTotalFee').value = autoFee.totalFee;
        
        alert(`Fee otomatis telah dihitung:\nFee Beli: ${formatCurrency(autoFee.feeBuy)}\nFee Jual: ${formatCurrency(autoFee.feeSell)}\nTotal Fee: ${formatCurrency(autoFee.totalFee)}`);
    } else {
        alert('Harap isi harga masuk dan harga keluar terlebih dahulu!');
    }
}
// Tombol hitung otomatis untuk form edit
function calculateAutoFeeForEdit() {
    const hargaMasuk = parseFloat(document.getElementById('editHargaMasuk').value) || 0;
    const hargaKeluar = parseFloat(document.getElementById('editHargaKeluar').value) || 0;
    const lot = parseInt(document.getElementById('editLot').value) || 1;
    
    if (hargaMasuk > 0 && hargaKeluar > 0) {
        const autoFee = calculateAutoFee(hargaMasuk, hargaKeluar, lot);
        
        document.getElementById('editFeeBuy').value = autoFee.feeBuy;
        document.getElementById('editFeeSell').value = autoFee.feeSell;
        document.getElementById('editTotalFee').value = autoFee.totalFee;
        
     
        
        alert(`Fee otomatis telah dihitung:\nFee Beli: ${formatCurrency(autoFee.feeBuy)}\nFee Jual: ${formatCurrency(autoFee.feeSell)}\nTotal Fee: ${formatCurrency(autoFee.totalFee)}`);
    } else {
        alert('Harap isi harga masuk dan harga keluar terlebih dahulu!');
    }
}
// ⭐⭐ UPDATE handleFormSubmit() ⭐⭐
async function handleFormSubmit(event) {
    event.preventDefault();
    
    // Validasi form
    const tanggalMasuk = document.getElementById('tanggalMasuk').value;
    const tanggalKeluar = document.getElementById('tanggalKeluar').value;
    const kodeSaham = document.getElementById('kodeSaham').value;
    const hargaMasuk = document.getElementById('hargaMasuk').value;
    const hargaKeluar = document.getElementById('hargaKeluar').value;
    const lot = document.getElementById('lot').value;
    
    if (!tanggalMasuk || !tanggalKeluar || !kodeSaham || !hargaMasuk || !hargaKeluar || !lot) {
        alert('Harap isi semua field yang wajib!');
        return;
    }
    
    if (tanggalKeluar < tanggalMasuk) {
        alert('Tanggal keluar tidak boleh sebelum tanggal masuk!');
        return;
    }
    
    if (parseInt(lot) < 1) {
        alert('Jumlah LOT minimal 1!');
        return;
    }
    
    try {
        // Ambil nilai dari form
        const feeBuy = parseFloat(document.getElementById('feeBuy').value) || 0;
        const feeSell = parseFloat(document.getElementById('feeSell').value) || 0;
        
        // Hitung profit/loss
        const calculation = calculateProfitLoss(
            parseFloat(hargaMasuk),
            parseFloat(hargaKeluar),
            parseInt(lot),
            feeBuy,
            feeSell
        );
        
        const formData = {
            id: generateId(),
            tanggalMasuk: tanggalMasuk,
            tanggalKeluar: tanggalKeluar,
            kodeSaham: kodeSaham.toUpperCase(),
            hargaMasuk: parseFloat(hargaMasuk),
            hargaKeluar: parseFloat(hargaKeluar),
            lot: parseInt(lot),
            feeBuy: calculation.feeBuy,
            feeSell: calculation.feeSell,
            totalFee: calculation.totalFee,
            profitLoss: calculation.profitLoss,
            metodeTrading: document.getElementById('metodeTrading').value,
            catatan: document.getElementById('catatan').value
        };
        
        console.log('Final data to save:', formData);
        
        // Tambahkan ke array data
        tradingData.push(formData);
        
        // Simpan ke Google Sheets
        const saveResult = await saveData();
        
        if (!saveResult) {
            tradingData = tradingData.filter(item => item.id !== formData.id);
            return;
        }
        
        // Tampilkan notifikasi sukses
        alert(`✅ Data trading berhasil disimpan ke Google Sheets!\n\nKode Saham: ${formData.kodeSaham}\nProfit/Loss: ${formatCurrency(formData.profitLoss)}`);
        
        // Reset form
        document.getElementById('tradingForm').reset();
        document.getElementById('lot').value = 1;
        //document.getElementById('totalFee').value = ''; // Reset total fee
        
        // Update tampilan
        updateHomeSummary();
        displayTradingData();
        
    } catch (error) {
        console.error('Error in form submission:', error);
        alert('❌ Error menyimpan data: ' + error.message);
    }
}

// Format currency (Rupiah)
function formatCurrency(amount) {
    return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0
    }).format(amount);
}

// Format date untuk input
function formatDateForInput(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

// Format date untuk display
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID');
}

// Tampilkan data di report
function displayTradingData(filteredData = null) {
    const dataToDisplay = filteredData || tradingData;
    const tableBody = document.getElementById('tradingTableBody');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (dataToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="13" style="text-align: center;">Tidak ada data trading</td></tr>';
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
            <td>${item.lot}</td>
            <td>${formatCurrency(item.feeBuy)}</td>
            <td>${formatCurrency(item.feeSell)}</td>
            <td>${formatCurrency(item.totalFee)}</td>
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
    
    // Event listeners untuk tombol edit dan hapus
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

// Modal functions
function openEditModal(id) {
    const data = tradingData.find(item => item.id === id);
    
    if (!data) return;
    
    // Isi form dengan data
    document.getElementById('editId').value = data.id;
    document.getElementById('editTanggalMasuk').value = data.tanggalMasuk;
    document.getElementById('editTanggalKeluar').value = data.tanggalKeluar;
    document.getElementById('editKodeSaham').value = data.kodeSaham;
    document.getElementById('editHargaMasuk').value = data.hargaMasuk;
    document.getElementById('editHargaKeluar').value = data.hargaKeluar;
    document.getElementById('editLot').value = data.lot;
    document.getElementById('editFeeBuy').value = data.feeBuy;
    document.getElementById('editFeeSell').value = data.feeSell;
    //document.getElementById('editTotalFee').value = data.totalFee;
    document.getElementById('editMetodeTrading').value = data.metodeTrading;
    document.getElementById('editCatatan').value = data.catatan || '';
    
    // Update profit preview
  
    
    // Tampilkan modal
    const modal = document.getElementById('editModal');
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// ⭐⭐ UPDATE handleEditSubmit() ⭐⭐
async function handleEditSubmit(event) {
    event.preventDefault();
    
    const id = document.getElementById('editId').value;
    const index = tradingData.findIndex(item => item.id === id);
    
    if (index === -1) return;
    
    // Validasi data
    const tanggalKeluar = document.getElementById('editTanggalKeluar').value;
    const tanggalMasuk = document.getElementById('editTanggalMasuk').value;
    
    if (tanggalKeluar < tanggalMasuk) {
        alert('Tanggal keluar tidak boleh sebelum tanggal masuk!');
        return;
    }
    
    const lot = parseInt(document.getElementById('editLot').value);
    if (lot < 1) {
        alert('Jumlah LOT minimal 1!');
        return;
    }
    
    // Ambil nilai fee
    const feeBuy = parseFloat(document.getElementById('editFeeBuy').value) || 0;
    const feeSell = parseFloat(document.getElementById('editFeeSell').value) || 0;
    
    // Hitung profit/loss
    const calculation = calculateProfitLoss(
        parseFloat(document.getElementById('editHargaMasuk').value),
        parseFloat(document.getElementById('editHargaKeluar').value),
        lot,
        feeBuy,
        feeSell
    );
    
    // Update data
    tradingData[index] = {
        id: id,
        tanggalMasuk: tanggalMasuk,
        tanggalKeluar: tanggalKeluar,
        kodeSaham: document.getElementById('editKodeSaham').value.toUpperCase(),
        hargaMasuk: parseFloat(document.getElementById('editHargaMasuk').value),
        hargaKeluar: parseFloat(document.getElementById('editHargaKeluar').value),
        lot: lot,
        feeBuy: calculation.feeBuy,
        feeSell: calculation.feeSell,
        totalFee: calculation.totalFee,
        profitLoss: calculation.profitLoss,
        metodeTrading: document.getElementById('editMetodeTrading').value,
        catatan: document.getElementById('editCatatan').value
    };
    
    // Simpan perubahan
    await saveData();
    
    // Tutup modal
    closeModal();
    
    // Update tampilan
    updateHomeSummary();
    displayTradingData();
    
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
    
    alert('Data trading berhasil dihapus!');
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

// Update summary di home
function updateHomeSummary() {
    const totalPLElement = document.getElementById('totalPL');
    const winRateElement = document.getElementById('winRate');
    const totalTradesElement = document.getElementById('totalTrades');
    const maxProfitElement = document.getElementById('maxProfit');
    
    if (!totalPLElement || !winRateElement || !totalTradesElement || !maxProfitElement) {
        return;
    }
    
    if (tradingData.length === 0) {
        totalPLElement.textContent = 'Rp 0';
        winRateElement.textContent = '0%';
        totalTradesElement.textContent = '0';
        maxProfitElement.textContent = 'Rp 0';
        
        totalPLElement.className = 'pl-value';
        maxProfitElement.className = 'pl-value';
        
        if (lineChart) lineChart.destroy();
        if (pieChart) pieChart.destroy();
        return;
    }
    
    // Hitung total profit/loss
    const totalPL = tradingData.reduce((sum, item) => sum + item.profitLoss, 0);
    totalPLElement.textContent = formatCurrency(totalPL);
    totalPLElement.className = `pl-value ${totalPL >= 0 ? 'positive' : 'negative'}`;
    
    // Hitung win rate
    const winningTrades = tradingData.filter(item => item.profitLoss > 0).length;
    const winRate = (winningTrades / tradingData.length) * 100;
    winRateElement.textContent = `${winRate.toFixed(1)}%`;
    
    // Total trading
    totalTradesElement.textContent = tradingData.length;
    
    // Profit terbesar
    const maxProfit = Math.max(...tradingData.map(item => item.profitLoss));
    maxProfitElement.textContent = formatCurrency(maxProfit);
    maxProfitElement.className = `pl-value ${maxProfit >= 0 ? 'positive' : 'negative'}`;
    
    // Update chart
    updateCharts();
}

// Update chart (sama seperti sebelumnya)
function updateCharts() {
    // Line chart - Profit/Loss per bulan
    const monthlyData = {};
    
    tradingData.forEach(item => {
        const month = item.tanggalMasuk.substring(0, 7);
        if (!monthlyData[month]) {
            monthlyData[month] = 0;
        }
        monthlyData[month] += item.profitLoss;
    });
    
    const months = Object.keys(monthlyData).sort();
    const monthlyPL = months.map(month => monthlyData[month]);
    
    const lineCtx = document.getElementById('lineChart');
    if (!lineCtx) return;
    
    const lineCanvas = lineCtx.getContext('2d');
    if (lineChart) lineChart.destroy();
    
    lineChart = new Chart(lineCanvas, {
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
    
    const pieCtx = document.getElementById('pieChart');
    if (!pieCtx) return;
    
    const pieCanvas = pieCtx.getContext('2d');
    if (pieChart) pieChart.destroy();
    
    pieChart = new Chart(pieCanvas, {
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

// Fungsi untuk performance analysis (sama seperti sebelumnya)
function analyzeSahamPerformance() {
    const sahamData = {};
    
    tradingData.forEach(trade => {
        if (!sahamData[trade.kodeSaham]) {
            sahamData[trade.kodeSaham] = {
                totalTrades: 0,
                wins: 0,
                losses: 0,
                totalProfit: 0,
                profits: []
            };
        }
        
        const data = sahamData[trade.kodeSaham];
        data.totalTrades++;
        data.totalProfit += trade.profitLoss;
        data.profits.push(trade.profitLoss);
        
        if (trade.profitLoss > 0) {
            data.wins++;
        } else if (trade.profitLoss < 0) {
            data.losses++;
        }
    });
    
    return sahamData;
}

function analyzeMetodePerformance() {
    const metodeData = {};
    
    tradingData.forEach(trade => {
        if (!metodeData[trade.metodeTrading]) {
            metodeData[trade.metodeTrading] = {
                totalTrades: 0,
                wins: 0,
                losses: 0,
                totalProfit: 0,
                profits: []
            };
        }
        
        const data = metodeData[trade.metodeTrading];
        data.totalTrades++;
        data.totalProfit += trade.profitLoss;
        data.profits.push(trade.profitLoss);
        
        if (trade.profitLoss > 0) {
            data.wins++;
        } else if (trade.profitLoss < 0) {
            data.losses++;
        }
    });
    
    return metodeData;
}

function displaySahamPerformance() {
    const sahamData = analyzeSahamPerformance();
    const tbody = document.getElementById('sahamPerformanceBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    Object.keys(sahamData).sort((a, b) => sahamData[b].totalProfit - sahamData[a].totalProfit).forEach(saham => {
        const data = sahamData[saham];
        const winRate = data.totalTrades > 0 ? (data.wins / data.totalTrades * 100) : 0;
        const avgProfit = data.totalTrades > 0 ? (data.totalProfit / data.totalTrades) : 0;
        const bestTrade = Math.max(...data.profits);
        const worstTrade = Math.min(...data.profits);
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${saham}</strong></td>
            <td>${data.totalTrades}</td>
            <td>${data.wins}</td>
            <td>${data.losses}</td>
            <td>${winRate.toFixed(1)}%</td>
            <td class="${data.totalProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.totalProfit)}</td>
            <td class="${avgProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(avgProfit)}</td>
            <td class="${bestTrade >= 0 ? 'positive' : 'negative'}">${formatCurrency(bestTrade)}</td>
            <td class="${worstTrade >= 0 ? 'positive' : 'negative'}">${formatCurrency(worstTrade)}</td>
        `;
        tbody.appendChild(row);
    });
}

function displayMetodePerformance() {
    const metodeData = analyzeMetodePerformance();
    const tbody = document.getElementById('metodePerformanceBody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    Object.keys(metodeData).sort((a, b) => metodeData[b].totalProfit - metodeData[a].totalProfit).forEach(metode => {
        const data = metodeData[metode];
        const winRate = data.totalTrades > 0 ? (data.wins / data.totalTrades * 100) : 0;
        const avgProfit = data.totalTrades > 0 ? (data.totalProfit / data.totalTrades) : 0;
        const successRate = data.totalTrades > 0 ? ((data.wins + data.losses) / data.totalTrades * 100) : 0;
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><strong>${metode}</strong></td>
            <td>${data.totalTrades}</td>
            <td>${data.wins}</td>
            <td>${data.losses}</td>
            <td>${winRate.toFixed(1)}%</td>
            <td class="${data.totalProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(data.totalProfit)}</td>
            <td class="${avgProfit >= 0 ? 'positive' : 'negative'}">${formatCurrency(avgProfit)}</td>
            <td>${successRate.toFixed(1)}%</td>
        `;
        tbody.appendChild(row);
    });
}

function displayTradingSummary() {
    const totalTrades = tradingData.length;
    const wins = tradingData.filter(t => t.profitLoss > 0).length;
    const losses = tradingData.filter(t => t.profitLoss < 0).length;
    const winRate = totalTrades > 0 ? (wins / totalTrades * 100) : 0;
    
    document.getElementById('totalAllTrades').textContent = totalTrades;
    document.getElementById('totalWins').textContent = wins;
    document.getElementById('totalLosses').textContent = losses;
    document.getElementById('overallWinRate').textContent = `${winRate.toFixed(1)}%`;
    
    updatePerformanceCharts();
}

function updatePerformanceCharts() {
    const metodeData = analyzeMetodePerformance();
    
    // Win Rate Chart
    const winRateCtx = document.getElementById('winRateChart');
    if (winRateCtx) {
        if (winRateChart) winRateChart.destroy();
        
        const methods = Object.keys(metodeData);
        const winRates = methods.map(method => {
            const data = metodeData[method];
            return data.totalTrades > 0 ? (data.wins / data.totalTrades * 100) : 0;
        });
        
        winRateChart = new Chart(winRateCtx.getContext('2d'), {
            type: 'bar',
            data: {
                labels: methods,
                datasets: [{
                    label: 'Win Rate (%)',
                    data: winRates,
                    backgroundColor: '#3498db'
                }]
            },
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100
                    }
                }
            }
        });
    }
    
    // Distribution Chart
    const distributionCtx = document.getElementById('distributionChart');
    if (distributionCtx) {
        if (distributionChart) distributionChart.destroy();
        
        const profitRanges = {
            'Loss Besar (< -1M)': 0,
            'Loss Sedang (-1M - -100K)': 0,
            'Loss Kecil (-100K - 0)': 0,
            'Profit Kecil (0 - 100K)': 0,
            'Profit Sedang (100K - 1M)': 0,
            'Profit Besar (> 1M)': 0
        };
        
        tradingData.forEach(trade => {
            const profit = trade.profitLoss;
            if (profit < -1000000) profitRanges['Loss Besar (< -1M)']++;
            else if (profit < -100000) profitRanges['Loss Sedang (-1M - -100K)']++;
            else if (profit < 0) profitRanges['Loss Kecil (-100K - 0)']++;
            else if (profit < 100000) profitRanges['Profit Kecil (0 - 100K)']++;
            else if (profit < 1000000) profitRanges['Profit Sedang (100K - 1M)']++;
            else profitRanges['Profit Besar (> 1M)']++;
        });
        
        distributionChart = new Chart(distributionCtx.getContext('2d'), {
            type: 'pie',
            data: {
                labels: Object.keys(profitRanges),
                datasets: [{
                    data: Object.values(profitRanges),
                    backgroundColor: [
                        '#e74c3c', '#f39c12', '#f1c40f', 
                        '#2ecc71', '#27ae60', '#16a085'
                    ]
                }]
            },
            options: {
                responsive: true
            }
        });
    }
}

function setupPerformanceTabs() {
    const tabs = document.querySelectorAll('.perf-tab');
    const tabContents = document.querySelectorAll('.perf-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            tab.classList.add('active');
            const targetTab = document.getElementById(`tab-${tabName}`);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            if (tabName === 'saham') {
                displaySahamPerformance();
            } else if (tabName === 'metode') {
                displayMetodePerformance();
            } else if (tabName === 'summary') {
                displayTradingSummary();
            }
        });
    });
    
    displaySahamPerformance();
}






