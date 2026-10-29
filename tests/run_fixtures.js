"use strict";
// Casos fijos de calc.js. Se corre con node, sin paquetes y sin red:
//   node tests/run_fixtures.js
// Imprime una línea PASS o FAIL por caso y una línea TOTAL; sale con código
// distinto de cero si algún caso falla. No escribe ningún archivo.

const assert = require("node:assert");
const fs = require("node:fs");
const path = require("node:path");

const calc = require("../calc.js");
const datos = JSON.parse(fs.readFileSync(
  path.join(__dirname, "..", "data", "categorias_arca.json"), "utf8"));

let pasaron = 0;
let fallaron = 0;

function caso(nombre, prueba) {
  try {
    prueba();
    pasaron += 1;
    console.log("PASS " + nombre);
  } catch (error) {
    fallaron += 1;
    const motivo = String(error && error.message ? error.message : error);
    console.log("FAIL " + nombre + " :: " + motivo.split("\n").join(" | "));
  }
}

function aCentavos(pesos) {
  const centavos = Math.round(pesos * 100);
  assert.ok(Math.abs(pesos * 100 - centavos) < 0.001,
    "importe con más de dos decimales: " + pesos);
  return centavos;
}

function meses(valor, cantidad) {
  const textos = [];
  for (let i = 0; i < 12; i += 1) {
    textos.push(i < cantidad ? valor : "");
  }
  return textos;
}

// ---- tabla de calc.js contra el JSON
caso("tabla: los topes de calc.js son los de data/categorias_arca.json",
  function () {
    const deJson = datos.categories.map(function (c) {
      return [c.categoria, aCentavos(c.ingresos_brutos_anuales)];
    });
    const deJs = calc.TABLA.categorias.map(function (c) {
      return [c.categoria, c.tope_centavos];
    });
    assert.deepStrictEqual(deJs, deJson);
    assert.strictEqual(deJs.map(function (t) { return t[0]; }).join(""),
      "ABCDEFGHIJK");
  });

caso("tabla: la vigencia y la fecha de lectura son las del JSON", function () {
  assert.strictEqual(calc.TABLA.vigencia, datos.vigencia);
  assert.strictEqual(calc.TABLA.fecha_lectura, datos.fetched_at);
});

// ---- parseImporte
[["1.234.567,89", 123456789], ["1234567,89", 123456789],
  ["1234567", 123456700], ["$ 15.000.000,00", 1500000000],
  ["0", 0], ["0,5", 50], ["007", 700]].forEach(function (par) {
  caso("parseImporte: \"" + par[0] + "\" da " + par[1] + " centavos",
    function () {
      assert.strictEqual(calc.parseImporte(par[0]), par[1]);
    });
});

["", "abc", "-5", "1,2,3", "1.23", "1e5", "1 234", "1234.", "9999999999999",
  "1.234.567,89 $"].forEach(function (texto) {
  caso("parseImporte: \"" + texto + "\" da null", function () {
    assert.strictEqual(calc.parseImporte(texto), null);
  });
});

caso("parseImporte: lo que no es texto da null", function () {
  [null, undefined, 1234, [], {}, true].forEach(function (valor) {
    assert.strictEqual(calc.parseImporte(valor), null);
  });
});

// ---- sumar12, formatImporte, promedioRestante
caso("sumar12: suma 12 importes y rechaza lo que no son 12 enteros",
  function () {
    assert.strictEqual(calc.sumar12(new Array(12).fill(125000000)),
      1500000000);
    assert.strictEqual(calc.sumar12([1, 2, 3]), null);
    assert.strictEqual(calc.sumar12(new Array(12).fill(1.5)), null);
    assert.strictEqual(calc.sumar12(new Array(12).fill(-1)), null);
    assert.strictEqual(calc.sumar12("x"), null);
  });

caso("formatImporte: centavos a formato argentino", function () {
  assert.strictEqual(calc.formatImporte(123456789), "1.234.567,89");
  assert.strictEqual(calc.formatImporte(0), "0,00");
  assert.strictEqual(calc.formatImporte(5), "0,05");
  assert.strictEqual(calc.formatImporte(1500000000), "15.000.000,00");
  assert.strictEqual(calc.formatImporte(-1), null);
  assert.strictEqual(calc.formatImporte(1.5), null);
});

caso("formatImporte y parseImporte: ida y vuelta de cada tope", function () {
  calc.TABLA.categorias.forEach(function (c) {
    assert.strictEqual(
      calc.parseImporte(calc.formatImporte(c.tope_centavos)),
      c.tope_centavos);
  });
});

caso("promedioRestante: divide hacia abajo al centavo", function () {
  assert.strictEqual(calc.promedioRestante(100941045, 8), 12617630);
  assert.strictEqual(calc.promedioRestante(100, 3), 33);
  assert.strictEqual(calc.promedioRestante(100, 0), null);
  assert.strictEqual(calc.promedioRestante(100, 13), null);
  assert.strictEqual(calc.promedioRestante(-1, 2), null);
});

// ---- categorías en el borde de cada tope
calc.TABLA.categorias.forEach(function (c, i, todas) {
  const siguiente = i + 1 < todas.length ? todas[i + 1] : null;
  caso("categoría " + c.categoria + ": el tope exacto queda en "
    + c.categoria + " con margen 0", function () {
    assert.strictEqual(calc.categoriaPara(c.tope_centavos), c.categoria);
    assert.strictEqual(calc.margen(c.tope_centavos), 0);
  });
  caso("categoría " + c.categoria + ": un centavo más pasa a "
    + (siguiente ? siguiente.categoria : "excluido"), function () {
    assert.strictEqual(calc.categoriaPara(c.tope_centavos + 1),
      siguiente ? siguiente.categoria : "excluido");
  });
});

// ---- calcular
caso("calcular: 12 meses de 1.250.000,00 dan total 15.000.000,00, categoría B,"
  + " margen 2.595.182,74 y siguiente C", function () {
  const r = calc.calcular(meses("1.250.000,00", 12));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(calc.formatImporte(r.total), "15.000.000,00");
  assert.strictEqual(r.categoria, "B");
  assert.strictEqual(calc.formatImporte(r.margen), "2.595.182,74");
  assert.strictEqual(r.categoriaSiguiente, "C");
  assert.strictEqual(r.faltan, 0);
  assert.strictEqual(r.promedio, null);
});

caso("calcular: 4 meses que suman 11.000.000,00 dan categoría A y promedio"
  + " 126.176,30 para 8 meses", function () {
  const r = calc.calcular(meses("2.750.000", 4));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.total, 1100000000);
  assert.strictEqual(r.cargados, 4);
  assert.strictEqual(r.faltan, 8);
  assert.strictEqual(r.categoria, "A");
  assert.strictEqual(calc.formatImporte(r.promedio), "126.176,30");
});

caso("calcular: un total sobre el tope de K da excluido, sin margen ni"
  + " promedio", function () {
  const r = calc.calcular(meses("130.000.000", 1));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.categoria, "excluido");
  assert.strictEqual(r.margen, null);
  assert.strictEqual(r.promedio, null);
  assert.strictEqual(r.categoriaSiguiente, null);
  assert.strictEqual(calc.formatImporte(r.excedente), "3.389.161,25");
});

caso("calcular: un importe mal escrito se informa y no se suma", function () {
  const textos = meses("1.000.000", 12);
  textos[2] = "mucho";
  const r = calc.calcular(textos);
  assert.strictEqual(r.ok, false);
  assert.deepStrictEqual(r.errores, [3]);
});

caso("calcular: con los 12 meses vacíos pide cargar al menos un mes",
  function () {
    const r = calc.calcular(meses("", 0));
    assert.strictEqual(r.ok, false);
    assert.deepStrictEqual(r.errores, []);
    assert.strictEqual(r.cargados, 0);
  });

caso("calcular: un 0 escrito cuenta como mes cargado", function () {
  const r = calc.calcular(meses("0", 1));
  assert.strictEqual(r.ok, true);
  assert.strictEqual(r.cargados, 1);
  assert.strictEqual(r.categoria, "A");
});

caso("calcular: sin 12 textos da null", function () {
  assert.strictEqual(calc.calcular(["1"]), null);
  assert.strictEqual(calc.calcular(null), null);
});

console.log("TOTAL " + (pasaron + fallaron) + " PASS " + pasaron + " FAIL "
  + fallaron);
process.exit(fallaron === 0 ? 0 : 1);
