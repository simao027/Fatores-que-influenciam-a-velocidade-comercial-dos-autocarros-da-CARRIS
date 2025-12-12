const API_BASE_URL = 'http://127.0.0.1:5000';

const PAGE_IDS = {
    INICIAL: 'pagina-inicial',
    ROTAS: 'pagina-rotas',
    GRAFICOS: 'pagina-graficos',
};

const CSS_CLASSES = {
    HIDDEN: 'd-none',
    ACTIVE: 'active',
};


const DOM = {
    // Elementos comuns
    navLinks: document.querySelectorAll('.bottom-nav .nav-link'),
    themeToggle: document.getElementById('theme-toggle'),
    connectionError: document.getElementById('connection-error'),
    mainContents: document.querySelectorAll('main.conteudo-principal'),
    
    // Filtros offcanvas
    offcanvasEl: document.getElementById('offcanvas-filtros'),
    applyFiltersBtn: document.getElementById('apply-filters'),
    clearFiltersBtn: document.getElementById('clear-filters'),
    filterForm: document.getElementById('filter-form'),
    filtroCarreiraModal: document.getElementById('filtro-carreira-modal'),
    
    // Selects filtros
    diaSemanaSelect: document.getElementById('dia_semana'),
    classeHoraSelect: document.getElementById('classe_hora'),
    classeChuvaSelect: document.getElementById('classe_chuva'),
    routeNumberSelect: document.getElementById('route_number'),

    // Elementos da Página Inicial
    avgSpeed: document.getElementById('avg-speed'),
    totalRoutes: document.getElementById('total-routes'),
    fastRoutesKpi: document.getElementById('fast-routes-kpi'),
    slowRoutesKpi: document.getElementById('slow-routes-kpi'),
    fastestRoutesTable: document.getElementById('fastest-routes-table'),
    slowestRoutesTable: document.getElementById('slowest-routes-table'),

    // Elementos da Página de Rotas
    analiseRotaResultados: document.getElementById('analise-rota-resultados'),
    analiseRotaPlaceholder: document.getElementById('analise-rota-placeholder'),
    detalheVelocidadeAtual: document.getElementById('detalhe-velocidade-atual'),
    detalheNumRegistos: document.getElementById('detalhe-num-registos'),
    detalheComparacaoGlobal: document.getElementById('detalhe-comparacao-global'),

    // Elementos da Página de Gráficos
    graficosResultados: document.getElementById('graficos-resultados'),
    graficosPlaceholder: document.getElementById('graficos-placeholder'),
    graficoDiaSemanaCanvas: document.getElementById('grafico-dia-semana'),
    graficoPeriodoDiaCanvas: document.getElementById('grafico-periodo-dia'),
    graficoMeteorologiaCanvas: document.getElementById('grafico-meteorologia'),
};

 var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
      var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
      })
      
/** @type {import('./types').AppState} */
const appState = {
    mapaAnalise: null,
    camadaDeRotasAnalise: null,
    offcanvasInstance: null,
    charts: { diaSemana: null, periodoDia: null, meteorologia: null },
    paginaAtual: PAGE_IDS.INICIAL,
};



document.addEventListener('DOMContentLoaded', () => {
    inicializarTema();
    inicializarNavegacao();
    preencherFiltroCarreiras();
    setupEventListeners();
    atualizarDashboard();
});

function setupEventListeners() {
    DOM.offcanvasEl.addEventListener('show.bs.offcanvas', configureModalForPage);
    appState.offcanvasInstance = new bootstrap.Offcanvas(DOM.offcanvasEl);

    DOM.applyFiltersBtn.addEventListener('click', () => {
        appState.offcanvasInstance.hide();
        atualizarDashboard();
    });

    DOM.clearFiltersBtn.addEventListener('click', () => {
        appState.offcanvasInstance.hide();
        DOM.filterForm.reset();
        atualizarDashboard();
    });
}

// navegacao entre páginas

function inicializarNavegacao() {
    DOM.navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            if (link.classList.contains(CSS_CLASSES.ACTIVE)) return;

            const pageId = link.getAttribute('data-page');
            mudarDePagina(pageId);

            DOM.navLinks.forEach(nav => nav.classList.remove(CSS_CLASSES.ACTIVE));
            link.classList.add(CSS_CLASSES.ACTIVE);
        });
    });
}


function mudarDePagina(pageId) {
    appState.paginaAtual = pageId;
    DOM.mainContents.forEach(page => page.classList.add(CSS_CLASSES.HIDDEN));
    document.getElementById(pageId)?.classList.remove(CSS_CLASSES.HIDDEN);
    
    DOM.filterForm.reset();
    atualizarDashboard();
}


function configureModalForPage() {
    const isPaginaDetalhada = [PAGE_IDS.ROTAS, PAGE_IDS.GRAFICOS].includes(appState.paginaAtual);
    DOM.filtroCarreiraModal.style.display = isPaginaDetalhada ? 'block' : 'none';

    if (isPaginaDetalhada) {
        if (DOM.routeNumberSelect.options.length > 0) {
            DOM.routeNumberSelect.options[0].text = '-- Selecione uma Carreira --';
        }
    } else {
        DOM.routeNumberSelect.value = '';
    }
}

// Funcoes obtencao dos dados e atualizacao da dashboard
async function obterDados(endpoint, params) {
    const url = new URL(`${API_BASE_URL}${endpoint}`);
    Object.entries(params)
        .filter(([, value]) => value)
        .forEach(([key, value]) => url.searchParams.append(key, value));

    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Erro HTTP: ${response.status}`);
        DOM.connectionError.classList.add(CSS_CLASSES.HIDDEN);
        return await response.json();
    } catch (error) {
        console.error(`Erro na chamada à API para ${endpoint}:`, error);
        DOM.connectionError.classList.remove(CSS_CLASSES.HIDDEN);
        return null;
    }
}

async function preencherFiltroCarreiras() {
    const routes = await obterDados('/api/routes', {});
    if (!routes) return;
    DOM.routeNumberSelect.innerHTML = '<option value="">-- Selecione uma Carreira --</option>';
    routes.forEach(route => {
        const option = document.createElement('option');
        option.value = route;
        option.textContent = route;
        DOM.routeNumberSelect.appendChild(option);
    });
}

// Atualização da dashboard c base na página atual e filtros
async function atualizarDashboard() {
    const filtros = {
        dia_semana: DOM.diaSemanaSelect.value,
        classe_hora: DOM.classeHoraSelect.value,
        classe_chuva: DOM.classeChuvaSelect.value,
        route_number: DOM.routeNumberSelect.value
    };

    mostrarCarregamento(true, appState.paginaAtual);

    try {
        switch (appState.paginaAtual) {
            case PAGE_IDS.INICIAL:
                const analyticsInicial = await obterDados('/api/analytics', { ...filtros, route_number: '' });
                if (analyticsInicial) atualizarPaginaInicial(analyticsInicial);
                break;
            case PAGE_IDS.ROTAS:
                const [dataRotas, analyticsRotas] = await Promise.all([
                    obterDados('/api/data', filtros),
                    obterDados('/api/analytics', filtros)
                ]);
                if (dataRotas && analyticsRotas) atualizarPaginaRotas(analyticsRotas, dataRotas, filtros.route_number);
                break;
            case PAGE_IDS.GRAFICOS:
                const chartData = await obterDados('/api/charts', filtros);
                if (chartData) atualizarPaginaGraficos(chartData, filtros.route_number);
                break;
        }
    } catch (error) {
        console.error("Falha ao atualizar o dashboard:", error);
        reiniciarInterface(appState.paginaAtual);
    } finally {
        mostrarCarregamento(false, appState.paginaAtual);
    }
}


function atualizarPaginaInicial(analytics) {
    updateTextContent(DOM.avgSpeed, analytics.avg_speed_geral?.toFixed(1));
    updateTextContent(DOM.totalRoutes, analytics.total_routes);
    updateTextContent(DOM.fastRoutesKpi, analytics.fast_routes);
    updateTextContent(DOM.slowRoutesKpi, analytics.slow_routes);

    const criarLinha = (route, index) => `
        <tr>
            <td><span class="numero-ranking">${index + 1}</span></td>
            <td><span class="carreira-ranking">${route.route_number}</span></td>
            <td class="text-end"><span class="velocidade-ranking">${route.avg_speed.toFixed(1)} <span class="kmh">km/h</span></span></td>
        </tr>`;
    updateTable(DOM.fastestRoutesTable, analytics.fastest_routes, criarLinha);
    updateTable(DOM.slowestRoutesTable, analytics.slowest_routes, criarLinha);
}


function atualizarPaginaRotas(analytics, data, selectedRoute) {
    const details = analytics.selection_details;

    if (selectedRoute && details) {
        DOM.analiseRotaPlaceholder.classList.add(CSS_CLASSES.HIDDEN);
        DOM.analiseRotaResultados.classList.remove(CSS_CLASSES.HIDDEN);

        updateTextContent(DOM.detalheVelocidadeAtual, details.avg_speed?.toFixed(1));
        updateTextContent(DOM.detalheNumRegistos, details.registos);

        if (details.avg_speed && data.kpi_global_avg_speed > 0) {
            const variacao = ((details.avg_speed / data.kpi_global_avg_speed) - 1) * 100;
            const cor = variacao >= 0 ? 'text-success' : 'text-danger';
            const sinal = variacao >= 0 ? '+' : '';
            DOM.detalheComparacaoGlobal.innerHTML = `<span class="${cor}">${sinal}${variacao.toFixed(1)}%</span>`;
        } else {
            updateTextContent(DOM.detalheComparacaoGlobal, '--');
        }

        inicializarMapaAnalise();
        atualizarMarcadoresMapa(data.heatmap_data || []);
    } else {
        DOM.analiseRotaResultados.classList.add(CSS_CLASSES.HIDDEN);
        DOM.analiseRotaPlaceholder.classList.remove(CSS_CLASSES.HIDDEN);
        
        const icon = selectedRoute ? "bi-exclamation-triangle-fill" : "bi-bus-front";
        const title = selectedRoute ? 'Sem Dados para a Carreira' : 'Análise por Carreiras';
        const msg = 'Para começar, use os <strong>Filtros</strong> e selecione uma carreira para ver a sua análise detalhada.';

        DOM.analiseRotaPlaceholder.innerHTML = `<i class="bi ${icon}"></i><h4>${title}</h4><p>${msg}</p>`;
    }
}


function atualizarPaginaGraficos(data, selectedRoute) {
 
    const hasData = data && data.avg_speed_by_weekday && data.avg_speed_by_weekday.values.some(v => v > 0);

    if (selectedRoute && hasData) {
        DOM.graficosPlaceholder.classList.add(CSS_CLASSES.HIDDEN);
        DOM.graficosResultados.classList.remove(CSS_CLASSES.HIDDEN);

        const isDark = document.body.classList.contains('dark-mode');
        const fontColor = isDark ? '#f3f4f6' : '#0f172a';
        const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
        const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--cor-destaque').trim();
        
        Chart.defaults.color = fontColor;
        Chart.defaults.font.family = "'Montserrat', sans-serif";
        
        const chartOptions = {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: gridColor, drawBorder: false }, ticks: { color: fontColor } },
                x: { grid: { display: false }, ticks: { color: fontColor } }
            }
        };

        createOrUpdateChart('diaSemana', DOM.graficoDiaSemanaCanvas, 'bar', data.avg_speed_by_weekday, { ...chartOptions }, { backgroundColor: primaryColor, borderRadius: 4 });
        createOrUpdateChart('periodoDia', DOM.graficoPeriodoDiaCanvas, 'bar', data.avg_speed_by_time_period, { ...chartOptions, indexAxis: 'y' }, { backgroundColor: [primaryColor, '#9ca3af'], borderRadius: 4 });
        createOrUpdateChart('meteorologia', DOM.graficoMeteorologiaCanvas, 'line', data.avg_speed_by_weather, { ...chartOptions }, { fill: true, backgroundColor: `${primaryColor}33`, borderColor: primaryColor, tension: 0.3, pointBackgroundColor: primaryColor, pointRadius: 4 });
    } else {
        DOM.graficosPlaceholder.classList.remove(CSS_CLASSES.HIDDEN);
        DOM.graficosResultados.classList.add(CSS_CLASSES.HIDDEN);

        const icon = selectedRoute ? "bi-exclamation-triangle-fill" : "bi-bar-chart-line-fill";
        const title = selectedRoute ? 'Sem Dados para a Carreira' : 'Análise Gráfica';
        const msg = 'Para visualizar os gráficos, abra o menu de <strong>Filtros</strong> e selecione a carreira que deseja analisar.';
        
        DOM.graficosPlaceholder.innerHTML = `<i class="bi ${icon}"></i><h4>${title}</h4><p>${msg}</p>`;
    }
}


function inicializarMapaAnalise() {
    if (appState.mapaAnalise) {
        appState.mapaAnalise.invalidateSize();
        return;
    }
    appState.mapaAnalise = L.map('mapa-analise', {
        center: [38.736946, -9.142685], zoom: 12, minZoom: 11,
        maxBounds: L.latLngBounds(L.latLng(38.6, -9.4), L.latLng(38.9, -9.0)),
        maxBoundsViscosity: 1.0, zoomControl: true, scrollWheelZoom: false
    });
    
    atualizarTileLayer();
    appState.mapaAnalise.zoomControl.setPosition('topright');
    appState.camadaDeRotasAnalise = L.layerGroup().addTo(appState.mapaAnalise);
}


function atualizarTileLayer() {
    if (!appState.mapaAnalise) return;
    appState.mapaAnalise.eachLayer(layer => {
        if (layer instanceof L.TileLayer) appState.mapaAnalise.removeLayer(layer);
    });
    const tileUrl = document.body.classList.contains('dark-mode')
        ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
        : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
    L.tileLayer(tileUrl, { maxZoom: 19, attribution: '© OpenStreetMap, © CARTO' }).addTo(appState.mapaAnalise);
}


function obterCorParaVelocidade(speed) {
    if (speed >= 30) return '#1a9850';
    if (speed >= 20) return '#84cc16';
    if (speed >= 10) return '#fee08b';
    if (speed >= 5) return '#f97316';
    return '#d73027';
}

function atualizarMarcadoresMapa(data) {
    const { camadaDeRotasAnalise, mapaAnalise } = appState;
    camadaDeRotasAnalise.clearLayers();
    if (!data || data.length === 0 || !mapaAnalise) return;
    
    data.forEach(point => {
        const [lat, lon] = point.zona_id.split('_').map(Number);
        const speed = point.vmc_kmh;
        const color = obterCorParaVelocidade(speed);
        L.circleMarker([lat, lon], {
            radius: Math.max(3, Math.min(8, speed / 4)),
            fillColor: color, color: color, weight: 1, fillOpacity: 0.8
        }).bindPopup(`<div class="text-center"><strong>Velocidade</strong><br><span class="fs-5 fw-bold" style="color: ${color}">${speed.toFixed(1)} <span class="kmh">km/h</span></span></div>`)
          .addTo(camadaDeRotasAnalise);
    });
    setTimeout(() => mapaAnalise.invalidateSize(), 300);
}


function inicializarTema() {
    const definirTema = (escuro) => {
        document.body.classList.toggle('dark-mode', escuro);
        DOM.themeToggle.checked = escuro;
        localStorage.setItem('theme', escuro ? 'dark' : 'light');
        atualizarTileLayer();
        if (appState.paginaAtual === PAGE_IDS.GRAFICOS && DOM.routeNumberSelect.value) {
            atualizarDashboard(); 
        }
    };
    const prefereEscuro = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const temaGuardado = localStorage.getItem('theme');
    definirTema(temaGuardado === 'dark' || (temaGuardado === null && prefereEscuro));
    DOM.themeToggle.addEventListener('change', () => definirTema(DOM.themeToggle.checked));
}


function mostrarCarregamento(mostrar, paginaId) {
    const loader = document.querySelector(`#${paginaId} .camada-carregamento`);
    loader?.classList.toggle('show', mostrar);
}

function reiniciarInterface(paginaId) {
    switch (paginaId) {
        case PAGE_IDS.INICIAL:
            [DOM.avgSpeed, DOM.totalRoutes, DOM.fastRoutesKpi, DOM.slowRoutesKpi].forEach(el => el.textContent = '--');
            DOM.fastestRoutesTable.innerHTML = '';
            DOM.slowestRoutesTable.innerHTML = '';
            break;
        case PAGE_IDS.ROTAS:
            DOM.analiseRotaPlaceholder.classList.remove(CSS_CLASSES.HIDDEN);
            DOM.analiseRotaResultados.classList.add(CSS_CLASSES.HIDDEN);
            appState.camadaDeRotasAnalise?.clearLayers();
            break;
        case PAGE_IDS.GRAFICOS:
            DOM.graficosPlaceholder.classList.remove(CSS_CLASSES.HIDDEN);
            DOM.graficosResultados.classList.add(CSS_CLASSES.HIDDEN);
            Object.keys(appState.charts).forEach(key => {
                if (appState.charts[key]) {
                    appState.charts[key].destroy();
                    appState.charts[key] = null;
                }
            });
            break;
    }
}


function createOrUpdateChart(chartKey, canvas, type, data, options, datasetOptions) {
    if (appState.charts[chartKey]) appState.charts[chartKey].destroy();
    appState.charts[chartKey] = new Chart(canvas.getContext('2d'), {
        type,
        data: {
            labels: data.labels,
            datasets: [{ label: 'Velocidade Média (km/h)', data: data.values, ...datasetOptions }]
        },
        options
    });
}

function updateTextContent(element, content, defaultValue = '--') {
    if (element) element.textContent = content ?? defaultValue;
}


function updateTable(tableBody, data, rowTemplate) {
    if (!tableBody) return;
    const placeholder = `<tr><td colspan="3" class="text-center text-muted py-4"><i class="bi bi-info-circle me-2"></i>Sem dados para os filtros.</td></tr>`;
    tableBody.innerHTML = data?.length > 0 ? data.slice(0, 10).map(rowTemplate).join('') : placeholder;
}

