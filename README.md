# Caderno de Obra

App que substitui o caderno de papel na obra. Offline, sem conta, dados no telemóvel.
Feita para Android (Chrome), a partir das tuas notas do vault e das páginas reais do caderno.

## Abrir já (telemóvel e PC na mesma rede Wi-Fi)

No PC, dentro desta pasta:

```powershell
node serve.mjs
```

Depois abre no telemóvel o endereço que aparecer, do tipo:

```
http://192.168.x.x:8080/
```

No Chrome do telemóvel: menu **⋮ → Adicionar ao ecrã principal**.

> Estar ligado ao PC tem um senão: se o PC desligar, a página não carrega (os dados ficam no telemóvel).
> Para ficar independente e a funcionar mesmo sem rede, o passo seguinte é publicar a pasta num
> alojamento HTTPS (ex.: GitHub Pages) — aí o Chrome instala a app e ela abre offline.

## Como se escreve uma linha

Um campo, uma linha por assunto. Podes escrever ou usar o **microfone do teclado Samsung**.

| Escreves | A app entende |
|---|---|
| `falta curva Ø40 300` | ⛔ Preciso · PPR · Curva Ø40 · 300 un |
| `// Ø32 — 200` | ⛔ Preciso · herda "Curva" da linha anterior · Ø32 · 200 un |
| `tê Ø40x32x40 — 100` | ⛔ Preciso · Tê Ø40x32x40 · 100 un |
| `12 caixas abraçadeiras Ø40` | ⛔ Preciso · Abraçadeira Ø40 · 12 caixa |
| `usei 30 m tubo ppr 25` | 📦 Gasto · Tubo ppr 25 · 30 m |
| `polifusora emprestada ao Diogo` | 🧰 Ferramenta · Polifusora (+ botão "Guardar em Ferramentas") |
| `iniciar tetos piso 1 bloco B` | 📌 Tarefa · Tetos · local Piso 1 Bloco B |
| `esgoto da cozinha: 45 cm do pronto, 1,90 m da parede da direita` | 📝 Nota + 2 medidas |

Regras que a app aplica:

- **`//` herda** o nome da linha anterior (marca de repetição do caderno).
- **Família** (PPR, PVC, Esgotos, Pluviais, Abraçadeiras, Isolamento) fica presa depois de a dizeres.
- **Unidade** é `un` por omissão; escreve `caixas`, `m`, `kg` quando for outra.
- **Piso/Bloco/Lote na linha** muda o local daquela linha; o resto herda o local do topo.
- **"do pronto" = chão acabado** (referência padrão das cotas).
- **Riscar/anular** não apaga: item fica `Anulado`.
- Nomes técnicos (`casq` → casquilho, `tes` → tê, `maq` → máquina, `holefusora` → polifusora) são traduzidos para o nome canónico.

## Ecrãs

- **Hoje** — a página do dia: escreves, a app organiza.
- **Preciso** — material em falta agrupado por família; selecionas e **envias ao armazém por WhatsApp**.
- **Medidas** — todas as cotas, com o assunto e o local.
- **Ferramentas** — comigo · emprestadas · a precisar · extraviadas · em reparação.
- **Mais** — obras e locais, Gasto, Encomendas (pedido → entrada), cópia de segurança.

## Dados

- Tudo fica no `localStorage` do telemóvel. Nada sai do dispositivo.
- **Exporta de vez em quando** (Mais → Exportar): é a única salvaguarda se o telemóvel se perder.
- O ficheiro exportado é JSON e pode ser reimportado.

## Aspeto

- **Três temas**: automático (segue o telemóvel), claro e escuro. Botão redondo no topo (sol/lua) e também em **Mais → Aspeto**.
- Ícones desenhados em SVG (sem emojis), listas em cartões com divisórias, barra inferior flutuante com contorno desfocado.
- Cor por tipo de linha: Preciso (vermelho), Gasto (âmbar), Ferramenta (violeta), Tarefa (azul), Nota (cinza).
- Respeita `prefers-reduced-motion` (sem animações) e tem áreas de toque grandes para uso com luvas.

## Testes

```powershell
node test/parser.test.mjs   # regras de captura, com linhas reais do caderno
node test/app.smoke.mjs     # a app desenha + fluxo de dados ponta a ponta
```

## Ficheiros

| Ficheiro | O que faz |
|---|---|
| `parser.js` | regras de captura (tipo, família, quantidade, cotas, herança, local) |
| `format.js` | datas, números e o texto da encomenda para WhatsApp |
| `store.js` | dados locais, obras/locais, encomendas, ferramentas, backup |
| `icons.js` | ícones SVG |
| `app.js` | interface e ecrãs |
| `index.html`, `styles.css` | estrutura e aspeto (mobile-first, temas claro/escuro) |
| `sw.js`, `manifest.webmanifest` | instalação e funcionamento offline (quando servido por HTTPS) |
| `serve.mjs` | servidor local para testar no telemóvel |
| `test/palco.html` | página de verificação com os ecrãs lado a lado (claro e escuro) |
| `test/palco-encomenda.html` | verificação do fluxo selecionar → encomenda → WhatsApp |

## Fora desta versão (planeado)

- Ligação ao vault Obsidian (exportar `.md` com as properties de lá).
- Gasto com multiplicação por casa/piso.
- Fotos, preços, presenças e horas.
- Empacotamento como APK.

## Notas

- Sem Android SDK nesta máquina, a app é uma web app instalável (PWA) — mesmo código, sem loja.
- `Scripts/catalogo_trabalhos.json` do vault tem caracteres mal codificados; não é usado por esta app.
