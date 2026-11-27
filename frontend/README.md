# Pluvial

Protótipo acadêmico do Challenge FIAP 2026. Moradores, sensores e Defesa Civil de Juiz de Fora trabalham juntos para prevenir alagamentos e deslizamentos.

A documentação completa está em `docs/Pluvial-Documentacao.pdf`: os fluxos, os componentes, o fluxograma e as telas. O arquivo para o Figma está em `figma/Pluvial-design-system.svg`.

## Como executar

**Opção 1, mais simples:** dê dois cliques em `index.html`. Ele abre no navegador, e não é preciso instalar nada.

**Opção 2, com servidor local (recomendada para testar entre abas):** no terminal, dentro desta pasta, rode o comando abaixo e abra `http://localhost:8000`.

```bash
python3 -m http.server 8000
```

Use Chrome, Edge, Firefox ou Safari atualizados.

A internet só é usada para três coisas: as fontes do Google Fonts, a chuva real do Open-Meteo e o link de rota no Google Maps. Sem internet, tudo funciona, com chuva zero e a fonte padrão do sistema.

## Roteiro de teste (5 minutos)

1. **Início** (`index.html`): clique em **Registrar relato**. Envie o formulário vazio para ver os erros junto aos campos. Depois preencha e envie. Os pontos sobem e o relato entra no cartão do bairro.
2. **Painel das autoridades** (`autoridades.html`):
   - Clique em **Carregar exemplos** e filtre por encosta Dom Bosco.
   - Marque as ocorrências como verificadas.
   - Em **Nível de alerta por encosta**, defina Dom Bosco como **Alerta máximo**.
   - Em **Situação dos abrigos**, coloque 380 pessoas no Ginásio poliesportivo e clique em **Atualizar situação dos abrigos**.
3. **Painel do morador** (`morador.html`):
   - Escolha Dom Bosco. Aparece o banner de alerta máximo, e, como o ginásio lotou, a página sugere o abrigo mais próximo com vaga.
   - Clique nos abrigos do mapa.
   - Escolha Linhares: o abrigo de destino dela começa lotado.
   - Registre uma ocorrência. O botão só é liberado com texto, e o erro aparece se o texto for curto.
4. **Componentes** (`componentes.html`): os 5 componentes em todos os estados, lado a lado.

Para recomeçar do zero, apague os dados do site no navegador. Também dá para rodar `localStorage.clear()` no console.

## Páginas e arquivos

| Página | Para que serve | CSS | JS |
| --- | --- | --- | --- |
| `index.html` | Apresentação, cartões dos bairros, sensor, relato e ranking | `base.css`, `home.css` | `core.js`, `sensor.js`, `bueiros.js`, `home.js`, `community.js` |
| `morador.html` | Alerta da encosta, mapa de abrigos, áreas de risco e ocorrências | `base.css`, `morador.css` | `risco.js`, `morador.js` |
| `autoridades.html` | Verificar relatos, definir o nível das encostas e atualizar os abrigos | `base.css`, `autoridades.css` | `risco.js`, `autoridades.js` |
| `componentes.html` | Design system: tokens e componentes em todos os estados | `base.css`, `componentes.css` | — |

`base.css` guarda os tokens, os componentes (botão, campos, seleção, cartão, chips) e os estados de cada um. Também guarda o topo das páginas internas.

## Dados (localStorage)

Não há servidor. As páginas conversam pelo `localStorage` do navegador. Se você abrir duas abas, uma atualiza a outra sozinha.

| Chave | Quem grava | Quem lê |
| --- | --- | --- |
| `pluvial-reports` | Início (relato) e autoridades (status) | Início, autoridades |
| `pluvial-ocorrencias` | Morador (registro) e autoridades (status) | Morador, autoridades |
| `pluvial-niveis` | Autoridades (nível por encosta) | Morador |
| `pluvial-abrigos` | Autoridades (ocupação) | Morador |

Bueiros, encostas, abrigos e moradores do ranking são fictícios. As ruas e a chuva são reais.

## Créditos

- **Foto:** Parque do Museu Mariano Procópio, por bolapiercing ([CC BY 2.0](https://commons.wikimedia.org/wiki/File:Parque_Museu_Mariano_Proc%C3%B3pio,_Juiz_de_Fora_MG.jpg)).
- **Chuva:** [Open-Meteo](https://open-meteo.com/) (CC BY 4.0).
- **Fontes:** Bricolage Grotesque e Instrument Sans (OFL).
