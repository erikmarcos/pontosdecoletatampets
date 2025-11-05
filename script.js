// ======================== MAPA ========================
// CHAVE 1: Remove o setView inicial para evitar conflitos de carregamento
const map = L.map("map")

// Camada base
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap",
}).addTo(map)

let pontos = []
let markers = []
let userMarker = null // marcador do usuário
let coverageCircle = null // círculo de cobertura ao redor do CEP
let regioesSet = new Set()

// ======================== FUNÇÃO DISTÂNCIA ========================
function distanciaKm(lat1, lon1, lat2, lon2) {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

// ======================== NORMALIZA TEXTO ========================
function normalizaTexto(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
}

// ======================== NORMALIZA COLUNA ========================
function normalizaColuna(str) {
  return (str || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase()
}

// ======================== CSV ========================
function carregarCSV() {
  Papa.parse("Pontos de coleta.csv?v=" + Date.now(), {
    download: true,
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
    delimitersToGuess: [",", ";"],
    complete: function (results) {
      if (!results.data || results.data.length === 0) {
        alert("Nenhum dado encontrado no CSV.")
        return
      } // Mapeamento das colunas

      const colunas = Object.keys(results.data[0])
      let mapaColunas = {}
      colunas.forEach((c) => {
        const key = normalizaColuna(c)
        if (key.includes("latitude")) mapaColunas.lat = c
        if (key.includes("longitude")) mapaColunas.lon = c
        if (key.includes("regiao")) mapaColunas.regiao = c
        if (key.includes("nome")) mapaColunas.nome = c
        if (key.includes("endereco")) mapaColunas.endereco = c
        if (key.includes("bairro")) mapaColunas.bairro = c
        if (key.includes("categoria")) mapaColunas.categoria = c
        if (key.includes("horario")) mapaColunas.horario = c
      })

      pontos = results.data
        .filter((p) => {
          const lat = parseFloat(
            (p[mapaColunas.lat] || "").toString().replace(",", ".")
          )
          const lon = parseFloat(
            (p[mapaColunas.lon] || "").toString().replace(",", ".")
          )
          return !isNaN(lat) && !isNaN(lon)
        })
        .map((p) => {
          const lat = parseFloat(
            (p[mapaColunas.lat] || "").toString().replace(",", ".")
          )
          const lon = parseFloat(
            (p[mapaColunas.lon] || "").toString().replace(",", ".")
          )
          const regiao = p[mapaColunas.regiao] || "-"
          regioesSet.add(regiao)
          return {
            lat,
            lon,
            nome: p[mapaColunas.nome] || "Ponto de Coleta",
            endereco: p[mapaColunas.endereco] || "-",
            bairro: p[mapaColunas.bairro] || "-",
            regiao,
            categoria: p[mapaColunas.categoria] || "-",
            horario: p[mapaColunas.horario] || "Não informado",
            original: p,
          }
        })

      atualizarFiltroRegioes()
      adicionarPinos()
      // CHAVE 2: Centraliza em Sorocaba após o CSV carregar (Solução do Bug)
      map.setView([-23.5015, -47.4526], 13)
    },
    error: function (err) {
      console.error("Erro ao carregar CSV:", err)
      alert("Erro ao carregar CSV.")
    },
  })
}

// ... (Resto do código sem alteração) ...

// ======================== ATUALIZA <select> DE REGIÕES (AJUSTADO) ========================
function atualizarFiltroRegioes() {
  const select = document.getElementById("regiaoSelect")
  if (!select) return
  select.innerHTML = '<option value="">Todas</option>' // Regiões fixas em ordem lógica

  const regioesLogicas = ["Centro", "Norte", "Sul", "Leste", "Oeste"] // Separe regiões e cidades

  let cidades = []
  let regioes = []

  Array.from(regioesSet).forEach((item) => {
    if (regioesLogicas.includes(item)) {
      regioes.push(item)
    } else {
      cidades.push(item)
    }
  }) // Adiciona regiões na ordem lógica

  regioesLogicas.forEach((regiao) => {
    if (regioes.includes(regiao)) {
      const opt = document.createElement("option")
      opt.value = regiao
      opt.textContent = regiao
      select.appendChild(opt)
    }
  }) // Adiciona cidades em ordem alfabética

  cidades.sort().forEach((cidade) => {
    const opt = document.createElement("option")
    opt.value = cidade
    opt.textContent = cidade
    select.appendChild(opt)
  })
}

// ======================== ADICIONA PINOS (MODIFICADO) ========================
function adicionarPinos(filtro = {}) {
  markers.forEach((m) => map.removeLayer(m))
  markers = []

  const regiaoFiltrada = filtro.regiao || ""
  const distanciaFiltrada = filtro.distancia
  const userLat = filtro.userLat
  const userLon = filtro.userLon

  const bounds = L.latLngBounds([]) // Inicializa a área de limite
  let pontosEncontrados = 0

  pontos.forEach((ponto) => {
    let incluirPonto = true

    if (regiaoFiltrada && regiaoFiltrada !== "" && regiaoFiltrada !== "Todas") {
      if (normalizaTexto(ponto.regiao) !== normalizaTexto(regiaoFiltrada)) {
        incluirPonto = false
      }
    } else if (distanciaFiltrada && userLat != null && userLon != null) {
      const d = distanciaKm(userLat, userLon, ponto.lat, ponto.lon)
      if (d > distanciaFiltrada) {
        incluirPonto = false
      }
    }

    if (incluirPonto) {
      const marker = L.marker([ponto.lat, ponto.lon]).addTo(map)
      marker.bindPopup(`<b>${ponto.nome}</b><br>${ponto.bairro}`)
      marker.on("click", () => abrirSidebar(ponto))
      markers.push(marker)
      bounds.extend([ponto.lat, ponto.lon]) // Adiciona o ponto à área de limite
      pontosEncontrados++
    }
  }) // CHAVE 1: Centralização do Mapa

  if (pontosEncontrados > 0) {
    // Centraliza e ajusta o zoom para caber todos os marcadores
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 })
  } else {
    // Se não houver pontos, centraliza na vista padrão de Sorocaba
    map.setView([-23.5015, -47.4526], 13)
  }
}

// ======================== SIDEBAR ========================
function abrirSidebar(ponto) {
  const sidebar = document.getElementById("sidebar")
  sidebar.innerHTML = "" // Botão fechar

  const closeBtn = document.createElement("button")
  closeBtn.className = "close-btn"
  closeBtn.textContent = "✖"
  closeBtn.addEventListener("click", () => {
    sidebar.classList.remove("active")
    document.body.classList.remove("sidebar-open")
  }) // Google Maps link

  let buscaMaps = ponto.nome
  if (ponto.endereco && ponto.endereco !== "-")
    buscaMaps += " " + ponto.endereco
  if (ponto.bairro && ponto.bairro !== "-") buscaMaps += " " + ponto.bairro
  buscaMaps += " Sorocaba SP"
  const googleLink =
    buscaMaps.trim() !== ""
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          buscaMaps
        )}`
      : !isNaN(ponto.lat) && !isNaN(ponto.lon)
      ? `https://www.google.com/maps/search/?api=1&query=${ponto.lat},${ponto.lon}`
      : "" // Conteúdo do sidebar

  const content = document.createElement("div")
  content.id = "sidebar-content"
  content.innerHTML = `
    <h2>${ponto.nome}</h2>
    <h3>${ponto.categoria}</h3>
    <div class="sidebar-block">
      <strong>Endereço completo:</strong>
      <p>${ponto.endereco}${
    ponto.bairro && ponto.bairro !== "-" ? " - " + ponto.bairro : ""
  }</p>
    </div>
    <div class="sidebar-block horario">
      <strong>Horário de funcionamento:</strong>
      <p>${ponto.horario}</p>
    </div>
    <a href="${googleLink}" target="_blank" rel="noopener" class="sidebar-btn-gmaps">
      📍 Ver no Google Maps
    </a>
  `

  sidebar.appendChild(closeBtn)
  sidebar.appendChild(content)

  sidebar.classList.add("active")
  document.body.classList.add("sidebar-open")
}

// Fecha sidebar ao clicar no mapa e remove círculo de cobertura
map.on("click", () => {
  document.getElementById("sidebar").classList.remove("active")
  document.body.classList.remove("sidebar-open")
  if (coverageCircle) map.removeLayer(coverageCircle) // Remove círculo ao clicar fora
})

// ======================== FUNÇÃO PARA LIMPAR CAMPO CEP (CHAVE DE INTEGRAÇÃO) ========================
function limparCampoCEP() {
  const cepInput = document.getElementById("cepInput")
  // Remove o marcador de usuário e o círculo de cobertura
  if (userMarker) map.removeLayer(userMarker)
  if (coverageCircle) map.removeLayer(coverageCircle)
  // Limpa o valor
  if (cepInput) {
    cepInput.value = ""
  }
}

// ======================== FORMATAÇÃO DE CEP ========================
function formatarCEP(input) {
  let value = input.value.replace(/\D/g, "")
  if (value.length > 5) {
    value = value.substring(0, 5) + "-" + value.substring(5, 8)
  }
  input.value = value
}

// Adiciona formatação automática ao campo CEP
document.addEventListener("DOMContentLoaded", () => {
  const cepInput = document.getElementById("cepInput")
  if (cepInput) {
    cepInput.addEventListener("input", (e) => {
      formatarCEP(e.target)
    })

    // Permite Enter para buscar
    cepInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        document.getElementById("buscarCEP")?.click()
      }
    })
  }
})

// ======================== BUSCA POR CEP ========================
document.getElementById("buscarCEP").addEventListener("click", () => {
  const cep = document.getElementById("cepInput").value.replace(/\D/g, "")
  if (cep.length !== 8) {
    alert("Digite um CEP válido!")
    return
  }

  // Fecha o menu mobile após iniciar a busca
  fecharMenuMobile()

  fetch(
    `https://nominatim.openstreetmap.org/search?format=json&q=${cep}+Brazil`
  )
    .then((resp) => resp.json())
    .then((data) => {
      if (!data || data.length === 0) {
        alert("CEP não encontrado!")
        return
      }

      const lat = parseFloat(data[0].lat)
      const lon = parseFloat(data[0].lon)
      if (isNaN(lat) || isNaN(lon)) {
        alert("Não foi possível localizar o CEP.")
        return
      }

      map.setView([lat, lon], 14) // Centraliza primeiro no CEP

      if (userMarker) map.removeLayer(userMarker)
      userMarker = L.marker([lat, lon], {
        icon: L.icon({
          iconUrl: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
          iconSize: [32, 32],
          iconAnchor: [16, 32],
        }),
      })
        .addTo(map)
        .bindPopup("📍 Você está aqui")
        .openPopup() // === CÍRCULO DE COBERTURA DINÂMICO ===

      const distancia = parseInt(
        document.querySelector('input[name="distancia"]:checked').value
      )

      if (coverageCircle) map.removeLayer(coverageCircle) // Remove círculo antigo
      coverageCircle = L.circle([lat, lon], {
        radius: distancia * 1000, // km → metros
        color: "#2c7a7b", // borda verde-escuro
        fillColor: "#38b2ac", // verde-claro translúcido
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map) // CHAVE: Chama o filtro e a centralização final

      adicionarPinos({ distancia: distancia, userLat: lat, userLon: lon })
    })
    .catch((err) => {
      console.error(err)
      alert("Erro ao buscar o CEP. Tente novamente.")
    })
})

// ======================== NOVA LÓGICA DE BUSCA POR REGIÃO (BOTÃO) ========================
document.getElementById("buscarRegiao").addEventListener("click", () => {
  const regiao = document.getElementById("regiaoSelect").value

  // Fecha o menu mobile após iniciar a busca
  fecharMenuMobile()

  // 1. Limpa o campo de CEP e marcadores de distância
  limparCampoCEP()

  // 2. Chama a função principal de filtro
  adicionarPinos({ regiao: regiao, distancia: 0, userLat: null, userLon: null })

  // 3. Centraliza o mapa na região filtrada (usando geocodificação)
  if (regiao && regiao !== "" && regiao !== "Todas") {
    // Usa a região (ou cidade) para centralizar no mapa
    fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${regiao}, Sorocaba, Brazil`
    )
      .then((resp) => resp.json())
      .then((data) => {
        if (data && data.length > 0) {
          const lat = parseFloat(data[0].lat)
          const lon = parseFloat(data[0].lon)
          map.setView([lat, lon], 13) // Centraliza na região com zoom padrão (13)
        }
      })
      .catch((err) =>
        console.error("Erro ao centralizar mapa por região:", err)
      )
  } else {
    // Se for "Todas", centraliza na vista padrão de Sorocaba
    map.setView([-23.5015, -47.4526], 13)
  }
})

// ======================== FILTROS DE DISTÂNCIA (MANTIDO) ========================
document.querySelectorAll('input[name="distancia"]').forEach((radio) => {
  radio.addEventListener("change", (e) => {
    const distancia = parseInt(e.target.value)
    const regiao = document.getElementById("regiaoSelect").value
    const userLat = userMarker ? userMarker.getLatLng().lat : null
    const userLon = userMarker ? userMarker.getLatLng().lng : null

    adicionarPinos({ regiao, distancia, userLat, userLon }) // Atualiza círculo de cobertura ao trocar distância

    if (coverageCircle) map.removeLayer(coverageCircle)
    if (userMarker) {
      const { lat, lng } = userMarker.getLatLng()
      coverageCircle = L.circle([lat, lng], {
        radius: distancia * 1000,
        color: "#2c7a7b",
        fillColor: "#38b2ac",
        fillOpacity: 0.2,
        weight: 2,
      }).addTo(map)
    }
  })
})

// ======================== FUNÇÃO PARA FECHAR MENU MOBILE ========================
function fecharMenuMobile() {
  const hamburgerBtn = document.getElementById("hamburgerBtn")
  const controlsSection = document.getElementById("controlsSection")

  if (hamburgerBtn && controlsSection && window.innerWidth <= 768) {
    hamburgerBtn.classList.remove("active")
    controlsSection.classList.remove("menu-open")

    // Ajusta o mapa quando o menu fecha
    setTimeout(() => {
      if (map) {
        map.invalidateSize()
      }
    }, 300)
  }
}

// ======================== BOTÃO HAMBURGER PARA MOBILE ========================
document.addEventListener("DOMContentLoaded", () => {
  const hamburgerBtn = document.getElementById("hamburgerBtn")
  const controlsSection = document.getElementById("controlsSection")

  if (hamburgerBtn && controlsSection) {
    hamburgerBtn.addEventListener("click", () => {
      hamburgerBtn.classList.toggle("active")
      controlsSection.classList.toggle("menu-open")

      // Ajusta o mapa quando o menu abre/fecha
      setTimeout(() => {
        if (map) {
          map.invalidateSize()
        }
      }, 300)
    })

    // Fecha o menu ao clicar fora (opcional)
    document.addEventListener("click", (e) => {
      if (
        controlsSection.classList.contains("menu-open") &&
        !controlsSection.contains(e.target) &&
        !hamburgerBtn.contains(e.target) &&
        window.innerWidth <= 768
      ) {
        fecharMenuMobile()
      }
    })
  }
})

// ======================== INICIALIZA ========================
document.addEventListener("DOMContentLoaded", carregarCSV)
