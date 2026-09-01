// GANTI dengan URL Web App Google Apps Script Anda yang sudah di deploy
const API_URL = 'https://script.google.com/macros/s/AKfycbyTr3UQRM9yiHFeny7EXCCIPNvUD4xZcZ0V3Zjy03_OxzBgpA6eaNNo779_tZcv5oLfig/exec'; 

const api = {
    // Fungsi umum untuk request GET
    async get(action, sheetName) {
        if (!API_URL || API_URL === 'GANTI_DENGAN_URL_WEB_APP_ANDA') {
            console.warn("API URL belum di-set");
            return { status: 'error', message: 'API URL belum diatur' };
        }
        try {
            const url = `${API_URL}?action=${action}${sheetName ? '&sheet=' + sheetName : ''}`;
            const response = await fetch(url);
            return await response.json();
        } catch (error) {
            console.error('API GET Error:', error);
            throw error;
        }
    },

    // Fungsi umum untuk request POST
    async post(action, data) {
        if (!API_URL || API_URL === 'GANTI_DENGAN_URL_WEB_APP_ANDA') {
            console.warn("API URL belum di-set");
            return { status: 'error', message: 'API URL belum diatur' };
        }
        try {
            const response = await fetch(API_URL, {
                method: 'POST',
                // Mode 'no-cors' bisa digunakan jika ada isu CORS, namun responsenya opaq (tidak bisa dibaca javascript).
                // Sangat direkomendasikan deploy Web App dengan akses "Anyone" agar CORS tidak masalah.
                body: JSON.stringify({ action, data }),
                headers: {
                    'Content-Type': 'text/plain;charset=utf-8',
                }
            });
            return await response.json();
        } catch (error) {
            console.error('API POST Error:', error);
            throw error;
        }
    },

    // Mengambil data dashboard
    async fetchDashboard() {
        return this.get('getDashboard');
    },

    // Mengambil list obat
    async fetchMasterObat() {
        return this.get('getData', 'Master_Obat');
    },
    async fetchTransaksi() {
        return this.get('getData', 'Transaksi');
    },
    async fetchBatchObat() {
        return this.get('getData', 'Batch_Obat');
    },

    // Menambah master obat
    async addMasterObat(data) {
        return this.post('addMaster', data);
    },
    async editMasterObat(data) {
        return this.post('editMaster', data);
    },
    async deleteMasterObat(id) {
        return this.post('deleteMaster', { id_obat: id });
    },

    // Menambah transaksi barang masuk / keluar
    async addTransaction(data) {
        return this.post('addTransaction', data);
    },

    // Upload image ke Google Drive
    async uploadImage(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
                const base64Str = reader.result.split(',')[1];
                const data = {
                    filename: file.name,
                    mimetype: file.type,
                    base64: base64Str
                };
                try {
                    const res = await this.post('uploadImage', data);
                    resolve(res);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });
    }
};
