/*
 * API de encuestas para Google Apps Script
 *
 * Pasos de implementación:
 * 1. Reemplazar SPREADSHEET_ID por el ID del Google Spreadsheet.
 * 2. Ejecutar configurarSpreadsheet() una vez desde el editor.
 * 3. Autorizar los permisos solicitados.
 * 4. Implementar como aplicación web, ejecutando como propietario,
 *    con acceso para cualquiera.
 * 5. Crear una nueva versión cada vez que se actualice este código.
 * 6. Ejecutar limpiarCaches() después de editar manualmente Instituciones,
 *    si se necesita ver el cambio inmediatamente.
 * 7. Ejecutar instalarTriggerCambios() una vez para invalidar la caché
 *    automáticamente ante ediciones, altas o eliminaciones en el Spreadsheet.
 */

const SPREADSHEET_ID = '1oYyGLu8wokMcWKfB4NjMl04ub2BG8BXSMFA_Se4UtaE';
const SHEET_NAME = 'Cargas';
const USERS_SHEET_NAME = 'Usuarios';
const INSTITUTIONS_SHEET_NAME = 'Instituciones';
const STATS_CACHE_KEY = 'encuestas_stats_v1';
const INSTITUTIONS_CACHE_KEY = 'encuestas_institutions_v1';
const CACHE_SECONDS = 300;

const AREAS = [
  'Tecnología y creatividad digital',
  'Seguridad laboral y medio ambiente',
  'Imágenes médicas y diagnóstico',
  'Comunicación, diseño y redes sociales',
  'Gastronomía y cocina'
];

const CARRERAS = [
  'Análisis de Datos e Inteligencia Artificial',
  'Laboratorio de Análisis Clínicos',
  'Prácticas Deportivas',
  'Marketing',
  'Comunicación Social para el Desarrollo',
  'Diseño, Imagen y Sonido',
  'Radio y Televisión',
  'Tiempo Libre y Recreación',
  'Gastronomía'
];

const VALORA = [
  'Rápida salida laboral',
  'Posibilidad de seguir estudiando después',
  'Formación práctica desde el primer año',
  'Tecnología y equipamiento moderno',
  'Trabajo en equipo y creatividad',
  'Ayudar a las personas / trabajar en salud',
  'Flexibilidad para trabajar y estudiar'
];

const HEADERS = [
  'Fecha',
  'Institución',
  'Nombre',
  'Apellido',
  ...AREAS,
  ...CARRERAS,
  ...VALORA,
  'Contacto',
  'Jornada informativa'
];

function doGet(e) {
  try {
    const action = e && e.parameter && e.parameter.action
      ? e.parameter.action
      : 'health';

    if (action === 'surveys') {
      const rows = leerEncuestas();
      return respuesta({
        ok: true,
        headers: HEADERS,
        rows,
        rowNumbers: rows.map((row, index) => index + 2)
      });
    }

    if (action === 'stats') {
      return respuesta({
        ok: true,
        stats: leerEstadisticasCacheadas()
      });
    }

    if (action === 'institutions') {
      return respuesta({
        ok: true,
        institutions: leerInstituciones()
      });
    }

    return respuesta({
      ok: true,
      message: 'API Encuestas funcionando',
      actions: ['health', 'surveys', 'stats', 'institutions']
    });
  } catch (error) {
    return respuesta({ ok: false, error: error.toString() });
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error('El request no contiene un body JSON.');
    }

    const data = JSON.parse(e.postData.contents);

    if (data.action === 'login') {
      return autenticarUsuario(data);
    }

    if (data.action === 'delete') {
      return eliminarEncuesta(data);
    }

    validarEncuesta(data);

    const selected = data.selected || {};

    const row = [
      new Date(),
      data.institution,
      data.name,
      data.surname,
      ...AREAS.map(item => selected[item] ? 'X' : ''),
      ...CARRERAS.map(item => selected[item] ? 'X' : ''),
      ...VALORA.map(item => selected[item] ? 'X' : ''),
      data.contact || '',
      data.visit || ''
    ];

    guardarEncuesta(row);
    CacheService.getScriptCache().remove(STATS_CACHE_KEY);

    return respuesta({ ok: true, message: 'Encuesta guardada correctamente' });
  } catch (error) {
    return respuesta({ ok: false, error: error.toString() });
  }
}

function autenticarUsuario(data) {
  const username = String(data.username || '').trim().toLowerCase();
  const password = String(data.password || '');
  if (!username || !password) return respuesta({ ok: false, error: 'Usuario y contraseña son obligatorios.' });

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const usersSheet = ss.getSheetByName(USERS_SHEET_NAME);
  if (!usersSheet || usersSheet.getLastRow() < 2) {
    return respuesta({ ok: false, error: 'La hoja Usuarios no está configurada.' });
  }

  const rows = usersSheet.getDataRange().getDisplayValues();
  const headers = rows.shift().map(header => String(header).trim().toLowerCase());
  const usernameIndex = headers.indexOf('usuario');
  const passwordIndex = headers.indexOf('clave');
  const nameIndex = headers.indexOf('nombre');
  const roleIndex = headers.indexOf('rol');
  const activeIndex = headers.indexOf('activo');

  if (usernameIndex < 0 || passwordIndex < 0) {
    return respuesta({ ok: false, error: 'Usuarios debe tener las columnas Usuario y Clave.' });
  }

  const user = rows.find(row => {
    const active = activeIndex < 0 || ['si', 'sí', 'true', '1', 'activo'].includes(String(row[activeIndex]).trim().toLowerCase());
    return active && String(row[usernameIndex]).trim().toLowerCase() === username && String(row[passwordIndex]) === password;
  });

  if (!user) return respuesta({ ok: false, error: 'Usuario o contraseña incorrectos.' });

  return respuesta({
    ok: true,
    user: {
      username: String(user[usernameIndex]),
      name: nameIndex >= 0 ? String(user[nameIndex]) : String(user[usernameIndex]),
      role: roleIndex >= 0 ? String(user[roleIndex] || 'Carga') : 'Carga'
    }
  });
}

function validarEncuesta(data) {
  ['institution', 'name', 'surname'].forEach(field => {
    if (!data || !String(data[field] || '').trim()) {
      throw new Error('El campo ' + field + ' es obligatorio.');
    }
  });

  if (!data.selected || typeof data.selected !== 'object') {
    throw new Error('La selección de respuestas es inválida.');
  }
}

function eliminarEncuesta(data) {
  const rowNumber = Number(data && data.rowNumber);
  if (!Number.isInteger(rowNumber) || rowNumber < 2) {
    throw new Error('El registro seleccionado no es válido.');
  }

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const cargas = ss.getSheetByName(SHEET_NAME);
    if (!cargas || rowNumber > cargas.getLastRow()) {
      throw new Error('El registro ya no existe o fue eliminado previamente.');
    }

    const expected = Array.isArray(data.expected) ? data.expected.slice(0, 4).map(value => String(value)) : [];
    if (expected.length === 4) {
      const current = cargas.getRange(rowNumber, 1, 1, 4).getDisplayValues()[0];
      const sameRecord = expected.every((value, index) => String(current[index]).trim() === value.trim());
      if (!sameRecord) {
        throw new Error('El registro cambió o ya fue eliminado. Actualizá la tabla e intentá nuevamente.');
      }
    }

    cargas.deleteRow(rowNumber);
    limpiarCaches();
    return respuesta({ ok: true, message: 'Encuesta eliminada correctamente' });
  } finally {
    lock.releaseLock();
  }
}

function obtenerOCrearCargas(ss) {
  let cargas = ss.getSheetByName(SHEET_NAME);
  if (!cargas) {
    cargas = ss.insertSheet(SHEET_NAME);
    prepararCargas(cargas);
  } else if (cargas.getLastRow() === 0) {
    prepararCargas(cargas);
  } else if (!cargas.getFilter()) {
    cargas.getRange(1, 1, Math.max(cargas.getLastRow(), 2), HEADERS.length).createFilter();
  }
  return cargas;
}

function guardarEncuesta(row) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const cargas = obtenerOCrearCargas(ss);
    const nextRow = cargas.getLastRow() + 1;
    cargas.getRange(nextRow, 1, 1, row.length).setValues([row]);
  } finally {
    lock.releaseLock();
  }
}

function prepararCargas(sheet) {
  if (sheet.getLastRow() === 0) sheet.appendRow(HEADERS);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#674ea7')
    .setFontColor('#ffffff')
    .setVerticalAlignment('middle');

  sheet.setRowHeight(1, 38);
  sheet.setColumnWidth(1, 145);
  sheet.setColumnWidth(2, 220);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 140);

  for (let col = 5; col <= HEADERS.length; col++) {
    sheet.setColumnWidth(col, 180);
  }

  if (sheet.getMaxRows() > 1) {
    sheet.getRange(2, 5, sheet.getMaxRows() - 1, HEADERS.length - 4)
      .setHorizontalAlignment('center');
  }

  if (!sheet.getFilter()) {
    sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), HEADERS.length)
      .createFilter();
  }
}

function leerEncuestas() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length)
    .getDisplayValues();
}

function leerInstituciones() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(INSTITUTIONS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(INSTITUTIONS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return [];

  const values = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getDisplayValues()
    .map(row => String(row[0] || '').trim())
    .filter(Boolean);

  const institutions = [...new Set(values)].sort((a, b) => a.localeCompare(b, 'es'));
  cache.put(INSTITUTIONS_CACHE_KEY, JSON.stringify(institutions), CACHE_SECONDS);
  return institutions;
}

function leerEstadisticasCacheadas() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get(STATS_CACHE_KEY);
  if (cached) return JSON.parse(cached);

  const stats = calcularEstadisticas(leerEncuestas());
  cache.put(STATS_CACHE_KEY, JSON.stringify(stats), CACHE_SECONDS);
  return stats;
}

function obtenerOCrearInstituciones(ss) {
  let sheet = ss.getSheetByName(INSTITUTIONS_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(INSTITUTIONS_SHEET_NAME);

  if (sheet.getLastRow() === 0) sheet.appendRow(['Institución']);

  sheet.setFrozenRows(1);
  sheet.getRange(1, 1)
    .setFontWeight('bold')
    .setBackground('#0d2946')
    .setFontColor('#ffffff');
  sheet.setColumnWidth(1, 320);

  if (!sheet.getFilter() && sheet.getLastRow() >= 2) {
    sheet.getRange(1, 1, sheet.getLastRow(), 1).createFilter();
  }

  return sheet;
}

function calcularEstadisticas(rows) {
  const areaStart = 4;
  const carreraStart = areaStart + AREAS.length;
  const valoraStart = carreraStart + CARRERAS.length;
  const contactIndex = valoraStart + VALORA.length;
  const visitIndex = contactIndex + 1;

  return {
    total: rows.length,
    areas: contarMarcadas(rows, AREAS, areaStart),
    carreras: contarMarcadas(rows, CARRERAS, carreraStart),
    valora: contarMarcadas(rows, VALORA, valoraStart),
    contact: contarValores(rows, contactIndex),
    visit: contarValores(rows, visitIndex)
  };
}

function contarMarcadas(rows, labels, startIndex) {
  return labels.map((label, index) => ({
    label,
    count: rows.reduce((total, row) => total + (row[startIndex + index] === 'X' ? 1 : 0), 0)
  }));
}

function contarValores(rows, index) {
  const counts = {};
  rows.forEach(row => {
    const value = row[index] || '';
    if (value) counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
}

function actualizarEstadisticas(ss) {
  let stats = ss.getSheetByName('Estadísticas');
  if (!stats) stats = ss.insertSheet('Estadísticas');

  stats.clear();
  stats.getCharts().forEach(chart => stats.removeChart(chart));
  stats.setFrozenRows(2);

  stats.getRange('A1:H1').merge()
    .setValue('ESTADÍSTICAS DE ENCUESTAS')
    .setFontSize(18)
    .setFontWeight('bold')
    .setHorizontalAlignment('center')
    .setBackground('#674ea7')
    .setFontColor('#ffffff');

  stats.getRange('A3').setValue('Total de encuestas').setFontWeight('bold');
  stats.getRange('B3').setFormula('=MAX(COUNTA(Cargas!A:A)-1,0)').setFontSize(16).setFontWeight('bold');

  crearTablaEstadistica(stats, 5, 'Áreas de interés', AREAS, 5);
  crearTablaEstadistica(stats, 5, 'Carreras de interés', CARRERAS, 5 + AREAS.length);
  crearTablaEstadistica(stats, 5, 'Qué valoran de una carrera', VALORA, 5 + AREAS.length + CARRERAS.length);

  const contactRow = 18;
  stats.getRange(contactRow, 1).setValue('Contacto').setFontWeight('bold');
  stats.getRange(contactRow + 1, 1, 3, 1).setValues([['WhatsApp'], ['Correo'], ['No desea contacto']]);

  const contactColumn = columnaLetra(HEADERS.indexOf('Contacto') + 1);
  stats.getRange(contactRow + 1, 2).setFormula(`=COUNTIF(Cargas!${contactColumn}:${contactColumn},"WhatsApp")`);
  stats.getRange(contactRow + 2, 2).setFormula(`=COUNTIF(Cargas!${contactColumn}:${contactColumn},"Correo")`);
  stats.getRange(contactRow + 3, 2).setFormula(`=COUNTIF(Cargas!${contactColumn}:${contactColumn},"No desea contacto")`);

  stats.getRange(contactRow, 5).setValue('Jornada informativa').setFontWeight('bold');
  stats.getRange(contactRow + 1, 5, 2, 1).setValues([['Sí'], ['No']]);

  const visitColumn = columnaLetra(HEADERS.indexOf('Jornada informativa') + 1);
  stats.getRange(contactRow + 1, 6).setFormula(`=COUNTIF(Cargas!${visitColumn}:${visitColumn},"Sí")`);
  stats.getRange(contactRow + 2, 6).setFormula(`=COUNTIF(Cargas!${visitColumn}:${visitColumn},"No")`);

  crearGrafico(stats, 6, 1, AREAS.length, 'Áreas de mayor interés', 1, 9);
  crearGrafico(stats, 6, 4, CARRERAS.length, 'Carreras de mayor interés', 18, 9);
  crearGrafico(stats, 6, 7, VALORA.length, 'Qué buscan en una carrera', 35, 9);
  crearGraficoCircular(stats, contactRow + 1, 1, 3, 'Preferencia de contacto', 1, 24);
  crearGraficoCircular(stats, contactRow + 1, 5, 2, 'Jornada informativa', 18, 24);
  stats.autoResizeColumns(1, 8);
}

function crearTablaEstadistica(sheet, startRow, titulo, opciones, columnaInicial) {
  const startColumn = titulo === 'Áreas de interés' ? 1 : titulo === 'Carreras de interés' ? 4 : 7;
  sheet.getRange(startRow, startColumn).setValue(titulo).setFontWeight('bold');

  opciones.forEach((opcion, index) => {
    const row = startRow + 1 + index;
    sheet.getRange(row, startColumn).setValue(opcion);
    const letra = columnaLetra(columnaInicial + index);
    sheet.getRange(row, startColumn + 1).setFormula(`=COUNTIF(Cargas!${letra}:${letra},"X")`);
  });
}

function crearGrafico(sheet, row, column, cantidad, titulo, positionRow, positionColumn) {
  const chart = sheet.newChart().setChartType(Charts.ChartType.BAR)
    .addRange(sheet.getRange(row, column, cantidad, 2))
    .setPosition(positionRow, positionColumn, 0, 0)
    .setOption('title', titulo)
    .setOption('legend', { position: 'none' })
    .setOption('width', 650)
    .setOption('height', 350)
    .build();
  sheet.insertChart(chart);
}

function crearGraficoCircular(sheet, row, column, cantidad, titulo, positionRow, positionColumn) {
  const chart = sheet.newChart().setChartType(Charts.ChartType.PIE)
    .addRange(sheet.getRange(row, column, cantidad, 2))
    .setPosition(positionRow, positionColumn, 0, 0)
    .setOption('title', titulo)
    .setOption('width', 500)
    .setOption('height', 300)
    .build();
  sheet.insertChart(chart);
}

function columnaLetra(column) {
  let letter = '';
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letter = String.fromCharCode(remainder + 65) + letter;
    column = (column - remainder - 1) / 26;
  }
  return letter;
}

function respuesta(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function limpiarCaches() {
  CacheService.getScriptCache().removeAll([
    STATS_CACHE_KEY,
    INSTITUTIONS_CACHE_KEY
  ]);
}

function instalarTriggerCambios() {
  const triggers = ScriptApp.getProjectTriggers();

  triggers.forEach(trigger => {
    if (['invalidarCachePorCambio', 'invalidarCachePorEdicion'].includes(trigger.getHandlerFunction())) {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('invalidarCachePorEdicion')
    .forSpreadsheet(SPREADSHEET_ID)
    .onEdit()
    .create();

  ScriptApp.newTrigger('invalidarCachePorCambio')
    .forSpreadsheet(SPREADSHEET_ID)
    .onChange()
    .create();

  limpiarCaches();
}

function invalidarCachePorEdicion(event) {
  limpiarCaches();
}

function invalidarCachePorCambio(event) {
  // onChange cubre ediciones, inserción/eliminación de filas y columnas,
  // creación/eliminación de hojas y otros cambios del Spreadsheet.
  limpiarCaches();
}

function configurarSpreadsheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  obtenerOCrearCargas(ss);
  obtenerOCrearInstituciones(ss);
  actualizarEstadisticas(ss);
  limpiarCaches();

  let users = ss.getSheetByName(USERS_SHEET_NAME);
  if (!users) users = ss.insertSheet(USERS_SHEET_NAME);
  if (users.getLastRow() === 0) {
    users.appendRow(['Usuario', 'Clave', 'Nombre', 'Rol', 'Activo']);
    users.getRange(1, 1, 1, 5).setFontWeight('bold').setBackground('#0d2946').setFontColor('#ffffff');
  }
}
