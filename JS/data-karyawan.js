/* ==============================
   Data Karyawan — JavaScript Logic
   FIREBASE EDITION
   ============================== */

// Avatar colors
const avatarColors = [
    '#2563eb', '#7c3aed', '#0891b2', '#059669', '#d97706',
    '#dc2626', '#4f46e5', '#0d9488', '#c026d3', '#0369a1',
    '#9333ea', '#e11d48', '#0284c7', '#15803d', '#b45309',
    '#7e22ce', '#be185d', '#0e7490', '#166534', '#92400e'
];

// ========== State ==========
let currentPage = 1;
const rowsPerPage = 8;
let karyawanData = [];
let filteredData = [];
let editingId = null;

// ========== Auth Check & User Profile ==========
function checkAuth() {
    const raw = localStorage.getItem('loggedInUser');
    if (!raw) {
        window.location.href = 'halaman Login.html';
        return null;
    }
    try {
        const user = JSON.parse(raw);
        if (user.role === 'staf') {
            window.location.href = 'staf-absensi.html';
            return null;
        }
        const nameEl = document.getElementById('adminName');
        const roleEl = document.getElementById('adminRole');
        const avatarEl = document.getElementById('adminAvatar');
        if (nameEl) nameEl.textContent = user.nama || 'Administrator';
        if (roleEl) roleEl.textContent = (user.role === 'admin' ? 'Administrator' : user.role);
        if (avatarEl) {
            const initials = (user.nama || 'AD').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
            avatarEl.textContent = initials;
        }
        return user;
    } catch (e) {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'halaman Login.html';
        return null;
    }
}

// ========== Init ==========
document.addEventListener('DOMContentLoaded', async () => {
    if (!checkAuth()) return;
    lucide.createIcons();
    await loadKaryawan();
    initSearch();
    initFilters();
    initModal();
    initSidebar();
    initProfileDropdown();
});

// ========== Load from Firebase ==========
async function loadKaryawan() {
    try {
        karyawanData = await DB_getAllKaryawan();
        filteredData = [...karyawanData];
        renderTable();
    } catch (e) {
        console.error('Failed to load karyawan:', e);
        showToast('Gagal memuat data karyawan. Periksa koneksi internet.', 'error');
    }
}

// ========== Search ==========
function initSearch() {
    const searchInput = document.getElementById('searchKaryawan');
    if (!searchInput) return;

    searchInput.addEventListener('input', () => {
        currentPage = 1;
        applyFilters();
    });
}

// ========== Filters ==========
function initFilters() {
    const depFilter = document.getElementById('filterDepartemen');
    const jabFilter = document.getElementById('filterJabatan');

    if (depFilter) {
        depFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFilters();
        });
    }

    if (jabFilter) {
        jabFilter.addEventListener('change', () => {
            currentPage = 1;
            applyFilters();
        });
    }
}

function applyFilters() {
    const searchVal = (document.getElementById('searchKaryawan')?.value || '').toLowerCase();
    const depVal = document.getElementById('filterDepartemen')?.value || '';
    const jabVal = document.getElementById('filterJabatan')?.value || '';

    filteredData = karyawanData.filter(k => {
        const matchSearch = !searchVal ||
            k.nama.toLowerCase().includes(searchVal) ||
            k.id.toLowerCase().includes(searchVal) ||
            k.telp.includes(searchVal);

        const matchDep = !depVal || k.departemen === depVal;
        const matchJab = !jabVal || k.jabatan === jabVal;

        return matchSearch && matchDep && matchJab;
    });

    renderTable();
}

// ========== Render Table ==========
function renderTable() {
    const tbody = document.getElementById('karyawanTableBody');
    const countEl = document.getElementById('resultCount');
    if (!tbody) return;

    // Calculate pagination
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / rowsPerPage) || 1;
    if (currentPage > totalPages) currentPage = totalPages;

    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = Math.min(startIdx + rowsPerPage, totalItems);
    const pageData = filteredData.slice(startIdx, endIdx);

    // Update count
    if (countEl) {
        countEl.innerHTML = `Menampilkan <strong>${totalItems}</strong> karyawan`;
    }

    // Empty state
    if (pageData.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9">
                    <div class="empty-state">
                        <i data-lucide="search-x"></i>
                        <p>Tidak ada data karyawan ditemukan</p>
                    </div>
                </td>
            </tr>
        `;
        lucide.createIcons();
        renderPagination(totalPages);
        return;
    }

    // Render rows
    tbody.innerHTML = pageData.map((k, i) => {
        const globalIdx = startIdx + i;
        const initials = k.nama.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
        const bgColor = avatarColors[globalIdx % avatarColors.length];

        const statusBadge = k.status === 'Aktif'
            ? `<span class="badge-aktif"><i data-lucide="check-circle-2"></i> Aktif</span>`
            : `<span class="badge-nonaktif"><i data-lucide="x-circle"></i> Nonaktif</span>`;

        return `
            <tr>
                <td><span class="id-cell">${k.id}</span></td>
                <td>
                    <div class="employee-photo" style="background:${bgColor}">${initials}</div>
                </td>
                <td><strong>${k.nama}</strong></td>
                <td>${k.jabatan}</td>
                <td>${k.departemen}</td>
                <td>${k.telp}</td>
                <td>${statusBadge}</td>
                <td>
                    <button class="btn-qr-badge" onclick="showEmployeeQR('${k.id}')" title="Lihat Kartu QR Absensi">
                        <i data-lucide="qr-code"></i>
                        <span>Lihat QR</span>
                    </button>
                </td>
                <td>
                    <div class="action-btns">
                        <button class="action-btn detail" title="Detail" onclick="viewDetail('${k.id}')">
                            <i data-lucide="eye"></i>
                        </button>
                        <button class="action-btn edit" title="Edit" onclick="editKaryawan('${k.id}')">
                            <i data-lucide="pencil"></i>
                        </button>
                        <button class="action-btn delete" title="Hapus" onclick="deleteKaryawan('${k.id}')">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');

    lucide.createIcons();
    renderPagination(totalPages);
}

// ========== Pagination ==========
function renderPagination(totalPages) {
    const paginationInfo = document.getElementById('paginationInfo');
    const paginationBtns = document.getElementById('paginationBtns');
    if (!paginationBtns) return;

    const totalItems = filteredData.length;
    const start = totalItems === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
    const end = Math.min(currentPage * rowsPerPage, totalItems);

    if (paginationInfo) {
        paginationInfo.innerHTML = `Menampilkan <strong>${start}</strong> - <strong>${end}</strong> dari <strong>${totalItems}</strong> data`;
    }

    let btnsHTML = `
        <button class="page-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i data-lucide="chevron-left"></i>
        </button>
    `;

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    for (let p = startPage; p <= endPage; p++) {
        btnsHTML += `
            <button class="page-btn ${p === currentPage ? 'active' : ''}" onclick="goToPage(${p})">${p}</button>
        `;
    }

    btnsHTML += `
        <button class="page-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i data-lucide="chevron-right"></i>
        </button>
    `;

    paginationBtns.innerHTML = btnsHTML;
    lucide.createIcons();
}

function goToPage(page) {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage) || 1;
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    renderTable();
    document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ========== Modal ==========
function initModal() {
    const overlay = document.getElementById('modalOverlay');
    const closeBtn = document.getElementById('modalCloseBtn');
    const cancelBtn = document.getElementById('modalCancelBtn');
    const form = document.getElementById('addKaryawanForm');

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);

    if (overlay) {
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    if (form) {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            handleSaveKaryawan();
        });
    }
}

function openModal() {
    editingId = null;
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = 'Tambah Karyawan Baru';
    document.getElementById('addKaryawanForm')?.reset();
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal() {
    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
        document.getElementById('addKaryawanForm')?.reset();
        editingId = null;
    }
}

async function handleSaveKaryawan() {
    const nama = document.getElementById('inputNama')?.value.trim();
    const email = document.getElementById('inputEmail')?.value.trim();
    const telp = document.getElementById('inputTelp')?.value.trim();
    const jabatan = document.getElementById('inputJabatan')?.value;
    const departemen = document.getElementById('inputDepartemen')?.value;
    const alamat = document.getElementById('inputAlamat')?.value.trim() || '';
    const status = document.getElementById('inputStatus')?.value || 'Aktif';

    if (!nama || !telp || !jabatan || !departemen) {
        alert('Mohon lengkapi field yang wajib diisi (Nama, Telepon, Jabatan, Departemen)!');
        return;
    }

    const finalEmail = email || `${nama.toLowerCase().replace(/[^a-z0-9]/g, '.')}@zrancorp.com`;

    try {
        if (editingId) {
            // Update existing
            await DB_updateKaryawan(editingId, {
                nama, jabatan, departemen, telp, email: finalEmail, alamat, status
            });
            showToast(`Data karyawan "${nama}" berhasil diperbarui!`);
        } else {
            // Generate safe max ID
            const allK = await DB_getAllKaryawan();
            const maxIdNum = allK.reduce((max, curr) => {
                const num = parseInt((curr.id || '').replace('KRY-', ''), 10) || 0;
                return num > max ? num : max;
            }, 0);
            const newId = `KRY-${String(maxIdNum + 1).padStart(3, '0')}`;

            await DB_addKaryawan({
                id: newId,
                nama,
                jabatan,
                departemen,
                telp,
                email: finalEmail,
                alamat,
                status
            });
            showToast(`Karyawan "${nama}" (${newId}) berhasil ditambahkan!`);
        }

        closeModal();
        await loadKaryawan();
    } catch (e) {
        console.error('Save error:', e);
        showToast('Gagal menyimpan data karyawan.', 'error');
    }
}

// ========== Action Handlers ==========
function viewDetail(id) {
    const k = karyawanData.find(x => x.id === id);
    if (!k) return;
    alert(
        `📋 DETAIL KARYAWAN\n` +
        `----------------------------------------\n` +
        `ID: ${k.id}\n` +
        `Nama: ${k.nama}\n` +
        `Jabatan: ${k.jabatan}\n` +
        `Departemen: ${k.departemen}\n` +
        `Telepon: ${k.telp}\n` +
        `Email: ${k.email || '-'}\n` +
        `Alamat: ${k.alamat || '-'}\n` +
        `Status: ${k.status}\n` +
        `Kode QR Absen: ZRAN-EMP:${k.id}`
    );
}

function editKaryawan(id) {
    const k = karyawanData.find(x => x.id === id);
    if (!k) return;

    editingId = id;
    const titleEl = document.getElementById('modalTitle');
    if (titleEl) titleEl.textContent = 'Edit Data Karyawan';

    // Pre-fill form
    const inputNama = document.getElementById('inputNama');
    const inputEmail = document.getElementById('inputEmail');
    const inputTelp = document.getElementById('inputTelp');
    const inputJabatan = document.getElementById('inputJabatan');
    const inputDepartemen = document.getElementById('inputDepartemen');
    const inputStatus = document.getElementById('inputStatus');
    const inputAlamat = document.getElementById('inputAlamat');

    if (inputNama) inputNama.value = k.nama || '';
    if (inputEmail) inputEmail.value = k.email || '';
    if (inputTelp) inputTelp.value = k.telp || '';
    if (inputJabatan) inputJabatan.value = k.jabatan || '';
    if (inputDepartemen) inputDepartemen.value = k.departemen || '';
    if (inputStatus) inputStatus.value = k.status || 'Aktif';
    if (inputAlamat) inputAlamat.value = k.alamat || '';

    const overlay = document.getElementById('modalOverlay');
    if (overlay) {
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

async function deleteKaryawan(id) {
    const k = karyawanData.find(x => x.id === id);
    if (!k) return;
    if (confirm(`Hapus karyawan "${k.nama}" (${k.id})?\n\nTindakan ini tidak dapat dibatalkan.`)) {
        try {
            await DB_deleteKaryawan(id);
            showToast(`Karyawan "${k.nama}" berhasil dihapus.`);
            await loadKaryawan();
        } catch (e) {
            console.error('Delete error:', e);
            showToast('Gagal menghapus data.', 'error');
        }
    }
}

// ========== Fitur QR Code Karyawan ==========
function showEmployeeQR(id) {
    const k = karyawanData.find(x => x.id === id);
    if (!k) return;

    const nameEl = document.getElementById('qrModalName');
    const idEl = document.getElementById('qrModalId');
    const deptEl = document.getElementById('qrModalDept');
    const codeEl = document.getElementById('qrModalCode');
    const container = document.getElementById('employeeQrContainer');

    if (nameEl) nameEl.textContent = k.nama;
    if (idEl) idEl.textContent = k.id;
    if (deptEl) deptEl.textContent = `${k.departemen} • ${k.jabatan}`;

    // Format kode QR unik per karyawan yang didukung oleh scanner staf
    const qrData = `ZRAN-EMP:${k.id}`;
    if (codeEl) codeEl.textContent = qrData;

    if (container) {
        container.innerHTML = '';
        if (typeof QRCode !== 'undefined') {
            new QRCode(container, {
                text: qrData,
                width: 160,
                height: 160,
                colorDark: "#1e293b",
                colorLight: "#ffffff",
                correctLevel: QRCode.CorrectLevel.H
            });
        } else {
            container.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrData)}" alt="QR Code" style="width:160px;height:160px;">`;
        }
    }

    const overlay = document.getElementById('qrModalOverlay');
    if (overlay) {
        overlay.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
    lucide.createIcons();
}

function closeQRModal() {
    const overlay = document.getElementById('qrModalOverlay');
    if (overlay) {
        overlay.classList.remove('show');
        document.body.style.overflow = '';
    }
}

function printEmployeeQR() {
    const printArea = document.getElementById('qrPrintArea');
    if (!printArea) return;

    const printWin = window.open('', '', 'width=650,height=650');
    printWin.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Cetak QR Code Karyawan - Zran Corporation</title>
            <style>
                body { font-family: 'Segoe UI', Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 95vh; margin: 0; background: #f8fafc; }
                .card { width: 320px; border: 2px solid #1e3a5f; border-radius: 16px; padding: 24px; text-align: center; background: #fff; box-shadow: 0 4px 15px rgba(0,0,0,0.08); }
                img { max-width: 100%; }
                h3 { margin: 10px 0 2px 0; color: #1e293b; font-size: 16px; }
                p { margin: 2px 0; font-size: 12px; color: #64748b; }
                code { background: #eff6ff; padding: 4px 8px; border-radius: 6px; font-weight: bold; font-size: 11px; color: #2563eb; }
            </style>
        </head>
        <body>
            <div class="card">
                ${printArea.innerHTML}
            </div>
            <script>
                window.onload = function() { window.print(); window.close(); };
            <\/script>
        </body>
        </html>
    `);
    printWin.document.close();
}

// ========== Toast Notification ==========
function showToast(message, type = 'success') {
    document.querySelectorAll('.toast-notif').forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = 'toast-notif';
    const iconColor = type === 'success' ? '#16a34a' : '#dc2626';
    const iconName = type === 'success' ? 'check-circle-2' : 'alert-triangle';
    toast.innerHTML = `
        <i data-lucide="${iconName}" style="width:18px;height:18px;color:${iconColor};flex-shrink:0;"></i>
        <span>${message}</span>
    `;
    toast.style.cssText = `
        position: fixed; bottom: 24px; right: 24px; z-index: 200;
        background: white; border: 1px solid #e2e8f0; border-radius: 12px;
        padding: 14px 20px; display: flex; align-items: center; gap: 10px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.12); font-size: 14px; color: #1e293b;
        font-family: 'Inter', sans-serif; animation: modalSlideUp 0.3s ease;
        max-width: 400px;
    `;

    document.body.appendChild(toast);
    lucide.createIcons();
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ========== Sidebar Toggle ==========
function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const hamburger = document.getElementById('hamburgerBtn');

    if (hamburger) {
        hamburger.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('show');
        });
    }

    if (overlay) {
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('show');
        });
    }
}

// ========== Profile Dropdown ==========
function initProfileDropdown() {
    const btn = document.getElementById('profileBtn');
    const dropdown = document.getElementById('profileDropdown');
    if (!btn || !dropdown) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        btn.classList.toggle('open');
        dropdown.classList.toggle('show');
    });

    document.addEventListener('click', () => {
        btn.classList.remove('open');
        dropdown.classList.remove('show');
    });
}

// ========== Logout ==========
function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        localStorage.removeItem('loggedInUser');
        window.location.href = 'halaman Login.html';
    }
}
