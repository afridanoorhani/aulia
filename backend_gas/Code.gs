const SHEET_ID = '1dKXDao2Wv4jj2m9jt1FhU8q2ujyDghnUBHHDUGU1sxs'; // Ganti dengan ID Spreadsheet Anda
const FOLDER_ID = '1F5-3sc_IfO6jHnSfHkISo3J7fffokZwh'; // Folder Foto Obat

function doGet(e) {
  try {
    const action = e.parameter.action;
    const sheetName = e.parameter.sheet;
    
    if (action === 'getData' && sheetName) {
      const data = getSheetData(sheetName);
      return createJsonResponse({ status: 'success', data: data });
    }
    
    if (action === 'getDashboard') {
      const dashboardData = getDashboardData();
      return createJsonResponse({ status: 'success', data: dashboardData });
    }

    return createJsonResponse({ status: 'error', message: 'Invalid action or sheet name' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    if (action === 'addMaster') {
      return addMasterObat(body.data);
    } else if (action === 'editMaster') {
      return editMasterObat(body.data);
    } else if (action === 'deleteMaster') {
      return deleteMasterObat(body.data);
    } else if (action === 'addTransaction') {
      return addTransaction(body.data);
    } else if (action === 'uploadImage') {
      return uploadImage(body.data);
    }

    return createJsonResponse({ status: 'error', message: 'Invalid action' });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: error.toString() });
  }
}

function doOptions(e) {
  return HtmlService.createHtmlOutput('OK');
}

function createJsonResponse(responseObject) {
  return ContentService.createTextOutput(JSON.stringify(responseObject))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // Hanya header
  
  const headers = data[0];
  const rows = data.slice(1);
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = row[index];
    });
    return obj;
  });
}

function getDashboardData() {
  const masterData = getSheetData('Master_Obat');
  const batchData = getSheetData('Batch_Obat');
  
  const totalObat = masterData.length;
  
  return {
    totalItems: totalObat,
    totalBatches: batchData.length,
    lowStockCount: 0
  };
}

function addMasterObat(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Master_Obat');
  
  const id_obat = 'OBT-' + new Date().getTime();
  sheet.appendRow([
    id_obat,
    data.nama_obat || '',
    data.kategori || '',
    data.golongan || '',
    data.komposisi || '',
    data.kekuatan || '',
    data.bentuk_sediaan || '',
    data.satuan_besar || '',
    data.satuan_kecil || '',
    data.stok_minimum || 0,
    data.url_foto || ''
  ]);
  
  return createJsonResponse({ status: 'success', message: 'Master obat ditambahkan', id_obat: id_obat });
}

function editMasterObat(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Master_Obat');
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.id_obat) {
      const rowNum = i + 1;
      
      const nama = data.nama_obat !== undefined ? data.nama_obat : values[i][1];
      const kategori = data.kategori !== undefined ? data.kategori : values[i][2];
      const golongan = data.golongan !== undefined ? data.golongan : values[i][3];
      const komposisi = data.komposisi !== undefined ? data.komposisi : values[i][4];
      const kekuatan = data.kekuatan !== undefined ? data.kekuatan : values[i][5];
      const bentuk_sediaan = data.bentuk_sediaan !== undefined ? data.bentuk_sediaan : values[i][6];
      const satuan_besar = data.satuan_besar !== undefined ? data.satuan_besar : values[i][7];
      const satuan_kecil = data.satuan_kecil !== undefined ? data.satuan_kecil : values[i][8];
      const stok_min = data.stok_minimum !== undefined ? data.stok_minimum : values[i][9];
      const url_foto = data.url_foto !== undefined ? data.url_foto : values[i][10];
      
      sheet.getRange(rowNum, 2, 1, 10).setValues([[nama, kategori, golongan, komposisi, kekuatan, bentuk_sediaan, satuan_besar, satuan_kecil, stok_min, url_foto]]);
      return createJsonResponse({ status: 'success', message: 'Master obat berhasil diubah' });
    }
  }
  return createJsonResponse({ status: 'error', message: 'Obat tidak ditemukan' });
}

function deleteMasterObat(data) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName('Master_Obat');
  const values = sheet.getDataRange().getValues();
  
  for (let i = 1; i < values.length; i++) {
    if (values[i][0] === data.id_obat) {
      sheet.deleteRow(i + 1);
      return createJsonResponse({ status: 'success', message: 'Master obat berhasil dihapus' });
    }
  }
  return createJsonResponse({ status: 'error', message: 'Obat tidak ditemukan' });
}

function addTransaction(data) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheetByName('Transaksi');
  
  const id_trans = 'TRX-' + new Date().getTime();
  const timestamp = new Date().toISOString();
  
  sheet.appendRow([
    id_trans,
    timestamp,
    data.tipe, 
    data.id_obat,
    data.id_batch || '',
    data.jumlah,
    data.keterangan || ''
  ]);
  
  if (data.tipe === 'Masuk' && data.no_batch) {
    const batchSheet = ss.getSheetByName('Batch_Obat');
    const id_batch = 'BCH-' + new Date().getTime();
    batchSheet.appendRow([
      id_batch,
      data.id_obat,
      data.no_batch,
      data.tanggal_expired || ''
    ]);
  }
  
  return createJsonResponse({ status: 'success', message: 'Transaksi berhasil dicatat' });
}

function uploadImage(data) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    const contentType = data.mimetype; 
    const byteCharacters = Utilities.base64Decode(data.base64);
    const blob = Utilities.newBlob(byteCharacters, contentType, data.filename);
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return createJsonResponse({ 
      status: 'success', 
      url: file.getUrl(), 
      fileId: file.getId() 
    });
  } catch (error) {
    return createJsonResponse({ status: 'error', message: 'Gagal upload: ' + error.toString() });
  }
}
