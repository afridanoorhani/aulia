document.addEventListener('DOMContentLoaded', () => {
    // --- Toast Notification System ---
    function showToast(type, title, message, duration = 4000) {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };

        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
            <div class="toast-body">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
            <div class="toast-progress"></div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    // --- Custom Confirm Dialog ---
    function showConfirm(title, message, onConfirm, type = 'warning') {
        const overlay = document.createElement('div');
        overlay.className = 'confirm-dialog-overlay';

        const icons = {
            warning: '⚠️',
            danger: '🗑️'
        };

        overlay.innerHTML = `
            <div class="confirm-dialog">
                <div class="confirm-dialog-icon ${type}">${icons[type] || '⚠️'}</div>
                <h3>${title}</h3>
                <p>${message}</p>
                <div class="confirm-dialog-buttons">
                    <button class="btn btn-secondary" id="confirm-cancel">Batal</button>
                    <button class="btn ${type === 'danger' ? 'btn-danger' : 'btn-primary'}" id="confirm-ok">Ya, Lanjutkan</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        overlay.querySelector('#confirm-cancel').addEventListener('click', () => {
            overlay.remove();
        });

        overlay.querySelector('#confirm-ok').addEventListener('click', () => {
            overlay.remove();
            onConfirm();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // --- Authentication & RBAC Logic ---
    const users = {
        'admin': { role: 'admin', name: 'Super Admin', pwd: '123' },
        'apoteker': { role: 'apoteker', name: 'apt. Afrida Noor Hani, S.Farm', pwd: '123' },
        'petugas': { role: 'petugas', name: 'Petugas Apotek', pwd: '123' },
        'pemilik': { role: 'pemilik', name: 'Pemilik Apotek', pwd: '123' }
    };

    let currentUser = null;
    let globalBatchData = [];
    let globalTransData = [];

    function checkAuth() {
        const session = localStorage.getItem('apotek_user');
        if (session) {
            currentUser = JSON.parse(session);
            showApp();
        } else {
            document.getElementById('login-screen').classList.remove('hidden');
            document.getElementById('app-container').style.display = 'none';
        }
    }

    function showApp() {
        document.getElementById('login-screen').classList.add('hidden');
        document.getElementById('app-container').style.display = 'flex';
        
        // Update user profile display
        document.getElementById('user-name-display').innerText = currentUser.name;
        
        let roleDisplay = currentUser.role;
        if(roleDisplay === 'admin') roleDisplay = 'Super Admin';
        else if(roleDisplay === 'apoteker') roleDisplay = 'Apoteker Pengawas';
        else if(roleDisplay === 'petugas') roleDisplay = 'Staf / Petugas';
        else if(roleDisplay === 'pemilik') roleDisplay = 'Pemilik';
        
        document.getElementById('user-role-display').innerText = roleDisplay;
        document.getElementById('user-avatar-display').innerText = currentUser.name.charAt(0);

        applyRolePermissions();
        
        // Load Data
        loadDashboard();
        loadMasterObat();

        // Welcome toast
        showToast('success', 'Selamat Datang!', `Login sebagai ${currentUser.name}`, 3000);
    }

    function applyRolePermissions() {
        const role = currentUser.role;
        const roleElements = document.querySelectorAll('[data-roles]');
        
        roleElements.forEach(el => {
            const allowedRoles = el.getAttribute('data-roles').split(',');
            if (allowedRoles.includes(role)) {
                el.classList.remove('hidden-role');
            } else {
                el.classList.add('hidden-role');
            }
        });

        // Click the first available nav item to set active state correctly
        const firstNav = document.querySelector('.nav-item:not(.hidden-role)');
        if(firstNav) firstNav.click();
    }

    document.getElementById('form-login').addEventListener('submit', (e) => {
        e.preventDefault();
        const u = document.getElementById('login-username').value.trim().toLowerCase();
        const p = document.getElementById('login-password').value;
        const err = document.getElementById('login-error');

        if (users[u] && users[u].pwd === p) {
            err.style.display = 'none';
            localStorage.setItem('apotek_user', JSON.stringify(users[u]));
            currentUser = users[u];
            showApp();
        } else {
            err.style.display = 'block';
            // Shake animation
            const loginCard = document.querySelector('.login-card');
            loginCard.style.animation = 'none';
            loginCard.offsetHeight; // trigger reflow
            loginCard.style.animation = 'shake 0.5s ease';
        }
    });

    // Add shake animation
    const shakeStyle = document.createElement('style');
    shakeStyle.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
            20%, 40%, 60%, 80% { transform: translateX(5px); }
        }
    `;
    document.head.appendChild(shakeStyle);

    document.getElementById('btn-logout').addEventListener('click', () => {
        showConfirm('Logout', 'Apakah Anda yakin ingin keluar dari sistem?', () => {
            localStorage.removeItem('apotek_user');
            window.location.reload();
        });
    });

    // --- Navigation Logic ---
    const navItems = document.querySelectorAll('.nav-item');
    const pageSections = document.querySelectorAll('.page-section');
    const pageTitle = document.getElementById('page-title');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            // Remove active from all nav
            navItems.forEach(nav => nav.classList.remove('active'));
            // Add active to clicked nav
            e.currentTarget.classList.add('active');
            
            // Switch content
            const targetId = e.currentTarget.getAttribute('data-target');
            pageSections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(targetId).classList.add('active');

            // Update title - get text content without SVG
            const navText = e.currentTarget.textContent.trim();
            pageTitle.innerText = navText;
            
            // Refresh Data based on view
            if(targetId === 'dashboard') loadDashboard();
            if(targetId === 'master') loadMasterObat();
        });
    });

    const modalMaster = document.getElementById('modal-master');
    const modalEditMaster = document.getElementById('modal-edit-master');
    const modalBatch = document.getElementById('modal-batch');
    const modalEditBatch = document.getElementById('modal-edit-batch');
    const btnAddMaster = document.getElementById('btn-add-master');
    const closeBtns = document.querySelectorAll('.close-modal');

    btnAddMaster.addEventListener('click', () => {
        modalMaster.classList.add('active');
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalMaster.classList.remove('active');
            if(modalEditMaster) modalEditMaster.classList.remove('active');
            if(modalBatch) modalBatch.classList.remove('active');
            if(modalEditBatch) modalEditBatch.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === modalMaster) modalMaster.classList.remove('active');
        if (modalEditMaster && e.target === modalEditMaster) modalEditMaster.classList.remove('active');
        if (modalBatch && e.target === modalBatch) modalBatch.classList.remove('active');
        if (modalEditBatch && e.target === modalEditBatch) modalEditBatch.classList.remove('active');
    });

    // --- Data Loading Functions ---
    async function loadDashboard() {
        try {
            const [masterRes, transRes, batchRes] = await Promise.all([
                api.fetchMasterObat(),
                api.fetchTransaksi(),
                api.fetchBatchObat()
            ]);
            
            if (masterRes.status === 'success') {
                const masterData = masterRes.data || [];
                const transData = (transRes && transRes.data) || [];
                const batchData = (batchRes && batchRes.data) || [];
                
                // Calculate stock map
                const stockMap = {};
                transData.forEach(t => {
                    const idObat = t.id_obat;
                    const qty = parseInt(t.jumlah) || 0;
                    if(!stockMap[idObat]) stockMap[idObat] = 0;
                    if(t.tipe === 'Masuk') stockMap[idObat] += qty;
                    else if(t.tipe === 'Keluar') stockMap[idObat] -= qty;
                });

                let lowStockCount = 0;
                const lowStockTbody = document.querySelector('#table-lowstock tbody');
                let lowStockHtml = '';

                masterData.forEach(item => {
                    const currStock = stockMap[item.id_obat] || 0;
                    const stokMin = parseInt(item.stok_minimum) || 0;
                    if(currStock <= stokMin) {
                        lowStockCount++;
                        const statusClass = currStock === 0 ? 'badge-danger' : 'badge-warning';
                        const statusText = currStock === 0 ? 'Habis' : 'Stok Kritis';
                        lowStockHtml += `
                            <tr>
                                <td>${item.nama_obat}</td>
                                <td><strong style="color:var(--danger);">${currStock}</strong></td>
                                <td>${stokMin}</td>
                                <td><span class="badge ${statusClass}">${statusText}</span></td>
                            </tr>
                        `;
                    }
                });

                // Animate stat counters
                animateCounter('stat-total-obat', masterData.length);
                animateCounter('stat-total-batch', batchData.length);
                animateCounter('stat-low-stock', lowStockCount);

                if (lowStockTbody) {
                    lowStockTbody.innerHTML = lowStockHtml || '<tr><td colspan="4" class="text-center" style="padding: 32px; color: var(--gray);">✅ Semua stok aman.</td></tr>';
                }

                // Render Riwayat Transaksi
                const riwayatTbody = document.querySelector('#table-riwayat tbody');
                if (riwayatTbody) {
                    if (transData.length === 0) {
                        riwayatTbody.innerHTML = '<tr><td colspan="7" class="text-center" style="padding: 32px; color: var(--gray);">Belum ada riwayat transaksi</td></tr>';
                    } else {
                        const reversedTrans = [...transData].reverse();
                        let riwayatHtml = '';
                        reversedTrans.forEach(t => {
                            const obat = masterData.find(m => m.id_obat === t.id_obat);
                            const namaObat = obat ? obat.nama_obat : t.id_obat;
                            const badge = t.tipe === 'Masuk' ? 
                                '<span class="badge badge-success">↓ Masuk</span>' : 
                                '<span class="badge badge-danger">↑ Keluar</span>';
                            
                            let timeStr = t.timestamp;
                            if(timeStr) {
                                try {
                                    const d = new Date(timeStr);
                                    timeStr = d.toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
                                } catch(e) {}
                            }

                            const batch = batchData.find(b => b.id_batch === t.id_batch);
                            const noBatch = batch ? batch.no_batch : '-';
                            let edStr = '-';
                            if (batch && batch.tanggal_expired) {
                                edStr = new Date(batch.tanggal_expired).toLocaleDateString('id-ID');
                            }

                            riwayatHtml += `
                                <tr>
                                    <td>${timeStr || '-'}</td>
                                    <td>${badge}</td>
                                    <td>${namaObat}</td>
                                    <td>${noBatch}</td>
                                    <td>${edStr}</td>
                                    <td><strong>${t.jumlah}</strong></td>
                                    <td>${t.keterangan || '-'}</td>
                                </tr>
                            `;
                        });
                        riwayatTbody.innerHTML = riwayatHtml;
                    }
                }

                // Hitung Obat Kadaluwarsa
                const expireTbody = document.querySelector('#table-expire tbody');
                if (expireTbody) {
                    expireTbody.innerHTML = '';
                    const today = new Date();
                    const ninetyDaysLater = new Date();
                    ninetyDaysLater.setDate(today.getDate() + 90);
                    
                    let expiringBatches = [];

                    batchData.forEach(b => {
                        if(b.tanggal_expired) {
                            const expDate = new Date(b.tanggal_expired);
                            if(expDate <= ninetyDaysLater) {
                                const obat = masterData.find(m => m.id_obat === b.id_obat);
                                expiringBatches.push({
                                    nama_obat: obat ? obat.nama_obat : b.id_obat,
                                    no_batch: b.no_batch,
                                    tanggal_expired: b.tanggal_expired,
                                    is_expired: expDate < today,
                                    expDate: expDate
                                });
                            }
                        }
                    });

                    // Sort by date closest to expiry
                    expiringBatches.sort((a, b) => a.expDate - b.expDate);

                    if(expiringBatches.length === 0) {
                        expireTbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 32px; color: var(--gray);">✅ Tidak ada obat yang mendekati masa kedaluwarsa.</td></tr>';
                    } else {
                        expiringBatches.forEach(b => {
                            const tr = document.createElement('tr');
                            const statusBadge = b.is_expired ? 
                                '<span class="badge badge-danger">Sudah Kedaluwarsa</span>' : 
                                '<span class="badge badge-warning">Segera Kedaluwarsa</span>';
                            
                            const formattedDate = b.expDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
                            
                            tr.innerHTML = `
                                <td>${b.nama_obat}</td>
                                <td>${b.no_batch}</td>
                                <td>${formattedDate}</td>
                                <td>${statusBadge}</td>
                            `;
                            expireTbody.appendChild(tr);
                        });
                    }
                }

                // Daftar Semua Batch Aktif
                const allBatchesTbody = document.querySelector('#table-all-batches tbody');
                if (allBatchesTbody) {
                    allBatchesTbody.innerHTML = '';
                    if (batchData.length === 0) {
                        allBatchesTbody.innerHTML = '<tr><td colspan="4" class="text-center" style="padding: 32px; color: var(--gray);">Belum ada data batch obat.</td></tr>';
                    } else {
                        // calculate stock per batch
                        const batchStockMap = {};
                        transData.forEach(t => {
                            if(t.id_batch) {
                                const qty = parseInt(t.jumlah) || 0;
                                if(!batchStockMap[t.id_batch]) batchStockMap[t.id_batch] = 0;
                                if(t.tipe === 'Masuk') batchStockMap[t.id_batch] += qty;
                                else if(t.tipe === 'Keluar') batchStockMap[t.id_batch] -= qty;
                            }
                        });

                        batchData.forEach(b => {
                            const obat = masterData.find(m => m.id_obat === b.id_obat);
                            const namaObat = obat ? obat.nama_obat : b.id_obat;
                            const stock = batchStockMap[b.id_batch] || 0;
                            const edStr = b.tanggal_expired ? new Date(b.tanggal_expired).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';

                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td>${namaObat}</td>
                                <td>${b.no_batch}</td>
                                <td>${edStr}</td>
                                <td><strong style="color: ${stock <= 0 ? 'var(--danger)' : 'var(--dark)'}">${stock}</strong></td>
                            `;
                            allBatchesTbody.appendChild(tr);
                        });
                    }
                }
            } else {
                document.getElementById('stat-total-obat').innerText = '-';
                document.getElementById('stat-total-batch').innerText = '-';
                document.getElementById('stat-low-stock').innerText = '-';
            }
        } catch (e) {
            console.log("Error loading dashboard", e);
            showToast('error', 'Gagal Memuat', 'Tidak dapat memuat data dashboard. Periksa koneksi Anda.');
        }
    }

    // --- Animated Counter ---
    function animateCounter(elementId, targetValue) {
        const el = document.getElementById(elementId);
        if (!el) return;
        
        const start = parseInt(el.innerText) || 0;
        const duration = 600;
        const startTime = performance.now();

        function update(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            const current = Math.round(start + (targetValue - start) * eased);
            
            el.innerText = current;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }

        requestAnimationFrame(update);
    }

    async function loadMasterObat() {
        try {
            const tbody = document.querySelector('#table-master tbody');
            const userRole = currentUser ? currentUser.role : null;
            const colSpan = userRole === 'admin' ? 7 : 6;
            tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center" style="padding: 32px; color: var(--gray);">
                <div class="spinner" style="margin: 0 auto 12px; width: 32px; height: 32px;"></div>
                Memuat data...
            </td></tr>`;
            
            const [masterRes, transRes, batchRes] = await Promise.all([
                api.fetchMasterObat(),
                api.fetchTransaksi(),
                api.fetchBatchObat()
            ]);
            
            if (masterRes.status === 'success' && (transRes.status === 'success' || transRes.status === 'error')) {
                const masterData = masterRes.data || [];
                const transData = transRes.data || [];
                globalBatchData = (batchRes && batchRes.data) ? batchRes.data : [];
                globalTransData = transData;
                
                // Kalkulasi stok saat ini berdasarkan history transaksi Masuk & Keluar
                const stockMap = {};
                transData.forEach(t => {
                    const idObat = t.id_obat;
                    const qty = parseInt(t.jumlah) || 0;
                    if(!stockMap[idObat]) stockMap[idObat] = 0;
                    
                    if(t.tipe === 'Masuk') stockMap[idObat] += qty;
                    else if(t.tipe === 'Keluar') stockMap[idObat] -= qty;
                });

                tbody.innerHTML = '';
                const outSelect = document.getElementById('out-obat');
                const inSelect = document.getElementById('in-obat');
                let optionsHtml = '<option value="">-- Pilih Obat --</option>';

                if (masterData.length === 0) {
                    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center" style="padding: 32px; color: var(--gray);">Belum ada data obat</td></tr>`;
                    outSelect.innerHTML = optionsHtml;
                    inSelect.innerHTML = optionsHtml;
                    return;
                }

                masterData.forEach(item => {
                    const tr = document.createElement('tr');
                    const currStock = stockMap[item.id_obat] || 0;
                    const stokMin = parseInt(item.stok_minimum) || 0;
                    const isLow = currStock <= stokMin;

                    let aksiCol = '';
                    if (userRole === 'admin') {
                        aksiCol = `
                            <td>
                                <div style="display: flex; gap: 6px; flex-wrap: nowrap;">
                                    <button class="btn btn-primary btn-sm btn-edit" style="padding: 6px 10px; font-size: 0.78rem; min-width: auto; width: auto;" 
                                        data-id="${item.id_obat}" 
                                        data-nama="${item.nama_obat}" 
                                        data-kategori="${item.kategori}" 
                                        data-golongan="${item.golongan || ''}" 
                                        data-komposisi="${item.komposisi || ''}" 
                                        data-kekuatan="${item.kekuatan || ''}" 
                                        data-bentuk="${item.bentuk_sediaan || ''}" 
                                        data-besar="${item.satuan_besar || ''}" 
                                        data-kecil="${item.satuan_kecil || ''}" 
                                        data-stokmin="${item.stok_minimum}">✏️</button>
                                    <button class="btn btn-sm btn-batch" style="padding: 6px 10px; font-size: 0.78rem; min-width: auto; width: auto; background: var(--info-light); color: var(--info); border: 1px solid transparent; font-weight: 600;" 
                                        data-id="${item.id_obat}" data-nama="${item.nama_obat}">Batch</button>
                                    <button class="btn btn-danger btn-sm btn-delete" style="padding: 6px 10px; font-size: 0.78rem; min-width: auto; width: auto;" data-id="${item.id_obat}">🗑️</button>
                                </div>
                            </td>
                        `;
                    }

                    const stockBadge = isLow 
                        ? `<span class="badge badge-danger">${currStock}</span>` 
                        : `<strong style="color: var(--success);">${currStock}</strong>`;

                    tr.innerHTML = `
                        <td style="font-family: monospace; font-size: 0.82rem; color: var(--gray);">${item.id_obat}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <span style="font-weight: 600;">${item.nama_obat}</span>
                                ${item.url_foto ? `<a href="${item.url_foto}" target="_blank" style="text-decoration: none; font-size: 0.8rem; padding: 2px 8px; background: var(--primary-50); border-radius: 6px; color: var(--primary); font-weight: 500;">🖼️ Foto</a>` : ''}
                            </div>
                        </td>
                        <td><span class="badge badge-info">${item.kategori}</span></td>
                        <td>${item.satuan_besar || '-'} / ${item.satuan_kecil || '-'}</td>
                        <td>${item.stok_minimum}</td>
                        <td>${stockBadge}</td>
                        ${aksiCol}
                    `;
                    tbody.appendChild(tr);
                    optionsHtml += `<option value="${item.id_obat}">${item.nama_obat} (Stok: ${currStock})</option>`;
                });
                
                outSelect.innerHTML = optionsHtml;
                inSelect.innerHTML = optionsHtml;

                if (window.jQuery && window.jQuery.fn.select2) {
                    $('#in-obat').select2();
                    $('#out-obat').select2();
                }

                // Trigger change to populate batches if any
                $('#out-obat').trigger('change');
            } else {
                tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center" style="padding: 32px; color: var(--danger);">Gagal memuat data</td></tr>`;
            }
        } catch (error) {
            console.error(error);
            showToast('error', 'Error', 'Gagal memuat data Master Obat.');
        }
    }

    // --- Table Actions (Edit & Delete) ---
    document.querySelector('#table-master tbody').addEventListener('click', async (e) => {
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            const id = btnDelete.getAttribute('data-id');
            showConfirm(
                'Hapus Obat',
                `Apakah Anda yakin ingin menghapus data Obat ID: <strong>${id}</strong>? Tindakan ini tidak dapat dibatalkan.`,
                async () => {
                    btnDelete.innerText = '⏳';
                    try {
                        const res = await api.deleteMasterObat(id);
                        if (res && res.status === 'success') {
                            showToast('success', 'Berhasil', 'Obat berhasil dihapus dari database.');
                            loadMasterObat();
                            loadDashboard();
                        } else {
                            showToast('error', 'Gagal', 'Gagal menghapus obat: ' + (res ? res.message : 'Unknown error'));
                        }
                    } catch (err) {
                        showToast('error', 'Error', 'Terjadi kesalahan saat menghapus data.');
                    }
                    btnDelete.innerText = '🗑️';
                },
                'danger'
            );
            return;
        }

        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            document.getElementById('edit-id-obat').value = btnEdit.getAttribute('data-id');
            document.getElementById('edit-nama').value = btnEdit.getAttribute('data-nama');
            document.getElementById('edit-kategori').value = btnEdit.getAttribute('data-kategori');
            document.getElementById('edit-golongan').value = btnEdit.getAttribute('data-golongan');
            document.getElementById('edit-komposisi').value = btnEdit.getAttribute('data-komposisi');
            document.getElementById('edit-kekuatan').value = btnEdit.getAttribute('data-kekuatan');
            document.getElementById('edit-bentuk').value = btnEdit.getAttribute('data-bentuk');
            document.getElementById('edit-besar').value = btnEdit.getAttribute('data-besar');
            document.getElementById('edit-kecil').value = btnEdit.getAttribute('data-kecil');
            document.getElementById('edit-stokmin').value = btnEdit.getAttribute('data-stokmin');
            document.getElementById('modal-edit-master').classList.add('active');
            return;
        }

        const btnBatch = e.target.closest('.btn-batch');
        if (btnBatch) {
            const id_obat = btnBatch.getAttribute('data-id');
            const nama_obat = btnBatch.getAttribute('data-nama');
            document.getElementById('batch-nama-obat').innerText = nama_obat;
            
            const tbody = document.querySelector('#table-batch-list tbody');
            tbody.innerHTML = '';
            const batches = globalBatchData.filter(b => b.id_obat === id_obat);
            
            if(batches.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="padding: 24px; color: var(--gray);">Belum ada batch</td></tr>';
            } else {
                batches.forEach(b => {
                    const edStr = b.tanggal_expired ? new Date(b.tanggal_expired).toLocaleDateString('id-ID') : '-';
                    tbody.innerHTML += `
                        <tr>
                            <td style="font-family: monospace;">${b.no_batch}</td>
                            <td>${edStr}</td>
                            <td>
                                <button class="btn btn-primary btn-sm btn-edit-batch" style="padding: 5px 12px; font-size: 0.78rem; min-width: auto; width: auto;" 
                                    data-id="${b.id_batch}" data-idobat="${b.id_obat}" data-no="${b.no_batch}" data-ed="${b.tanggal_expired}">✏️ Edit</button>
                            </td>
                        </tr>
                    `;
                });
            }
            document.getElementById('modal-batch').classList.add('active');
            return;
        }
    });

    // --- Modal Batch Edit Logic ---
    const tableBatchList = document.querySelector('#table-batch-list tbody');
    if(tableBatchList) {
        tableBatchList.addEventListener('click', (e) => {
            const btnEditBatch = e.target.closest('.btn-edit-batch');
            if (btnEditBatch) {
                document.getElementById('edit-batch-id').value = btnEditBatch.getAttribute('data-id');
                document.getElementById('edit-batch-id-obat').value = btnEditBatch.getAttribute('data-idobat');
                document.getElementById('edit-batch-no').value = btnEditBatch.getAttribute('data-no');
                
                let ed = btnEditBatch.getAttribute('data-ed');
                if(ed) {
                    try {
                        const d = new Date(ed);
                        const yyyy = d.getFullYear();
                        const mm = String(d.getMonth() + 1).padStart(2, '0');
                        const dd = String(d.getDate()).padStart(2, '0');
                        ed = `${yyyy}-${mm}-${dd}`;
                    } catch(err) {}
                }
                document.getElementById('edit-batch-ed').value = ed || '';
                document.getElementById('modal-edit-batch').classList.add('active');
            }
        });
    }

    document.getElementById('form-edit-batch').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-edit-batch');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Menyimpan...';
        btn.disabled = true;

        const data = {
            id_batch: document.getElementById('edit-batch-id').value,
            no_batch: document.getElementById('edit-batch-no').value,
            tanggal_expired: document.getElementById('edit-batch-ed').value
        };

        try {
            const res = await api.editBatchObat(data);
            if(res.status === 'success') {
                showToast('success', 'Berhasil', 'Batch berhasil diubah!');
                document.getElementById('modal-edit-batch').classList.remove('active');
                
                // Refresh data
                await loadDashboard();
                await loadMasterObat();

                // refresh modal batch list
                const id_obat = document.getElementById('edit-batch-id-obat').value;
                const tbody = document.querySelector('#table-batch-list tbody');
                tbody.innerHTML = '';
                const batches = globalBatchData.filter(b => b.id_obat === id_obat);
                batches.forEach(b => {
                    const edStr = b.tanggal_expired ? new Date(b.tanggal_expired).toLocaleDateString('id-ID') : '-';
                    tbody.innerHTML += `
                        <tr>
                            <td style="font-family: monospace;">${b.no_batch}</td>
                            <td>${edStr}</td>
                            <td>
                                <button class="btn btn-primary btn-sm btn-edit-batch" style="padding: 5px 12px; font-size: 0.78rem; min-width: auto; width: auto;" 
                                    data-id="${b.id_batch}" data-idobat="${b.id_obat}" data-no="${b.no_batch}" data-ed="${b.tanggal_expired}">✏️ Edit</button>
                            </td>
                        </tr>
                    `;
                });
            } else {
                showToast('error', 'Gagal', 'Gagal mengubah batch: ' + res.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Terjadi kesalahan saat mengedit batch.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // --- Outbound Obat Change (Populate Batch) ---
    if(window.jQuery) {
        $('#out-obat').on('change', function() {
            const id_obat = $(this).val();
            const batchSelect = document.getElementById('out-batch');
            batchSelect.innerHTML = '<option value="">-- Pilih Batch --</option>';
            if(!id_obat) return;

            const batches = globalBatchData.filter(b => b.id_obat === id_obat);
            batches.forEach(b => {
                const edStr = b.tanggal_expired ? new Date(b.tanggal_expired).toLocaleDateString('id-ID') : '-';
                batchSelect.innerHTML += `<option value="${b.id_batch}">${b.no_batch} (ED: ${edStr})</option>`;
            });
            if (window.jQuery.fn.select2) {
                $('#out-batch').select2();
            }
        });
    }

    // --- Search Master Obat ---
    const searchMaster = document.getElementById('search-master');
    if (searchMaster) {
        searchMaster.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#table-master tbody tr');
            rows.forEach(row => {
                if(row.children.length === 1) return; // Skip loading/empty rows
                const text = row.innerText.toLowerCase();
                if(text.includes(term)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // --- Search Batch di Dashboard ---
    const searchBatchDashboard = document.getElementById('search-batch-dashboard');
    if (searchBatchDashboard) {
        searchBatchDashboard.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#table-all-batches tbody tr');
            rows.forEach(row => {
                if(row.children.length === 1) return; 
                const text = row.innerText.toLowerCase();
                if(text.includes(term)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // --- Search Low Stock di Dashboard ---
    const searchLowstockDashboard = document.getElementById('search-lowstock-dashboard');
    if (searchLowstockDashboard) {
        searchLowstockDashboard.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#table-lowstock tbody tr');
            rows.forEach(row => {
                if(row.children.length === 1) return; 
                const text = row.innerText.toLowerCase();
                if(text.includes(term)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // --- Search Riwayat Transaksi ---
    const searchRiwayat = document.getElementById('search-riwayat');
    if (searchRiwayat) {
        searchRiwayat.addEventListener('input', (e) => {
            const term = e.target.value.toLowerCase();
            const rows = document.querySelectorAll('#table-riwayat tbody tr');
            rows.forEach(row => {
                if(row.children.length === 1) return; 
                const text = row.innerText.toLowerCase();
                if(text.includes(term)) {
                    row.style.display = '';
                } else {
                    row.style.display = 'none';
                }
            });
        });
    }

    // --- Form Submissions ---

    // Master Obat Submit
    document.getElementById('form-master').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-master');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Menyimpan...';
        btn.disabled = true;

        const data = {
            nama_obat: document.getElementById('m-nama').value,
            kategori: document.getElementById('m-kategori').value,
            golongan: document.getElementById('m-golongan').value,
            komposisi: document.getElementById('m-komposisi').value,
            kekuatan: document.getElementById('m-kekuatan').value,
            bentuk_sediaan: document.getElementById('m-bentuk').value,
            satuan_besar: document.getElementById('m-besar').value,
            satuan_kecil: document.getElementById('m-kecil').value,
            stok_minimum: document.getElementById('m-stokmin').value,
            url_foto: ''
        };

        const fileInput = document.getElementById('m-foto');
        try {
            if(fileInput.files.length > 0) {
                btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Mengupload Foto...';
                const uploadRes = await api.uploadImage(fileInput.files[0]);
                if(uploadRes.status === 'success') {
                    data.url_foto = uploadRes.url;
                }
            }

            btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Menyimpan Data...';
            const res = await api.addMasterObat(data);
            if(res.status === 'success') {
                showToast('success', 'Berhasil!', 'Master Obat berhasil ditambahkan ke database.');
                modalMaster.classList.remove('active');
                e.target.reset();
                loadMasterObat(); 
            }
        } catch (err) {
            showToast('error', 'Error', 'Terjadi kesalahan saat menyimpan data.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // Edit Master Obat Submit
    document.getElementById('form-edit-master').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-edit-master');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Menyimpan...';
        btn.disabled = true;

        const data = {
            id_obat: document.getElementById('edit-id-obat').value,
            nama_obat: document.getElementById('edit-nama').value,
            kategori: document.getElementById('edit-kategori').value,
            golongan: document.getElementById('edit-golongan').value,
            komposisi: document.getElementById('edit-komposisi').value,
            kekuatan: document.getElementById('edit-kekuatan').value,
            bentuk_sediaan: document.getElementById('edit-bentuk').value,
            satuan_besar: document.getElementById('edit-besar').value,
            satuan_kecil: document.getElementById('edit-kecil').value,
            stok_minimum: document.getElementById('edit-stokmin').value
        };

        const fileInput = document.getElementById('edit-foto');
        try {
            if(fileInput.files.length > 0) {
                btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Mengupload Foto...';
                const uploadRes = await api.uploadImage(fileInput.files[0]);
                if(uploadRes.status === 'success') {
                    data.url_foto = uploadRes.url;
                }
            }

            btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Menyimpan...';
            const res = await api.editMasterObat(data);
            if(res.status === 'success') {
                showToast('success', 'Berhasil!', 'Master Obat berhasil diubah.');
                document.getElementById('modal-edit-master').classList.remove('active');
                e.target.reset();
                loadMasterObat(); 
            } else {
                showToast('error', 'Gagal', 'Gagal mengubah data: ' + res.message);
            }
        } catch (err) {
            showToast('error', 'Error', 'Terjadi kesalahan saat mengedit data.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // Inbound Submit
    document.getElementById('form-inbound').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-inbound');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Menyimpan...';
        btn.disabled = true;

        const data = {
            tipe: 'Masuk',
            id_obat: document.getElementById('in-obat').value,
            no_batch: document.getElementById('in-batch').value,
            tanggal_expired: document.getElementById('in-expired').value,
            jumlah: parseInt(document.getElementById('in-jumlah').value),
            keterangan: document.getElementById('in-ket').value
        };

        try {
            const res = await api.addTransaction(data);
            if(res.status === 'success') {
                showToast('success', 'Berhasil!', 'Barang masuk berhasil dicatat.');
                e.target.reset();
                loadMasterObat();
                loadDashboard();
            }
        } catch (err) {
            showToast('error', 'Gagal', 'Gagal mencatat transaksi.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // Outbound Submit
    document.getElementById('form-outbound').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-outbound');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner" style="width: 18px; height: 18px; margin: 0 auto;"></div> Memproses...';
        btn.disabled = true;

        const data = {
            tipe: 'Keluar',
            id_obat: document.getElementById('out-obat').value,
            id_batch: document.getElementById('out-batch').value,
            jumlah: parseInt(document.getElementById('out-jumlah').value),
            keterangan: document.getElementById('out-ket').value
        };

        try {
            const res = await api.addTransaction(data);
            if(res.status === 'success') {
                showToast('success', 'Berhasil!', 'Barang keluar berhasil dicatat.');
                e.target.reset();
                loadMasterObat();
                loadDashboard();
            }
        } catch (err) {
            showToast('error', 'Gagal', 'Gagal memproses transaksi.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    });

    // --- Mobile Sidebar Logic ---
    const btnMobileMenu = document.getElementById('btn-mobile-menu');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebar-overlay');

    if (btnMobileMenu && sidebar && sidebarOverlay) {
        btnMobileMenu.addEventListener('click', () => {
            sidebar.classList.add('show');
            sidebarOverlay.classList.add('active');
        });

        sidebarOverlay.addEventListener('click', () => {
            sidebar.classList.remove('show');
            sidebarOverlay.classList.remove('active');
        });

        // Close sidebar on mobile when a nav item is clicked
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                if(window.innerWidth <= 768) {
                    sidebar.classList.remove('show');
                    sidebarOverlay.classList.remove('active');
                }
            });
        });
    }

    // --- Keyboard Shortcuts ---
    document.addEventListener('keydown', (e) => {
        // Escape to close modals
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal.active').forEach(m => m.classList.remove('active'));
            document.querySelectorAll('.confirm-dialog-overlay').forEach(d => d.remove());
        }
    });

    // Initial Start
    setTimeout(() => {
        checkAuth();
    }, 100);
});
