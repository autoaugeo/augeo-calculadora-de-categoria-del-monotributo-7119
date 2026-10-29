"use strict";
/* Cálculo de la categoría del monotributo por ingresos brutos de 12 meses.

   Todas las cuentas se hacen en centavos enteros. Este archivo solo tiene
   funciones puras: no usa red ni código de navegador y no
   guarda datos. Se carga con require() en node.

   La tabla es la de data/categorias_arca.json (topes anuales de ingresos
   brutos, en centavos). */

var TABLA = {
  "vigencia": "Valores de aplicación desde el 1/08/2026",
  "fecha_lectura": "2026-10-05",
  "categorias": [
    {"categoria": "A", "tope_centavos": 1200941045},
    {"categoria": "B", "tope_centavos": 1759518274},
    {"categoria": "C", "tope_centavos": 2467049431},
    {"categoria": "D", "tope_centavos": 3062865143},
    {"categoria": "E", "tope_centavos": 3602823133},
    {"categoria": "F", "tope_centavos": 4515165941},
    {"categoria": "G", "tope_centavos": 5399579887},
    {"categoria": "H", "tope_centavos": 8192466037},
    {"categoria": "I", "tope_centavos": 9169976190},
    {"categoria": "J", "tope_centavos": 10501251920},
    {"categoria": "K", "tope_centavos": 12661083875}
  ]
};

var CATEGORIAS = TABLA.categorias;
var ULTIMA = CATEGORIAS[CATEGORIAS.length - 1];
var MESES = 12;
var EXCLUIDO = "excluido";
// Hasta 12 cifras enteras por importe: así la suma de 12 importes, en
// centavos, sigue siendo un entero exacto.
var MAX_CIFRAS = 12;
var CON_MILES = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/;
var SIN_MILES = /^\d+(,\d{1,2})?$/;

function esCentavos(n) {
  return typeof n === "number" && Number.isSafeInteger(n) && n >= 0;
}

// "1.234.567,89", "1234567,89" o "1234567", con o sin "$" adelante, pasan
// a centavos enteros. El punto solo vale como separador de miles y la coma
// como separador de centavos. Cualquier otra cosa da null.
function parseImporte(texto) {
  if (typeof texto !== "string") {
    return null;
  }
  var limpio = texto.trim();
  if (limpio.charAt(0) === "$") {
    limpio = limpio.slice(1).trim();
  }
  if (!CON_MILES.test(limpio) && !SIN_MILES.test(limpio)) {
    return null;
  }
  var partes = limpio.split(",");
  var entero = partes[0].split(".").join("").replace(/^0+(?=\d)/, "");
  if (entero.length > MAX_CIFRAS) {
    return null;
  }
  var decimales = ((partes[1] || "") + "00").slice(0, 2);
  return Number(entero) * 100 + Number(decimales);
}

// Suma de 12 importes mensuales en centavos; null si no son 12 enteros.
function sumar12(meses) {
  if (!Array.isArray(meses) || meses.length !== MESES) {
    return null;
  }
  var total = 0;
  for (var i = 0; i < MESES; i += 1) {
    if (!esCentavos(meses[i])) {
      return null;
    }
    total += meses[i];
  }
  return Number.isSafeInteger(total) ? total : null;
}

// Lugar en la tabla de la categoría más baja cuyo tope es igual o mayor al
// total; CATEGORIAS.length si el total supera el tope de la última.
function posicionPara(total) {
  if (!esCentavos(total)) {
    return -1;
  }
  for (var i = 0; i < CATEGORIAS.length; i += 1) {
    if (CATEGORIAS[i].tope_centavos >= total) {
      return i;
    }
  }
  return CATEGORIAS.length;
}

// Letra de la categoría por ingresos, o "excluido" por encima del tope de
// la última categoría.
function categoriaPara(total) {
  var i = posicionPara(total);
  if (i < 0) {
    return null;
  }
  return i === CATEGORIAS.length ? EXCLUIDO : CATEGORIAS[i].categoria;
}

function topeDe(categoria) {
  for (var i = 0; i < CATEGORIAS.length; i += 1) {
    if (CATEGORIAS[i].categoria === categoria) {
      return CATEGORIAS[i].tope_centavos;
    }
  }
  return null;
}

// Tope de una categoría menos el total; null si el total ya lo supera.
function margenHasta(total, categoria) {
  var tope = topeDe(categoria);
  if (tope === null || !esCentavos(total) || total > tope) {
    return null;
  }
  return tope - total;
}

// Tope de la categoría por ingresos menos el total; null si el total
// supera el tope de la última categoría.
function margen(total) {
  return margenHasta(total, categoriaPara(total));
}

function categoriaSiguiente(total) {
  var i = posicionPara(total);
  if (i < 0 || i + 1 >= CATEGORIAS.length) {
    return null;
  }
  return CATEGORIAS[i + 1].categoria;
}

function topeSiguiente(total) {
  var siguiente = categoriaSiguiente(total);
  return siguiente === null ? null : topeDe(siguiente);
}

// Cuánto supera el total al tope de la última categoría; null si no lo
// supera.
function excedente(total) {
  if (posicionPara(total) !== CATEGORIAS.length) {
    return null;
  }
  return total - ULTIMA.tope_centavos;
}

// Margen dividido por los meses que faltan, hacia abajo al centavo.
function promedioRestante(margenCentavos, mesesQueFaltan) {
  if (!esCentavos(margenCentavos) || !Number.isInteger(mesesQueFaltan)
      || mesesQueFaltan < 1 || mesesQueFaltan > MESES) {
    return null;
  }
  return (margenCentavos - (margenCentavos % mesesQueFaltan))
    / mesesQueFaltan;
}

// Centavos enteros a texto con formato argentino: 123456789 da
// "1.234.567,89".
function formatImporte(centavos) {
  if (!esCentavos(centavos)) {
    return null;
  }
  var resto = centavos % 100;
  var entero = String((centavos - resto) / 100)
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return entero + "," + (resto < 10 ? "0" : "") + resto;
}

// Recibe 12 textos, uno por mes. Un texto vacío es un mes sin cargar: cuenta
// como 0 y queda entre los meses que faltan.
function calcular(textos) {
  if (!Array.isArray(textos) || textos.length !== MESES) {
    return null;
  }
  var importes = [];
  var errores = [];
  var cargados = 0;
  for (var i = 0; i < MESES; i += 1) {
    var texto = typeof textos[i] === "string" ? textos[i].trim() : "";
    if (texto === "") {
      importes.push(0);
      continue;
    }
    var valor = parseImporte(texto);
    if (valor === null) {
      errores.push(i + 1);
      importes.push(0);
    } else {
      cargados += 1;
      importes.push(valor);
    }
  }
  if (errores.length > 0 || cargados === 0) {
    return { ok: false, errores: errores, cargados: cargados };
  }
  var total = sumar12(importes);
  var categoria = categoriaPara(total);
  var faltan = MESES - cargados;
  var margenTotal = margen(total);
  return {
    ok: true,
    total: total,
    cargados: cargados,
    faltan: faltan,
    categoria: categoria,
    tope: categoria === EXCLUIDO ? ULTIMA.tope_centavos : topeDe(categoria),
    margen: margenTotal,
    categoriaSiguiente: categoriaSiguiente(total),
    topeSiguiente: topeSiguiente(total),
    excedente: excedente(total),
    promedio: margenTotal !== null && faltan > 0
      ? promedioRestante(margenTotal, faltan) : null
  };
}

module.exports = {
  TABLA: TABLA,
  parseImporte: parseImporte,
  sumar12: sumar12,
  categoriaPara: categoriaPara,
  topeDe: topeDe,
  margenHasta: margenHasta,
  margen: margen,
  categoriaSiguiente: categoriaSiguiente,
  topeSiguiente: topeSiguiente,
  excedente: excedente,
  promedioRestante: promedioRestante,
  formatImporte: formatImporte,
  calcular: calcular
};
