document.addEventListener('DOMContentLoaded', () => {
    // --- Authentication & RBAC Logic ---
    const users = {
        'admin': { role: 'admin', name: 'Super Admin', pwd: '123' },
        'apoteker': { role: 'apoteker', name: 'apt. Afrida Noor Hani, S.Farm', pwd: '123' },
        'petugas': { role: 'petugas', name: 'Petugas Apotek', pwd: '123' },
        'pemilik': { role: 'pemilik', name: 'Pemilik Apotek', pwd: '123' }
    };

    let currentUser = null;

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
        }
    });

    document.getElementById('btn-logout').addEventListener('click', () => {
        localStorage.removeItem('apotek_user');
        window.location.reload();
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

            // Update title
            pageTitle.innerText = e.currentTarget.innerText;
            
            // Refresh Data based on view
            if(targetId === 'dashboard') loadDashboard();
            if(targetId === 'master') loadMasterObat();
        });
    });

    // --- Modal Logic ---
    const modalMaster = document.getElementById('modal-master');
    const modalEditMaster = document.getElementById('modal-edit-master');
    const btnAddMaster = document.getElementById('btn-add-master');
    const closeBtns = document.querySelectorAll('.close-modal');

    btnAddMaster.addEventListener('click', () => {
        modalMaster.classList.add('active');
    });

    closeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            modalMaster.classList.remove('active');
            if(modalEditMaster) modalEditMaster.classList.remove('active');
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target === modalMaster) modalMaster.classList.remove('active');
        if (modalEditMaster && e.target === modalEditMaster) modalEditMaster.classList.remove('active');
    });

    // --- Data Loading Functions (Mocked initially if API_URL not set) ---
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
                masterData.forEach(item => {
                    const currStock = stockMap[item.id_obat] || 0;
                    const stokMin = parseInt(item.stok_minimum) || 0;
                    if(currStock <= stokMin) {
                        lowStockCount++;
                    }
                });

                document.getElementById('stat-total-obat').innerText = masterData.length;
                document.getElementById('stat-total-batch').innerText = batchData.length;
                document.getElementById('stat-low-stock').innerText = lowStockCount;

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
                        expireTbody.innerHTML = '<tr><td colspan="4" class="text-center">Tidak ada obat yang mendekati masa kedaluwarsa.</td></tr>';
                    } else {
                        expiringBatches.forEach(b => {
                            const tr = document.createElement('tr');
                            const statusBadge = b.is_expired ? 
                                '<span style="background:var(--danger); color:white; padding:2px 8px; border-radius:4px; font-size:0.8rem;">Sudah Kedaluwarsa</span>' : 
                                '<span style="background:#f59e0b; color:white; padding:2px 8px; border-radius:4px; font-size:0.8rem;">Segera Kedaluwarsa</span>';
                            
                            tr.innerHTML = `
                                <td>${b.nama_obat}</td>
                                <td>${b.no_batch}</td>
                                <td>${b.tanggal_expired}</td>
                                <td>${statusBadge}</td>
                            `;
                            expireTbody.appendChild(tr);
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
        }
    }

    async function loadMasterObat() {
        try {
            const tbody = document.querySelector('#table-master tbody');
            const userRole = currentUser ? currentUser.role : null;
            const colSpan = userRole === 'admin' ? 7 : 6;
            tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">Memuat data...</td></tr>`;
            
            const [masterRes, transRes] = await Promise.all([
                api.fetchMasterObat(),
                api.fetchTransaksi()
            ]);
            
            if (masterRes.status === 'success' && (transRes.status === 'success' || transRes.status === 'error')) {
                const masterData = masterRes.data || [];
                const transData = transRes.data || []; // Sometimes trans is empty and returns error in my simple api wrapper if not array, just fallback
                
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
                    tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center">Belum ada data obat</td></tr>`;
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
                                <button class="btn btn-primary btn-sm btn-edit" style="padding: 2px 8px; font-size: 0.8rem;" data-id="${item.id_obat}" data-nama="${item.nama_obat}" data-kategori="${item.kategori}" data-satuan="${item.satuan}" data-stokmin="${item.stok_minimum}">✏️</button>
                                <button class="btn btn-danger btn-sm btn-delete" style="padding: 2px 8px; font-size: 0.8rem; margin-left: 5px;" data-id="${item.id_obat}">🗑️</button>
                            </td>
                        `;
                    }

                    tr.innerHTML = `
                        <td>${item.id_obat}</td>
                        <td>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <span>${item.nama_obat}</span>
                                ${item.url_foto ? `<a href="${item.url_foto}" target="_blank" style="text-decoration: none; font-size: 0.85rem; padding: 2px 6px; background: var(--light); border-radius: 4px; color: var(--primary);">🖼️ Lihat</a>` : ''}
                            </div>
                        </td>
                        <td>${item.kategori}</td>
                        <td>${item.satuan}</td>
                        <td>${item.stok_minimum}</td>
                        <td style="color: ${isLow ? 'var(--danger)' : 'inherit'}; font-weight: 600;">${currStock}</td>
                        ${aksiCol}
                    `;
                    tbody.appendChild(tr);
                    optionsHtml += `<option value="${item.id_obat}">${item.nama_obat} (Stok: ${currStock})</option>`;
                });
                
                outSelect.innerHTML = optionsHtml;
                inSelect.innerHTML = optionsHtml;
            } else {
                tbody.innerHTML = `<tr><td colspan="${colSpan}" class="text-center text-danger">Gagal memuat data</td></tr>`;
            }
        } catch (error) {
            console.error(error);
        }
    }

    // --- Table Actions (Edit & Delete) ---
    document.querySelector('#table-master tbody').addEventListener('click', async (e) => {
        const btnDelete = e.target.closest('.btn-delete');
        if (btnDelete) {
            const id = btnDelete.getAttribute('data-id');
            if (confirm(`Apakah Anda yakin ingin menghapus data Obat ID: ${id}?\n\nPERINGATAN: Tindakan ini tidak dapat dibatalkan.`)) {
                btnDelete.innerText = '⏳';
                try {
                    const res = await api.deleteMasterObat(id);
                    if (res && res.status === 'success') {
                        alert('Obat berhasil dihapus!');
                        loadMasterObat();
                        loadDashboard();
                    } else {
                        alert('Gagal menghapus obat: ' + (res ? res.message : 'Unknown error'));
                    }
                } catch (err) {
                    alert('Terjadi kesalahan saat menghapus data.');
                }
                btnDelete.innerText = '🗑️';
            }
            return;
        }

        const btnEdit = e.target.closest('.btn-edit');
        if (btnEdit) {
            document.getElementById('edit-id-obat').value = btnEdit.getAttribute('data-id');
            document.getElementById('edit-nama').value = btnEdit.getAttribute('data-nama');
            document.getElementById('edit-kategori').value = btnEdit.getAttribute('data-kategori');
            document.getElementById('edit-satuan').value = btnEdit.getAttribute('data-satuan');
            document.getElementById('edit-stokmin').value = btnEdit.getAttribute('data-stokmin');
            document.getElementById('modal-edit-master').classList.add('active');
            return;
        }
    });

    // --- Form Submissions ---

    // Master Obat Submit
    document.getElementById('form-master').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-master');
        btn.innerText = 'Menyimpan...';
        btn.disabled = true;

        const data = {
            nama_obat: document.getElementById('m-nama').value,
            kategori: document.getElementById('m-kategori').value,
            satuan: document.getElementById('m-satuan').value,
            stok_minimum: document.getElementById('m-stokmin').value,
            url_foto: ''
        };

        const fileInput = document.getElementById('m-foto');
        try {
            if(fileInput.files.length > 0) {
                btn.innerText = 'Mengupload Foto...';
                const uploadRes = await api.uploadImage(fileInput.files[0]);
                if(uploadRes.status === 'success') {
                    data.url_foto = uploadRes.url;
                }
            }

            btn.innerText = 'Menyimpan Data...';
            const res = await api.addMasterObat(data);
            if(res.status === 'success') {
                alert('Master Obat berhasil ditambahkan!');
                modalMaster.classList.remove('active');
                e.target.reset();
                loadMasterObat(); 
            }
        } catch (err) {
            alert('Terjadi kesalahan saat menyimpan data.');
        } finally {
            btn.innerText = 'Simpan Master Obat';
            btn.disabled = false;
        }
    });

    // Edit Master Obat Submit
    document.getElementById('form-edit-master').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-edit-master');
        btn.innerText = 'Menyimpan...';
        btn.disabled = true;

        const data = {
            id_obat: document.getElementById('edit-id-obat').value,
            nama_obat: document.getElementById('edit-nama').value,
            kategori: document.getElementById('edit-kategori').value,
            satuan: document.getElementById('edit-satuan').value,
            stok_minimum: document.getElementById('edit-stokmin').value
        };

        const fileInput = document.getElementById('edit-foto');
        try {
            if(fileInput.files.length > 0) {
                btn.innerText = 'Mengupload Foto...';
                const uploadRes = await api.uploadImage(fileInput.files[0]);
                if(uploadRes.status === 'success') {
                    data.url_foto = uploadRes.url;
                }
            }

            btn.innerText = 'Menyimpan Perubahan...';
            const res = await api.editMasterObat(data);
            if(res.status === 'success') {
                alert('Master Obat berhasil diubah!');
                document.getElementById('modal-edit-master').classList.remove('active');
                e.target.reset();
                loadMasterObat(); 
            } else {
                alert('Gagal: ' + res.message);
            }
        } catch (err) {
            alert('Terjadi kesalahan saat mengedit data.');
        } finally {
            btn.innerText = 'Simpan Perubahan';
            btn.disabled = false;
        }
    });

    // Inbound Submit
    document.getElementById('form-inbound').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-inbound');
        btn.innerText = 'Menyimpan...';
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
                alert('Barang masuk berhasil dicatat!');
                e.target.reset();
                loadMasterObat();
                loadDashboard();
            }
        } catch (err) {
            alert('Gagal mencatat transaksi.');
        } finally {
            btn.innerText = 'Simpan Transaksi';
            btn.disabled = false;
        }
    });

    // Outbound Submit
    document.getElementById('form-outbound').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-submit-outbound');
        btn.innerText = 'Memproses...';
        btn.disabled = true;

        const data = {
            tipe: 'Keluar',
            id_obat: document.getElementById('out-obat').value,
            jumlah: parseInt(document.getElementById('out-jumlah').value),
            keterangan: document.getElementById('out-ket').value
        };

        try {
            const res = await api.addTransaction(data);
            if(res.status === 'success') {
                alert('Barang keluar berhasil dicatat!');
                e.target.reset();
                loadMasterObat();
                loadDashboard();
            }
        } catch (err) {
            alert('Gagal memproses transaksi.');
        } finally {
            btn.innerText = 'Proses Barang Keluar';
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

    // Initial Start
    setTimeout(() => {
        checkAuth();
    }, 100);
});
