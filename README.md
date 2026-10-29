# Calculadora de categoría del monotributo (código y pruebas)

This project is built and maintained by an automated agent system.

Funciones en JavaScript, sin dependencias, que calculan la categoría del monotributo por ingresos brutos de los últimos 12 meses. La calculadora para usar en el navegador está en https://augeo-monotributo-planilla-para-seguir-el-tope-7119.pages.dev/ (calculadora-categoria-monotributo.html).

## Qué calcula

Todas las cuentas se hacen en centavos enteros:

- Suma de 12 importes mensuales (`sumar12`).
- Categoría por ingresos: la letra más baja (A a K) cuyo tope anual es igual o mayor al total, o `excluido` si el total supera el tope de K (`categoriaPara`).
- Margen: tope de esa categoría menos el total (`margen`, `margenHasta`), categoría siguiente y su tope (`categoriaSiguiente`, `topeSiguiente`), y excedente sobre K (`excedente`).
- Promedio mensual del margen para los meses que faltan, hacia abajo al centavo (`promedioRestante`). No es un límite oficial.
- Lectura de importes escritos como `1.234.567,89`, `1234567,89` o `1234567` (`parseImporte`) y formato argentino (`formatImporte`).
- `calcular(textos)` junta todo para 12 textos, uno por mes; un texto vacío es un mes sin cargar.

Uso desde node:

```js
const calc = require("./calc.js");
const r = calc.calcular(new Array(12).fill("1.250.000,00"));
// r.categoria === "B"; calc.formatImporte(r.margen) === "2.595.182,74"
```

## Pruebas

```
node tests/run_fixtures.js
```

Necesita solo node. No usa paquetes ni red y no escribe archivos. Imprime una línea `PASS` o `FAIL` por caso y una línea `TOTAL`; sale con código distinto de cero si algún caso falla. Cubre el ejemplo de 12 meses (total 15.000.000,00, categoría B, margen 2.595.182,74, siguiente C), el caso parcial de 4 meses, el total por encima del tope de K, los bordes de cada tope y los importes mal escritos.

## Fuente de la tabla

- Fuente: ARCA, Monotributo, Categorías: https://www.arca.gob.ar/monotributo/categorias.asp
- Vigencia: Valores de aplicación desde el 1/08/2026.
- Fecha de lectura: 2026-10-05.
- Los datos completos están en `data/categorias_arca.json`. Los valores pueden cambiar: la fecha de fin de vigencia no figura en la fuente oficial leída.

## Avisos

- Herramienta informativa. No es asesoramiento contable ni impositivo.
- Verificá los valores vigentes en ARCA o con un contador matriculado antes de decidir algo.
- Sin afiliación con ARCA.
- Construida con asistencia de IA; no es el trabajo de un contador.

## English summary

Dependency-free JavaScript functions that compute the Argentine monotributo category from 12 months of gross income, using the ARCA cap table valid from 2026-08-01 (read on 2026-10-05, source: https://www.arca.gob.ar/monotributo/categorias.asp). Run the tests with `node tests/run_fixtures.js`. Informational only: not accounting or tax advice; verify current values with ARCA or a licensed contador. Not affiliated with ARCA. Built with AI assistance.

## Licencia

MIT, ver `LICENSE`.
