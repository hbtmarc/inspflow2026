# InspFlow Revitalização — MVP Story App

Base inicial do **InspFlow Revitalização** em formato de story-app estático, pronto para GitHub Pages.

## URL publicada

- Produção (GitHub Pages): `https://hbtmarc.github.io/inspflow2026/`

## Objetivo

Substituir o deck legado por uma SPA simples (hash routing) para contar a narrativa do produto em 10 cenas.

## Stack

- HTML5
- CSS3 (sem frameworks)
- JavaScript vanilla (ES Modules)
- JSON local para conteúdo das cenas

## Rotas

- `#home`
- `#contexto`
- `#o-que-e`
- `#demo-menu`
- `#fluxo-inspecao`
- `#fluxo-end`
- `#equipamentos-equipe`
- `#visao-planejador`
- `#painel-gerencial`
- `#encerramento`

## Funcionalidades MVP

- Navegação por hash
- Indicador de progresso no topo
- Controles anterior/próxima/início/fim
- Navegação por teclado (`←`, `→`, `Home`, `End`)
- `aria-current` na navegação de cenas
- Estados de foco visíveis
- Suporte a `prefers-reduced-motion`

## Modo apresentador (avançado)

### Modos por query string

- `?presenter=1` → **Console do Apresentador**
- `?present=1` → **Visão da Audiência**

### Console do Apresentador

- Timer de apresentação em execução
- Estado de visibilidade da aba (pausado quando oculto)
- Título da cena atual
- Lista de cenas com estado ativo
- Notas por cena vindas de `data/story.json` (`notas`)
- Controles: anterior, próxima, início, fim e tela cheia

### Visão da Audiência

- Mostra apenas a cena ativa em estilo full-canvas
- Oculta elementos auxiliares do apresentador

### Sincronização entre abas

- Usa `BroadcastChannel("inspflow-presenter")`
- Navegação em uma aba sincroniza a outra
- Fallback seguro: se `BroadcastChannel` não existir, os controles locais continuam funcionando normalmente

### Atalhos de teclado

- `←` / `→` para navegar
- `Home` / `End` para início/fim
- `F` para alternar tela cheia
- `P` para alternar auxiliares no console do apresentador

## Rodar localmente

Por usar `fetch` para carregar `data/story.json`, execute com servidor HTTP local.

Exemplo com Python:

```bash
python3 -m http.server 8080
```

Abra:

`http://localhost:8080`

## Suporte offline (PWA leve)

Arquivos adicionados para hardening final:

- `sw.js`
- `manifest.webmanifest`
- `offline.html`
- `404.html`

### Estratégia de cache

- **Precache**: app shell, componentes JS, CSS, JSON e assets locais
- **Network-first**: navegação HTML/documento
- **Cache-first**: arquivos estáticos (`.css`, `.js`, `.json`, `.svg`, `manifest`)
- **Fallback offline**: `offline.html` quando não houver rede
- **Versionamento e limpeza**: caches antigos removidos no `activate`

## Como testar offline localmente

1. Rode: `python3 -m http.server 8080`
2. Abra `http://localhost:8080` e navegue por algumas cenas (para aquecer cache)
3. Abra DevTools > Application > Service Workers e confirme registro ativo
4. Ative modo offline no DevTools > Network
5. Recarregue a página e valide que o app abre com recursos em cache
6. Teste uma navegação sem cache e valide fallback para `offline.html`

## Como testar atualização de versão

1. Com o app aberto, altere `CACHE_VERSION` em `sw.js`
2. Recarregue a aba para disparar `updatefound`
3. Confirme que aparece o aviso "Nova versão disponível"
4. Clique em **Atualizar agora** para ativar o novo service worker
5. Verifique recarregamento automático após `controllerchange`

## Reset de cache (quando necessário)

- DevTools > Application > Storage > **Clear site data**
- ou DevTools > Application > Service Workers > **Unregister** e depois recarregar

## Notas de publicação no GitHub Pages

- Projeto continua 100% estático (sem build step)
- Mantenha `.nojekyll` no repositório
- `start_url` e `scope` do `manifest.webmanifest` usam caminhos relativos (`./`) para compatibilidade no subpath do Pages
- Hash routing (`#...`) continua compatível com GitHub Pages
- Service worker registra apenas em `https` ou `localhost`
- Após publicar, faça um hard refresh na primeira validação para garantir atualização de cache

## Checklist de validação em produção

1. Abrir `https://hbtmarc.github.io/inspflow2026/#home`
2. Navegar por todas as cenas hash (`#home` até `#encerramento`)
3. Validar `?presenter=1` e `?present=1` com sincronização entre abas
4. Confirmar carregamento de dados locais em `data/*` sem erro
5. Verificar registro do service worker em ambiente `https`
6. Simular offline no navegador e validar fallback em `offline.html`
7. Confirmar aviso de atualização quando houver nova versão do `sw.js`
8. Validar ausência de referências legadas DDSMS

## Estrutura

```text
inspflow2026/
	.nojekyll
	index.html
	README.md
	ROTEIRO.md
	data/
		story.json
	css/
		tokens.css
		base.css
		components.css
		presenter.css
	js/
		app.js
		presenter.js
		router.js
		state.js
		a11y.js
```
