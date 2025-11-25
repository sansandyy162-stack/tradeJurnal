// Konfigurasi Google Apps Script
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz5nymwb9rYMRCfPqrevTfXAch4KogtXQGB4HssHLKanBRHPrH6G2Vl6K1gSqEOs02i/exec';

// Variabel global
let tradingData = [];
let lineChart, pieChart, winRateChart, distributionChart;
let positions = {};

// ⭐⭐ TAMBAHKAN: Fungsi Loading Time ⭐⭐
function showLoading(message = 'Menyimpan data...') {
    const loadingEl = document.createElement('div');
    loadingEl.id = 'loadingOverlay';
    loadingEl.innerHTML = `
        <div class="loading-spinner">
            <div class="spinner"></div>
            <p>${message}</p>
            <div class="loading-timer">Estimasi: 2-5 detik</div>
        </div>
    `;
    document.body.appendChild(loadingEl);
}

function hideLoading() {
    const loadingEl = document.getElementById('loadingOverlay');
    if (loadingEl) {
        loadingEl.remove();
    }
}

// ⭐⭐ TAMBAHKAN: Fungsi untuk disable/enable form ⭐⭐
function disableForm(buttonId = 'submitBtn') {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = true;
        button.innerHTML = 'Menyimpan...';
    }
}

function enableForm(buttonId = 'submitBtn') {
    const button = document.getElementById(buttonId);
    if (button) {
        button.disabled = false;
        button.innerHTML = 'Simpan Data';
    }
}

function disableEditForm() {
    const button = document.getElementById('updateBtn');
    if (button) {
        button.disabled = true;
        button.innerHTML = 'Mengupdate...';
    }
}

function enableEditForm() {
    const button = document.getElementById('updateBtn');
    if (button) {
        button.disabled = false;
        button.innerHTML = 'Update Data';
    }
}

// Inisialisasi aplikasi
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

async function initializeApp() {
    console.log('=== INITIALIZING APP ===');
    
    // Setup event listeners
    setupEventListeners();
    setupPositionTradingListeners();
    
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
// ⭐⭐ BARU: Setup Event Listeners untuk Position Trading ⭐⭐
function setupPositionTradingListeners() {
    const toggle = document.getElementById('positionModeToggle');
    const positionType = document.getElementById('positionType');
    const existingPositions = document.getElementById('existingPositions');
    
    if (!toggle) return;
    
    // Toggle switch listener
    toggle.addEventListener('change', function() {
        const isPositionMode = this.checked;
        togglePositionMode(isPositionMode);
    });
    
    // Position type change listener
    positionType.addEventListener('change', function() {
        handlePositionTypeChange(this.value);
    });
    
    // Existing positions change listener
    existingPositions.addEventListener('change', function() {
        handlePositionSelection(this.value);
    });
    
    // Real-time preview listeners
    const previewFields = ['hargaMasuk', 'hargaKeluar', 'lot', 'feeBuy', 'feeSell', 'partialLot'];
    previewFields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.addEventListener('input', updatePositionPreview);
        }
    });
}
// ⭐⭐ BARU: Toggle antara Trading Biasa dan Posisi Saham ⭐⭐
function togglePositionMode(isPositionMode) {
    const toggleDesc = document.getElementById('toggleDesc');
    const positionSelection = document.getElementById('positionSelection');
    const tanggalKeluarGroup = document.querySelector('label[for="tanggalKeluar"]').parentElement;
    const hargaKeluarGroup = document.querySelector('label[for="hargaKeluar"]').parentElement;
    const feeSellGroup = document.querySelector('label[for="feeSell"]').parentElement;
    
    // ✅ Reset kodeSaham field ketika ganti mode
    document.getElementById('kodeSaham').value = '';
    document.getElementById('kodeSaham').readOnly = false;
    
    if (isPositionMode) {
        // Mode Posisi Saham
        toggleDesc.textContent = 'Multiple Buy/Sell dalam 1 posisi';
        positionSelection.style.display = 'block';
        
        // Reset form
        document.getElementById('positionType').value = 'new';
        handlePositionTypeChange('new');
        
    } else {
        // Mode Trading Biasa
        toggleDesc.textContent = '1x Buy + 1x Sell dalam 1 trading';
        positionSelection.style.display = 'none';
        
        // Show semua field
        tanggalKeluarGroup.style.display = 'block';
        hargaKeluarGroup.style.display = 'block';
        feeSellGroup.style.display = 'block';
        
        // Hide position-specific elements
        document.getElementById('existingPositionsContainer').style.display = 'none';
        document.getElementById('partialExitContainer').style.display = 'none';
        document.getElementById('positionPreview').style.display = 'none';
    }
}
function handlePositionTypeChange(positionType) {
    const tanggalMasukGroup = document.querySelector('label[for="tanggalMasuk"]').parentElement;
    const tanggalKeluarGroup = document.querySelector('label[for="tanggalKeluar"]').parentElement;
    const hargaMasukGroup = document.querySelector('label[for="hargaMasuk"]').parentElement;
    const hargaKeluarGroup = document.querySelector('label[for="hargaKeluar"]').parentElement;
    const lotGroup = document.querySelector('label[for="lot"]').parentElement;
    const feeBuyGroup = document.querySelector('label[for="feeBuy"]').parentElement;
    const feeSellGroup = document.querySelector('label[for="feeSell"]').parentElement;
    const existingPositionsContainer = document.getElementById('existingPositionsContainer');
    const partialExitContainer = document.getElementById('partialExitContainer');
    
    // Reset semua field ke default
    resetFormFields();
    
    // Update form berdasarkan jenis transaksi
    switch(positionType) {
        case 'new': // Beli - Buat Posisi Baru
            tanggalKeluarGroup.style.display = 'none';
            hargaKeluarGroup.style.display = 'none';
            feeSellGroup.style.display = 'none';
            break;
            
        case 'add': // Beli - Tambah ke Posisi Existing
            tanggalKeluarGroup.style.display = 'none';
            hargaKeluarGroup.style.display = 'none';
            feeSellGroup.style.display = 'none';
            existingPositionsContainer.style.display = 'block';
            populateExistingPositions('open');
            break;
            
        case 'close': // Jual - Tutup Posisi
            tanggalMasukGroup.style.display = 'none';
            hargaMasukGroup.style.display = 'none';
            feeBuyGroup.style.display = 'none';
            existingPositionsContainer.style.display = 'block';
            populateExistingPositions('open');
            break;
            
        case 'partial': // Jual - Partial Exit - ✅ DIPERBAIKI
            tanggalMasukGroup.style.display = 'none';
            hargaMasukGroup.style.display = 'none';
            lotGroup.style.display = 'none';
            feeBuyGroup.style.display = 'none';
            existingPositionsContainer.style.display = 'block';
            partialExitContainer.style.display = 'block';
            populateExistingPositions('open');
            break;
    }
    
    updatePositionPreview();
}

// ⭐⭐ PERBAIKI: resetFormFields() - RESET YANG BENAR ⭐⭐
function resetFormFields() {
    const allGroups = [
        document.querySelector('label[for="tanggalMasuk"]').parentElement,
        document.querySelector('label[for="tanggalKeluar"]').parentElement,
        document.querySelector('label[for="hargaMasuk"]').parentElement,
        document.querySelector('label[for="hargaKeluar"]').parentElement,
        document.querySelector('label[for="lot"]').parentElement,
        document.querySelector('label[for="feeBuy"]').parentElement,
        document.querySelector('label[for="feeSell"]').parentElement
    ];
    
    // Tampilkan semua field terlebih dahulu
    allGroups.forEach(group => {
        if (group) group.style.display = 'block';
    });
    
    // Reset nilai field
    document.getElementById('kodeSaham').value = '';
    document.getElementById('kodeSaham').readOnly = false;
    document.getElementById('hargaMasuk').value = '';
    document.getElementById('hargaMasuk').readOnly = false;
    document.getElementById('lot').value = '1'; // ✅ SET DEFAULT 1
    document.getElementById('lot').readOnly = false;
    document.getElementById('hargaKeluar').value = '';
    document.getElementById('feeBuy').value = '';
    document.getElementById('feeSell').value = '';
    
    // Reset partial exit container
    document.getElementById('partialExitContainer').style.display = 'none';
    document.getElementById('partialLot').value = '1'; // ✅ SET DEFAULT 1
}


// ⭐⭐ PERBAIKI: populateExistingPositions() - BETTER FILTERING ⭐⭐
function populateExistingPositions(status = 'open') {
    const existingPositions = document.getElementById('existingPositions');
    const positionInfo = document.getElementById('positionInfo');
    
    if (!existingPositions) return;
    
    existingPositions.innerHTML = '<option value="">-- Pilih Posisi --</option>';
    positionInfo.style.display = 'none';
    
    // Reset form fields
    document.getElementById('kodeSaham').value = '';
    document.getElementById('kodeSaham').readOnly = false;
    document.getElementById('lot').value = '';
    document.getElementById('lot').readOnly = false;
    
    // Rebuild positions dari trading data
    const positions = rebuildPositionsFromData();
    
    // ✅ FILTER YANG LEBIH AKURAT: 
    // Tampilkan posisi yang status open DAN ada remaining lot > 0
    const availablePositions = Object.values(positions).filter(pos => {
        const hasRemainingLot = pos.remainingLot > 0;
        const isOpenStatus = pos.status === 'open';
        
        console.log(`🔍 Filtering: ${pos.kodeSaham}`, {
            status: pos.status,
            remainingLot: pos.remainingLot,
            hasRemainingLot: hasRemainingLot,
            isOpenStatus: isOpenStatus,
            shouldShow: hasRemainingLot && isOpenStatus
        });
        
        return hasRemainingLot && isOpenStatus;
    });
    
    console.log(`📋 Available positions: ${availablePositions.length}`);
    
    if (availablePositions.length === 0) {
        existingPositions.innerHTML = '<option value="">Tidak ada posisi open</option>';
        
        // ✅ DEBUG: Tampilkan kenapa tidak ada posisi
        const allPositions = Object.values(positions);
        console.log('🔍 All positions debug:', allPositions.map(p => ({
            kodeSaham: p.kodeSaham,
            status: p.status,
            totalLot: p.totalLot,
            remainingLot: p.remainingLot
        })));
        
        return;
    }
    
    availablePositions.forEach(position => {
        const option = document.createElement('option');
        option.value = position.id;
        
        // ✅ TAMPILKAN INFO YANG JELAS: Sisa lot / Total lot
        const lotInfo = position.remainingLot === position.totalLot ? 
            `${position.totalLot} lot` : 
            `${position.remainingLot}/${position.totalLot} lot`;
            
        option.textContent = `${position.kodeSaham} - ${lotInfo} @ ${formatCurrency(position.averagePrice)}`;
        
        option.setAttribute('data-position', JSON.stringify({
            id: position.id,
            kodeSaham: position.kodeSaham,
            averagePrice: position.averagePrice,
            totalLot: position.totalLot,
            remainingLot: position.remainingLot, // ✅ PASTIKAN ini ada
            totalInvestment: position.totalInvestment,
            totalFeeBuy: position.totalFeeBuy,
            entries: position.entries || [],
            exits: position.exits || []
        }));
        
        existingPositions.appendChild(option);
    });
    
    console.log(`✅ Populated ${availablePositions.length} positions to dropdown`);
}

// ⭐⭐ BARU: Handle ketika user memilih posisi existing ⭐⭐

function handlePositionSelection(positionId) {
    const positionInfo = document.getElementById('positionInfo');
    const existingPositions = document.getElementById('existingPositions');
    const partialLotInput = document.getElementById('partialLot');
    const totalAvailableLot = document.getElementById('totalAvailableLot');
    const positionType = document.getElementById('positionType').value;
    
    if (!positionId) {
        positionInfo.style.display = 'none';
        return;
    }
    
    const selectedOption = existingPositions.querySelector(`option[value="${positionId}"]`);
    if (!selectedOption) return;
    
    const position = JSON.parse(selectedOption.getAttribute('data-position'));
    
    // ✅ AUTO-FILL KODE SAHAM
    document.getElementById('kodeSaham').value = position.kodeSaham || '';
    document.getElementById('kodeSaham').readOnly = true;
    
    // ✅ AUTO-FILL HARGA MASUK untuk partial/close exit (harga rata-rata)
    if (positionType === 'partial') {
        document.getElementById('hargaMasuk').value = position.averagePrice || '';
        document.getElementById('hargaMasuk').readOnly = true;
    } else if (positionType === 'close') {
       // Auto-fill LOT dengan remaining lot (readonly)
        document.getElementById('lot').value = position.remainingLot || position.totalLot;
        document.getElementById('lot').readOnly = true;
    }
    
    // Update position info
    positionInfo.innerHTML = `
        <div class="position-info-item">
            <span>Kode Saham:</span>
            <span><strong>${position.kodeSaham}</strong></span>
        </div>
        <div class="position-info-item">
            <span>Harga Rata:</span>
            <span>${formatCurrency(position.averagePrice)}</span>
        </div>
        <div class="position-info-item">
            <span>Total Lot Awal:</span>
            <span>${position.totalLot}</span>
        </div>
        <div class="position-info-item">
            <span>Sisa Lot Saat Ini:</span>
            <span><strong>${position.remainingLot || position.totalLot} lot</strong></span>
        </div>
        <div class="position-info-item">
            <span>Total Investasi:</span>
            <span>${formatCurrency(position.totalInvestment)}</span>
        </div>
        <div class="position-info-item">
            <span>Total Fee Beli:</span>
            <span>${formatCurrency(position.totalFeeBuy)}</span>
        </div>
    `;
    positionInfo.style.display = 'block';
    
    // Update partial exit info
    if (partialLotInput && positionType === 'partial') {
        partialLotInput.max = position.remainingLot || position.totalLot;
        totalAvailableLot.textContent = position.remainingLot || position.totalLot; // ✅ Tampilkan sisa lot
        partialLotInput.value = Math.min(1, position.remainingLot || position.totalLot);
    }
    updatePositionPreview();
}

// ⭐⭐ BARU: Update real-time position preview ⭐⭐
function updatePositionPreview() {
    const preview = document.getElementById('positionPreview');
    const positionType = document.getElementById('positionType')?.value;
    const isPositionMode = document.getElementById('positionModeToggle')?.checked;
    
    if (!isPositionMode || !positionType) {
        preview.style.display = 'none';
        return;
    }
    
    let previewHTML = '<h4>Preview:</h4>';
    
    switch(positionType) {
        case 'new':
            previewHTML += getNewPositionPreview();
            break;
        case 'add':
            previewHTML += getAddPositionPreview();
            break;
        case 'close':
        case 'partial':
            previewHTML += getExitPositionPreview();
            break;
    }
    
    preview.innerHTML = previewHTML;
    preview.style.display = 'block';
}

function getNewPositionPreview() {
    const kodeSaham = document.getElementById('kodeSaham').value || '?';
    const lot = parseInt(document.getElementById('lot').value) || 0;
    const hargaMasuk = parseFloat(document.getElementById('hargaMasuk').value) || 0;
    
    return `
        <div class="preview-item">
            <span class="preview-label">Posisi Baru:</span>
            <span class="preview-value">${kodeSaham} - ${lot} lot</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Harga Beli:</span>
            <span class="preview-value">${formatCurrency(hargaMasuk)}</span>
        </div>
    `;
}

function getAddPositionPreview() {
    // Implementasi preview untuk average down
    const selectedPosition = getSelectedPosition();
    if (!selectedPosition) return '<div class="preview-item">Pilih posisi terlebih dahulu</div>';
    
    const lot = parseInt(document.getElementById('lot').value) || 0;
    const hargaMasuk = parseFloat(document.getElementById('hargaMasuk').value) || 0;
    
    // Calculate new average
    const newTotalLot = selectedPosition.totalLot + lot;
    const newTotalValue = (selectedPosition.totalLot * 100 * selectedPosition.averagePrice) + (lot * 100 * hargaMasuk);
    const newAveragePrice = newTotalValue / (newTotalLot * 100);
    
    return `
        <div class="preview-item">
            <span class="preview-label">Posisi Saat Ini:</span>
            <span class="preview-value">${selectedPosition.totalLot} lot @ ${formatCurrency(selectedPosition.averagePrice)}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Setelah Average:</span>
            <span class="preview-value">${newTotalLot} lot @ ${formatCurrency(Math.round(newAveragePrice))}</span>
        </div>
    `;
}

function getExitPositionPreview() {
    const selectedPosition = getSelectedPosition();
    if (!selectedPosition) return '<div class="preview-item">Pilih posisi terlebih dahulu</div>';
    
    const hargaKeluar = parseFloat(document.getElementById('hargaKeluar').value) || 0;
    const positionType = document.getElementById('positionType').value;
    
    let exitLot;
    if (positionType === 'partial') {
        exitLot = parseInt(document.getElementById('partialLot').value) || 0;
    } else {
        exitLot = selectedPosition.totalLot;
    }

     // ✅ HITUNG SISA LOT SETELAH EXIT
    const sisaLotSetelahExit = (selectedPosition.remainingLot || selectedPosition.totalLot) - exitLot;
    
    // Calculate profit/loss
    const profitLoss = calculatePositionProfitLoss(selectedPosition, hargaKeluar, exitLot);
    
    let previewHTML = `
        <div class="preview-item">
            <span class="preview-label">Jenis Exit:</span>
            <span class="preview-value">${positionType === 'partial' ? 'Partial Exit' : 'Full Exit'}</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Lot yang Dijual:</span>
            <span class="preview-value">${exitLot} lot</span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Sisa Lot Setelah Exit:</span>
            <span class="preview-value"><strong>${sisaLotSetelahExit} lot</strong></span>
        </div>
        <div class="preview-item">
            <span class="preview-label">Harga Rata Beli:</span>
            <span class="preview-value">${formatCurrency(selectedPosition.averagePrice)}</span>
        </div>
    `;

    if (hargaKeluar > 0) {
        previewHTML += `
            <div class="preview-item">
                <span class="preview-label">Harga Jual:</span>
                <span class="preview-value">${formatCurrency(hargaKeluar)}</span>
            </div>
            <div class="preview-item">
                <span class="preview-label">Estimasi P/L:</span>
                <span class="preview-value ${profitLoss >= 0 ? 'positive' : 'negative'}">${formatCurrency(profitLoss)}</span>
            </div>
        `;
    }
    
    return previewHTML;
}

    // ⭐⭐ BARU: Helper functions untuk position trading ⭐⭐
function getSelectedPosition() {
    const existingPositions = document.getElementById('existingPositions');
    const selectedOption = existingPositions?.options[existingPositions.selectedIndex];
    
    if (!selectedOption || !selectedOption.value) return null;
    
    return JSON.parse(selectedOption.getAttribute('data-position'));
}

// ⭐⭐ UPDATE: calculatePositionProfitLoss dengan fee allocation ⭐⭐
function calculatePositionProfitLoss(position, hargaKeluar, exitLot) {
    const totalShares = exitLot * 100;
    const totalBuyValue = totalShares * position.averagePrice;
    const totalSellValue = totalShares * hargaKeluar;
    
    // Hitung allocated fee buy
    const allocatedFeeBuy = (exitLot / position.totalLot) * position.totalFeeBuy;
    
    // Hitung fee jual (0.25132%)
    const estimatedFeeSell = Math.round(totalSellValue * (0.25132 / 100));
    
    const profitLoss = totalSellValue - totalBuyValue - allocatedFeeBuy - estimatedFeeSell;
    return Math.round(profitLoss);
}


function generatePositionId(kodeSaham) {
    return `POS-${kodeSaham}-${Date.now()}`;
}
// ⭐⭐ BARU: Fungsi untuk parse PositionData - DIPERBAIKI ⭐⭐
function parsePositionData(positionDataString) {
    try {
        if (!positionDataString || positionDataString.trim() === '') {
            return null;
        }
        
        // Coba parse sebagai JSON (untuk data baru)
        if (positionDataString.trim().startsWith('{') && positionDataString.includes('":"')) {
            return JSON.parse(positionDataString);
        }
        
        // Fallback: parse format key=value (untuk data existing)
        console.log('🔄 Parsing legacy PositionData format:', positionDataString);
        const data = {};
        
        // Clean the string - remove curly braces
        const cleanString = positionDataString.replace(/[{}]/g, '');
        
        // Split by comma and process each key=value pair
        const pairs = cleanString.split(',');
        
        pairs.forEach(pair => {
            const [key, value] = pair.split('=').map(item => item.trim());
            if (key && value !== undefined) {
                // Try to parse numbers and booleans
                if (value === 'true') data[key] = true;
                else if (value === 'false') data[key] = false;
                else if (value === 'null') data[key] = null;
                else if (!isNaN(value) && value !== '') data[key] = parseFloat(value);
                else data[key] = value;
            }
        });
        
        console.log('✅ Parsed legacy data:', data);
        return Object.keys(data).length > 0 ? data : null;
        
    } catch (error) {
        console.warn('❌ Gagal parse PositionData:', positionDataString, error);
        return null;
    }
}

// ⭐⭐ BARU: Fungsi untuk serialize PositionData - DIPERBAIKI ⭐⭐
function serializePositionData(positionData) {
    if (!positionData) return '';
    
    try {
        // Simpan sebagai JSON string yang valid
        return JSON.stringify(positionData);
    } catch (error) {
        console.error('❌ Gagal serialize PositionData:', error);
        
        // Fallback: format key=value legacy
        const pairs = [];
        for (const [key, value] of Object.entries(positionData)) {
            pairs.push(`${key}=${value}`);
        }
        return `{${pairs.join(', ')}}`;
    }
}


// ⭐⭐ PERBAIKI BESAR: rebuildPositionsFromData() - FIX REMAINING LOT ⭐⭐
function rebuildPositionsFromData() {
    console.log('🔄 Rebuilding positions from PositionData...');
    
    const positions = {};
    
    // PHASE 1: Process semua ENTRIES terlebih dahulu
    tradingData.forEach(trade => {
        if (trade.positionData && trade.positionData.positionId && trade.positionData.transactionType === 'entry') {
            const positionId = trade.positionData.positionId;
            
            if (!positions[positionId]) {
                positions[positionId] = {
                    id: positionId,
                    kodeSaham: trade.kodeSaham,
                    status: 'open',
                    entries: [],
                    exits: [], // ✅ BARU: Track exits
                    totalLot: 0,
                    totalFeeBuy: 0,
                    averagePrice: 0,
                    totalInvestment: 0,
                    remainingLot: 0 // ✅ Initialize
                };
            }
            
            // Process entry
            positions[positionId].entries.push({
                id: trade.id,
                tanggal: trade.tanggalMasuk,
                lot: trade.lot,
                harga: trade.hargaMasuk,
                fee: trade.feeBuy
            });
            
            positions[positionId].totalLot += trade.lot;
            positions[positionId].totalFeeBuy += trade.feeBuy;
            positions[positionId].remainingLot += trade.lot; // ✅ Tambah remaining lot
        }
    });
    
    // PHASE 2: Process semua EXITS
    tradingData.forEach(trade => {
        if (trade.positionData && trade.positionData.positionId && trade.positionData.transactionType === 'exit') {
            const positionId = trade.positionData.positionId;
            
            if (!positions[positionId]) {
                console.warn(`❌ Exit transaction for unknown position: ${positionId}`);
                return;
            }
            
            const exitLot = trade.lot;
            
            // Process exit
            positions[positionId].exits.push({
                id: trade.id,
                tanggal: trade.tanggalKeluar,
                lot: exitLot,
                hargaKeluar: trade.hargaKeluar,
                feeSell: trade.feeSell,
                profitLoss: trade.profitLoss
            });
            
            // ✅ KURANGI remainingLot
            positions[positionId].remainingLot -= exitLot;
            
            // Update status berdasarkan remainingLot
            if (positions[positionId].remainingLot <= 0) {
                positions[positionId].status = 'closed';
                positions[positionId].remainingLot = 0; // Pastikan tidak minus
            } else {
                positions[positionId].status = 'open';
            }
        }
    });
    
    // PHASE 3: Calculate average price untuk semua positions
    Object.values(positions).forEach(position => {
        if (position.entries.length > 0) {
            const totalShares = position.entries.reduce((sum, entry) => 
                sum + (entry.lot * 100 * entry.harga), 0);
            const totalLot = position.entries.reduce((sum, entry) => 
                sum + entry.lot, 0);
            
            position.averagePrice = totalLot > 0 ? 
                Math.round(totalShares / (totalLot * 100)) : 0;
            position.totalInvestment = totalShares + position.totalFeeBuy;
        }
    });
    
    console.log('✅ Rebuilt positions:', Object.keys(positions).length);
    
    // ✅ DEBUG DETAIL: Log semua positions dengan info lengkap
    Object.values(positions).forEach(pos => {
        console.log(`📊 Position: ${pos.id} (${pos.kodeSaham})`, {
            status: pos.status,
            totalLot: pos.totalLot,
            remainingLot: pos.remainingLot,
            entries: pos.entries.length,
            exits: pos.exits.length,
            averagePrice: pos.averagePrice
        });
    });
    
    return positions;
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
                    catatan: row[12] || '',
                    positionData: row[13] ? parsePositionData(row[13]) : null
                };
            }).filter(item => item !== null); // Hapus null values
            
            console.log(`✅ Load ${tradingData.length} records berhasil dari Google Sheets`);
            // ⭐ BARU: Rebuild positions dari PositionData
            rebuildPositionsFromData();
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
        // ⭐ UPDATE: Sertakan PositionData dalam data yang disimpan
        const dataToSave = tradingData.map(item => ({
            ...item,
            positionData: serializePositionData(item.positionData)
        }));
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


// ⭐⭐ UPDATE LENGKAP: handleFormSubmit untuk handle Position Trading ⭐⭐
async function handleFormSubmit(event) {
    event.preventDefault();
    
    const isPositionMode = document.getElementById('positionModeToggle').checked;
    const positionType = document.getElementById('positionType').value;
    
    if (isPositionMode) {
        // Mode Position Trading
        await handlePositionFormSubmit(positionType);
    } else {
        // Mode Trading Biasa (existing)
        await handleRegularFormSubmit();
    }
}

// ⭐⭐ BARU: Handle Regular Trading ⭐⭐
async function handleRegularFormSubmit() {
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
    
    // Tampilkan loading dan disable form
    showLoading('Menyimpan data ke Google Sheets...');
    disableForm();
    
    try {
        const feeBuy = parseFloat(document.getElementById('feeBuy').value) || 0;
        const feeSell = parseFloat(document.getElementById('feeSell').value) || 0;
        
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
            catatan: document.getElementById('catatan').value,
            positionData: null
        };
        
        console.log('Final data to save:', formData);
        
        // Tambahkan ke array data
        tradingData.push(formData);
        
        // Simpan ke Google Sheets
        const saveResult = await saveData();
        
        if (!saveResult) {
            tradingData = tradingData.filter(item => item.id !== formData.id);
            hideLoading();
            enableForm();
            return;
        }
        
        // Sembunyikan loading dan enable form
        hideLoading();
        enableForm();
        
        // Tampilkan notifikasi sukses
        alert(`✅ Data trading berhasil disimpan ke Google Sheets!\n\nKode Saham: ${formData.kodeSaham}\nProfit/Loss: ${formatCurrency(formData.profitLoss)}`);
        
        // Reset form
        document.getElementById('tradingForm').reset();
        document.getElementById('lot').value = 1;
        
        // Update tampilan
        updateHomeSummary();
        displayTradingData();
        
    } catch (error) {
        // Sembunyikan loading dan enable form jika error
        hideLoading();
        enableForm();
        console.error('Error in form submission:', error);
        alert('❌ Error menyimpan data: ' + error.message);
    }
}

// ⭐⭐ BARU: Handle Position Trading Submit ⭐⭐
async function handlePositionFormSubmit(positionType) {
    // Validasi berdasarkan jenis transaksi
    const validation = validatePositionForm(positionType);
    if (!validation.isValid) {
        alert(validation.message);
        return;
    }
    
    // Tampilkan loading dan disable form
    showLoading('Menyimpan data posisi ke Google Sheets...');
    disableForm();
    
    try {
        let formData;
        let successMessage;
        
        switch(positionType) {
            case 'new':
                formData = await handleNewPosition();
                successMessage = `✅ Posisi baru berhasil dibuat!\n\nKode Saham: ${formData.kodeSaham}\nLot: ${formData.lot}\nHarga Rata: ${formatCurrency(formData.hargaMasuk)}`;
                break;
                
            case 'add':
                formData = await handleAddToPosition();
                successMessage = `✅ Berhasil menambah ke posisi existing!\n\nKode Saham: ${formData.kodeSaham}\nTotal Lot: ${formData.positionData.currentTotalLot}\nHarga Rata Baru: ${formatCurrency(formData.positionData.currentAvgPrice)}`;
                break;
                
            case 'close':
                formData = await handleClosePosition();
                successMessage = `✅ Posisi berhasil ditutup!\n\nKode Saham: ${formData.kodeSaham}\nProfit/Loss: ${formatCurrency(formData.profitLoss)}`;
                break;
                
            case 'partial':
                formData = await handlePartialExit();
                successMessage = `✅ Partial exit berhasil!\n\nKode Saham: ${formData.kodeSaham}\nLot Terjual: ${formData.lot}\nRealized P/L: ${formatCurrency(formData.profitLoss)}`;
                break;
        }
        
        if (!formData) {
            throw new Error('Gagal membuat data position');
        }
        
        console.log('Final position data to save:', formData);
        
        // Tambahkan ke array data
        tradingData.push(formData);
        
        // Simpan ke Google Sheets
        const saveResult = await saveData();
        
        if (!saveResult) {
            tradingData = tradingData.filter(item => item.id !== formData.id);
            hideLoading();
            enableForm();
            return;
        }
        
        // Sembunyikan loading dan enable form
        hideLoading();
        enableForm();
        
        // Tampilkan notifikasi sukses
        alert(successMessage);
        
        // Reset form dan kembali ke mode biasa
        document.getElementById('tradingForm').reset();
        document.getElementById('lot').value = 1;
        document.getElementById('positionModeToggle').checked = false;
        const toggleEvent = new Event('change');
        document.getElementById('positionModeToggle').dispatchEvent(toggleEvent);
        
        // Update tampilan
        updateHomeSummary();
        displayTradingData();
        
    } catch (error) {
        // Sembunyikan loading dan enable form jika error
        hideLoading();
        enableForm();
        console.error('Error in position form submission:', error);
        alert('❌ Error menyimpan data posisi: ' + error.message);
    }
}

// ⭐⭐ PERBAIKI: validatePositionForm() - FIX VALIDATION FOR PARTIAL EXIT ⭐⭐
function validatePositionForm(positionType) {
    const kodeSaham = document.getElementById('kodeSaham').value;
    
    // ✅ VALIDASI BERDASARKAN JENIS TRANSAKSI
    switch(positionType) {
        case 'new':
        case 'add':
            // Untuk beli, validasi lot biasa
            const lot = parseInt(document.getElementById('lot').value) || 0;
            if (lot < 1) {
                return { isValid: false, message: 'Jumlah LOT minimal 1!' };
            }
            break;
            
        case 'partial':
            // Untuk partial exit, validasi partialLot
            const partialLot = parseInt(document.getElementById('partialLot').value) || 0;
            if (partialLot < 1) {
                return { isValid: false, message: 'Jumlah LOT jual minimal 1!' };
            }
            break;
            
        case 'close':
            // Untuk close position, lot sudah auto-filled (tidak perlu validasi khusus)
            break;
    }
    
    // Validasi umum
    if (!kodeSaham) {
        return { isValid: false, message: 'Kode Saham harus diisi!' };
    }
    
    // Validasi untuk transaksi existing
    if (positionType === 'add' || positionType === 'close' || positionType === 'partial') {
        const selectedPosition = getSelectedPosition();
        if (!selectedPosition) {
            return { isValid: false, message: 'Pilih posisi terlebih dahulu!' };
        }
        
        // Validasi khusus partial exit
        if (positionType === 'partial') {
            const partialLot = parseInt(document.getElementById('partialLot').value) || 0;
            if (partialLot < 1) {
                return { isValid: false, message: 'Jumlah LOT jual minimal 1!' };
            }
            if (partialLot > selectedPosition.remainingLot) {
                return { isValid: false, message: `Jumlah LOT jual tidak boleh lebih dari ${selectedPosition.remainingLot} lot!` };
            }
        }
    }
    
    // Validasi harga berdasarkan jenis transaksi
    const hargaMasuk = parseFloat(document.getElementById('hargaMasuk').value) || 0;
    const hargaKeluar = parseFloat(document.getElementById('hargaKeluar').value) || 0;
    
    switch(positionType) {
        case 'new':
        case 'add':
            if (hargaMasuk <= 0) {
                return { isValid: false, message: 'Harga Beli harus diisi!' };
            }
            break;
            
        case 'close':
        case 'partial':
            if (hargaKeluar <= 0) {
                return { isValid: false, message: 'Harga Jual harus diisi!' };
            }
            break;
    }
    
    return { isValid: true, message: 'Validasi berhasil' };
}

// ⭐⭐ BARU: Handler untuk Buat Posisi Baru ⭐⭐
async function handleNewPosition() {
    const kodeSaham = document.getElementById('kodeSaham').value.toUpperCase();
    const tanggalMasuk = document.getElementById('tanggalMasuk').value;
    const lot = parseInt(document.getElementById('lot').value);
    const hargaMasuk = parseFloat(document.getElementById('hargaMasuk').value);
    const feeBuy = parseFloat(document.getElementById('feeBuy').value) || 0;
    
    const positionId = generatePositionId(kodeSaham);
    
    // Hitung fee otomatis jika kosong
    let finalFeeBuy = feeBuy;
    if (!feeBuy || feeBuy === 0) {
        const autoFee = calculateAutoFee(hargaMasuk, hargaMasuk, lot); // hargaKeluar sama dengan hargaMasuk untuk perhitungan fee
        finalFeeBuy = autoFee.feeBuy;
    }
    
    return {
        id: generateId(),
        tanggalMasuk: tanggalMasuk,
        tanggalKeluar: '', // Kosong untuk entry
        kodeSaham: kodeSaham,
        hargaMasuk: hargaMasuk,
        hargaKeluar: 0, // 0 untuk entry
        lot: lot,
        feeBuy: finalFeeBuy,
        feeSell: 0, // 0 untuk entry
        totalFee: finalFeeBuy,
        profitLoss: 0, // 0 untuk entry
        metodeTrading: document.getElementById('metodeTrading').value || 'Average Down',
        catatan: document.getElementById('catatan').value || `Buat posisi baru - ${kodeSaham}`,
        positionData: {
            positionId: positionId,
            transactionType: 'entry',
            entryType: 'initial',
            currentAvgPrice: hargaMasuk,
            currentTotalLot: lot,
            parentPosition: null
        }
    };
}

// ⭐⭐ BARU: Handler untuk Tambah ke Posisi Existing ⭐⭐
async function handleAddToPosition() {
    const selectedPosition = getSelectedPosition();
    const tanggalMasuk = document.getElementById('tanggalMasuk').value;
    const lot = parseInt(document.getElementById('lot').value);
    const hargaMasuk = parseFloat(document.getElementById('hargaMasuk').value);
    const feeBuy = parseFloat(document.getElementById('feeBuy').value) || 0;
    
    // Hitung average price baru
    const newTotalLot = selectedPosition.totalLot + lot;
    const newTotalValue = (selectedPosition.totalLot * 100 * selectedPosition.averagePrice) + (lot * 100 * hargaMasuk);
    const newAveragePrice = Math.round(newTotalValue / (newTotalLot * 100));
    
    // Hitung fee otomatis jika kosong
    let finalFeeBuy = feeBuy;
    if (!feeBuy || feeBuy === 0) {
        const autoFee = calculateAutoFee(hargaMasuk, hargaMasuk, lot);
        finalFeeBuy = autoFee.feeBuy;
    }
    
    return {
        id: generateId(),
        tanggalMasuk: tanggalMasuk,
        tanggalKeluar: '',
        kodeSaham: selectedPosition.kodeSaham,
        hargaMasuk: hargaMasuk,
        hargaKeluar: 0,
        lot: lot,
        feeBuy: finalFeeBuy,
        feeSell: 0,
        totalFee: finalFeeBuy,
        profitLoss: 0,
        metodeTrading: document.getElementById('metodeTrading').value || 'Average Down',
        catatan: document.getElementById('catatan').value || `Average down - ${selectedPosition.kodeSaham}`,
        positionData: {
            positionId: selectedPosition.id,
            transactionType: 'entry',
            entryType: 'average_down',
            currentAvgPrice: newAveragePrice,
            currentTotalLot: newTotalLot,
            parentPosition: selectedPosition.id
        }
    };
}

// ⭐⭐ BARU: Handler untuk Tutup Posisi ⭐⭐
async function handleClosePosition() {
    const selectedPosition = getSelectedPosition();
    const tanggalKeluar = document.getElementById('tanggalKeluar').value;
    const hargaKeluar = parseFloat(document.getElementById('hargaKeluar').value);
    const feeSell = parseFloat(document.getElementById('feeSell').value) || 0;
    
    // Hitung profit/loss
    const profitLoss = calculatePositionProfitLoss(selectedPosition, hargaKeluar, selectedPosition.totalLot);
    
    // Hitung fee otomatis jika kosong
    let finalFeeSell = feeSell;
    if (!feeSell || feeSell === 0) {
        const totalSellValue = selectedPosition.totalLot * 100 * hargaKeluar;
        finalFeeSell = Math.round(totalSellValue * (0.25132 / 100));
    }
    
    return {
        id: generateId(),
        tanggalMasuk: selectedPosition.entries[0].tanggal, // Tanggal posisi dibuat
        tanggalKeluar: tanggalKeluar,
        kodeSaham: selectedPosition.kodeSaham,
        hargaMasuk: selectedPosition.averagePrice, // Average price
        hargaKeluar: hargaKeluar,
        lot: selectedPosition.totalLot,
        feeBuy: selectedPosition.totalFeeBuy, // Total fee beli dari semua entries
        feeSell: finalFeeSell,
        totalFee: selectedPosition.totalFeeBuy + finalFeeSell,
        profitLoss: profitLoss,
        metodeTrading: document.getElementById('metodeTrading').value || 'Average Down',
        catatan: document.getElementById('catatan').value || `Tutup posisi - ${selectedPosition.kodeSaham}`,
        positionData: {
            positionId: selectedPosition.id,
            transactionType: 'exit',
            exitType: 'full',
            avgPrice: selectedPosition.averagePrice,
            totalLot: selectedPosition.totalLot,
            parentPosition: selectedPosition.id
        }
    };
}

// ⭐⭐ BARU: Handler untuk Partial Exit ⭐⭐
async function handlePartialExit() {
    const selectedPosition = getSelectedPosition();
    const tanggalKeluar = document.getElementById('tanggalKeluar').value;
    const hargaKeluar = parseFloat(document.getElementById('hargaKeluar').value);
    const partialLot = parseInt(document.getElementById('partialLot').value);
    const feeSell = parseFloat(document.getElementById('feeSell').value) || 0;
    
    // Hitung profit/loss untuk partial exit
    const profitLoss = calculatePositionProfitLoss(selectedPosition, hargaKeluar, partialLot);
    
    // Hitung allocated fee buy
    const allocatedFeeBuy = (partialLot / selectedPosition.totalLot) * selectedPosition.totalFeeBuy;
    
    // Hitung fee otomatis jika kosong
    let finalFeeSell = feeSell;
    if (!feeSell || feeSell === 0) {
        const totalSellValue = partialLot * 100 * hargaKeluar;
        finalFeeSell = Math.round(totalSellValue * (0.25132 / 100));
    }
    
    return {
        id: generateId(),
        tanggalMasuk: selectedPosition.entries[0].tanggal,
        tanggalKeluar: tanggalKeluar,
        kodeSaham: selectedPosition.kodeSaham,
        hargaMasuk: selectedPosition.averagePrice,
        hargaKeluar: hargaKeluar,
        lot: partialLot,
        feeBuy: Math.round(allocatedFeeBuy),
        feeSell: finalFeeSell,
        totalFee: Math.round(allocatedFeeBuy) + finalFeeSell,
        profitLoss: profitLoss,
        metodeTrading: document.getElementById('metodeTrading').value || 'Average Down',
        catatan: document.getElementById('catatan').value || `Partial exit ${partialLot} lot - ${selectedPosition.kodeSaham}`,
        positionData: {
            positionId: selectedPosition.id,
            transactionType: 'exit',
            exitType: 'partial',
            avgPrice: selectedPosition.averagePrice,
            totalLot: partialLot,
            remainingLot: selectedPosition.totalLot - partialLot,
            parentPosition: selectedPosition.id
        }
    };
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
        
         // ⭐ BARU: Add position indicator
        const positionInfo = item.positionData ? 
            `<span class="position-badge" title="Position: ${item.positionData.positionId}">📊</span>` : '';
        
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
    // Tampilkan loading dan disable form
    showLoading('Mengupdate data di Google Sheets...');
    disableEditForm();
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
        catatan: document.getElementById('editCatatan').value,
        positionData: null
    };
    
    // Simpan perubahan
    await saveData();
    // Sembunyikan loading dan enable form
        hideLoading();
        enableEditForm();
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
    // Tampilkan loading
    showLoading('Menghapus data dari Google Sheets...');
    
    tradingData = tradingData.filter(item => item.id !== id);
    
    // Simpan perubahan
    await saveData();
    // Sembunyikan loading
        hideLoading();
    
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
     // Line chart - Profit/Loss 7 Hari Terakhir
    const dailyData = {};
    
    // Kelompokkan data per hari
    tradingData.forEach(item => {
        const day = item.tanggalMasuk;
        if (!dailyData[day]) {
            dailyData[day] = 0;
        }
        dailyData[day] += item.profitLoss;
    });
    
    // Urutkan tanggal dari terlama ke terbaru
    const allDays = Object.keys(dailyData).sort();
    const allDailyPL = allDays.map(day => dailyData[day]);
    
    // ⭐⭐ AMBIL 7 HARI TERAKHIR SAJA ⭐⭐
    const last7Days = allDays.slice(-7);
    const last7DaysPL = allDailyPL.slice(-7);
    
    // Format label tanggal agar lebih readable
    const formattedDays = last7Days.map(day => {
        const date = new Date(day);
        return date.toLocaleDateString('id-ID', { 
            day: 'numeric', 
            month: 'short' 
        });
    });
    
    const lineCtx = document.getElementById('lineChart');
    if (!lineCtx) return;
    
    const lineCanvas = lineCtx.getContext('2d');
    if (lineChart) lineChart.destroy();
    
    lineChart = new Chart(lineCanvas, {
        type: 'line',
        data: {
            labels: formattedDays,
            datasets: [{
                label: 'Profit/Loss 7 Hari Terakhir',
                data: last7DaysPL,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#3498db',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Profit/Loss: ${formatCurrency(context.raw)}`;
                        },
                        title: function(context) {
                            // Kembalikan tanggal lengkap di tooltip
                            const fullDate = new Date(last7Days[context[0].dataIndex]);
                            return fullDate.toLocaleDateString('id-ID', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) {
                            return formatCurrency(value).replace('Rp', 'Rp ');
                        },
                        font: {
                            size: 12
                        }
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    title: {
                        display: true,
                        text: 'Profit/Loss'
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    },
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45,
                        font: {
                            size: 11
                        }
                    },
                    title: {
                        display: true,
                        text: 'Tanggal'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
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






















