// Konfigurasi Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzjrJQodARnBDZ8HeVAKZNdCJ2SNL_Jz-7szHZd3D_50s6DXkcQMqW6LbMu13YhIaWB/exec';

// Variabel global
let tradingData = [];
let lineChart, pieChart, winRateChart, distributionChart; // ⭐ UPDATE INI
let useLocalStorage = false;
let calcCurrentMode = 'target';


// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('=== INITIALIZING APP ===');
    
    // ⭐⭐ SET useLocalStorage SELALU FALSE ⭐⭐
    useLocalStorage = false;
    
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
        // Biarkan tradingData sebagai array kosong
        tradingData = [];
        console.log('🔄 Menggunakan data kosong');
    }
    
    // Tampilkan data
    updateHomeSummary();
    displayTradingData();
    
    // Setup performance tabs
    setupPerformanceTabs();
    
    console.log('=== APP INITIALIZATION COMPLETED ===');
    console.log('Mode: Google Sheets Only (No localStorage)');
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
    
    // Initialize fee preview
    setupFeePreview();
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
    } else {
        console.error('Section not found:', sectionId);
        return;
    }
    
    // Update tombol navigasi aktif
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    const btn = document.querySelector(`#${sectionId}Btn`);
    if (btn) {
        btn.classList.add('active');
    } else {
        console.error('Button not found for section:', sectionId);
    }
    
    // Jika pindah ke home, update summary dan chart
    if (sectionId === 'home') {
        updateHomeSummary();
    }
     
}

// Fungsi untuk load data dari Google Apps Script - FIXED VERSION
async function loadData() {
    try {
        console.log('🔄 Mengambil data dari Google Sheets...');
        
        const response = await fetch(`${APPS_SCRIPT_URL}?action=getData`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('📦 Response dari server:', result);
        
        // Handle error response dari server
        if (result.error) {
            console.warn('Server returned warning:', result.error);
            // Jangan langsung fallback, coba lanjut dengan data kosong
            tradingData = [];
            console.log('ℹ️ Menggunakan data kosong karena server error');
            return;
        }
        
        if (result.data && result.data.length > 1) {
            // Konversi data dari array ke objek
            tradingData = result.data.slice(1).map((row, index) => {
                let feeValue = parseFloat(row[7]) || 0;
                
                // Handle data lama: jika nilai fee < 1, convert ke Rupiah
                if (feeValue < 1 && feeValue > 0) {
                    const totalShares = (parseInt(row[6]) || 1) * 100;
                    const totalBuy = (parseFloat(row[4]) || 0) * totalShares;
                    const totalSell = (parseFloat(row[5]) || 0) * totalShares;
                    feeValue = (totalBuy + totalSell) * (feeValue / 100);
                    feeValue = Math.round(feeValue);
                }
                
                return {
                    id: row[0] || generateId(),
                    tanggalMasuk: row[1] || new Date().toISOString().split('T')[0],
                    tanggalKeluar: row[2] || new Date().toISOString().split('T')[0],
                    kodeSaham: row[3] || 'UNKNOWN',
                    hargaMasuk: parseFloat(row[4]) || 0,
                    hargaKeluar: parseFloat(row[5]) || 0,
                    lot: parseInt(row[6]) || 1,
                    feeBroker: feeValue,
                    metodeTrading: row[8] || 'Scalping',
                    catatan: row[9] || '',
                    profitLoss: parseFloat(row[10]) || 0
                };
            });
            console.log(`✅ Load ${tradingData.length} records berhasil dari Google Sheets`);
        } else {
            tradingData = [];
            console.log('ℹ️ Tidak ada data di Google Sheets');
        }
    } catch (error) {
        console.error('❌ Error loading data from server:', error);
        // Jangan fallback ke localStorage, biarkan array kosong
        tradingData = [];
        console.log('🔄 Menggunakan data kosong, tetap coba simpan ke Google Sheets');
    }
}

// ⭐⭐ COMMENT atau HAPUS fungsi localStorage ⭐⭐
/*
function loadFromLocalStorage() {
    const savedData = localStorage.getItem('tradingData');
    if (savedData) {
        tradingData = JSON.parse(savedData);
    } else {
        tradingData = [];
    }
}
*/

// Fungsi untuk save data ke Google Apps Script - FIXED VERSION (NO LOCALSTORAGE)
async function saveData() {
    console.log('💾 Menyimpan data ke Google Sheets...');
    console.log('Data to save:', tradingData);
    
    // ⭐⭐ HAPUS localStorage fallback ⭐⭐
    // SELALU coba simpan ke Google Sheets, bahkan jika sebelumnya error
    
    try {
        console.log('🔄 Mengirim data ke Google Apps Script...');
        
        // Kirim semua data ke server
        const params = new URLSearchParams({
            action: 'saveAllData',
            data: JSON.stringify(tradingData)
        });
        
        console.log('Mengirim request ke:', APPS_SCRIPT_URL);
        
        const response = await fetch(APPS_SCRIPT_URL, {
            method: 'POST',
            body: params
        });
        
        console.log('Response status:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Response dari Google Sheets:', result);
        
        // Handle error response
        if (result.error) {
            throw new Error(`Google Sheets error: ${result.error}`);
        }
        
        console.log('✅ Data berhasil disimpan ke Google Sheets:', result);
        return true; // Return success
        
    } catch (error) {
        console.error('❌ Gagal menyimpan ke Google Sheets:', error);
        
        // ⭐⭐ TIDAK fallback ke localStorage ⭐⭐
        // Biarkan error, user akan tahu ada masalah dengan Google Sheets
        alert('❌ Gagal menyimpan data ke Google Sheets!\n\nError: ' + error.message + '\n\nCoba refresh halaman dan coba lagi.');
        return false; // Return failure
    }
}

// Fungsi untuk generate ID unik
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Fungsi untuk menghitung fee otomatis berdasarkan persentase 0.4026%
function calculateAutoFee(hargaMasuk, hargaKeluar, lot, percentage = 0.4026) {
    const totalShares = lot * 100;
    const totalBuy = hargaMasuk * totalShares;
    const totalSell = hargaKeluar * totalShares;
    const fee = (totalBuy + totalSell) * (percentage / 100);
    return Math.round(fee);
}

// Fungsi utama untuk menghitung profit/loss
function calculateProfitLoss(hargaMasuk, hargaKeluar, lot, feeBrokerInput) {
    const totalShares = lot * 100;
    const totalBuy = hargaMasuk * totalShares;
    const totalSell = hargaKeluar * totalShares;
    
    let totalFee;
    
    // Jika user input fee manual, pakai nilai tersebut
    if (feeBrokerInput !== null && feeBrokerInput !== '' && !isNaN(feeBrokerInput) && parseFloat(feeBrokerInput) > 0) {
        totalFee = parseFloat(feeBrokerInput);
    } else {
        // Jika kosong, pakai fee otomatis 0.4026%
        totalFee = calculateAutoFee(hargaMasuk, hargaKeluar, lot);
    }
    
    const profitLoss = totalSell - totalBuy - totalFee;
    
    return {
        profitLoss: Math.round(profitLoss * 100) / 100,
        totalFee: totalFee,
        totalBuy: totalBuy,
        totalSell: totalSell
    };
}

// Handler untuk form submission - FIXED VERSION (NO LOCALSTORAGE)
async function handleFormSubmit(event) {
    console.log('Form submission started...');
    event.preventDefault();
    
    // Validasi form dulu sebelum proses
    const tanggalMasuk = document.getElementById('tanggalMasuk').value;
    const tanggalKeluar = document.getElementById('tanggalKeluar').value;
    const kodeSaham = document.getElementById('kodeSaham').value;
    const hargaMasuk = document.getElementById('hargaMasuk').value;
    const hargaKeluar = document.getElementById('hargaKeluar').value;
    const lot = document.getElementById('lot').value;
    
    // Validasi required fields
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
        const formData = {
            id: generateId(),
            tanggalMasuk: tanggalMasuk,
            tanggalKeluar: tanggalKeluar,
            kodeSaham: kodeSaham.toUpperCase(),
            hargaMasuk: parseFloat(hargaMasuk),
            hargaKeluar: parseFloat(hargaKeluar),
            lot: parseInt(lot),
            feeBroker: document.getElementById('feeBroker').value,
            metodeTrading: document.getElementById('metodeTrading').value,
            catatan: document.getElementById('catatan').value
        };
        
        console.log('Form data collected:', formData);
        
        // Hitung profit/loss
        const calculation = calculateProfitLoss(
            formData.hargaMasuk, 
            formData.hargaKeluar, 
            formData.lot,
            formData.feeBroker
        );
        
        formData.profitLoss = calculation.profitLoss;
        formData.feeBroker = calculation.totalFee; // Simpan nilai RUPIAH
        
        console.log('Final data to save:', formData);
        
        // Tambahkan ke array data
        tradingData.push(formData);
        console.log('Data added to tradingData array');
        
        // ⭐⭐ SIMPAN KE GOOGLE SHEETS - TANPA FALLBACK ⭐⭐
        console.log('Menyimpan ke Google Sheets...');
        const saveResult = await saveData();
        
        if (!saveResult) {
            // Jika save gagal, hapus data dari array
            tradingData = tradingData.filter(item => item.id !== formData.id);
            console.log('Data removed from array karena save gagal');
            return; // Berhenti di sini
        }
        
        console.log('Data saved successfully to Google Sheets');
        
        // Tampilkan notifikasi sukses
        alert(`✅ Data trading berhasil disimpan ke Google Sheets!\n\nKode Saham: ${formData.kodeSaham}\nProfit/Loss: ${formatCurrency(formData.profitLoss)}`);
        
        // Reset form
        document.getElementById('tradingForm').reset();
        document.getElementById('lot').value = 1;
        console.log('Form reset completed');
        
        // Update tampilan
        updateHomeSummary();
        displayTradingData();
        
        // TETAP di section add-data
        showSection('add-data');
        console.log('Stay in add-data section');
        
    } catch (error) {
        console.error('Error in form submission:', error);
        alert('❌ Error menyimpan data: ' + error.message);
    }
}

// Fungsi untuk menampilkan preview fee otomatis
function setupFeePreview() {
    const hargaMasukInput = document.getElementById('hargaMasuk');
    const hargaKeluarInput = document.getElementById('hargaKeluar');
    const lotInput = document.getElementById('lot');
    const feeBrokerInput = document.getElementById('feeBroker');
    
    // Buat element preview jika belum ada
    if (!document.getElementById('feePreview')) {
        const previewDiv = document.createElement('div');
        previewDiv.id = 'feePreview';
        previewDiv.className = 'auto-fee-info';
        previewDiv.style.display = 'none';
        feeBrokerInput.parentNode.appendChild(previewDiv);
    }
    
    function updateFeePreview() {
        const hargaMasuk = parseFloat(hargaMasukInput.value) || 0;
        const hargaKeluar = parseFloat(hargaKeluarInput.value) || 0;
        const lot = parseInt(lotInput.value) || 1;
        const currentFee = feeBrokerInput.value;
        
        const previewElement = document.getElementById('feePreview');
        
        // Jika field fee kosong dan harga sudah diisi, tampilkan preview
        if ((!currentFee || currentFee === '') && hargaMasuk > 0 && hargaKeluar > 0) {
            const autoFee = calculateAutoFee(hargaMasuk, hargaKeluar, lot);
            previewElement.innerHTML = `
                <strong>Fee Otomatis:</strong> ${formatCurrency(autoFee)} (0.4026% dari total transaksi)
                <br><small>Isi manual jika ingin mengubah</small>
            `;
            previewElement.style.display = 'block';
        } else {
            previewElement.style.display = 'none';
        }
    }
    
    // Event listeners untuk update preview
    [hargaMasukInput, hargaKeluarInput, lotInput, feeBrokerInput].forEach(input => {
        input.addEventListener('input', updateFeePreview);
        input.addEventListener('change', updateFeePreview);
    });
}

// Update summary di home
function updateHomeSummary() {
    const totalPLElement = document.getElementById('totalPL');
    const winRateElement = document.getElementById('winRate');
    const totalTradesElement = document.getElementById('totalTrades');
    const maxProfitElement = document.getElementById('maxProfit');
    
    if (!totalPLElement || !winRateElement || !totalTradesElement || !maxProfitElement) {
        console.error('Summary elements not found');
        return;
    }
    
    if (tradingData.length === 0) {
        totalPLElement.textContent = 'Rp 0';
        winRateElement.textContent = '0%';
        totalTradesElement.textContent = '0';
        maxProfitElement.textContent = 'Rp 0';
        
        // Reset class
        totalPLElement.className = 'pl-value';
        maxProfitElement.className = 'pl-value';
        
        // Reset chart jika ada
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

// Tampilkan data di report - VERSI SIMPLE
function displayTradingData(filteredData = null) {
    const dataToDisplay = filteredData || tradingData;
    const tableBody = document.getElementById('tradingTableBody');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (dataToDisplay.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" style="text-align: center;">Tidak ada data trading</td></tr>';
        return;
    }
    
    dataToDisplay.forEach(item => {
        const row = document.createElement('tr');
        
        // ⭐⭐ SIMPLE: Selalu tampilkan nilai RUPIAH
        row.innerHTML = `
            <td>${formatDate(item.tanggalMasuk)}</td>
            <td>${formatDate(item.tanggalKeluar)}</td>
            <td>${item.kodeSaham}</td>
            <td>${formatCurrency(item.hargaMasuk)}</td>
            <td>${formatCurrency(item.hargaKeluar)}</td>
            <td>${item.lot}</td>
            <td>${formatCurrency(item.feeBroker)}</td> <!-- ⭐ Nilai Rupiah -->
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

// Format tanggal
function formatDate(dateString) {
    if (!dateString) return '-';
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
// Modal functions - VERSI SIMPLE
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
    document.getElementById('editFeeBroker').value = data.feeBroker;
    document.getElementById('editMetodeTrading').value = data.metodeTrading;
    document.getElementById('editCatatan').value = data.catatan || '';
    
    // Tampilkan modal
    const modal = document.getElementById('editModal');
    modal.style.display = 'block';
    
    // Scroll ke atas modal ketika dibuka
    const modalContent = modal.querySelector('.modal-content');
    modalContent.scrollTop = 0;
    
    // Prevent body scroll ketika modal terbuka
    document.body.style.overflow = 'hidden';
}

function closeModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    
    // Kembalikan body scroll
    document.body.style.overflow = 'auto';
}

// Update handler edit form - VERSI SIMPLE
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
    const feeBrokerInput = document.getElementById('editFeeBroker').value;
    
    // Hitung profit/loss
    const calculation = calculateProfitLoss(
        parseFloat(document.getElementById('editHargaMasuk').value),
        parseFloat(document.getElementById('editHargaKeluar').value),
        lot,
        feeBrokerInput
    );
    
    // ⭐⭐ SIMPLE: Selalu simpan nilai RUPIAH di database
    tradingData[index] = {
        id: id,
        tanggalMasuk: tanggalMasuk,
        tanggalKeluar: tanggalKeluar,
        kodeSaham: document.getElementById('editKodeSaham').value.toUpperCase(),
        hargaMasuk: parseFloat(document.getElementById('editHargaMasuk').value),
        hargaKeluar: parseFloat(document.getElementById('editHargaKeluar').value),
        lot: lot,
        feeBroker: calculation.totalFee, // ⭐ Simpan nilai RUPIAH
        metodeTrading: document.getElementById('editMetodeTrading').value,
        catatan: document.getElementById('editCatatan').value,
        profitLoss: calculation.profitLoss
    };
    
    // Simpan perubahan
    await saveData();
    
    // Tutup modal
    closeModal();
    
    // Update tampilan
    updateHomeSummary();
    displayTradingData();
    
    // Tampilkan notifikasi
    alert(`Data trading berhasil diupdate!\n\nFee: ${formatCurrency(calculation.totalFee)}\nProfit/Loss: ${formatCurrency(calculation.profitLoss)}`);
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

// ⭐⭐⭐ PASTE KODE DI SINI ⭐⭐⭐
// Event listener untuk ESC key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeModal();
    }
});

// Auto-focus ke field pertama ketika modal terbuka
document.getElementById('editModal').addEventListener('shown', function() {
    const firstInput = this.querySelector('input, select, textarea');
    if (firstInput) {
        firstInput.focus();
    }
});
// ⭐⭐⭐ SAMPAI DI SINI ⭐⭐⭐


// Fungsi untuk analisis performance by saham
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

// Fungsi untuk analisis performance by metode
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

// Tampilkan performance by saham
function displaySahamPerformance() {
    const sahamData = analyzeSahamPerformance();
    const tbody = document.getElementById('sahamPerformanceBody');
    
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

// Tampilkan performance by metode
function displayMetodePerformance() {
    const metodeData = analyzeMetodePerformance();
    const tbody = document.getElementById('metodePerformanceBody');
    
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

// Tampilkan summary trading
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

// Update performance charts
// Perbaiki fungsi updatePerformanceCharts
function updatePerformanceCharts() {
    const metodeData = analyzeMetodePerformance();
    
    // Win Rate Chart - FIXED VERSION
    const winRateCtx = document.getElementById('winRateChart');
    if (winRateCtx) {
        // Destroy chart sebelumnya jika ada
        if (winRateChart) {
            winRateChart.destroy();
        }
        
        const methods = Object.keys(metodeData);
        const winRates = methods.map(method => {
            const data = metodeData[method];
            return data.totalTrades > 0 ? (data.wins / data.totalTrades * 100) : 0;
        });
        
        winRateChart = new Chart(winRateCtx.getContext('2d'), { // ⭐ SIMPAN KE VARIABLE
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
    
    // Distribution Chart - FIXED VERSION
    const distributionCtx = document.getElementById('distributionChart');
    if (distributionCtx) {
        // Destroy chart sebelumnya jika ada
        if (distributionChart) {
            distributionChart.destroy();
        }
        
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
        
        distributionChart = new Chart(distributionCtx.getContext('2d'), { // ⭐ SIMPAN KE VARIABLE
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

// Performance tab functionality - FIXED VERSION
function setupPerformanceTabs() {
    const tabs = document.querySelectorAll('.perf-tab');
    const tabContents = document.querySelectorAll('.perf-tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.getAttribute('data-tab');
            console.log('Performance tab clicked:', tabName);
            
            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            
            tab.classList.add('active');
            const targetTab = document.getElementById(`tab-${tabName}`);
            if (targetTab) {
                targetTab.classList.add('active');
            }
            
            // Refresh data berdasarkan tab
            if (tabName === 'saham') {
                displaySahamPerformance();
            } else if (tabName === 'metode') {
                displayMetodePerformance();
            } else if (tabName === 'summary') {
                displayTradingSummary();
            }
        });
    });
    
    // Load data untuk tab pertama
    displaySahamPerformance();
}

// Update showSection untuk performance - FIXED VERSION
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
    if (btn) btn.classList.add('active');
    
    // Jika pindah ke home, update summary dan chart
    if (sectionId === 'home') {
        updateHomeSummary();
    }
    // Jika pindah ke performance, load data performance
    else if (sectionId === 'performance') {
        // Pastikan performance tabs sudah setup
        setTimeout(() => {
            displaySahamPerformance();
            displayMetodePerformance();
            displayTradingSummary();
        }, 100);
    }
}

// Update navigation untuk performance
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Navigation
    document.getElementById('homeBtn').addEventListener('click', () => showSection('home'));
    document.getElementById('addBtn').addEventListener('click', () => showSection('add-data'));
    document.getElementById('reportBtn').addEventListener('click', () => showSection('report'));
    document.getElementById('performanceBtn').addEventListener('click', () => showSection('performance'));
    
    
    // Form submission - PASTIKAN INI BENAR
    const tradingForm = document.getElementById('tradingForm');
    if (tradingForm) {
        tradingForm.addEventListener('submit', handleFormSubmit);
        console.log('Trading form event listener added');
    } else {
        console.error('Trading form not found!');
    }
    
    // Edit form
    const editForm = document.getElementById('editForm');
    if (editForm) {
        editForm.addEventListener('submit', handleEditSubmit);
        console.log('Edit form event listener added');
    }
    
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
    
    // Initialize fee preview
    setupFeePreview();
    
    // ESC key untuk modal
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeModal();
        }
    });
    
    console.log('All event listeners setup completed');
}

// Update showSection untuk handle performance
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
    
    const btn = document.querySelector(`#${sectionId}Btn`);
    if (btn) btn.classList.add('active');
    
    // Jika pindah ke home, update summary dan chart
    if (sectionId === 'home') {
        updateHomeSummary();
    }
    // Jika pindah ke performance, load data performance
    else if (sectionId === 'performance') {
        displaySahamPerformance();
        displayMetodePerformance();
        displayTradingSummary();
    }
}








