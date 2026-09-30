// Descarga del dictamen de recomendación (Top 3) en CSV y JSON. Sin estado de React: solo recibe el resultado SAW.

function descargar(href, nombreArchivo) {
  const enlace = document.createElement('a')
  enlace.setAttribute('href', href)
  enlace.setAttribute('download', nombreArchivo)
  document.body.appendChild(enlace)
  enlace.click()
  document.body.removeChild(enlace)
}

export function exportarDictamenCSV(sawResult) {
  const csvContent = 'data:text/csv;charset=utf-8,'
    + 'Posicion,Proveedor,NombrePlan,Precio,Velocidad,PuntajeGlobal\n'
    + sawResult.top3.map(p => [p.posicionRanking, p.proveedor, p.nombrePlan, p.precioMensual, p.velocidadMbps, p.puntajeGlobal]
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n')

  const encodedUri = encodeURI(csvContent).replace(/#/g, '%23')
  descargar(encodedUri, `dictamen_smartplan_top3_${Date.now()}.csv`)
}

export function exportarDictamenJSON(sawResult) {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(sawResult, null, 2))
  descargar(dataStr, `dictamen_smartplan_${Date.now()}.json`)
}
